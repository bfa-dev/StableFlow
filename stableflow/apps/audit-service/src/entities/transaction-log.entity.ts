import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TransactionLogDocument = TransactionLog & Document;

export enum TransactionType {
  MINT = 'MINT',
  BURN = 'BURN',
  TRANSFER = 'TRANSFER',
  BULK_TRANSFER = 'BULK_TRANSFER',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Schema({ 
  timestamps: true,
  collection: 'transaction_logs'
})
export class TransactionLog {
  @Prop({ required: true, unique: true })
  transaction_id: string;

  @Prop({ required: true })
  user_id: number;

  @Prop({ required: false })
  from_user_id?: number;

  @Prop({ required: false })
  to_user_id?: number;

  @Prop({ required: true, enum: TransactionType })
  type: TransactionType;

  @Prop({ required: true, type: String })
  amount: string;

  @Prop({ required: false, type: String })
  fee?: string;

  @Prop({ required: true })
  currency: string;

  @Prop({ required: true, enum: TransactionStatus })
  status: TransactionStatus;

  @Prop({ type: Object })
  metadata: {
    ip_address?: string;
    user_agent?: string;
    wallet_balance_before?: string;
    wallet_balance_after?: string;
    correlation_id?: string;
    admin_user_id?: number;
    bulk_operation_id?: string;
    fraud_score?: number;
    risk_level?: 'LOW' | 'MEDIUM' | 'HIGH';
    compliance_flags?: string[];
  };

  @Prop({ required: true })
  timestamp: Date;

  @Prop()
  processed_at?: Date;

  @Prop()
  error_message?: string;

  @Prop({ default: false })
  is_suspicious: boolean;

  @Prop({ default: false })
  requires_review: boolean;
}

export const TransactionLogSchema = SchemaFactory.createForClass(TransactionLog); 