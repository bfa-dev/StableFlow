import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Transaction, TransactionType, TransactionStatus } from './entities/transaction.entity';
import { TransactionLimit } from './entities/transaction-limit.entity';
import {
  MintTokensDto,
  BurnTokensDto,
  TransferTokensDto,
  BulkTransferDto,
  UpdateTransactionLimitsDto,
  TransactionResponseDto,
  TransactionLimitResponseDto,
  TransactionQueryDto,
} from './dto/transaction.dto';

interface UserInfo {
  id: number;
  email: string;
  role: string;
}

interface WalletInfo {
  id: number;
  user_id: number;
  balance: string;
  frozen_balance: string;
  status: string;
}

@Injectable()
export class TransactionServiceService {
  private readonly logger = new Logger(TransactionServiceService.name);
  private readonly TRANSACTION_FEE_RATE = 0.001; // 0.1% fee
  private readonly MIN_TRANSACTION_AMOUNT = 0.00000001;

  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(TransactionLimit)
    private transactionLimitRepository: Repository<TransactionLimit>,
    private dataSource: DataSource,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  async mintTokens(mintDto: MintTokensDto, currentUser: UserInfo): Promise<TransactionResponseDto> {
    // Only SUPER_ADMIN can mint tokens
    if (currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only SUPER_ADMIN can mint tokens');
    }

    const { amount, to_user_id, description, reference_id, metadata } = mintDto;

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= this.MIN_TRANSACTION_AMOUNT) {
      throw new BadRequestException('Invalid mint amount');
    }

