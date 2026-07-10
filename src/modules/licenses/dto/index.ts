import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsObject, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateLicenseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Tenant UUID to assign this license to' })
  @IsUUID()
  tenantId: string;

  @ApiProperty({ enum: ['online', 'offline'], description: 'online = phones home for heartbeat; offline = fully air-gapped' })
  @IsEnum(['online', 'offline'])
  mode: 'online' | 'offline';

  @ApiProperty({ example: '2027-01-01', description: 'License expiry date (ISO 8601)' })
  @IsDateString()
  expiresAt: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Plan catalog id to snapshot maxUsers/maxLocations from' })
  @IsUUID()
  @IsOptional()
  planId?: string;

  @ApiPropertyOptional({
    description: 'Feature flags for this license',
    example: { maxLocations: 1, restaurantMode: false, pharmacyMode: true, multiRegister: false },
  })
  @IsObject()
  @IsOptional()
  features?: Record<string, unknown>;
}

export class RenewLicenseDto {
  @ApiPropertyOptional({ example: 30, description: 'Days to extend by. Defaults to the license\'s plan durationDays, or 30.' })
  @IsInt()
  @Min(1)
  @IsOptional()
  durationDays?: number;

  @ApiPropertyOptional({ example: 2500, description: 'Amount actually charged for this renewal. Defaults to the plan\'s catalog price.' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ example: 'Paid via bank transfer' })
  @IsString()
  @IsOptional()
  note?: string;
}

export class ChangeLicensePlanDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'New plan catalog id' })
  @IsUUID()
  planId: string;

  @ApiPropertyOptional({ example: false, description: 'Also extend expiresAt by the new plan\'s durationDays' })
  @IsBoolean()
  @IsOptional()
  extend?: boolean;

  @ApiPropertyOptional({ example: 2500, description: 'Amount actually charged for this change. Defaults to the new plan\'s catalog price.' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ example: 'Upgraded mid-cycle, prorated manually' })
  @IsString()
  @IsOptional()
  note?: string;
}

export class ActivateLicenseDto {
  @ApiProperty({ example: 'A1B2C3-D4E5F6-G7H8I9-J0K1L2', description: 'License key from the control panel' })
  @IsString()
  @MinLength(6)
  licenseKey: string;

  @ApiProperty({ example: 'a3f1b2c4...', description: 'SHA-256 machine fingerprint from GET /v1/license/fingerprint' })
  @IsString()
  fingerprint: string;

  @ApiPropertyOptional({ example: 'Al-Farooq Pharmacy', description: 'Business name to embed in the signed license file' })
  @IsString()
  @IsOptional()
  businessName?: string;
}

export class HeartbeatDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'License UUID from the signed license file' })
  @IsUUID()
  licenseId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Tenant UUID from the signed license file' })
  @IsUUID()
  tenantId: string;

  @ApiPropertyOptional({ example: '1.2.0', description: 'Installed POS version' })
  @IsString()
  @IsOptional()
  version?: string;
}
