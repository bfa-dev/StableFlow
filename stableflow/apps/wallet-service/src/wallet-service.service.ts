import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { randomBytes, createHash } from 'crypto';
import { Wallet, WalletStatus } from './entities/wallet.entity';
import { BalanceHistory, ChangeType } from './entities/balance-history.entity';
import { WalletAddress, AddressType, Currency } from './entities/wallet-address.entity';
import {
  CreateWalletDto,
  UpdateBalanceDto,
  FreezeWalletDto,
  GenerateAddressDto,
  WalletResponseDto,
  BalanceHistoryResponseDto,
  WalletAddressResponseDto,
  BalanceQueryDto,
} from './dto/wallet.dto';

@Injectable()
export class WalletServiceService {
  private readonly logger = new Logger(WalletServiceService.name);

  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(BalanceHistory)
    private balanceHistoryRepository: Repository<BalanceHistory>,
    @InjectRepository(WalletAddress)
    private walletAddressRepository: Repository<WalletAddress>,
    private dataSource: DataSource,
  ) {}

  async createWallet(createWalletDto: CreateWalletDto): Promise<WalletResponseDto> {
    const { user_id, currency = Currency.USDT, label } = createWalletDto;

    // Check if user already has a wallet for this currency
    const existingWallet = await this.walletRepository.findOne({
      where: { user_id, currency },
    });

    if (existingWallet) {
      throw new ConflictException(
        `User already has a ${currency} wallet`,
      );
    }

    // Generate unique wallet address
    const address = this.generateWalletAddress(currency);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create wallet
      const wallet = queryRunner.manager.create(Wallet, {
        user_id,
        address,
        currency,
        balance: '0.00000000',
        frozen_balance: '0.00000000',
        status: WalletStatus.ACTIVE,
      });

      const savedWallet = await queryRunner.manager.save(wallet);

      // Create primary address
      const walletAddress = queryRunner.manager.create(WalletAddress, {
        wallet_id: savedWallet.id,
        currency,
        address,
        address_type: AddressType.DEPOSIT,
        is_primary: true,
        is_active: true,
        label: label || `Primary ${currency} Address`,
      });

      await queryRunner.manager.save(walletAddress);

      // Log wallet creation
      await this.logBalanceChange(
        queryRunner,
        savedWallet.id,
        '0.00000000',
        '0.00000000',
        '0.00000000',
        ChangeType.DEPOSIT,
        null,
        `wallet-creation-${savedWallet.id}`,
        'Wallet created',
      );

      await queryRunner.commitTransaction();

      this.logger.log(`Wallet created for user ${user_id}, currency ${currency}`);

      return this.mapWalletToResponse(savedWallet);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create wallet: ${error.message}`);
      throw new BadRequestException('Failed to create wallet');
    } finally {
      await queryRunner.release();
    }
  }

  async getWalletByUserId(userId: number, currency?: Currency): Promise<WalletResponseDto[]> {
    const where: any = { user_id: userId };
    if (currency) {
      where.currency = currency;
    }

    const wallets = await this.walletRepository.find({
      where,
      order: { created_at: 'ASC' },
    });

    if (wallets.length === 0) {
      throw new NotFoundException('No wallets found for user');
    }

    return wallets.map(wallet => this.mapWalletToResponse(wallet));
  }

  async updateBalance(updateBalanceDto: UpdateBalanceDto): Promise<WalletResponseDto> {
    const {
      user_id,
      amount,
      change_type,
      transaction_id,
      reference_id,
      description,
      metadata,
    } = updateBalanceDto;

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new BadRequestException('Invalid amount');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get wallet with lock for update
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { user_id, currency: Currency.USDT }, // Default to USDT
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      if (wallet.status === WalletStatus.FROZEN) {
        throw new BadRequestException('Wallet is frozen');
      }

      const oldBalance = parseFloat(wallet.balance);
      let newBalance: number;

      // Calculate new balance based on change type
      switch (change_type) {
        case ChangeType.DEPOSIT:
        case ChangeType.TRANSFER_IN:
        case ChangeType.MINT:
        case ChangeType.UNFREEZE:
          newBalance = oldBalance + amountNum;
          break;
        case ChangeType.WITHDRAWAL:
        case ChangeType.TRANSFER_OUT:
        case ChangeType.BURN:
        case ChangeType.FEE:
        case ChangeType.FREEZE:
          if (oldBalance < amountNum) {
            throw new BadRequestException('Insufficient balance');
          }
          newBalance = oldBalance - amountNum;
          break;
        case ChangeType.ADJUSTMENT:
          newBalance = amountNum; // Direct balance set
          break;
        default:
          throw new BadRequestException('Invalid change type');
      }

      // Update wallet balance
      wallet.balance = newBalance.toFixed(8);
      wallet.last_transaction_at = new Date();

      // Handle frozen balance for freeze/unfreeze operations
      if (change_type === ChangeType.FREEZE) {
        const currentFrozen = parseFloat(wallet.frozen_balance);
        wallet.frozen_balance = (currentFrozen + amountNum).toFixed(8);
      } else if (change_type === ChangeType.UNFREEZE) {
        const currentFrozen = parseFloat(wallet.frozen_balance);
        if (currentFrozen < amountNum) {
          throw new BadRequestException('Insufficient frozen balance');
        }
        wallet.frozen_balance = (currentFrozen - amountNum).toFixed(8);
      }

      const updatedWallet = await queryRunner.manager.save(wallet);

      // Log balance change
      await this.logBalanceChange(
        queryRunner,
        wallet.id,
        oldBalance.toFixed(8),
        newBalance.toFixed(8),
        amount,
        change_type,
        transaction_id,
        reference_id,
        description,
        metadata,
      );

      await queryRunner.commitTransaction();

      this.logger.log(
        `Balance updated for user ${user_id}: ${oldBalance} -> ${newBalance} (${change_type})`,
      );

      return this.mapWalletToResponse(updatedWallet);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to update balance: ${error.message}`);
      throw new BadRequestException('Failed to update balance');
    } finally {
      await queryRunner.release();
    }
  }

  async freezeWallet(freezeWalletDto: FreezeWalletDto): Promise<WalletResponseDto> {
    const { user_id, reason, amount } = freezeWalletDto;

    const wallet = await this.walletRepository.findOne({
      where: { user_id, currency: Currency.USDT },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (wallet.status === WalletStatus.FROZEN) {
      throw new BadRequestException('Wallet is already frozen');
    }

    // If amount is specified, freeze only that amount
    if (amount) {
      await this.updateBalance({
        user_id,
        amount,
        change_type: ChangeType.FREEZE,
        description: `Partial freeze: ${reason}`,
      });
    } else {
      // Freeze entire wallet
      wallet.status = WalletStatus.FROZEN;
      wallet.freeze_reason = reason;
      wallet.frozen_at = new Date();
      await this.walletRepository.save(wallet);

      this.logger.log(`Wallet frozen for user ${user_id}: ${reason}`);
    }

    return this.mapWalletToResponse(wallet);
  }

  async unfreezeWallet(userId: number, amount?: string): Promise<WalletResponseDto> {
    const wallet = await this.walletRepository.findOne({
      where: { user_id: userId, currency: Currency.USDT },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (amount) {
      // Unfreeze specific amount
      await this.updateBalance({
        user_id: userId,
        amount,
        change_type: ChangeType.UNFREEZE,
        description: 'Partial unfreeze',
      });
    } else {
      // Unfreeze entire wallet
      wallet.status = WalletStatus.ACTIVE;
      wallet.freeze_reason = null;
      wallet.frozen_at = null;
      await this.walletRepository.save(wallet);

      this.logger.log(`Wallet unfrozen for user ${userId}`);
    }

    return this.mapWalletToResponse(wallet);
  }

  async generateAddress(
    userId: number,
    generateAddressDto: GenerateAddressDto,
  ): Promise<WalletAddressResponseDto> {
    const { currency, address_type = AddressType.DEPOSIT, label } = generateAddressDto;

    const wallet = await this.walletRepository.findOne({
      where: { user_id: userId, currency },
    });

    if (!wallet) {
      throw new NotFoundException(`${currency} wallet not found for user`);
    }

    // Generate new address
    const newAddress = this.generateWalletAddress(currency);

    // Ensure address is unique
    const existingAddress = await this.walletAddressRepository.findOne({
      where: { address: newAddress },
    });

    if (existingAddress) {
      // Retry with different address (rare case)
      return this.generateAddress(userId, generateAddressDto);
    }

    const walletAddress = this.walletAddressRepository.create({
      wallet_id: wallet.id,
      currency,
      address: newAddress,
      address_type,
      is_primary: false,
      is_active: true,
      label: label || `${address_type} Address`,
    });

    const savedAddress = await this.walletAddressRepository.save(walletAddress);

    this.logger.log(`New ${currency} address generated for user ${userId}`);

    return this.mapAddressToResponse(savedAddress);
  }

  async getBalanceHistory(
    userId: number,
    queryDto: BalanceQueryDto,
  ): Promise<{ data: BalanceHistoryResponseDto[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, change_type } = queryDto;

    const wallet = await this.walletRepository.findOne({
      where: { user_id: userId, currency: Currency.USDT },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const queryBuilder = this.balanceHistoryRepository
      .createQueryBuilder('history')
      .where('history.wallet_id = :walletId', { walletId: wallet.id });

    if (change_type) {
      queryBuilder.andWhere('history.change_type = :changeType', { changeType: change_type });
    }

    const [data, total] = await queryBuilder
      .orderBy('history.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: data.map(history => this.mapHistoryToResponse(history)),
      total,
      page,
      limit,
    };
  }

  async getWalletAddresses(userId: number): Promise<WalletAddressResponseDto[]> {
    const wallets = await this.walletRepository.find({
      where: { user_id: userId },
      relations: ['addresses'],
    });

    if (wallets.length === 0) {
      throw new NotFoundException('No wallets found for user');
    }

    const addresses = wallets.flatMap(wallet => wallet.addresses);
    return addresses.map(address => this.mapAddressToResponse(address));
  }

  private generateWalletAddress(currency: Currency): string {
    const timestamp = Date.now().toString();
    const random = randomBytes(16).toString('hex');
    const combined = `${currency}-${timestamp}-${random}`;
    const hash = createHash('sha256').update(combined).digest('hex');

    // Format address based on currency (simulated)
    switch (currency) {
      case Currency.USDT:
      case Currency.USDC:
        return `0x${hash.substring(0, 40)}`; // ETH-like address
      case Currency.BTC:
        return `bc1${hash.substring(0, 39)}`; // Bech32-like address
      case Currency.ETH:
        return `0x${hash.substring(0, 40)}`; // ETH address
      default:
        return `addr_${hash.substring(0, 32)}`;
    }
  }

  private async logBalanceChange(
    queryRunner: QueryRunner,
    walletId: number,
    oldBalance: string,
    newBalance: string,
    amount: string,
    changeType: ChangeType,
    transactionId?: string,
    referenceId?: string,
    description?: string,
    metadata?: any,
  ): Promise<void> {
    const balanceHistory = queryRunner.manager.create(BalanceHistory, {
      wallet_id: walletId,
      old_balance: oldBalance,
      new_balance: newBalance,
      amount,
      change_type: changeType,
      transaction_id: transactionId,
      reference_id: referenceId,
      description,
      metadata,
    });

    await queryRunner.manager.save(balanceHistory);
  }

  private mapWalletToResponse(wallet: Wallet): WalletResponseDto {
    return {
      id: wallet.id,
      user_id: wallet.user_id,
      address: wallet.address,
      balance: wallet.balance,
      frozen_balance: wallet.frozen_balance,
      status: wallet.status,
      currency: wallet.currency,
      created_at: wallet.created_at,
      last_transaction_at: wallet.last_transaction_at,
    };
  }

  private mapHistoryToResponse(history: BalanceHistory): BalanceHistoryResponseDto {
    return {
      id: history.id,
      old_balance: history.old_balance,
      new_balance: history.new_balance,
      amount: history.amount,
      change_type: history.change_type,
      transaction_id: history.transaction_id,
      description: history.description,
      created_at: history.created_at,
    };
  }

  private mapAddressToResponse(address: WalletAddress): WalletAddressResponseDto {
    return {
      id: address.id,
      currency: address.currency,
      address: address.address,
      address_type: address.address_type,
      is_primary: address.is_primary,
      is_active: address.is_active,
      label: address.label,
      created_at: address.created_at,
    };
  }
}
