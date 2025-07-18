import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TransactionLog, TransactionLogDocument } from '../entities/transaction-log.entity';
import { LogTransactionDto } from '../dto/log-transaction.dto';
import { QueryTransactionLogsDto } from '../dto/query-logs.dto';

@Injectable()
export class TransactionLoggingService {
  private readonly logger = new Logger(TransactionLoggingService.name);

  constructor(
    @InjectModel(TransactionLog.name)
    private transactionLogModel: Model<TransactionLogDocument>,
  ) {}

  async logTransaction(logTransactionDto: LogTransactionDto): Promise<TransactionLog> {
    try {
      const transactionLog = new this.transactionLogModel({
        ...logTransactionDto,
        timestamp: new Date(),
      });

      const savedLog = await transactionLog.save();
      
      this.logger.log(`Transaction logged: ${logTransactionDto.transaction_id} - Type: ${logTransactionDto.type} - Amount: ${logTransactionDto.amount} ${logTransactionDto.currency}`);
      
      // Trigger fraud detection analysis
      await this.analyzeFraudRisk(savedLog);
      
      return savedLog;
    } catch (error) {
      this.logger.error(`Failed to log transaction ${logTransactionDto.transaction_id}:`, error);
      throw error;
    }
  }

  async updateTransactionStatus(
    transactionId: string, 
    status: string, 
    processedAt?: Date,
    errorMessage?: string
  ): Promise<TransactionLog> {
    try {
      const updateData: any = { 
        status,
        processed_at: processedAt || new Date()
      };
      
      if (errorMessage) {
        updateData.error_message = errorMessage;
      }

      const updatedLog = await this.transactionLogModel.findOneAndUpdate(
        { transaction_id: transactionId },
        updateData,
        { new: true }
      );

      if (!updatedLog) {
        throw new Error(`Transaction log not found: ${transactionId}`);
      }

      this.logger.log(`Transaction status updated: ${transactionId} -> ${status}`);
      return updatedLog;
    } catch (error) {
      this.logger.error(`Failed to update transaction status ${transactionId}:`, error);
      throw error;
    }
  }

