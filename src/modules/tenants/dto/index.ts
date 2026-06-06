import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEmail, IsEnum, IsObject, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TenantPlan, TenantStatus } from '../tenant.entity';

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
}

export class UpdateTenantDto {
  @ApiPropertyOptional({ example: 'New Business Name' })
  @IsString()
  @IsOptional()
  businessName?: string;

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
