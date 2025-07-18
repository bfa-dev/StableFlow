import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuditServiceController } from './audit-service.controller';
import { AuditServiceService } from './audit-service.service';
import { TransactionLoggingService } from './services/transaction-logging.service';
import { SystemEventLoggingService } from './services/system-event-logging.service';
import { ComplianceReportingService } from './services/compliance-reporting.service';

// Entities/Schemas
import { TransactionLog, TransactionLogSchema } from './entities/transaction-log.entity';
import { SystemEvent, SystemEventSchema } from './entities/system-event.entity';
import { ComplianceReport, ComplianceReportSchema } from './entities/compliance-report.entity';
import { AlertRule, AlertRuleSchema } from './entities/alert-rule.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI') || 'mongodb://localhost:27017/stableflow_audit',
        retryWrites: true,
        w: 'majority',
      }),
    }),
    MongooseModule.forFeature([
      { name: TransactionLog.name, schema: TransactionLogSchema },
      { name: SystemEvent.name, schema: SystemEventSchema },
      { name: ComplianceReport.name, schema: ComplianceReportSchema },
      { name: AlertRule.name, schema: AlertRuleSchema },
    ]),
  ],
  controllers: [AuditServiceController],
  providers: [
    AuditServiceService,
    TransactionLoggingService,
    SystemEventLoggingService,
    ComplianceReportingService,
  ],
  exports: [
    AuditServiceService,
    TransactionLoggingService,
    SystemEventLoggingService,
    ComplianceReportingService,
  ],
})
export class AuditServiceModule {}
