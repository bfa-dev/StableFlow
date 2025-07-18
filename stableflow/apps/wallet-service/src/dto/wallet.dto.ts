import { IsString, IsNumber, IsEnum, IsOptional, IsUUID, IsDecimal, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WalletStatus } from '../entities/wallet.entity';
import { Currency, AddressType } from '../entities/wallet-address.entity';
import { ChangeType } from '../entities/balance-history.entity';

export class CreateWalletDto {
  @ApiProperty()
  @IsNumber()
  user_id: number;

  @ApiProperty({ enum: Currency, default: Currency.USDT })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  label?: string;
}

export class UpdateBalanceDto {
  @ApiProperty()
  @IsNumber()
  user_id: number;

  @ApiProperty({ example: '100.50000000' })
  @IsString()
  amount: string;

  @ApiProperty({ enum: ChangeType })
  @IsEnum(ChangeType)
  change_type: ChangeType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  transaction_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reference_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  metadata?: any;
}

export class FreezeWalletDto {
  @ApiProperty()
  @IsNumber()
  user_id: number;

  @ApiProperty()
  @IsString()
  reason: string;

  @ApiProperty({ example: '50.00000000', required: false })
  @IsOptional()
  @IsString()
  amount?: string;
}

export class GenerateAddressDto {
  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency: Currency;

  @ApiProperty({ enum: AddressType, default: AddressType.DEPOSIT })
  @IsOptional()
  @IsEnum(AddressType)
  address_type?: AddressType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  label?: string;
}

export class WalletResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  user_id: number;

  @ApiProperty()
  address: string;

  @ApiProperty({ example: '1250.75000000' })
  balance: string;

  @ApiProperty({ example: '50.00000000' })
  frozen_balance: string;

  @ApiProperty({ enum: WalletStatus })
  status: WalletStatus;

  @ApiProperty({ enum: Currency })
  currency: Currency;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  last_transaction_at: Date;
}

export class BalanceHistoryResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ example: '1200.75000000' })
  old_balance: string;

  @ApiProperty({ example: '1250.75000000' })
  new_balance: string;

  @ApiProperty({ example: '50.00000000' })
  amount: string;

  @ApiProperty({ enum: ChangeType })
  change_type: ChangeType;

  @ApiProperty()
  transaction_id: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  created_at: Date;
}

export class WalletAddressResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: Currency })
  currency: Currency;

  @ApiProperty()
  address: string;

  @ApiProperty({ enum: AddressType })
  address_type: AddressType;

  @ApiProperty()
  is_primary: boolean;

  @ApiProperty()
  is_active: boolean;

  @ApiProperty()
  label: string;

  @ApiProperty()
  created_at: Date;
}

export class BalanceQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({ enum: ChangeType, required: false })
  @IsOptional()
  @IsEnum(ChangeType)
  change_type?: ChangeType;
} 