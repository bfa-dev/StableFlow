import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Wallet } from './wallet.entity';

export enum ChangeType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  MINT = 'MINT',
  BURN = 'BURN',
  FREEZE = 'FREEZE',
  UNFREEZE = 'UNFREEZE',
  FEE = 'FEE',
  ADJUSTMENT = 'ADJUSTMENT',
}

@Entity('balance_history')
@Index(['wallet_id'])
@Index(['created_at'])
@Index(['change_type'])
export class BalanceHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  wallet_id: number;

  @Column('decimal', { precision: 18, scale: 8 })
  old_balance: string;

  @Column('decimal', { precision: 18, scale: 8 })
  new_balance: string;

  @Column('decimal', { precision: 18, scale: 8 })
  amount: string;

  @Column({
    type: 'enum',
    enum: ChangeType,
  })
  change_type: ChangeType;

  @Column({ nullable: true })
  transaction_id: string;

  @Column({ nullable: true })
  reference_id: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  metadata: any;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Wallet, wallet => wallet.balance_history)
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;
} 