import { IsString, IsNumber, IsEnum, IsOptional, IsObject, ValidateNested, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { EventType, Severity } from '../entities/system-event.entity';

class EventGeolocationDto {
  @ApiPropertyOptional({ description: 'Country code' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'City name' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Latitude coordinate' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude coordinate' })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}

class EventDeviceInfoDto {
  @ApiPropertyOptional({ description: 'Device platform' })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({ description: 'Browser name' })
  @IsOptional()
  @IsString()
  browser?: string;

  @ApiPropertyOptional({ description: 'Browser version' })
  @IsOptional()
  @IsString()
  version?: string;
}

class EventMetadataDto {
  @ApiPropertyOptional({ description: 'API endpoint called' })
  @IsOptional()
  @IsString()
  endpoint?: string;

  @ApiPropertyOptional({ description: 'HTTP method' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ description: 'HTTP status code' })
  @IsOptional()
  @IsNumber()
  status_code?: number;

  @ApiPropertyOptional({ description: 'Response time in milliseconds' })
  @IsOptional()
  @IsNumber()
  response_time?: number;

  @ApiPropertyOptional({ description: 'Session identifier' })
  @IsOptional()
  @IsString()
  session_id?: string;

  @ApiPropertyOptional({ description: 'Correlation ID for tracking' })
  @IsOptional()
  @IsString()
  correlation_id?: string;

  @ApiPropertyOptional({ type: EventGeolocationDto, description: 'Geolocation data' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => EventGeolocationDto)
  geolocation?: EventGeolocationDto;

  @ApiPropertyOptional({ type: EventDeviceInfoDto, description: 'Device information' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => EventDeviceInfoDto)
  device_info?: EventDeviceInfoDto;

  @ApiPropertyOptional({ description: 'Additional custom data' })
  @IsOptional()
  additional_data?: any;
}

export class LogEventDto {
  @ApiProperty({ enum: EventType, description: 'Type of system event' })
  @IsEnum(EventType)
  event_type: EventType;

  @ApiPropertyOptional({ description: 'User ID associated with the event' })
  @IsOptional()
  @IsNumber()
  user_id?: number;

  @ApiPropertyOptional({ description: 'Admin user ID if admin action' })
  @IsOptional()
  @IsNumber()
  admin_user_id?: number;

  @ApiProperty({ description: 'IP address of the request' })
  @IsString()
  ip_address: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  @IsOptional()
  @IsString()
  user_agent?: string;

  @ApiProperty({ description: 'Event description' })
  @IsString()
  description: string;

  @ApiProperty({ enum: Severity, description: 'Event severity level', default: Severity.LOW })
  @IsEnum(Severity)
  severity: Severity;

  @ApiPropertyOptional({ type: EventMetadataDto, description: 'Additional event metadata' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => EventMetadataDto)
  metadata?: EventMetadataDto;

  @ApiPropertyOptional({ description: 'Mark event as requiring investigation' })
  @IsOptional()
  @IsBoolean()
  requires_investigation?: boolean;
} 