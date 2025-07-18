import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TransactionClientService {
  private readonly logger = new Logger(TransactionClientService.name);
  private readonly transactionServiceUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.transactionServiceUrl = this.configService.get('TRANSACTION_SERVICE_URL', 'http://localhost:3003');
  }

  async updateTransactionStatus(
    transactionId: string, 
    status: 'PROCESSING' | 'COMPLETED' | 'FAILED',
    failureReason?: string
  ): Promise<boolean> {
    try {
      this.logger.log(`Updating transaction ${transactionId} status to ${status}`);

      const payload: any = {
        transaction_id: transactionId,
        status,
      };

      if (failureReason) {
        payload.failure_reason = failureReason;
      }

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.transactionServiceUrl}/api/v1/transactions/internal/process-transaction`,
          payload
        )
      );

      if (response.status === 200) {
        this.logger.log(`Transaction ${transactionId} status updated to ${status}`);
        return true;
      } else {
        this.logger.error(`Failed to update transaction status: ${response.status} ${response.statusText}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error updating transaction ${transactionId} status: ${error.message}`);
      return false;
    }
  }

  async getTransaction(transactionId: string): Promise<any | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.transactionServiceUrl}/api/v1/transactions/internal/transaction/${transactionId}`)
      );

      if (response.status === 200) {
        return response.data;
      }
      return null;
    } catch (error) {
      this.logger.error(`Error getting transaction ${transactionId}: ${error.message}`);
      return null;
    }
  }
} 