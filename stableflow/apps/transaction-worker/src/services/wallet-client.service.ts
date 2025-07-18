import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { WalletUpdateRequest } from '../interfaces/transaction.interface';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WalletClientService {
  private readonly logger = new Logger(WalletClientService.name);
  private readonly walletServiceUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.walletServiceUrl = this.configService.get('WALLET_SERVICE_URL', 'http://localhost:3002');
  }

  async updateBalance(updateRequest: WalletUpdateRequest): Promise<boolean> {
    try {
      const { user_id, amount, operation, transaction_id, description } = updateRequest;
      
      this.logger.log(`Updating balance for user ${user_id}: ${operation} ${amount} (txn: ${transaction_id})`);

      const response = await firstValueFrom(
        this.httpService.post(`${this.walletServiceUrl}/api/v1/internal/wallets/update-balance`, {
          user_id,
          amount,
          operation,
          transaction_id,
          description,
        })
      );

      if (response.status === 200) {
        this.logger.log(`Balance updated successfully for user ${user_id}`);
        return true;
      } else {
        this.logger.error(`Failed to update balance: ${response.status} ${response.statusText}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error updating balance for user ${updateRequest.user_id}: ${error.message}`);
      return false;
    }
  }

  async getBalance(userId: number): Promise<{ balance: string; frozen_balance: string } | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.walletServiceUrl}/api/v1/internal/wallets/balance/${userId}`)
      );

      if (response.status === 200 && response.data.length > 0) {
        const wallet = response.data[0];
        return {
          balance: wallet.balance,
          frozen_balance: wallet.frozen_balance,
        };
      }
      return null;
    } catch (error) {
      this.logger.error(`Error getting balance for user ${userId}: ${error.message}`);
      return null;
    }
  }

  async validateWalletExists(userId: number): Promise<boolean> {
    try {
      const balance = await this.getBalance(userId);
      return balance !== null;
    } catch (error) {
      this.logger.error(`Error validating wallet for user ${userId}: ${error.message}`);
      return false;
    }
  }

  async freezeWallet(userId: number, reason: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.walletServiceUrl}/api/v1/internal/wallets/freeze`, {
          user_id: userId,
          reason,
        })
      );

      return response.status === 200;
    } catch (error) {
      this.logger.error(`Error freezing wallet for user ${userId}: ${error.message}`);
      return false;
    }
  }
} 