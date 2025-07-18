import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TransactionType {
  MINT = 'MINT',
  BURN = 'BURN',
  TRANSFER = 'TRANSFER',
  BULK_TRANSFER = 'BULK_TRANSFER',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Entity('transactions')
@Index(['from_user_id'])
@Index(['to_user_id'])
@Index(['status'])
@Index(['type'])
@Index(['created_at'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({ nullable: true })
  from_user_id: number;

  @Column({ nullable: true })
  to_user_id: number;

  @Column('decimal', { precision: 18, scale: 8 })
  amount: string;

  @Column('decimal', { precision: 18, scale: 8, default: 0 })
  fee: string;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  reference_id: string;

  @Column({ type: 'json', nullable: true })
  metadata: any;

  @Column({ type: 'text', nullable: true })
  failure_reason: string;

  @Column({ nullable: true })
  processed_by: number; // User ID who processed the transaction

  @Column({ type: 'timestamp', nullable: true })
  processed_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
} 