import { IsString, IsEnum, IsOptional, IsObject, ValidateNested, IsArray, IsDateString, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ReportType } from '../entities/compliance-report.entity';

class ReportDateRangeDto {
  @ApiProperty({ description: 'Start date for the report' })
  @IsDateString()
  start_date: string;

  @ApiProperty({ description: 'End date for the report' })
  @IsDateString()
  end_date: string;
}

class ReportAmountRangeDto {
  @ApiPropertyOptional({ description: 'Minimum transaction amount' })
  @IsOptional()
  @IsString()
  min?: string;

  @ApiPropertyOptional({ description: 'Maximum transaction amount' })
  @IsOptional()
  @IsString()
  max?: string;
}

class ReportFiltersDto {
  @ApiPropertyOptional({ type: [Number], description: 'Filter by specific user IDs' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  user_ids?: number[];

  @ApiPropertyOptional({ type: [String], description: 'Filter by transaction types' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  transaction_types?: string[];

  @ApiPropertyOptional({ type: ReportAmountRangeDto, description: 'Filter by amount range' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ReportAmountRangeDto)
  amount_range?: ReportAmountRangeDto;

  @ApiPropertyOptional({ type: [String], description: 'Filter by risk levels' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  risk_levels?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Filter by currencies' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  currencies?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Filter by transaction statuses' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  status_filters?: string[];
}

export class GenerateReportDto {
  @ApiProperty({ enum: ReportType, description: 'Type of report to generate' })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiProperty({ description: 'Report title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Report description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: ReportDateRangeDto, description: 'Date range for the report' })
  @IsObject()
  @ValidateNested()
  @Type(() => ReportDateRangeDto)
  date_range: ReportDateRangeDto;

  @ApiPropertyOptional({ type: ReportFiltersDto, description: 'Additional filters for the report' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ReportFiltersDto)
  filters?: ReportFiltersDto;

  @ApiPropertyOptional({ enum: ['PDF', 'CSV', 'XLSX', 'JSON'], description: 'Export format' })
  @IsOptional()
  @IsEnum(['PDF', 'CSV', 'XLSX', 'JSON'])
  export_format?: 'PDF' | 'CSV' | 'XLSX' | 'JSON';

  @ApiPropertyOptional({ description: 'Mark as confidential report' })
  @IsOptional()
  is_confidential?: boolean;

  @ApiPropertyOptional({ description: 'Mark as regulatory filing' })
  @IsOptional()
  is_regulatory_filing?: boolean;
} 