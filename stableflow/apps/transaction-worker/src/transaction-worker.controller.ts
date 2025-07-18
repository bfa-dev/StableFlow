import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TransactionWorkerService } from './transaction-worker.service';
import { TransactionMessage } from './interfaces/transaction.interface';

@ApiTags('Transaction Worker')
@Controller('worker')
export class TransactionWorkerController {
  constructor(private readonly transactionWorkerService: TransactionWorkerService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Worker is healthy' })
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get worker status and statistics' })
  @ApiResponse({ status: 200, description: 'Worker status retrieved successfully' })
  async getWorkerStatus(): Promise<{
    kafkaConsumer: boolean;
    processingStats: any;
  }> {
    return this.transactionWorkerService.getWorkerStatus();
  }

  @Post('process')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Manually trigger transaction processing (for testing)' })
  @ApiResponse({ status: 202, description: 'Transaction queued for processing' })
  @ApiResponse({ status: 400, description: 'Invalid transaction data' })
  async processTransaction(
    @Body(ValidationPipe) transaction: TransactionMessage,
  ): Promise<{ message: string; transaction_id: string }> {
    await this.transactionWorkerService.processTransaction(transaction);
    
    return {
      message: 'Transaction queued for processing',
      transaction_id: transaction.id,
    };
  }

  @Get('logs/:transactionId')
  @ApiOperation({ summary: 'Get transaction processing log' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction log retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Transaction log not found' })
  async getTransactionLog(
    @Param('transactionId') transactionId: string,
  ): Promise<any> {
    const log = await this.transactionWorkerService.getTransactionLog(transactionId);
    
    if (!log) {
      return { message: 'Transaction log not found' };
    }
    
    return log;
  }

  @Get('failed')
  @ApiOperation({ summary: 'Get failed transactions' })
  @ApiResponse({ status: 200, description: 'Failed transactions retrieved successfully' })
  async getFailedTransactions(): Promise<any[]> {
    return this.transactionWorkerService.getFailedTransactions();
  }

  @Get('retryable')
  @ApiOperation({ summary: 'Get transactions ready for retry' })
  @ApiResponse({ status: 200, description: 'Retryable transactions retrieved successfully' })
  async getRetryableTransactions(): Promise<any[]> {
    return this.transactionWorkerService.getRetryableTransactions();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get processing statistics' })
  @ApiResponse({ status: 200, description: 'Processing statistics retrieved successfully' })
  async getProcessingStats(): Promise<{
    worker_status: string;
    queue_statistics: any;
    error_rates: any;
  }> {
    const status = await this.transactionWorkerService.getWorkerStatus();
    const [failedTransactions, retryableTransactions] = await Promise.all([
      this.transactionWorkerService.getFailedTransactions(),
      this.transactionWorkerService.getRetryableTransactions(),
    ]);

    return {
      worker_status: status.kafkaConsumer ? 'HEALTHY' : 'UNHEALTHY',
      queue_statistics: {
        failed_transactions: failedTransactions.length,
        retryable_transactions: retryableTransactions.length,
        processing_stats: status.processingStats,
      },
      error_rates: {
        total_failed: failedTransactions.length,
        pending_retries: retryableTransactions.length,
      },
    };
  }
}
