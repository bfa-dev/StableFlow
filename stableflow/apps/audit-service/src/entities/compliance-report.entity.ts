import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ComplianceReportDocument = ComplianceReport & Document;

export enum ReportType {
  DAILY_TRANSACTION_SUMMARY = 'DAILY_TRANSACTION_SUMMARY',
  WEEKLY_TRANSACTION_SUMMARY = 'WEEKLY_TRANSACTION_SUMMARY',
  MONTHLY_TRANSACTION_SUMMARY = 'MONTHLY_TRANSACTION_SUMMARY',
  LARGE_TRANSACTION_REPORT = 'LARGE_TRANSACTION_REPORT',
  SUSPICIOUS_ACTIVITY_REPORT = 'SUSPICIOUS_ACTIVITY_REPORT',
  USER_ACTIVITY_REPORT = 'USER_ACTIVITY_REPORT',
  FRAUD_DETECTION_REPORT = 'FRAUD_DETECTION_REPORT',
  COMPLIANCE_AUDIT_REPORT = 'COMPLIANCE_AUDIT_REPORT',
  REGULATORY_FILING = 'REGULATORY_FILING',
  AML_SCREENING_REPORT = 'AML_SCREENING_REPORT',
}

export enum ReportStatus {
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  EXPORTED = 'EXPORTED',
}

@Schema({ 
  timestamps: true,
  collection: 'compliance_reports'
})
export class ComplianceReport {
  @Prop({ required: true, unique: true })
  report_id: string;

  @Prop({ required: true, enum: ReportType })
  type: ReportType;

  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ required: true, type: Object })
  date_range: {
    start_date: Date;
    end_date: Date;
  };

  @Prop({ required: true, enum: ReportStatus, default: ReportStatus.GENERATING })
  status: ReportStatus;

  @Prop({ required: true })
  generated_by: number;

  @Prop({ required: true })
  generated_at: Date;

  @Prop()
  completed_at?: Date;

  @Prop({ type: Object })
  data: {
    total_transactions?: number;
    total_volume?: string;
    mint_operations?: number;
    burn_operations?: number;
    transfer_operations?: number;
    unique_users?: number;
    large_transactions?: any[];
    suspicious_activities?: any[];
    compliance_violations?: any[];
    risk_metrics?: {
      high_risk_transactions: number;
      fraud_alerts: number;
      aml_flags: number;
    };
    summary_statistics?: any;
    detailed_records?: any[];
  };

  @Prop({ type: Object })
  filters: {
    user_ids?: number[];
    transaction_types?: string[];
    amount_range?: {
      min: string;
      max: string;
    };
    risk_levels?: string[];
    currencies?: string[];
    status_filters?: string[];
  };

  @Prop()
  file_path?: string;

  @Prop()
  file_size?: number;

  @Prop()
  export_format?: 'PDF' | 'CSV' | 'XLSX' | 'JSON';

  @Prop()
  error_message?: string;

  @Prop({ default: false })
  is_confidential: boolean;

  @Prop({ default: false })
  is_regulatory_filing: boolean;

  @Prop()
  retention_until?: Date;
}

export const ComplianceReportSchema = SchemaFactory.createForClass(ComplianceReport); 