import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param, 
  Query, 
  HttpCode, 
  HttpStatus, 
  UseGuards,
  Headers,
  ValidationPipe,
  ParseIntPipe
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth, 
  ApiQuery,
  ApiParam
} from '@nestjs/swagger';
import { AuditServiceService } from './audit-service.service';
import { LogTransactionDto } from './dto/log-transaction.dto';
import { LogEventDto } from './dto/log-event.dto';
import { GenerateReportDto } from './dto/generate-report.dto';
import { QueryTransactionLogsDto, QuerySystemEventsDto } from './dto/query-logs.dto';

// Mock guard for demonstration - in real implementation, this would validate JWT tokens
const AdminGuard = () => (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
  // Mock implementation
};

const InternalServiceGuard = () => (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
  // Mock implementation - validates internal service calls
};

@ApiTags('Audit Service')
@Controller('api/v1/audit')
export class AuditServiceController {
  constructor(private readonly auditService: AuditServiceService) {}

  // Health Check
  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service health status' })
  @HttpCode(HttpStatus.OK)
  getHealth() {
    return this.auditService.getHealth();
  }

  // Internal Transaction Logging Endpoints
  @Post('log-transaction')
  @ApiOperation({ summary: 'Log a transaction (Internal use only)' })
  @ApiResponse({ status: 201, description: 'Transaction logged successfully' })
  @ApiResponse({ status: 400, description: 'Invalid transaction data' })
  @InternalServiceGuard()
  @HttpCode(HttpStatus.CREATED)
  async logTransaction(@Body(ValidationPipe) logTransactionDto: LogTransactionDto) {
    return this.auditService.logTransaction(logTransactionDto);
  }

