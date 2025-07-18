import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AlertRuleDocument = AlertRule & Document;

export enum AlertType {
  LARGE_TRANSACTION = 'LARGE_TRANSACTION',
  RAPID_SUCCESSION = 'RAPID_SUCCESSION',
  UNUSUAL_TIME = 'UNUSUAL_TIME',
  VELOCITY_CHECK = 'VELOCITY_CHECK',
  PATTERN_DETECTION = 'PATTERN_DETECTION',
  CROSS_BORDER = 'CROSS_BORDER',
  ACCOUNT_TAKEOVER = 'ACCOUNT_TAKEOVER',
  THRESHOLD_BREACH = 'THRESHOLD_BREACH',
  BLACKLIST_MATCH = 'BLACKLIST_MATCH',
}

export enum AlertAction {
  LOG_ONLY = 'LOG_ONLY',
  EMAIL_NOTIFICATION = 'EMAIL_NOTIFICATION',
  SMS_ALERT = 'SMS_ALERT',
  FREEZE_ACCOUNT = 'FREEZE_ACCOUNT',
  BLOCK_TRANSACTION = 'BLOCK_TRANSACTION',
  REQUIRE_REVIEW = 'REQUIRE_REVIEW',
  WEBHOOK_NOTIFICATION = 'WEBHOOK_NOTIFICATION',
}

@Schema({ 
  timestamps: true,
  collection: 'alert_rules'
})
export class AlertRule {
  @Prop({ required: true, unique: true })
  rule_id: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true, enum: AlertType })
  type: AlertType;

  @Prop({ required: true, default: true })
  active: boolean;

  @Prop({ required: true, type: Object })
  conditions: {
    // Transaction amount conditions
    amount_threshold?: string;
    amount_currency?: string;
    
    // Time-based conditions
    time_window_minutes?: number;
    transaction_count_threshold?: number;
    
    // Time range conditions
    unusual_hours?: {
      start_hour: number;
      end_hour: number;
    };
    
    // Velocity conditions
    daily_limit?: string;
    monthly_limit?: string;
    
    // Pattern conditions
    min_pattern_occurrences?: number;
    pattern_type?: string;
    
    // Geographic conditions
    restricted_countries?: string[];
    
    // User-based conditions
    user_risk_levels?: string[];
    new_user_days?: number;
    
    // Custom conditions
    custom_rules?: any[];
  };

  @Prop({ required: true, type: [String], enum: AlertAction })
  actions: AlertAction[];

  @Prop({ required: true })
  priority: number;

  @Prop({ required: true })
  created_by: number;

  @Prop()
  updated_by?: number;

  @Prop({ default: 0 })
  triggered_count: number;

  @Prop()
  last_triggered?: Date;

  @Prop({ type: Object })
  configuration: {
    notification_emails?: string[];
    webhook_url?: string;
    cooldown_minutes?: number;
    max_triggers_per_day?: number;
    escalation_threshold?: number;
    auto_resolve_minutes?: number;
    custom_message?: string;
  };

  @Prop({ default: false })
  is_system_rule: boolean;

  @Prop()
  expires_at?: Date;
}

export const AlertRuleSchema = SchemaFactory.createForClass(AlertRule); 