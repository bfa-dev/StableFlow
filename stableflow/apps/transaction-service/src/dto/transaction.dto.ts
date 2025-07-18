import { IsString, IsNumber, IsEnum, IsOptional, IsUUID, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TransactionType, TransactionStatus } from '../entities/transaction.entity';

export class MintTokensDto {
  @ApiProperty({ example: '1000.50000000' })
  @IsString()
  amount: string;

  @ApiProperty()
  @IsNumber()
  to_user_id: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reference_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  metadata?: any;
}

export class BurnTokensDto {
  @ApiProperty({ example: '500.25000000' })
  @IsString()
  amount: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  from_user_id?: number; // Optional, if not provided, uses current user

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reference_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  metadata?: any;
}

export class TransferTokensDto {
  @ApiProperty({ example: '250.75000000' })
  @IsString()
  amount: string;

  @ApiProperty()
  @IsNumber()
  to_user_id: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reference_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  metadata?: any;
}

export class BulkTransferItem {
  @ApiProperty()
  @IsNumber()
  to_user_id: number;

  @ApiProperty({ example: '100.00000000' })
  @IsString()
  amount: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reference_id?: string;
}

export class BulkTransferDto {
  @ApiProperty({ type: [BulkTransferItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkTransferItem)
  transfers: BulkTransferItem[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  metadata?: any;
}

export class UpdateTransactionLimitsDto {
  @ApiProperty()
  @IsNumber()
  user_id: number;

  @ApiProperty({ example: '15000.00000000', required: false })
  @IsOptional()
  @IsString()
  daily_limit?: string;

  @ApiProperty({ example: '150000.00000000', required: false })
  @IsOptional()
  @IsString()
  monthly_limit?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  is_active?: boolean;
}

export class TransactionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: TransactionType })
  type: TransactionType;

  @ApiProperty()
  from_user_id: number;

  @ApiProperty()
  to_user_id: number;

  @ApiProperty({ example: '1000.50000000' })
  amount: string;

  @ApiProperty({ example: '5.00000000' })
  fee: string;

  @ApiProperty({ enum: TransactionStatus })
  status: TransactionStatus;

  @ApiProperty()
  description: string;

  @ApiProperty()
  reference_id: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  processed_at: Date;
}

export class TransactionLimitResponseDto {
  @ApiProperty()
  user_id: number;

  @ApiProperty({ example: '10000.00000000' })
  daily_limit: string;

  @ApiProperty({ example: '100000.00000000' })
  monthly_limit: string;

  @ApiProperty({ example: '2500.75000000' })
  current_daily: string;

  @ApiProperty({ example: '15750.25000000' })
  current_monthly: string;

  @ApiProperty()
  daily_reset_date: Date;

  @ApiProperty()
  monthly_reset_date: Date;

  @ApiProperty()
  is_active: boolean;
}

export class TransactionQueryDto {
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

  @ApiProperty({ enum: TransactionType, required: false })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiProperty({ enum: TransactionStatus, required: false })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  user_id?: number;
} 