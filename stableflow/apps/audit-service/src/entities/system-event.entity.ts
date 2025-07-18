import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SystemEventDocument = SystemEvent & Document;

export enum EventType {
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_REGISTRATION = 'USER_REGISTRATION',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  FAILED_LOGIN_ATTEMPT = 'FAILED_LOGIN_ATTEMPT',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  WALLET_CREATED = 'WALLET_CREATED',
  WALLET_FROZEN = 'WALLET_FROZEN',
  WALLET_UNFROZEN = 'WALLET_UNFROZEN',
  ADMIN_ACTION = 'ADMIN_ACTION',
  COMPLIANCE_ALERT = 'COMPLIANCE_ALERT',
  FRAUD_DETECTED = 'FRAUD_DETECTED',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
}

export enum Severity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

@Schema({ 
  timestamps: true,
  collection: 'system_events'
})
export class SystemEvent {
  @Prop({ required: true, enum: EventType })
  event_type: EventType;

  @Prop({ required: false })
  user_id?: number;

  @Prop({ required: false })
  admin_user_id?: number;

  @Prop({ required: true })
  ip_address: string;

  @Prop()
  user_agent?: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: Severity, default: Severity.LOW })
  severity: Severity;

  @Prop({ type: Object })
  metadata: {
    endpoint?: string;
    method?: string;
    status_code?: number;
    response_time?: number;
    session_id?: string;
    correlation_id?: string;
    geolocation?: {
      country?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
    };
    device_info?: {
      platform?: string;
      browser?: string;
      version?: string;
    };
    additional_data?: any;
  };

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ default: false })
  requires_investigation: boolean;

  @Prop({ default: false })
  is_resolved: boolean;

  @Prop()
  resolved_by?: number;

  @Prop()
  resolved_at?: Date;

  @Prop()
  resolution_notes?: string;
}

export const SystemEventSchema = SchemaFactory.createForClass(SystemEvent); 