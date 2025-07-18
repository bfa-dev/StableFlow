import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TransactionLogStatus {
  RECEIVED = 'RECEIVED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
  DEAD_LETTER = 'DEAD_LETTER',
}

@Entity('transaction_logs')
export class TransactionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  transaction_id: string;

  @Column({
    type: 'enum',
    enum: TransactionLogStatus,
    default: TransactionLogStatus.RECEIVED,
  })
  status: TransactionLogStatus;

  @Column({ type: 'int', default: 0 })
  retry_count: number;

  @Column({ type: 'int', default: 3 })
  max_retries: number;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @Column({ type: 'json', nullable: true })
  transaction_data: any;

  @Column({ type: 'json', nullable: true })
  wallet_updates: any;

  @Column({ type: 'timestamp', nullable: true })
  processed_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  next_retry_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
} 