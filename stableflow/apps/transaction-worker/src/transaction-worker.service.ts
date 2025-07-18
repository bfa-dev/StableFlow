import { Injectable, Logger } from '@nestjs/common';
import { KafkaConsumerService } from './services/kafka-consumer.service';
import { TransactionProcessorService } from './services/transaction-processor.service';
import { TransactionMessage } from './interfaces/transaction.interface';

@Injectable()
export class TransactionWorkerService {
  private readonly logger = new Logger(TransactionWorkerService.name);

  constructor(
    private kafkaConsumerService: KafkaConsumerService,
    private transactionProcessorService: TransactionProcessorService,
  ) {}

  async processTransaction(transaction: TransactionMessage): Promise<void> {
    this.logger.log(`Orchestrating processing of transaction ${transaction.id}`);
    
    // Simulate receiving a transaction from Kafka
    await this.kafkaConsumerService.simulateMessage(transaction);
  }

  async getWorkerStatus(): Promise<{
    kafkaConsumer: boolean;
    processingStats: any;
  }> {
    const [kafkaHealth, processingStats] = await Promise.all([
      this.kafkaConsumerService.isHealthy(),
      this.kafkaConsumerService.getConsumerStats(),
    ]);

    return {
      kafkaConsumer: kafkaHealth,
      processingStats,
    };
  }

  async getTransactionLog(transactionId: string) {
    return this.transactionProcessorService.getTransactionLog(transactionId);
  }

  async getFailedTransactions() {
    return this.transactionProcessorService.getFailedTransactions();
  }

  async getRetryableTransactions() {
    return this.transactionProcessorService.getRetryableTransactions();
  }
}