  async queryTransactionLogs(query: QueryTransactionLogsDto): Promise<{
    logs: TransactionLog[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const filter: any = {};

      // Apply filters
      if (query.user_id) filter.user_id = query.user_id;
      if (query.transaction_id) filter.transaction_id = query.transaction_id;
      if (query.type) filter.type = query.type;
      if (query.status) filter.status = query.status;
      if (query.currency) filter.currency = query.currency;
      if (query.is_suspicious !== undefined) filter.is_suspicious = query.is_suspicious;
      if (query.requires_review !== undefined) filter.requires_review = query.requires_review;

      // Date range filter
      if (query.start_date || query.end_date) {
        filter.timestamp = {};
        if (query.start_date) filter.timestamp.$gte = new Date(query.start_date);
        if (query.end_date) filter.timestamp.$lte = new Date(query.end_date);
      }

      // Amount range filter
      if (query.min_amount || query.max_amount) {
        filter.amount = {};
        if (query.min_amount) filter.amount.$gte = query.min_amount;
        if (query.max_amount) filter.amount.$lte = query.max_amount;
      }

      const page = query.page || 1;
      const limit = query.limit || 20;
      const skip = (page - 1) * limit;

      // Sort configuration
      const sortField = query.sort_by || 'timestamp';
      const sortOrder = query.sort_order === 'ASC' ? 1 : -1;
      const sort = { [sortField]: sortOrder };

      const [logs, total] = await Promise.all([
        this.transactionLogModel
          .find(filter)
          .sort(sort as any)
          .skip(skip)
          .limit(limit)
          .exec(),
        this.transactionLogModel.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        logs,
        total,
        page,
        totalPages
      };
    } catch (error) {
      this.logger.error('Failed to query transaction logs:', error);
      throw error;
    }
  }

  async getSuspiciousTransactions(userId?: number): Promise<TransactionLog[]> {
    try {
      const filter: any = { is_suspicious: true };
      if (userId) filter.user_id = userId;

      return await this.transactionLogModel
        .find(filter)
        .sort({ timestamp: -1 })
        .limit(100)
        .exec();
    } catch (error) {
      this.logger.error('Failed to get suspicious transactions:', error);
      throw error;
    }
  }

  async getTransactionsRequiringReview(): Promise<TransactionLog[]> {
    try {
      return await this.transactionLogModel
        .find({ requires_review: true })
        .sort({ timestamp: -1 })
        .limit(100)
        .exec();
    } catch (error) {
      this.logger.error('Failed to get transactions requiring review:', error);
      throw error;
    }
  }

  async getUserActivitySummary(userId: number, startDate: Date, endDate: Date): Promise<{
    totalTransactions: number;
    totalVolume: string;
    transactionsByType: any;
    riskMetrics: any;
  }> {
    try {
      const filter = {
        user_id: userId,
        timestamp: { $gte: startDate, $lte: endDate }
      };

      const [transactions, typeAggregation] = await Promise.all([
        this.transactionLogModel.find(filter).exec(),
        this.transactionLogModel.aggregate([
          { $match: filter },
          { $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalAmount: { $sum: { $toDouble: '$amount' } }
          }}
        ])
      ]);

      const totalVolume = transactions
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
        .toString();

      const suspiciousCount = transactions.filter(tx => tx.is_suspicious).length;
      const reviewRequiredCount = transactions.filter(tx => tx.requires_review).length;

      return {
        totalTransactions: transactions.length,
        totalVolume,
        transactionsByType: typeAggregation,
        riskMetrics: {
          suspicious_transactions: suspiciousCount,
          review_required: reviewRequiredCount,
          risk_score: this.calculateUserRiskScore(transactions)
        }
      };
    } catch (error) {
      this.logger.error(`Failed to get user activity summary for user ${userId}:`, error);
      throw error;
    }
  }

  private async analyzeFraudRisk(transactionLog: TransactionLog): Promise<void> {
    try {
      const amount = parseFloat(transactionLog.amount);
      let riskScore = 0;
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      const riskFlags: string[] = [];

      // Large transaction check
      if (amount > 10000) {
        riskScore += 30;
        riskFlags.push('LARGE_TRANSACTION');
      }

      // Check for rapid succession transactions
      const recentTransactions = await this.transactionLogModel
        .find({
          user_id: transactionLog.user_id,
          timestamp: {
            $gte: new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
          }
        })
        .exec();

      if (recentTransactions.length > 5) {
        riskScore += 25;
        riskFlags.push('RAPID_SUCCESSION');
      }

      // Unusual time check (outside 6 AM - 11 PM)
      const hour = new Date().getHours();
      if (hour < 6 || hour > 23) {
        riskScore += 15;
        riskFlags.push('UNUSUAL_TIME');
      }

      // Determine risk level
      if (riskScore >= 50) {
        riskLevel = 'HIGH';
      } else if (riskScore >= 25) {
        riskLevel = 'MEDIUM';
      }

      // Update transaction log with risk assessment
      if (riskScore > 0) {
        await this.transactionLogModel.findByIdAndUpdate(
          (transactionLog as any)._id,
          {
            $set: {
              'metadata.fraud_score': riskScore,
              'metadata.risk_level': riskLevel,
              'metadata.compliance_flags': riskFlags,
              is_suspicious: riskScore >= 40,
              requires_review: riskScore >= 60
            }
          }
        );

        if (riskScore >= 40) {
          this.logger.warn(`Suspicious transaction detected: ${transactionLog.transaction_id} - Risk Score: ${riskScore}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to analyze fraud risk:', error);
    }
  }

  private calculateUserRiskScore(transactions: TransactionLog[]): number {
    if (transactions.length === 0) return 0;

    const totalScore = transactions.reduce((sum, tx) => {
      return sum + (tx.metadata?.fraud_score || 0);
    }, 0);

    return Math.round(totalScore / transactions.length);
  }
} 