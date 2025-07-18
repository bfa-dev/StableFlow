import { IsString, IsNumber, IsEnum, IsOptional, IsObject, ValidateNested, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TransactionType, TransactionStatus } from '../entities/transaction-log.entity';

class TransactionMetadataDto {
  @ApiPropertyOptional({ description: 'IP address of the request' })
  @IsOptional()
  @IsString()
  ip_address?: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  @IsOptional()
  @IsString()
  user_agent?: string;

  @ApiPropertyOptional({ description: 'Wallet balance before transaction' })
  @IsOptional()
  @IsString()
  wallet_balance_before?: string;

  @ApiPropertyOptional({ description: 'Wallet balance after transaction' })
  @IsOptional()
  @IsString()
  wallet_balance_after?: string;

  @ApiPropertyOptional({ description: 'Correlation ID for tracking' })
  @IsOptional()
  @IsString()
  correlation_id?: string;

  @ApiPropertyOptional({ description: 'Admin user ID if admin action' })
  @IsOptional()
  @IsNumber()
  admin_user_id?: number;

  @ApiPropertyOptional({ description: 'Bulk operation ID' })
  @IsOptional()
  @IsString()
  bulk_operation_id?: string;

  @ApiPropertyOptional({ description: 'Fraud detection score (0-100)' })
  @IsOptional()
  @IsNumber()
  fraud_score?: number;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH'], description: 'Risk level assessment' })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'])
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH';

  @ApiPropertyOptional({ type: [String], description: 'Compliance flags' })
  @IsOptional()
  compliance_flags?: string[];
}

export class LogTransactionDto {
  @ApiProperty({ description: 'Unique transaction identifier' })
  @IsString()
  transaction_id: string;

  @ApiProperty({ description: 'User ID performing the transaction' })
  @IsNumber()
  user_id: number;

  @ApiPropertyOptional({ description: 'From user ID for transfers' })
  @IsOptional()
  @IsNumber()
  from_user_id?: number;

  @ApiPropertyOptional({ description: 'To user ID for transfers' })
  @IsOptional()
  @IsNumber()
  to_user_id?: number;

  @ApiProperty({ enum: TransactionType, description: 'Type of transaction' })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ description: 'Transaction amount as string for precision' })
  @IsString()
  amount: string;

  @ApiPropertyOptional({ description: 'Transaction fee as string for precision' })
  @IsOptional()
  @IsString()
  fee?: string;

  @ApiProperty({ description: 'Currency type (USDT, USDC, etc.)' })
  @IsString()
  currency: string;

  @ApiProperty({ enum: TransactionStatus, description: 'Transaction status' })
  @IsEnum(TransactionStatus)
  status: TransactionStatus;

  @ApiPropertyOptional({ type: TransactionMetadataDto, description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => TransactionMetadataDto)
  metadata?: TransactionMetadataDto;

  @ApiPropertyOptional({ description: 'Error message if transaction failed' })
  @IsOptional()
  @IsString()
  error_message?: string;

  @ApiPropertyOptional({ description: 'Mark transaction as suspicious' })
  @IsOptional()
  @IsBoolean()
  is_suspicious?: boolean;

  @ApiPropertyOptional({ description: 'Mark transaction as requiring review' })
  @IsOptional()
  @IsBoolean()
  requires_review?: boolean;
} 