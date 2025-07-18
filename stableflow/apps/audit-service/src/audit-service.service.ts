import { Injectable, Logger } from '@nestjs/common';
import { TransactionLoggingService } from './services/transaction-logging.service';
import { SystemEventLoggingService } from './services/system-event-logging.service';
import { ComplianceReportingService } from './services/compliance-reporting.service';
import { LogTransactionDto } from './dto/log-transaction.dto';
import { LogEventDto } from './dto/log-event.dto';
import { GenerateReportDto } from './dto/generate-report.dto';
import { QueryTransactionLogsDto, QuerySystemEventsDto } from './dto/query-logs.dto';

@Injectable()
export class AuditServiceService {
  private readonly logger = new Logger(AuditServiceService.name);

  constructor(
    private readonly transactionLoggingService: TransactionLoggingService,
    private readonly systemEventLoggingService: SystemEventLoggingService,
    private readonly complianceReportingService: ComplianceReportingService,
  ) {}

  // Health check
  getHealth(): { status: string; timestamp: string; services: any } {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        transactionLogging: 'active',
        systemEventLogging: 'active',
        complianceReporting: 'active',
        database: 'connected'
      }
    };
  }

  // Transaction Logging Methods
  async logTransaction(logTransactionDto: LogTransactionDto) {
    this.logger.log(`Logging transaction: ${logTransactionDto.transaction_id}`);
    return this.transactionLoggingService.logTransaction(logTransactionDto);
  }

  async updateTransactionStatus(
    transactionId: string,
    status: string,
    processedAt?: Date,
    errorMessage?: string
  ) {
    return this.transactionLoggingService.updateTransactionStatus(
      transactionId,
      status,
      processedAt,
      errorMessage
    );
  }

  async queryTransactionLogs(query: QueryTransactionLogsDto) {
    return this.transactionLoggingService.queryTransactionLogs(query);
  }

  async getSuspiciousTransactions(userId?: number) {
    return this.transactionLoggingService.getSuspiciousTransactions(userId);
  }

  async getTransactionsRequiringReview() {
    return this.transactionLoggingService.getTransactionsRequiringReview();
  }

  async getUserActivitySummary(userId: number, startDate: Date, endDate: Date) {
    return this.transactionLoggingService.getUserActivitySummary(userId, startDate, endDate);
  }

  // System Event Logging Methods
  async logEvent(logEventDto: LogEventDto) {
    this.logger.log(`Logging system event: ${logEventDto.event_type}`);
    return this.systemEventLoggingService.logEvent(logEventDto);
  }

  async querySystemEvents(query: QuerySystemEventsDto) {
    return this.systemEventLoggingService.querySystemEvents(query);
  }

  async getEventsByUser(userId: number, limit?: number) {
    return this.systemEventLoggingService.getEventsByUser(userId, limit);
  }

  async getSecurityAlerts(limit?: number) {
    return this.systemEventLoggingService.getSecurityAlerts(limit);
  }

  async getEventsRequiringInvestigation() {
    return this.systemEventLoggingService.getEventsRequiringInvestigation();
  }

  async resolveEvent(eventId: string, resolvedBy: number, resolutionNotes: string) {
    return this.systemEventLoggingService.resolveEvent(eventId, resolvedBy, resolutionNotes);
  }

  async getEventStatistics(startDate: Date, endDate: Date) {
    return this.systemEventLoggingService.getEventStatistics(startDate, endDate);
  }

  // Convenience methods for common event logging
  async logUserLogin(userId: number, ipAddress: string, userAgent?: string, success: boolean = true) {
    return this.systemEventLoggingService.logUserLogin(userId, ipAddress, userAgent, success);
  }

  async logUserLogout(userId: number, ipAddress: string, userAgent?: string) {
    return this.systemEventLoggingService.logUserLogout(userId, ipAddress, userAgent);
  }

  async logAdminAction(
    adminUserId: number,
    action: string,
    targetUserId: number | null,
    ipAddress: string,
    details?: any
  ) {
    return this.systemEventLoggingService.logAdminAction(
      adminUserId,
      action,
      targetUserId,
      ipAddress,
      details
    );
  }

  // Compliance Reporting Methods
  async generateReport(generateReportDto: GenerateReportDto, generatedBy: number) {
    this.logger.log(`Generating compliance report: ${generateReportDto.type}`);
    return this.complianceReportingService.generateReport(generateReportDto, generatedBy);
  }

  async getReport(reportId: string) {
    return this.complianceReportingService.getReport(reportId);
  }

  async getReports(userId?: number, type?: any, status?: any, limit?: number) {
    return this.complianceReportingService.getReports(userId, type, status, limit);
  }

  // Dashboard Statistics
  async getDashboardStats(): Promise<{
    overview: any;
    recentActivity: any;
    alerts: any;
    compliance: any;
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

      const [
        suspiciousTransactions,
        transactionsRequiringReview,
        securityAlerts,
        eventsRequiringInvestigation,
        eventStats
      ] = await Promise.all([
        this.getSuspiciousTransactions(),
        this.getTransactionsRequiringReview(),
        this.getSecurityAlerts(10),
        this.getEventsRequiringInvestigation(),
        this.getEventStatistics(startDate, endDate)
      ]);

      return {
        overview: {
          suspicious_transactions: suspiciousTransactions.length,
          transactions_requiring_review: transactionsRequiringReview.length,
          security_alerts: securityAlerts.length,
          unresolved_events: eventsRequiringInvestigation.length,
          last_updated: new Date().toISOString()
        },
        recentActivity: {
          latest_suspicious: suspiciousTransactions.slice(0, 5),
          latest_security_alerts: securityAlerts.slice(0, 5),
          latest_unresolved: eventsRequiringInvestigation.slice(0, 5)
        },
        alerts: {
          high_priority: eventsRequiringInvestigation.filter(e => e.severity === 'HIGH' || e.severity === 'CRITICAL').length,
          medium_priority: eventsRequiringInvestigation.filter(e => e.severity === 'MEDIUM').length,
          low_priority: eventsRequiringInvestigation.filter(e => e.severity === 'LOW').length
        },
        compliance: {
          total_events_24h: eventStats.totalEvents,
          unresolved_events: eventStats.unresolved,
          events_by_severity: eventStats.eventsBySeverity,
          events_by_type: eventStats.eventsByType
        }
      };
    } catch (error) {
      this.logger.error('Failed to get dashboard stats:', error);
      throw error;
    }
  }

  // Advanced Analytics
  async getAdvancedAnalytics(days: number = 7): Promise<{
    transactionTrends: any;
    riskAnalysis: any;
    userBehavior: any;
    systemHealth: any;
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      // This would be expanded with more sophisticated analytics
      const [eventStats, suspiciousTransactions] = await Promise.all([
        this.getEventStatistics(startDate, endDate),
        this.getSuspiciousTransactions()
      ]);

      return {
        transactionTrends: {
          period: `${days} days`,
          total_events: eventStats.totalEvents,
          daily_average: Math.round(eventStats.totalEvents / days),
          growth_rate: 'calculation_placeholder'
        },
        riskAnalysis: {
          suspicious_transaction_rate: suspiciousTransactions.length,
          top_risk_indicators: ['LARGE_TRANSACTION', 'RAPID_SUCCESSION', 'UNUSUAL_TIME'],
          risk_score_distribution: 'calculation_placeholder'
        },
        userBehavior: {
          top_active_users: eventStats.topUsers,
          unusual_patterns: 'analysis_placeholder',
          geographic_distribution: eventStats.topIPs
        },
        systemHealth: {
          uptime_percentage: 99.9, // Placeholder
          error_rate: 'calculation_placeholder',
          performance_metrics: 'placeholder'
        }
      };
    } catch (error) {
      this.logger.error('Failed to get advanced analytics:', error);
      throw error;
    }
  }
}
