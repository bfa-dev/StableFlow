import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('transaction_limits')
export class TransactionLimit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  user_id: number;

  @Column('decimal', { precision: 18, scale: 8, default: 10000 })
  daily_limit: string;

  @Column('decimal', { precision: 18, scale: 8, default: 100000 })
  monthly_limit: string;

  @Column('decimal', { precision: 18, scale: 8, default: 0 })
  current_daily: string;

  @Column('decimal', { precision: 18, scale: 8, default: 0 })
  current_monthly: string;

  @Column({ type: 'date' })
  daily_reset_date: Date;

  @Column({ type: 'date' })
  monthly_reset_date: Date;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
} 