    // Validate target user exists and has a wallet
    const wallet = await this.getWalletByUserId(to_user_id);
    if (!wallet) {
      throw new NotFoundException('Target user wallet not found');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create pending transaction
      const transaction = queryRunner.manager.create(Transaction, {
        type: TransactionType.MINT,
        from_user_id: null, // Minting from system
        to_user_id,
        amount,
        fee: '0.00000000', // No fee for minting
        status: TransactionStatus.PENDING,
        description: description || 'Token minting',
        reference_id,
        metadata: {
          ...metadata,
          minted_by: currentUser.id,
          minted_by_email: currentUser.email,
        },
      });

      const savedTransaction = await queryRunner.manager.save(transaction);

      // Publish to Kafka for processing
      await this.publishTransactionToKafka(savedTransaction);

      await queryRunner.commitTransaction();

      this.logger.log(`Mint transaction created: ${savedTransaction.id} for user ${to_user_id} amount ${amount}`);

      return this.mapTransactionToResponse(savedTransaction);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create mint transaction: ${error.message}`);
      throw new BadRequestException('Failed to create mint transaction');
    } finally {
      await queryRunner.release();
    }
  }

  async burnTokens(burnDto: BurnTokensDto, currentUser: UserInfo): Promise<TransactionResponseDto> {
    const { amount, from_user_id, description, reference_id, metadata } = burnDto;

    // Determine the source user
    const sourceUserId = from_user_id || currentUser.id;

    // Users can only burn their own tokens unless they're admin
    if (sourceUserId !== currentUser.id && !['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role)) {
      throw new ForbiddenException('You can only burn your own tokens');
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= this.MIN_TRANSACTION_AMOUNT) {
      throw new BadRequestException('Invalid burn amount');
    }

    // Validate source user wallet and balance
    const wallet = await this.getWalletByUserId(sourceUserId);
    if (!wallet) {
      throw new NotFoundException('Source user wallet not found');
    }

    const availableBalance = parseFloat(wallet.balance) - parseFloat(wallet.frozen_balance);
    if (availableBalance < amountNum) {
      throw new BadRequestException('Insufficient balance for burn operation');
    }

    // Check transaction limits
    await this.checkTransactionLimits(sourceUserId, amountNum);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create pending transaction
      const transaction = queryRunner.manager.create(Transaction, {
        type: TransactionType.BURN,
        from_user_id: sourceUserId,
        to_user_id: null, // Burning to system
        amount,
        fee: '0.00000000', // No fee for burning
        status: TransactionStatus.PENDING,
        description: description || 'Token burning',
        reference_id,
        metadata: {
          ...metadata,
          burned_by: currentUser.id,
          burned_by_email: currentUser.email,
        },
      });

      const savedTransaction = await queryRunner.manager.save(transaction);

      // Update transaction limits
      await this.updateTransactionLimitsUsage(queryRunner, sourceUserId, amountNum);

      // Publish to Kafka for processing
      await this.publishTransactionToKafka(savedTransaction);

      await queryRunner.commitTransaction();

      this.logger.log(`Burn transaction created: ${savedTransaction.id} for user ${sourceUserId} amount ${amount}`);

      return this.mapTransactionToResponse(savedTransaction);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create burn transaction: ${error.message}`);
      throw new BadRequestException('Failed to create burn transaction');
    } finally {
      await queryRunner.release();
    }
  }

  async transferTokens(transferDto: TransferTokensDto, currentUser: UserInfo): Promise<TransactionResponseDto> {
    const { amount, to_user_id, description, reference_id, metadata } = transferDto;

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= this.MIN_TRANSACTION_AMOUNT) {
      throw new BadRequestException('Invalid transfer amount');
    }

    // Users cannot transfer to themselves
    if (to_user_id === currentUser.id) {
      throw new BadRequestException('Cannot transfer to yourself');
    }

    // Calculate fee
    const feeAmount = amountNum * this.TRANSACTION_FEE_RATE;
    const totalAmount = amountNum + feeAmount;

    // Validate source user wallet and balance
    const sourceWallet = await this.getWalletByUserId(currentUser.id);
    if (!sourceWallet) {
      throw new NotFoundException('Your wallet not found');
    }

    const availableBalance = parseFloat(sourceWallet.balance) - parseFloat(sourceWallet.frozen_balance);
    if (availableBalance < totalAmount) {
      throw new BadRequestException('Insufficient balance for transfer (including fees)');
    }

    // Validate target user wallet
    const targetWallet = await this.getWalletByUserId(to_user_id);
    if (!targetWallet) {
      throw new NotFoundException('Target user wallet not found');
    }

    if (targetWallet.status !== 'ACTIVE') {
      throw new BadRequestException('Target wallet is not active');
    }

    // Check transaction limits
    await this.checkTransactionLimits(currentUser.id, totalAmount);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create pending transaction
      const transaction = queryRunner.manager.create(Transaction, {
        type: TransactionType.TRANSFER,
        from_user_id: currentUser.id,
        to_user_id,
        amount,
        fee: feeAmount.toFixed(8),
        status: TransactionStatus.PENDING,
        description: description || 'Token transfer',
        reference_id,
        metadata,
      });

      const savedTransaction = await queryRunner.manager.save(transaction);

      // Update transaction limits
      await this.updateTransactionLimitsUsage(queryRunner, currentUser.id, totalAmount);

      // Publish to Kafka for processing
      await this.publishTransactionToKafka(savedTransaction);

      await queryRunner.commitTransaction();

      this.logger.log(`Transfer transaction created: ${savedTransaction.id} from ${currentUser.id} to ${to_user_id} amount ${amount}`);

      return this.mapTransactionToResponse(savedTransaction);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create transfer transaction: ${error.message}`);
      throw new BadRequestException('Failed to create transfer transaction');
    } finally {
      await queryRunner.release();
    }
  }

  async bulkTransfer(bulkTransferDto: BulkTransferDto, currentUser: UserInfo): Promise<TransactionResponseDto[]> {
    // Only admin users can perform bulk transfers
    if (!['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role)) {
      throw new ForbiddenException('Only admins can perform bulk transfers');
    }

    const { transfers, description, metadata } = bulkTransferDto;

    if (transfers.length === 0) {
      throw new BadRequestException('No transfers provided');
    }

    if (transfers.length > 100) {
      throw new BadRequestException('Maximum 100 transfers per bulk operation');
    }

    // Calculate total amount
    let totalAmount = 0;
    for (const transfer of transfers) {
      const amount = parseFloat(transfer.amount);
      if (isNaN(amount) || amount <= this.MIN_TRANSACTION_AMOUNT) {
        throw new BadRequestException(`Invalid transfer amount: ${transfer.amount}`);
      }
      totalAmount += amount;
    }

    const totalFee = totalAmount * this.TRANSACTION_FEE_RATE;
    const grandTotal = totalAmount + totalFee;

    // Validate source wallet
    const sourceWallet = await this.getWalletByUserId(currentUser.id);
    if (!sourceWallet) {
      throw new NotFoundException('Your wallet not found');
    }

    const availableBalance = parseFloat(sourceWallet.balance) - parseFloat(sourceWallet.frozen_balance);
    if (availableBalance < grandTotal) {
      throw new BadRequestException('Insufficient balance for bulk transfer');
    }

    // Validate all target wallets
    const targetUserIds = [...new Set(transfers.map(t => t.to_user_id))];
    for (const userId of targetUserIds) {
      if (userId === currentUser.id) {
        throw new BadRequestException('Cannot transfer to yourself');
      }
      const wallet = await this.getWalletByUserId(userId);
      if (!wallet || wallet.status !== 'ACTIVE') {
        throw new BadRequestException(`Target user ${userId} wallet not found or inactive`);
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const createdTransactions: Transaction[] = [];

      // Create individual transactions for each transfer
      for (const transfer of transfers) {
        const transaction = queryRunner.manager.create(Transaction, {
          type: TransactionType.BULK_TRANSFER,
          from_user_id: currentUser.id,
          to_user_id: transfer.to_user_id,
          amount: transfer.amount,
          fee: (parseFloat(transfer.amount) * this.TRANSACTION_FEE_RATE).toFixed(8),
          status: TransactionStatus.PENDING,
          description: transfer.description || description || 'Bulk transfer',
          reference_id: transfer.reference_id,
          metadata: {
            ...metadata,
            bulk_transfer_id: `bulk_${Date.now()}`,
          },
        });

        const savedTransaction = await queryRunner.manager.save(transaction);
        createdTransactions.push(savedTransaction);
      }

      // Update transaction limits
      await this.updateTransactionLimitsUsage(queryRunner, currentUser.id, grandTotal);

      // Publish all transactions to Kafka
      for (const transaction of createdTransactions) {
        await this.publishTransactionToKafka(transaction);
      }

      await queryRunner.commitTransaction();

      this.logger.log(`Bulk transfer created: ${createdTransactions.length} transactions for user ${currentUser.id}`);

      return createdTransactions.map(t => this.mapTransactionToResponse(t));
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create bulk transfer: ${error.message}`);
      throw new BadRequestException('Failed to create bulk transfer');
    } finally {
      await queryRunner.release();
    }
  }

  async getTransactionHistory(
    queryDto: TransactionQueryDto,
    currentUser: UserInfo,
  ): Promise<{ data: TransactionResponseDto[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, type, status, user_id } = queryDto;

    const queryBuilder = this.transactionRepository.createQueryBuilder('transaction');

    // Regular users can only see their own transactions
    if (!['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role)) {
      queryBuilder.where(
        '(transaction.from_user_id = :userId OR transaction.to_user_id = :userId)',
        { userId: currentUser.id }
      );
    } else if (user_id) {
      // Admins can filter by specific user
      queryBuilder.where(
        '(transaction.from_user_id = :userId OR transaction.to_user_id = :userId)',
        { userId: user_id }
      );
    }

    if (type) {
      queryBuilder.andWhere('transaction.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('transaction.status = :status', { status });
    }

    const [data, total] = await queryBuilder
      .orderBy('transaction.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: data.map(t => this.mapTransactionToResponse(t)),
      total,
      page,
      limit,
    };
  }

  async getTransactionLimits(userId: number, currentUser: UserInfo): Promise<TransactionLimitResponseDto> {
    // Users can only see their own limits, admins can see any
    if (userId !== currentUser.id && !['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role)) {
      throw new ForbiddenException('You can only view your own transaction limits');
    }

    let limits = await this.transactionLimitRepository.findOne({ where: { user_id: userId } });

    if (!limits) {
      // Create default limits if they don't exist
      limits = await this.createDefaultTransactionLimits(userId);
    }

    // Check if limits need to be reset
    await this.resetLimitsIfNeeded(limits);

    return this.mapLimitsToResponse(limits);
  }

  async updateTransactionLimits(
    updateDto: UpdateTransactionLimitsDto,
    currentUser: UserInfo,
  ): Promise<TransactionLimitResponseDto> {
    // Only admins can update transaction limits
    if (!['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role)) {
      throw new ForbiddenException('Only admins can update transaction limits');
    }

    const { user_id, daily_limit, monthly_limit, is_active } = updateDto;

    let limits = await this.transactionLimitRepository.findOne({ where: { user_id } });

    if (!limits) {
      limits = await this.createDefaultTransactionLimits(user_id);
    }

    if (daily_limit !== undefined) {
      limits.daily_limit = daily_limit;
    }
    if (monthly_limit !== undefined) {
      limits.monthly_limit = monthly_limit;
    }
    if (is_active !== undefined) {
      limits.is_active = is_active;
    }

    const savedLimits = await this.transactionLimitRepository.save(limits);

    this.logger.log(`Transaction limits updated for user ${user_id} by ${currentUser.email}`);

    return this.mapLimitsToResponse(savedLimits);
  }

  private async getWalletByUserId(userId: number): Promise<WalletInfo | null> {
    try {
      const walletServiceUrl = this.configService.get('WALLET_SERVICE_URL', 'http://localhost:3002');
      const response = await this.httpService.axiosRef.get(
        `${walletServiceUrl}/api/v1/internal/wallets/balance/${userId}`
      );
      return response.data[0] || null;
    } catch (error) {
      this.logger.error(`Failed to get wallet for user ${userId}: ${error.message}`);
      return null;
    }
  }

  private async checkTransactionLimits(userId: number, amount: number): Promise<void> {
    let limits = await this.transactionLimitRepository.findOne({ where: { user_id: userId } });

    if (!limits) {
      limits = await this.createDefaultTransactionLimits(userId);
    }

    if (!limits.is_active) {
      throw new ForbiddenException('Transaction limits are disabled for this user');
    }

    // Reset limits if needed
    await this.resetLimitsIfNeeded(limits);

    // Check daily limit
    const newDailyTotal = parseFloat(limits.current_daily) + amount;
    if (newDailyTotal > parseFloat(limits.daily_limit)) {
      throw new BadRequestException('Daily transaction limit exceeded');
    }

    // Check monthly limit
    const newMonthlyTotal = parseFloat(limits.current_monthly) + amount;
    if (newMonthlyTotal > parseFloat(limits.monthly_limit)) {
      throw new BadRequestException('Monthly transaction limit exceeded');
    }
  }

  private async updateTransactionLimitsUsage(queryRunner: any, userId: number, amount: number): Promise<void> {
    const limits = await queryRunner.manager.findOne(TransactionLimit, { where: { user_id: userId } });
    
    if (limits) {
      limits.current_daily = (parseFloat(limits.current_daily) + amount).toFixed(8);
      limits.current_monthly = (parseFloat(limits.current_monthly) + amount).toFixed(8);
      await queryRunner.manager.save(limits);
    }
  }

  private async createDefaultTransactionLimits(userId: number): Promise<TransactionLimit> {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const limits = this.transactionLimitRepository.create({
      user_id: userId,
      daily_limit: '10000.00000000',
      monthly_limit: '100000.00000000',
      current_daily: '0.00000000',
      current_monthly: '0.00000000',
      daily_reset_date: today,
      monthly_reset_date: nextMonth,
      is_active: true,
    });

    return this.transactionLimitRepository.save(limits);
  }

  private async resetLimitsIfNeeded(limits: TransactionLimit): Promise<void> {
    const today = new Date();
    let needsUpdate = false;

    // Reset daily limits if needed
    if (today >= limits.daily_reset_date) {
      limits.current_daily = '0.00000000';
      limits.daily_reset_date = new Date(today.getTime() + 24 * 60 * 60 * 1000); // Next day
      needsUpdate = true;
    }

    // Reset monthly limits if needed
    if (today >= limits.monthly_reset_date) {
      limits.current_monthly = '0.00000000';
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      limits.monthly_reset_date = nextMonth;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await this.transactionLimitRepository.save(limits);
    }
  }

  private async publishTransactionToKafka(transaction: Transaction): Promise<void> {
    try {
      // In a real implementation, this would publish to Kafka
      // For now, we'll simulate by logging
      this.logger.log(`Publishing transaction to Kafka: ${transaction.id}`);
      
      // TODO: Implement actual Kafka producer
      // const kafkaMessage = {
      //   key: transaction.id,
      //   value: JSON.stringify(transaction),
      //   topic: 'transaction-requests'
      // };
      // await this.kafkaProducer.send(kafkaMessage);
    } catch (error) {
      this.logger.error(`Failed to publish transaction to Kafka: ${error.message}`);
      throw error;
    }
  }

  private mapTransactionToResponse(transaction: Transaction): TransactionResponseDto {
    return {
      id: transaction.id,
      type: transaction.type,
      from_user_id: transaction.from_user_id,
      to_user_id: transaction.to_user_id,
      amount: transaction.amount,
      fee: transaction.fee,
      status: transaction.status,
      description: transaction.description,
      reference_id: transaction.reference_id,
      created_at: transaction.created_at,
      processed_at: transaction.processed_at,
    };
  }

  private mapLimitsToResponse(limits: TransactionLimit): TransactionLimitResponseDto {
    return {
      user_id: limits.user_id,
      daily_limit: limits.daily_limit,
      monthly_limit: limits.monthly_limit,
      current_daily: limits.current_daily,
      current_monthly: limits.current_monthly,
      daily_reset_date: limits.daily_reset_date,
      monthly_reset_date: limits.monthly_reset_date,
      is_active: limits.is_active,
    };
  }
}
