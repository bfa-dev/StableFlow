import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TransactionLog, TransactionLogStatus } from '../entities/transaction-log.entity';
import { WalletClientService } from './wallet-client.service';
import { TransactionClientService } from './transaction-client.service';
import {
  TransactionMessage,
  WalletUpdateRequest,
  TransactionResult,
  ProcessingContext,
} from '../interfaces/transaction.interface';

@Injectable()
export class TransactionProcessorService {
  private readonly logger = new Logger(TransactionProcessorService.name);

  constructor(
    @InjectRepository(TransactionLog)
    private transactionLogRepository: Repository<TransactionLog>,
    private walletClientService: WalletClientService,
    private transactionClientService: TransactionClientService,
    private dataSource: DataSource,
  ) {}

  async processTransaction(
    transaction: TransactionMessage,
    correlationId: string,
  ): Promise<TransactionResult> {
    const context: ProcessingContext = {
      transaction,
      retry_count: 0,
      max_retries: 3,
      correlation_id: correlationId,
    };

    this.logger.log(
      `Processing transaction ${transaction.id} (type: ${transaction.type}) - Correlation: ${correlationId}`
    );

    // Check if transaction was already processed (idempotency)
    const existingLog = await this.transactionLogRepository.findOne({
      where: { transaction_id: transaction.id },
    });

    if (existingLog) {
      if (existingLog.status === TransactionLogStatus.COMPLETED) {
        this.logger.log(`Transaction ${transaction.id} already completed`);
        return { success: true, transaction_id: transaction.id };
      }
      
      if (existingLog.status === TransactionLogStatus.DEAD_LETTER) {
        this.logger.warn(`Transaction ${transaction.id} is in dead letter queue`);
        return { success: false, transaction_id: transaction.id, error: 'Transaction in dead letter queue' };
      }

      // Update retry count for existing transaction
      context.retry_count = existingLog.retry_count;
      context.max_retries = existingLog.max_retries;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create or update transaction log
      let transactionLog = existingLog;
      if (!transactionLog) {
        transactionLog = queryRunner.manager.create(TransactionLog, {
          transaction_id: transaction.id,
          status: TransactionLogStatus.PROCESSING,
          retry_count: 0,
          max_retries: 3,
          transaction_data: transaction,
        });
      } else {
        transactionLog.status = TransactionLogStatus.PROCESSING;
        transactionLog.retry_count += 1;
        transactionLog.updated_at = new Date();
      }

      await queryRunner.manager.save(transactionLog);

      // Update transaction status to PROCESSING
      await this.transactionClientService.updateTransactionStatus(
        transaction.id,
        'PROCESSING'
      );

      // Process based on transaction type
      let result: TransactionResult;
      switch (transaction.type) {
        case 'MINT':
          result = await this.processMint(transaction, context);
          break;
        case 'BURN':
          result = await this.processBurn(transaction, context);
          break;
        case 'TRANSFER':
          result = await this.processTransfer(transaction, context);
          break;
        case 'BULK_TRANSFER':
          result = await this.processBulkTransfer(transaction, context);
          break;
        default:
          throw new Error(`Unsupported transaction type: ${transaction.type}`);
      }

      if (result.success) {
        // Mark as completed
        transactionLog.status = TransactionLogStatus.COMPLETED;
        transactionLog.processed_at = new Date();
        transactionLog.wallet_updates = result.wallet_updates;
        transactionLog.error_message = null;

        await queryRunner.manager.save(transactionLog);
        await queryRunner.commitTransaction();

        // Update transaction status to COMPLETED
        await this.transactionClientService.updateTransactionStatus(
          transaction.id,
          'COMPLETED'
        );

        this.logger.log(`Transaction ${transaction.id} completed successfully`);
        return result;
      } else {
        throw new Error(result.error || 'Transaction processing failed');
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      
      this.logger.error(
        `Transaction ${transaction.id} failed: ${error.message} (retry: ${context.retry_count}/${context.max_retries})`
      );

      // Handle retry or dead letter
      await this.handleTransactionFailure(transaction, error.message, context);
      
      return {
        success: false,
        transaction_id: transaction.id,
        error: error.message,
      };
    } finally {
      await queryRunner.release();
    }
  }

  private async processMint(
    transaction: TransactionMessage,
    context: ProcessingContext,
  ): Promise<TransactionResult> {
    this.logger.log(`Processing MINT: ${transaction.amount} to user ${transaction.to_user_id}`);

    if (!transaction.to_user_id) {
      throw new Error('MINT transaction missing to_user_id');
    }

    // Validate target wallet exists
    const walletExists = await this.walletClientService.validateWalletExists(transaction.to_user_id);
    if (!walletExists) {
      throw new Error(`Target wallet not found for user ${transaction.to_user_id}`);
    }

    // Credit the target wallet
    const walletUpdate: WalletUpdateRequest = {
      user_id: transaction.to_user_id,
      amount: transaction.amount,
      operation: 'CREDIT',
      transaction_id: transaction.id,
      description: `Token mint: ${transaction.description || 'System mint'}`,
    };

    const success = await this.walletClientService.updateBalance(walletUpdate);
    if (!success) {
      throw new Error('Failed to update wallet balance for MINT');
    }

    return {
      success: true,
      transaction_id: transaction.id,
      wallet_updates: [walletUpdate],
    };
  }

  private async processBurn(
    transaction: TransactionMessage,
    context: ProcessingContext,
  ): Promise<TransactionResult> {
    this.logger.log(`Processing BURN: ${transaction.amount} from user ${transaction.from_user_id}`);

    if (!transaction.from_user_id) {
      throw new Error('BURN transaction missing from_user_id');
    }

    // Validate source wallet and balance
    const walletBalance = await this.walletClientService.getBalance(transaction.from_user_id);
    if (!walletBalance) {
      throw new Error(`Source wallet not found for user ${transaction.from_user_id}`);
    }

    const availableBalance = parseFloat(walletBalance.balance) - parseFloat(walletBalance.frozen_balance);
    const burnAmount = parseFloat(transaction.amount);

    if (availableBalance < burnAmount) {
      throw new Error(`Insufficient balance for BURN: available ${availableBalance}, required ${burnAmount}`);
    }

    // Debit the source wallet
    const walletUpdate: WalletUpdateRequest = {
      user_id: transaction.from_user_id,
      amount: transaction.amount,
      operation: 'DEBIT',
      transaction_id: transaction.id,
      description: `Token burn: ${transaction.description || 'Token destruction'}`,
    };

    const success = await this.walletClientService.updateBalance(walletUpdate);
    if (!success) {
      throw new Error('Failed to update wallet balance for BURN');
    }

    return {
      success: true,
      transaction_id: transaction.id,
      wallet_updates: [walletUpdate],
    };
  }

  private async processTransfer(
    transaction: TransactionMessage,
    context: ProcessingContext,
  ): Promise<TransactionResult> {
    this.logger.log(
      `Processing TRANSFER: ${transaction.amount} from user ${transaction.from_user_id} to user ${transaction.to_user_id}`
    );

    if (!transaction.from_user_id || !transaction.to_user_id) {
      throw new Error('TRANSFER transaction missing from_user_id or to_user_id');
    }

    // Validate both wallets exist
    const [sourceWallet, targetWallet] = await Promise.all([
      this.walletClientService.getBalance(transaction.from_user_id),
      this.walletClientService.validateWalletExists(transaction.to_user_id),
    ]);

    if (!sourceWallet) {
      throw new Error(`Source wallet not found for user ${transaction.from_user_id}`);
    }
    if (!targetWallet) {
      throw new Error(`Target wallet not found for user ${transaction.to_user_id}`);
    }

    // Calculate total debit (amount + fee)
    const transferAmount = parseFloat(transaction.amount);
    const feeAmount = parseFloat(transaction.fee);
    const totalDebit = transferAmount + feeAmount;

    const availableBalance = parseFloat(sourceWallet.balance) - parseFloat(sourceWallet.frozen_balance);
    if (availableBalance < totalDebit) {
      throw new Error(
        `Insufficient balance for TRANSFER: available ${availableBalance}, required ${totalDebit} (${transferAmount} + ${feeAmount} fee)`
      );
    }

    // Perform wallet updates
    const walletUpdates: WalletUpdateRequest[] = [
      {
        user_id: transaction.from_user_id,
        amount: totalDebit.toFixed(8),
        operation: 'DEBIT',
        transaction_id: transaction.id,
        description: `Transfer sent: ${transaction.amount} + ${transaction.fee} fee`,
      },
      {
        user_id: transaction.to_user_id,
        amount: transaction.amount,
        operation: 'CREDIT',
        transaction_id: transaction.id,
        description: `Transfer received: ${transaction.description || 'Token transfer'}`,
      },
    ];

    // Execute both updates
    for (const update of walletUpdates) {
      const success = await this.walletClientService.updateBalance(update);
      if (!success) {
        throw new Error(`Failed to update wallet balance for user ${update.user_id}`);
      }
    }

    return {
      success: true,
      transaction_id: transaction.id,
      wallet_updates: walletUpdates,
    };
  }

  private async processBulkTransfer(
    transaction: TransactionMessage,
    context: ProcessingContext,
  ): Promise<TransactionResult> {
    this.logger.log(`Processing BULK_TRANSFER: ${transaction.amount} from user ${transaction.from_user_id} to user ${transaction.to_user_id}`);

    // For bulk transfers, we process each individual transfer
    // This is a simplified version - in reality, you'd have multiple target users
    return this.processTransfer(transaction, context);
  }

  private async handleTransactionFailure(
    transaction: TransactionMessage,
    errorMessage: string,
    context: ProcessingContext,
  ): Promise<void> {
    const { retry_count, max_retries } = context;

    if (retry_count >= max_retries) {
      // Move to dead letter queue
      await this.moveToDeadLetterQueue(transaction, errorMessage);
      
      // Update transaction status to FAILED
      await this.transactionClientService.updateTransactionStatus(
        transaction.id,
        'FAILED',
        `Max retries exceeded: ${errorMessage}`
      );
    } else {
      // Schedule retry
      const nextRetryAt = new Date(Date.now() + Math.pow(2, retry_count) * 30000); // Exponential backoff: 30s, 60s, 120s
      
      await this.transactionLogRepository.update(
        { transaction_id: transaction.id },
        {
          status: TransactionLogStatus.RETRYING,
          error_message: errorMessage,
          next_retry_at: nextRetryAt,
          retry_count: retry_count + 1,
        }
      );

      this.logger.warn(
        `Transaction ${transaction.id} scheduled for retry ${retry_count + 1}/${max_retries} at ${nextRetryAt}`
      );
    }
  }

  private async moveToDeadLetterQueue(
    transaction: TransactionMessage,
    errorMessage: string,
  ): Promise<void> {
    await this.transactionLogRepository.update(
      { transaction_id: transaction.id },
      {
        status: TransactionLogStatus.DEAD_LETTER,
        error_message: `DEAD_LETTER: ${errorMessage}`,
        processed_at: new Date(),
      }
    );

    this.logger.error(
      `Transaction ${transaction.id} moved to dead letter queue: ${errorMessage}`
    );

    // In a real implementation, you might also:
    // 1. Send to a dead letter Kafka topic
    // 2. Alert administrators
    // 3. Create incident tickets
  }

  async getTransactionLog(transactionId: string): Promise<TransactionLog | null> {
    return this.transactionLogRepository.findOne({
      where: { transaction_id: transactionId },
    });
  }

  async getFailedTransactions(): Promise<TransactionLog[]> {
    return this.transactionLogRepository.find({
      where: { status: TransactionLogStatus.FAILED },
      order: { created_at: 'DESC' },
      take: 100,
    });
  }

  async getRetryableTransactions(): Promise<TransactionLog[]> {
    return this.transactionLogRepository
      .createQueryBuilder('log')
      .where('log.status = :status', { status: TransactionLogStatus.RETRYING })
      .andWhere('log.next_retry_at <= :now', { now: new Date() })
      .orderBy('log.next_retry_at', 'ASC')
      .take(50)
      .getMany();
  }
} 