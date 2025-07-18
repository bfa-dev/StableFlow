import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { BalanceHistory } from './balance-history.entity';
import { WalletAddress, Currency } from './wallet-address.entity';

export enum WalletStatus {
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
  SUSPENDED = 'SUSPENDED',
  CLOSED = 'CLOSED',
}



@Entity('wallets')
@Index(['user_id'])
export class Wallet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column({ unique: true })
  address: string;

  @Column('decimal', { precision: 18, scale: 8, default: 0 })
  balance: string;

  @Column('decimal', { precision: 18, scale: 8, default: 0 })
  frozen_balance: string;

  @Column({
    type: 'enum',
    enum: WalletStatus,
    default: WalletStatus.ACTIVE,
  })
  status: WalletStatus;

  @Column({
    type: 'enum',
    enum: Currency,
    default: Currency.USDT,
  })
  currency: Currency;

  @Column({ type: 'text', nullable: true })
  freeze_reason: string;

  @Column({ type: 'timestamp', nullable: true })
  frozen_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  last_transaction_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => BalanceHistory, history => history.wallet)
  balance_history: BalanceHistory[];

  @OneToMany(() => WalletAddress, address => address.wallet)
  addresses: WalletAddress[];
} 