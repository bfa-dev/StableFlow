import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SystemEvent, SystemEventDocument, EventType, Severity } from '../entities/system-event.entity';
import { LogEventDto } from '../dto/log-event.dto';
import { QuerySystemEventsDto } from '../dto/query-logs.dto';

@Injectable()
export class SystemEventLoggingService {
  private readonly logger = new Logger(SystemEventLoggingService.name);

  constructor(
    @InjectModel(SystemEvent.name)
    private systemEventModel: Model<SystemEventDocument>,
  ) {}

  async logEvent(logEventDto: LogEventDto): Promise<SystemEvent> {
    try {
      const systemEvent = new this.systemEventModel({
        ...logEventDto,
        timestamp: new Date(),
      });

      const savedEvent = await systemEvent.save();
      
      this.logger.log(`System event logged: ${logEventDto.event_type} - User: ${logEventDto.user_id || 'N/A'} - Severity: ${logEventDto.severity}`);
      
      // Auto-escalate critical events
      if (logEventDto.severity === Severity.CRITICAL) {
        await this.escalateCriticalEvent(savedEvent);
      }
      
      return savedEvent;
    } catch (error) {
      this.logger.error(`Failed to log system event:`, error);
      throw error;
    }
  }

  async querySystemEvents(query: QuerySystemEventsDto): Promise<{
    events: SystemEvent[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const filter: any = {};

      // Apply filters
      if (query.user_id) filter.user_id = query.user_id;
      if (query.event_type) filter.event_type = query.event_type;
      if (query.severity) filter.severity = query.severity;
      if (query.ip_address) filter.ip_address = query.ip_address;
      if (query.requires_investigation !== undefined) {
        filter.requires_investigation = query.requires_investigation;
      }
      if (query.is_resolved !== undefined) {
        filter.is_resolved = query.is_resolved;
      }

      // Date range filter
      if (query.start_date || query.end_date) {
        filter.timestamp = {};
        if (query.start_date) filter.timestamp.$gte = new Date(query.start_date);
        if (query.end_date) filter.timestamp.$lte = new Date(query.end_date);
      }

      // Search in description
      if (query.search) {
        filter.description = { $regex: query.search, $options: 'i' };
      }

      const page = query.page || 1;
      const limit = query.limit || 20;
      const skip = (page - 1) * limit;

      // Sort configuration
      const sortField = query.sort_by || 'timestamp';
      const sortOrder = query.sort_order === 'ASC' ? 1 : -1;
      const sort = { [sortField]: sortOrder };

      const [events, total] = await Promise.all([
        this.systemEventModel
          .find(filter)
          .sort(sort as any)
          .skip(skip)
          .limit(limit)
          .exec(),
        this.systemEventModel.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        events,
        total,
        page,
        totalPages
      };
    } catch (error) {
      this.logger.error('Failed to query system events:', error);
      throw error;
    }
  }

  async getEventsByUser(userId: number, limit: number = 50): Promise<SystemEvent[]> {
    try {
      return await this.systemEventModel
        .find({ user_id: userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .exec();
    } catch (error) {
      this.logger.error(`Failed to get events for user ${userId}:`, error);
      throw error;
    }
  }

  async getSecurityAlerts(limit: number = 100): Promise<SystemEvent[]> {
    try {
      const securityEventTypes = [
        EventType.FAILED_LOGIN_ATTEMPT,
        EventType.ACCOUNT_LOCKED,
        EventType.FRAUD_DETECTED,
        EventType.SECURITY_VIOLATION,
        EventType.API_RATE_LIMIT
      ];

      return await this.systemEventModel
        .find({ event_type: { $in: securityEventTypes } })
        .sort({ timestamp: -1 })
        .limit(limit)
        .exec();
    } catch (error) {
      this.logger.error('Failed to get security alerts:', error);
      throw error;
    }
  }

  async getEventsRequiringInvestigation(): Promise<SystemEvent[]> {
    try {
      return await this.systemEventModel
        .find({ 
          requires_investigation: true,
          is_resolved: false 
        })
        .sort({ timestamp: -1 })
        .limit(100)
        .exec();
    } catch (error) {
      this.logger.error('Failed to get events requiring investigation:', error);
      throw error;
    }
  }

  async resolveEvent(
    eventId: string, 
    resolvedBy: number, 
    resolutionNotes: string
  ): Promise<SystemEvent> {
    try {
      const updatedEvent = await this.systemEventModel.findByIdAndUpdate(
        eventId,
        {
          is_resolved: true,
          resolved_by: resolvedBy,
          resolved_at: new Date(),
          resolution_notes: resolutionNotes
        },
        { new: true }
      );

      if (!updatedEvent) {
        throw new Error(`System event not found: ${eventId}`);
      }

      this.logger.log(`System event resolved: ${eventId} by user ${resolvedBy}`);
      return updatedEvent;
    } catch (error) {
      this.logger.error(`Failed to resolve system event ${eventId}:`, error);
      throw error;
    }
  }

  async getEventStatistics(startDate: Date, endDate: Date): Promise<{
    totalEvents: number;
    eventsBySeverity: any;
    eventsByType: any;
    topUsers: any;
    topIPs: any;
    unresolved: number;
  }> {
    try {
      const dateFilter = {
        timestamp: { $gte: startDate, $lte: endDate }
      };

      const [
        totalEvents,
        severityStats,
        typeStats,
        userStats,
        ipStats,
        unresolvedCount
      ] = await Promise.all([
        this.systemEventModel.countDocuments(dateFilter),
        
        this.systemEventModel.aggregate([
          { $match: dateFilter },
          { $group: { _id: '$severity', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        
        this.systemEventModel.aggregate([
          { $match: dateFilter },
          { $group: { _id: '$event_type', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        
        this.systemEventModel.aggregate([
          { $match: { ...dateFilter, user_id: { $exists: true } } },
          { $group: { _id: '$user_id', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]),
        
        this.systemEventModel.aggregate([
          { $match: dateFilter },
          { $group: { _id: '$ip_address', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]),
        
        this.systemEventModel.countDocuments({
          ...dateFilter,
          requires_investigation: true,
          is_resolved: false
        })
      ]);

      return {
        totalEvents,
        eventsBySeverity: severityStats,
        eventsByType: typeStats,
        topUsers: userStats,
        topIPs: ipStats,
        unresolved: unresolvedCount
      };
    } catch (error) {
      this.logger.error('Failed to get event statistics:', error);
      throw error;
    }
  }

  async logUserLogin(userId: number, ipAddress: string, userAgent?: string, success: boolean = true): Promise<SystemEvent> {
    const eventType = success ? EventType.USER_LOGIN : EventType.FAILED_LOGIN_ATTEMPT;
    const severity = success ? Severity.LOW : Severity.MEDIUM;
    
    return this.logEvent({
      event_type: eventType,
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      description: success ? 'User logged in successfully' : 'Failed login attempt',
      severity,
      metadata: {
        endpoint: '/auth/login',
        method: 'POST'
      }
    });
  }

  async logUserLogout(userId: number, ipAddress: string, userAgent?: string): Promise<SystemEvent> {
    return this.logEvent({
      event_type: EventType.USER_LOGOUT,
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      description: 'User logged out',
      severity: Severity.LOW,
      metadata: {
        endpoint: '/auth/logout',
        method: 'POST'
      }
    });
  }

  async logAdminAction(
    adminUserId: number, 
    action: string, 
    targetUserId: number | null, 
    ipAddress: string,
    details?: any
  ): Promise<SystemEvent> {
    return this.logEvent({
      event_type: EventType.ADMIN_ACTION,
      user_id: targetUserId || undefined,
      admin_user_id: adminUserId,
      ip_address: ipAddress,
      description: `Admin action: ${action}`,
      severity: Severity.MEDIUM,
      metadata: {
        additional_data: {
          action,
          target_user_id: targetUserId,
          details
        }
      }
    });
  }

  private async escalateCriticalEvent(event: SystemEvent): Promise<void> {
    try {
      // Mark as requiring investigation
      await this.systemEventModel.findByIdAndUpdate(
        (event as any)._id,
        { requires_investigation: true }
      );

      // Log escalation
      this.logger.error(`CRITICAL EVENT ESCALATED: ${event.event_type} - ${event.description}`);
      
      // In a real implementation, this would trigger notifications
      // to administrators via email, SMS, or external alerting systems
    } catch (error) {
      this.logger.error('Failed to escalate critical event:', error);
    }
  }
} 