import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsEnum, IsIn, IsObject, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TenantPlan, TenantStatus } from '../tenant.entity';

export const BUSINESS_TYPES = ['retail', 'wholesale', 'hybrid', 'pharmacy', 'restaurant', 'service'] as const;
export type BusinessType = typeof BUSINESS_TYPES[number];

export class AutoLicenseDto {
  @ApiPropertyOptional({ enum: ['online', 'offline'], default: 'online' })
  @IsEnum(['online', 'offline'])
  @IsOptional()
  mode?: 'online' | 'offline';

  @ApiProperty({ example: '2027-01-01', description: 'License expiry date (ISO 8601)' })
  @IsDateString()
  expiresAt: string;

  @ApiPropertyOptional({ example: { maxLocations: 1, restaurantMode: false, pharmacyMode: false, multiRegister: false } })
  @IsObject()
  @IsOptional()
  features?: Record<string, unknown>;
}

export class CreateTenantDto {
  @ApiProperty({ example: 'Al-Farooq Pharmacy', description: 'Unique business name' })
  @IsString()
  @MinLength(2)
  businessName: string;

  @ApiPropertyOptional({ example: 'owner@alfarooq.com', description: 'Owner email address' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+92-300-1234567' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ enum: ['starter', 'pro', 'enterprise'], default: 'starter' })
  @IsEnum(['starter', 'pro', 'enterprise'])
  @IsOptional()
  plan?: TenantPlan;

  @ApiPropertyOptional({ example: 'Referred by Ahmed' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'When provided, automatically issues a license for this business after creation.',
    type: AutoLicenseDto,
  })
  @ValidateNested()
  @Type(() => AutoLicenseDto)
  @IsOptional()
  autoIssueLicense?: AutoLicenseDto;

  // ── POS provisioning (cloud mode) ──────────────────────────────────────────
  // When set, pointsell-control will call the POS backend to provision a schema,
  // run all seeders, and create the admin user in one atomic step.

  @ApiPropertyOptional({
    example: 'acme-pharmacy',
    description: 'Subdomain slug (becomes the POS schema prefix). Auto-derived from businessName if omitted.',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, {
    message: 'slug must be 2-50 chars, lowercase alphanumeric with optional hyphens',
  })
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ enum: BUSINESS_TYPES, example: 'pharmacy' })
  @IsIn(BUSINESS_TYPES, { message: `businessType must be one of: ${BUSINESS_TYPES.join(', ')}` })
  @IsOptional()
  businessType?: BusinessType;

  @ApiPropertyOptional({ example: 'Str0ngP@ss!', description: 'Initial admin password for the POS system (min 8 chars)' })
  @IsString()
  @MinLength(8, { message: 'adminPassword must be at least 8 characters' })
  @IsOptional()
  adminPassword?: string;

  @ApiPropertyOptional({ example: 'Ahmed Ali', description: 'Full name of the first admin user in the POS' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  adminFullName?: string;
}

export class UpdateTenantDto {
  @ApiPropertyOptional({ example: 'New Business Name' })
  @IsString()
  @IsOptional()
  businessName?: string;

  @ApiPropertyOptional({ enum: BUSINESS_TYPES, example: 'pharmacy' })
  @IsIn(BUSINESS_TYPES, { message: `businessType must be one of: ${BUSINESS_TYPES.join(', ')}` })
  @IsOptional()
  businessType?: BusinessType;

  @ApiPropertyOptional({ example: 'newemail@shop.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+92-300-9876543' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ enum: ['active', 'suspended', 'trial', 'expired'], description: 'Update subscription status' })
  @IsEnum(['active', 'suspended', 'trial', 'expired'])
  @IsOptional()
  status?: TenantStatus;

  @ApiPropertyOptional({ enum: ['starter', 'pro', 'enterprise'] })
  @IsEnum(['starter', 'pro', 'enterprise'])
  @IsOptional()
  plan?: TenantPlan;

  @ApiPropertyOptional({ example: 'Upgraded to pro plan on renewal' })
  @IsString()
  @IsOptional()
  notes?: string;
}
