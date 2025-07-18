import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransactionProcessorService } from './transaction-processor.service';
import { TransactionMessage } from '../interfaces/transaction.interface';
import { v4 as uuidv4 } from 'uuid';

// Mock Kafka implementation for demonstration
// In production, you would use a real Kafka client like kafkajs
interface KafkaMessage {
  key: string;
  value: string;
  offset: string;
  partition: number;
  timestamp: string;
}

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private isRunning = false;
  private processingInterval: NodeJS.Timeout;

  constructor(
    private transactionProcessorService: TransactionProcessorService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Kafka Consumer...');
    await this.startConsumer();
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Kafka Consumer...');
    await this.stopConsumer();
  }

  private async startConsumer() {
    try {
      this.isRunning = true;
      
      // In a real implementation, you would:
      // 1. Create Kafka consumer instance
      // 2. Subscribe to topics
      // 3. Set up error handlers
      // 4. Configure consumer groups

      this.logger.log('Kafka Consumer started successfully');
      this.logger.log('Subscribed to topics: transaction-requests, transaction-retries');
      
      // Start the mock message processing loop
      this.startMessageProcessing();

      // Start retry processor
      this.startRetryProcessor();

    } catch (error) {
      this.logger.error(`Failed to start Kafka consumer: ${error.message}`);
      throw error;
    }
  }

  private async stopConsumer() {
    this.isRunning = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.logger.log('Kafka Consumer stopped');
  }

  private startMessageProcessing() {
    // Mock message processing - in real implementation, this would be event-driven
    this.processingInterval = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        // Simulate checking for new messages
        // In reality, Kafka would push messages to your consumer
        await this.checkForRetriableTransactions();
      } catch (error) {
        this.logger.error(`Error in message processing loop: ${error.message}`);
      }
    }, 10000); // Check every 10 seconds
  }

  private startRetryProcessor() {
    // Process retryable transactions every 30 seconds
    setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        await this.processRetryableTransactions();
      } catch (error) {
        this.logger.error(`Error in retry processor: ${error.message}`);
      }
    }, 30000);
  }

  async processMessage(kafkaMessage: KafkaMessage): Promise<void> {
    const correlationId = uuidv4();
    
    try {
      this.logger.log(
        `Processing message (offset: ${kafkaMessage.offset}, partition: ${kafkaMessage.partition}) - Correlation: ${correlationId}`
      );

      // Parse the transaction message
      const transaction: TransactionMessage = JSON.parse(kafkaMessage.value);
      
      // Validate message structure
      this.validateTransactionMessage(transaction);

      // Process the transaction
      const result = await this.transactionProcessorService.processTransaction(
        transaction,
        correlationId
      );

      if (result.success) {
        this.logger.log(`Transaction ${transaction.id} processed successfully`);
        
        // In a real Kafka implementation, you would commit the offset here
        await this.commitOffset(kafkaMessage);
      } else {
        this.logger.warn(`Transaction ${transaction.id} processing failed: ${result.error}`);
        
        // Don't commit offset on failure to allow for retry
        // The message will be reprocessed by retry mechanism
      }

    } catch (error) {
      this.logger.error(
        `Failed to process message (correlation: ${correlationId}): ${error.message}`
      );
      
      // Handle message processing failure
      await this.handleMessageFailure(kafkaMessage, error, correlationId);
    }
  }

  private validateTransactionMessage(transaction: TransactionMessage): void {
    if (!transaction.id) {
      throw new Error('Transaction message missing required field: id');
    }
    if (!transaction.type) {
      throw new Error('Transaction message missing required field: type');
    }
    if (!transaction.amount) {
      throw new Error('Transaction message missing required field: amount');
    }

    // Validate transaction type
    const validTypes = ['MINT', 'BURN', 'TRANSFER', 'BULK_TRANSFER'];
    if (!validTypes.includes(transaction.type)) {
      throw new Error(`Invalid transaction type: ${transaction.type}`);
    }

    // Validate user IDs based on transaction type
    if (transaction.type === 'MINT' && !transaction.to_user_id) {
      throw new Error('MINT transaction missing to_user_id');
    }
    if (transaction.type === 'BURN' && !transaction.from_user_id) {
      throw new Error('BURN transaction missing from_user_id');
    }
    if (transaction.type === 'TRANSFER' && (!transaction.from_user_id || !transaction.to_user_id)) {
      throw new Error('TRANSFER transaction missing from_user_id or to_user_id');
    }

    // Validate amount is numeric and positive
    const amount = parseFloat(transaction.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error(`Invalid transaction amount: ${transaction.amount}`);
    }
  }

  private async commitOffset(kafkaMessage: KafkaMessage): Promise<void> {
    // In a real Kafka implementation, you would commit the message offset
    this.logger.debug(`Committing offset ${kafkaMessage.offset} for partition ${kafkaMessage.partition}`);
  }

  private async handleMessageFailure(
    kafkaMessage: KafkaMessage,
    error: Error,
    correlationId: string,
  ): Promise<void> {
    this.logger.error(
      `Message processing failed (correlation: ${correlationId}): ${error.message}`
    );

    // In a real implementation, you might:
    // 1. Send to dead letter topic
    // 2. Implement exponential backoff
    // 3. Alert monitoring systems
    // 4. Log to error tracking service
  }

  private async checkForRetriableTransactions(): Promise<void> {
    // This method would normally not be needed with real Kafka
    // It's here to simulate periodic checking for retryable transactions
  }

  private async processRetryableTransactions(): Promise<void> {
    try {
      const retryableTransactions = await this.transactionProcessorService.getRetryableTransactions();
      
      if (retryableTransactions.length > 0) {
        this.logger.log(`Found ${retryableTransactions.length} transactions ready for retry`);
        
        for (const transactionLog of retryableTransactions) {
          const correlationId = uuidv4();
          
          try {
            const transaction: TransactionMessage = transactionLog.transaction_data;
            
            this.logger.log(`Retrying transaction ${transaction.id} (attempt ${transactionLog.retry_count + 1})`);
            
            await this.transactionProcessorService.processTransaction(
              transaction,
              correlationId
            );
            
          } catch (error) {
            this.logger.error(`Retry failed for transaction ${transactionLog.transaction_id}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error processing retryable transactions: ${error.message}`);
    }
  }

  // Simulate receiving a Kafka message (for testing purposes)
  async simulateMessage(transaction: TransactionMessage): Promise<void> {
    const mockMessage: KafkaMessage = {
      key: transaction.id,
      value: JSON.stringify(transaction),
      offset: Date.now().toString(),
      partition: 0,
      timestamp: new Date().toISOString(),
    };

    await this.processMessage(mockMessage);
  }

  // Health check method
  isHealthy(): boolean {
    return this.isRunning;
  }

  // Statistics
  async getConsumerStats(): Promise<{
    isRunning: boolean;
    retryableTransactions: number;
    failedTransactions: number;
  }> {
    const [retryableTransactions, failedTransactions] = await Promise.all([
      this.transactionProcessorService.getRetryableTransactions(),
      this.transactionProcessorService.getFailedTransactions(),
    ]);

    return {
      isRunning: this.isRunning,
      retryableTransactions: retryableTransactions.length,
      failedTransactions: failedTransactions.length,
    };
  }
} 