  @Put('transaction/:transactionId/status')
  @ApiOperation({ summary: 'Update transaction status (Internal use only)' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction status updated' })
  @InternalServiceGuard()
  async updateTransactionStatus(
    @Param('transactionId') transactionId: string,
    @Body() updateData: { status: string; processedAt?: string; errorMessage?: string }
  ) {
    return this.auditService.updateTransactionStatus(
      transactionId,
      updateData.status,
      updateData.processedAt ? new Date(updateData.processedAt) : undefined,
      updateData.errorMessage
    );
  }

  // Internal System Event Logging
  @Post('log-event')
  @ApiOperation({ summary: 'Log a system event (Internal use only)' })
  @ApiResponse({ status: 201, description: 'System event logged successfully' })
  @InternalServiceGuard()
  @HttpCode(HttpStatus.CREATED)
  async logEvent(@Body(ValidationPipe) logEventDto: LogEventDto) {
    return this.auditService.logEvent(logEventDto);
  }

  // Admin Query Endpoints
  @Get('transactions')
  @ApiOperation({ summary: 'Query transaction logs (Admin only)' })
  @ApiResponse({ status: 200, description: 'Transaction logs retrieved' })
  @ApiBearerAuth()
  @AdminGuard()
  async queryTransactionLogs(@Query(ValidationPipe) query: QueryTransactionLogsDto) {
    return this.auditService.queryTransactionLogs(query);
  }

  @Get('events')
  @ApiOperation({ summary: 'Query system events (Admin only)' })
  @ApiResponse({ status: 200, description: 'System events retrieved' })
  @ApiBearerAuth()
  @AdminGuard()
  async querySystemEvents(@Query(ValidationPipe) query: QuerySystemEventsDto) {
    return this.auditService.querySystemEvents(query);
  }

  @Get('user-activity/:userId')
  @ApiOperation({ summary: 'Get user activity summary (Admin only)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'startDate', description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', description: 'End date (ISO string)' })
  @ApiResponse({ status: 200, description: 'User activity summary' })
  @ApiBearerAuth()
  @AdminGuard()
  async getUserActivity(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.auditService.getUserActivitySummary(
      userId,
      new Date(startDate),
      new Date(endDate)
    );
  }

  @Get('user-events/:userId')
  @ApiOperation({ summary: 'Get events for specific user (Admin only)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of events to return' })
  @ApiResponse({ status: 200, description: 'User events retrieved' })
  @ApiBearerAuth()
  @AdminGuard()
  async getUserEvents(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('limit') limit?: string
  ) {
    return this.auditService.getEventsByUser(userId, limit ? parseInt(limit) : undefined);
  }

  // Security & Monitoring Endpoints
  @Get('suspicious-transactions')
  @ApiOperation({ summary: 'Get suspicious transactions (Admin only)' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiResponse({ status: 200, description: 'Suspicious transactions retrieved' })
  @ApiBearerAuth()
  @AdminGuard()
  async getSuspiciousTransactions(@Query('userId') userId?: string) {
    return this.auditService.getSuspiciousTransactions(userId ? parseInt(userId) : undefined);
  }

  @Get('transactions/requiring-review')
  @ApiOperation({ summary: 'Get transactions requiring manual review (Admin only)' })
  @ApiResponse({ status: 200, description: 'Transactions requiring review' })
  @ApiBearerAuth()
  @AdminGuard()
  async getTransactionsRequiringReview() {
    return this.auditService.getTransactionsRequiringReview();
  }

  @Get('security-alerts')
  @ApiOperation({ summary: 'Get security alerts (Admin only)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of alerts to return' })
  @ApiResponse({ status: 200, description: 'Security alerts retrieved' })
  @ApiBearerAuth()
  @AdminGuard()
  async getSecurityAlerts(@Query('limit') limit?: string) {
    return this.auditService.getSecurityAlerts(limit ? parseInt(limit) : undefined);
  }

  @Get('events/requiring-investigation')
  @ApiOperation({ summary: 'Get events requiring investigation (Admin only)' })
  @ApiResponse({ status: 200, description: 'Events requiring investigation' })
  @ApiBearerAuth()
  @AdminGuard()
  async getEventsRequiringInvestigation() {
    return this.auditService.getEventsRequiringInvestigation();
  }

  @Put('events/:eventId/resolve')
  @ApiOperation({ summary: 'Resolve a system event (Admin only)' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event resolved successfully' })
  @ApiBearerAuth()
  @AdminGuard()
  async resolveEvent(
    @Param('eventId') eventId: string,
    @Body() resolutionData: { resolvedBy: number; resolutionNotes: string },
    @Headers('user-id') userId: string
  ) {
    return this.auditService.resolveEvent(
      eventId,
      resolutionData.resolvedBy,
      resolutionData.resolutionNotes
    );
  }

  // Compliance Reporting Endpoints
  @Post('generate-report')
  @ApiOperation({ summary: 'Generate compliance report (Admin only)' })
  @ApiResponse({ status: 201, description: 'Report generation initiated' })
  @ApiBearerAuth()
  @AdminGuard()
  @HttpCode(HttpStatus.CREATED)
  async generateReport(
    @Body(ValidationPipe) generateReportDto: GenerateReportDto,
    @Headers('user-id') userId: string
  ) {
    return this.auditService.generateReport(generateReportDto, parseInt(userId));
  }

  @Get('reports/:reportId')
  @ApiOperation({ summary: 'Get compliance report (Admin only)' })
  @ApiParam({ name: 'reportId', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Compliance report retrieved' })
  @ApiBearerAuth()
  @AdminGuard()
  async getReport(@Param('reportId') reportId: string) {
    return this.auditService.getReport(reportId);
  }

  @Get('reports')
  @ApiOperation({ summary: 'List compliance reports (Admin only)' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by report type' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by report status' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of reports to return' })
  @ApiResponse({ status: 200, description: 'Compliance reports list' })
  @ApiBearerAuth()
  @AdminGuard()
  async getReports(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Headers('user-id') userId?: string
  ) {
    return this.auditService.getReports(
      userId ? parseInt(userId) : undefined,
      type,
      status,
      limit ? parseInt(limit) : undefined
    );
  }

  // Statistics & Analytics Endpoints
  @Get('statistics')
  @ApiOperation({ summary: 'Get audit statistics (Admin only)' })
  @ApiQuery({ name: 'startDate', description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', description: 'End date (ISO string)' })
  @ApiResponse({ status: 200, description: 'Audit statistics' })
  @ApiBearerAuth()
  @AdminGuard()
  async getStatistics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.auditService.getEventStatistics(new Date(startDate), new Date(endDate));
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics' })
  @ApiBearerAuth()
  @AdminGuard()
  async getDashboardStats() {
    return this.auditService.getDashboardStats();
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get advanced analytics (Admin only)' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to analyze' })
  @ApiResponse({ status: 200, description: 'Advanced analytics data' })
  @ApiBearerAuth()
  @AdminGuard()
  async getAdvancedAnalytics(@Query('days') days?: string) {
    return this.auditService.getAdvancedAnalytics(days ? parseInt(days) : undefined);
  }

  // Convenience endpoints for common event logging
  @Post('events/user-login')
  @ApiOperation({ summary: 'Log user login event (Internal use only)' })
  @InternalServiceGuard()
  @HttpCode(HttpStatus.CREATED)
  async logUserLogin(@Body() loginData: {
    userId: number;
    ipAddress: string;
    userAgent?: string;
    success: boolean;
  }) {
    return this.auditService.logUserLogin(
      loginData.userId,
      loginData.ipAddress,
      loginData.userAgent,
      loginData.success
    );
  }

  @Post('events/user-logout')
  @ApiOperation({ summary: 'Log user logout event (Internal use only)' })
  @InternalServiceGuard()
  @HttpCode(HttpStatus.CREATED)
  async logUserLogout(@Body() logoutData: {
    userId: number;
    ipAddress: string;
    userAgent?: string;
  }) {
    return this.auditService.logUserLogout(
      logoutData.userId,
      logoutData.ipAddress,
      logoutData.userAgent
    );
  }

  @Post('events/admin-action')
  @ApiOperation({ summary: 'Log admin action event (Internal use only)' })
  @InternalServiceGuard()
  @HttpCode(HttpStatus.CREATED)
  async logAdminAction(@Body() actionData: {
    adminUserId: number;
    action: string;
    targetUserId?: number;
    ipAddress: string;
    details?: any;
  }) {
    return this.auditService.logAdminAction(
      actionData.adminUserId,
      actionData.action,
      actionData.targetUserId || null,
      actionData.ipAddress,
      actionData.details
    );
  }
}
