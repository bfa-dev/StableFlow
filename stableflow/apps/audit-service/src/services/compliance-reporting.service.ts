import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ComplianceReport, ComplianceReportDocument, ReportType, ReportStatus } from '../entities/compliance-report.entity';
import { TransactionLog, TransactionLogDocument } from '../entities/transaction-log.entity';
import { SystemEvent, SystemEventDocument } from '../entities/system-event.entity';
import { GenerateReportDto } from '../dto/generate-report.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ComplianceReportingService {
  private readonly logger = new Logger(ComplianceReportingService.name);

  constructor(
    @InjectModel(ComplianceReport.name)
    private complianceReportModel: Model<ComplianceReportDocument>,
    @InjectModel(TransactionLog.name)
    private transactionLogModel: Model<TransactionLogDocument>,
    @InjectModel(SystemEvent.name)
    private systemEventModel: Model<SystemEventDocument>,
  ) {}

  async generateReport(generateReportDto: GenerateReportDto, generatedBy: number): Promise<ComplianceReport> {
    try {
      const reportId = uuidv4();
      
      // Create initial report record
      const report = new this.complianceReportModel({
        report_id: reportId,
        type: generateReportDto.type,
        title: generateReportDto.title,
        description: generateReportDto.description,
        date_range: {
          start_date: new Date(generateReportDto.date_range.start_date),
          end_date: new Date(generateReportDto.date_range.end_date)
        },
        status: ReportStatus.GENERATING,
        generated_by: generatedBy,
        generated_at: new Date(),
        filters: generateReportDto.filters || {},
        export_format: generateReportDto.export_format || 'JSON',
        is_confidential: generateReportDto.is_confidential || false,
        is_regulatory_filing: generateReportDto.is_regulatory_filing || false,
        data: {} // Will be populated during generation
      });

      const savedReport = await report.save();
      
      // Generate report data asynchronously
      this.generateReportData(savedReport).catch(error => {
        this.logger.error(`Failed to generate report data for ${reportId}:`, error);
      });

      this.logger.log(`Report generation started: ${reportId} - Type: ${generateReportDto.type}`);
      return savedReport;
    } catch (error) {
      this.logger.error('Failed to initiate report generation:', error);
      throw error;
    }
  }

  async getReport(reportId: string): Promise<ComplianceReport> {
    try {
      const report = await this.complianceReportModel.findOne({ report_id: reportId });
      if (!report) {
        throw new Error(`Report not found: ${reportId}`);
      }
      return report;
    } catch (error) {
      this.logger.error(`Failed to get report ${reportId}:`, error);
      throw error;
    }
  }

  async getReports(
    userId?: number, 
    type?: ReportType, 
    status?: ReportStatus,
    limit: number = 50
  ): Promise<ComplianceReport[]> {
    try {
      const filter: any = {};
      
      if (userId) filter.generated_by = userId;
      if (type) filter.type = type;
      if (status) filter.status = status;

      return await this.complianceReportModel
        .find(filter)
        .sort({ generated_at: -1 })
        .limit(limit)
        .exec();
    } catch (error) {
      this.logger.error('Failed to get reports:', error);
      throw error;
    }
  }

  private async generateReportData(report: ComplianceReport): Promise<void> {
    try {
      let reportData: any = {};

      switch (report.type) {
        case ReportType.DAILY_TRANSACTION_SUMMARY:
        case ReportType.WEEKLY_TRANSACTION_SUMMARY:
        case ReportType.MONTHLY_TRANSACTION_SUMMARY:
          reportData = await this.generateTransactionSummary(report);
          break;
        
        case ReportType.LARGE_TRANSACTION_REPORT:
          reportData = await this.generateLargeTransactionReport(report);
          break;
        
        case ReportType.SUSPICIOUS_ACTIVITY_REPORT:
          reportData = await this.generateSuspiciousActivityReport(report);
          break;
        
        case ReportType.USER_ACTIVITY_REPORT:
          reportData = await this.generateUserActivityReport(report);
          break;
        
        case ReportType.FRAUD_DETECTION_REPORT:
          reportData = await this.generateFraudDetectionReport(report);
          break;
        
        case ReportType.COMPLIANCE_AUDIT_REPORT:
          reportData = await this.generateComplianceAuditReport(report);
          break;
        
        default:
          throw new Error(`Unsupported report type: ${report.type}`);
      }

      // Update report with generated data
      await this.complianceReportModel.findByIdAndUpdate(
        (report as any)._id,
        {
          status: ReportStatus.COMPLETED,
          completed_at: new Date(),
          data: reportData
        }
      );

      this.logger.log(`Report generation completed: ${report.report_id}`);
    } catch (error) {
      this.logger.error(`Report generation failed for ${report.report_id}:`, error);
      
      await this.complianceReportModel.findByIdAndUpdate(
        (report as any)._id,
        {
          status: ReportStatus.FAILED,
          error_message: error.message
        }
      );
    }
  }

  private async generateTransactionSummary(report: ComplianceReport): Promise<any> {
    const filter: any = {
      timestamp: {
        $gte: report.date_range.start_date,
        $lte: report.date_range.end_date
      }
    };

    // Apply additional filters
    if (report.filters?.user_ids?.length) {
      filter.user_id = { $in: report.filters.user_ids };
    }
    if (report.filters?.transaction_types?.length) {
      filter.type = { $in: report.filters.transaction_types };
    }
    if (report.filters?.currencies?.length) {
      filter.currency = { $in: report.filters.currencies };
    }

    const [
      totalTransactions,
      transactionsByType,
      transactionsByCurrency,
      transactionsByStatus,
      volumeMetrics,
      uniqueUsers
    ] = await Promise.all([
      this.transactionLogModel.countDocuments(filter),
      
      this.transactionLogModel.aggregate([
        { $match: filter },
        { $group: { _id: '$type', count: { $sum: 1 }, volume: { $sum: { $toDouble: '$amount' } } } },
        { $sort: { count: -1 } }
      ]),
      
      this.transactionLogModel.aggregate([
        { $match: filter },
        { $group: { _id: '$currency', count: { $sum: 1 }, volume: { $sum: { $toDouble: '$amount' } } } },
        { $sort: { volume: -1 } }
      ]),
      
      this.transactionLogModel.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      
      this.transactionLogModel.aggregate([
        { $match: filter },
        { $group: {
          _id: null,
          totalVolume: { $sum: { $toDouble: '$amount' } },
          avgTransaction: { $avg: { $toDouble: '$amount' } },
          maxTransaction: { $max: { $toDouble: '$amount' } },
          minTransaction: { $min: { $toDouble: '$amount' } }
        }}
      ]),
      
      this.transactionLogModel.distinct('user_id', filter)
    ]);

    return {
      total_transactions: totalTransactions,
      total_volume: volumeMetrics[0]?.totalVolume?.toString() || '0',
      unique_users: uniqueUsers.length,
      transactions_by_type: transactionsByType,
      transactions_by_currency: transactionsByCurrency,
      transactions_by_status: transactionsByStatus,
      volume_metrics: {
        total_volume: volumeMetrics[0]?.totalVolume?.toString() || '0',
        average_transaction: volumeMetrics[0]?.avgTransaction?.toString() || '0',
        largest_transaction: volumeMetrics[0]?.maxTransaction?.toString() || '0',
        smallest_transaction: volumeMetrics[0]?.minTransaction?.toString() || '0'
      },
      generation_timestamp: new Date().toISOString()
    };
  }

  private async generateLargeTransactionReport(report: ComplianceReport): Promise<any> {
    const thresholdAmount = parseFloat(report.filters?.amount_range?.min || '10000');
    
    const filter: any = {
      timestamp: {
        $gte: report.date_range.start_date,
        $lte: report.date_range.end_date
      },
      $expr: { $gte: [{ $toDouble: '$amount' }, thresholdAmount] }
    };

    const largeTransactions = await this.transactionLogModel
      .find(filter)
      .sort({ amount: -1 })
      .limit(1000)
      .exec();

    const summary = largeTransactions.reduce((acc, tx) => {
      acc.totalCount++;
      acc.totalVolume += parseFloat(tx.amount);
      
      if (!acc.byType[tx.type]) {
        acc.byType[tx.type] = { count: 0, volume: 0 };
      }
      acc.byType[tx.type].count++;
      acc.byType[tx.type].volume += parseFloat(tx.amount);
      
      return acc;
    }, {
      totalCount: 0,
      totalVolume: 0,
      byType: {} as any
    });

    return {
      threshold_amount: thresholdAmount.toString(),
      large_transactions: largeTransactions.map(tx => ({
        transaction_id: tx.transaction_id,
        user_id: tx.user_id,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        timestamp: tx.timestamp,
        risk_level: tx.metadata?.risk_level,
        fraud_score: tx.metadata?.fraud_score
      })),
      summary: {
        total_count: summary.totalCount,
        total_volume: summary.totalVolume.toString(),
        by_type: summary.byType
      }
    };
  }

  private async generateSuspiciousActivityReport(report: ComplianceReport): Promise<any> {
    const filter: any = {
      timestamp: {
        $gte: report.date_range.start_date,
        $lte: report.date_range.end_date
      },
      is_suspicious: true
    };

    const suspiciousTransactions = await this.transactionLogModel
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(1000)
      .exec();

    const riskLevelDistribution = suspiciousTransactions.reduce((acc, tx) => {
      const riskLevel = tx.metadata?.risk_level || 'UNKNOWN';
      acc[riskLevel] = (acc[riskLevel] || 0) + 1;
      return acc;
    }, {} as any);

    const topRiskUsers = suspiciousTransactions.reduce((acc, tx) => {
      acc[tx.user_id] = (acc[tx.user_id] || 0) + 1;
      return acc;
    }, {} as any);

    return {
      suspicious_activities: suspiciousTransactions.map(tx => ({
        transaction_id: tx.transaction_id,
        user_id: tx.user_id,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        timestamp: tx.timestamp,
        risk_level: tx.metadata?.risk_level,
        fraud_score: tx.metadata?.fraud_score,
        compliance_flags: tx.metadata?.compliance_flags,
        requires_review: tx.requires_review
      })),
      summary: {
        total_suspicious: suspiciousTransactions.length,
        risk_level_distribution: riskLevelDistribution,
        top_risk_users: Object.entries(topRiskUsers)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 10)
          .map(([userId, count]) => ({ user_id: parseInt(userId), suspicious_count: count }))
      }
    };
  }

  private async generateUserActivityReport(report: ComplianceReport): Promise<any> {
    const userIds = report.filters?.user_ids || [];
    if (userIds.length === 0) {
      throw new Error('User activity report requires specific user IDs');
    }

    const userActivities = await Promise.all(
      userIds.map(async (userId) => {
        const transactionFilter = {
          user_id: userId,
          timestamp: {
            $gte: report.date_range.start_date,
            $lte: report.date_range.end_date
          }
        };

        const eventFilter = {
          user_id: userId,
          timestamp: {
            $gte: report.date_range.start_date,
            $lte: report.date_range.end_date
          }
        };

        const [transactions, events] = await Promise.all([
          this.transactionLogModel.find(transactionFilter).exec(),
          this.systemEventModel.find(eventFilter).exec()
        ]);

        const totalVolume = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
        const suspiciousCount = transactions.filter(tx => tx.is_suspicious).length;

        return {
          user_id: userId,
          transaction_count: transactions.length,
          total_volume: totalVolume.toString(),
          suspicious_transactions: suspiciousCount,
          system_events: events.length,
          transactions: transactions.map(tx => ({
            transaction_id: tx.transaction_id,
            type: tx.type,
            amount: tx.amount,
            currency: tx.currency,
            timestamp: tx.timestamp,
            status: tx.status
          })),
          events: events.map(event => ({
            event_type: event.event_type,
            description: event.description,
            severity: event.severity,
            timestamp: event.timestamp
          }))
        };
      })
    );

    return {
      user_activities: userActivities,
      summary: {
        total_users: userIds.length,
        total_transactions: userActivities.reduce((sum, user) => sum + user.transaction_count, 0),
        total_volume: userActivities.reduce((sum, user) => sum + parseFloat(user.total_volume), 0).toString(),
        total_suspicious: userActivities.reduce((sum, user) => sum + user.suspicious_transactions, 0)
      }
    };
  }

  private async generateFraudDetectionReport(report: ComplianceReport): Promise<any> {
    const filter: any = {
      timestamp: {
        $gte: report.date_range.start_date,
        $lte: report.date_range.end_date
      }
    };

    const [fraudulentTransactions, riskMetrics] = await Promise.all([
      this.transactionLogModel.find({
        ...filter,
        $or: [
          { is_suspicious: true },
          { requires_review: true },
          { 'metadata.fraud_score': { $gte: 50 } }
        ]
      }).exec(),
      
      this.transactionLogModel.aggregate([
        { $match: filter },
        { $group: {
          _id: '$metadata.risk_level',
          count: { $sum: 1 },
          avgFraudScore: { $avg: '$metadata.fraud_score' }
        }}
      ])
    ]);

    return {
      fraud_detection_summary: {
        total_flagged: fraudulentTransactions.length,
        high_risk: fraudulentTransactions.filter(tx => tx.metadata?.risk_level === 'HIGH').length,
        medium_risk: fraudulentTransactions.filter(tx => tx.metadata?.risk_level === 'MEDIUM').length,
        low_risk: fraudulentTransactions.filter(tx => tx.metadata?.risk_level === 'LOW').length,
        requiring_review: fraudulentTransactions.filter(tx => tx.requires_review).length
      },
      risk_metrics: riskMetrics,
      flagged_transactions: fraudulentTransactions.map(tx => ({
        transaction_id: tx.transaction_id,
        user_id: tx.user_id,
        type: tx.type,
        amount: tx.amount,
        fraud_score: tx.metadata?.fraud_score,
        risk_level: tx.metadata?.risk_level,
        compliance_flags: tx.metadata?.compliance_flags,
        timestamp: tx.timestamp
      }))
    };
  }

  private async generateComplianceAuditReport(report: ComplianceReport): Promise<any> {
    // This would integrate with actual compliance frameworks
    // For now, we'll generate a comprehensive audit summary
    
    const transactionFilter = {
      timestamp: {
        $gte: report.date_range.start_date,
        $lte: report.date_range.end_date
      }
    };

    const [
      totalTransactions,
      complianceViolations,
      auditTrail,
      systemIntegrity
    ] = await Promise.all([
      this.transactionLogModel.countDocuments(transactionFilter),
      
      this.transactionLogModel.countDocuments({
        ...transactionFilter,
        'metadata.compliance_flags': { $exists: true, $ne: [] }
      }),
      
      this.systemEventModel.find({
        timestamp: {
          $gte: report.date_range.start_date,
          $lte: report.date_range.end_date
        },
        event_type: { $in: ['ADMIN_ACTION', 'COMPLIANCE_ALERT', 'FRAUD_DETECTED'] }
      }).exec(),
      
      this.systemEventModel.countDocuments({
        timestamp: {
          $gte: report.date_range.start_date,
          $lte: report.date_range.end_date
        },
        event_type: 'SYSTEM_ERROR'
      })
    ]);

    return {
      compliance_summary: {
        total_transactions: totalTransactions,
        compliance_violations: complianceViolations,
        violation_rate: totalTransactions > 0 ? (complianceViolations / totalTransactions * 100).toFixed(2) : '0',
        system_errors: systemIntegrity,
        audit_events: auditTrail.length
      },
      audit_trail: auditTrail.map(event => ({
        event_type: event.event_type,
        description: event.description,
        user_id: event.user_id,
        admin_user_id: event.admin_user_id,
        timestamp: event.timestamp
      })),
      recommendations: this.generateComplianceRecommendations(complianceViolations, totalTransactions)
    };
  }

  private generateComplianceRecommendations(violations: number, totalTransactions: number): string[] {
    const recommendations: string[] = [];
    
    if (violations > 0) {
      const violationRate = (violations / totalTransactions) * 100;
      
      if (violationRate > 5) {
        recommendations.push('HIGH PRIORITY: Violation rate exceeds 5%. Immediate review of compliance controls required.');
      } else if (violationRate > 1) {
        recommendations.push('MEDIUM PRIORITY: Violation rate above 1%. Consider strengthening fraud detection rules.');
      }
      
      recommendations.push('Review and update compliance training for operations team.');
      recommendations.push('Implement additional automated compliance checks.');
    } else {
      recommendations.push('Compliance status: GOOD. Continue current monitoring practices.');
    }
    
    return recommendations;
  }
} 