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

export enum Currency {
  USDT = 'USDT',
  USDC = 'USDC',
  ETH = 'ETH',
  BTC = 'BTC',
}

export enum AddressType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
}

@Entity('wallet_addresses')
@Index(['wallet_id'])
@Index(['currency'])
export class WalletAddress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  wallet_id: number;

  @Column({
    type: 'enum',
    enum: Currency,
  })
  currency: Currency;

  @Column({ unique: true })
  address: string;

  @Column({
    type: 'enum',
    enum: AddressType,
    default: AddressType.DEPOSIT,
  })
  address_type: AddressType;

  @Column({ default: true })
  is_primary: boolean;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'text', nullable: true })
  label: string;

  @Column({ type: 'json', nullable: true })
  metadata: any;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Wallet, wallet => wallet.addresses)
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;
} 