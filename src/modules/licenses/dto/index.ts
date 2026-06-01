import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsObject, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

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

  @ApiPropertyOptional({
    description: 'Feature flags for this license',
    example: { maxLocations: 1, restaurantMode: false, pharmacyMode: true, multiRegister: false },
  })
  @IsObject()
  @IsOptional()
  features?: Record<string, unknown>;
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
