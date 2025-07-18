import { IsOptional, IsString, IsNumber, IsEnum, IsDateString, IsBoolean, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TransactionType, TransactionStatus } from '../entities/transaction-log.entity';
import { EventType, Severity } from '../entities/system-event.entity';

export class QueryTransactionLogsDto {
  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  user_id?: number;

  @ApiPropertyOptional({ description: 'Filter by transaction ID' })
  @IsOptional()
  @IsString()
  transaction_id?: string;

  @ApiPropertyOptional({ enum: TransactionType, description: 'Filter by transaction type' })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({ enum: TransactionStatus, description: 'Filter by transaction status' })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({ description: 'Filter by currency' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Start date for filtering' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ description: 'End date for filtering' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ description: 'Minimum transaction amount' })
  @IsOptional()
  @IsString()
  min_amount?: string;

  @ApiPropertyOptional({ description: 'Maximum transaction amount' })
  @IsOptional()
  @IsString()
  max_amount?: string;

  @ApiPropertyOptional({ description: 'Filter by suspicious transactions' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_suspicious?: boolean;

  @ApiPropertyOptional({ description: 'Filter by transactions requiring review' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  requires_review?: boolean;

  @ApiPropertyOptional({ description: 'Page number for pagination', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort field', default: 'timestamp' })
  @IsOptional()
  @IsString()
  sort_by?: string = 'timestamp';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sort_order?: 'ASC' | 'DESC' = 'DESC';
}

export class QuerySystemEventsDto {
  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  user_id?: number;

  @ApiPropertyOptional({ enum: EventType, description: 'Filter by event type' })
  @IsOptional()
  @IsEnum(EventType)
  event_type?: EventType;

  @ApiPropertyOptional({ enum: Severity, description: 'Filter by event severity' })
  @IsOptional()
  @IsEnum(Severity)
  severity?: Severity;

  @ApiPropertyOptional({ description: 'Filter by IP address' })
  @IsOptional()
  @IsString()
  ip_address?: string;

  @ApiPropertyOptional({ description: 'Start date for filtering' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ description: 'End date for filtering' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ description: 'Filter by events requiring investigation' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  requires_investigation?: boolean;

  @ApiPropertyOptional({ description: 'Filter by resolved events' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_resolved?: boolean;

  @ApiPropertyOptional({ description: 'Search in event description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number for pagination', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort field', default: 'timestamp' })
  @IsOptional()
  @IsString()
  sort_by?: string = 'timestamp';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sort_order?: 'ASC' | 'DESC' = 'DESC';
} 