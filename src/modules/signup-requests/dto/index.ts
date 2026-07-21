import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { BUSINESS_TYPES, BusinessType } from '../../tenants/tenant.entity';
import { LANDING_BUSINESS_TYPES } from '../signup-request.entity';

export class CreateSignupRequestDto {
  @ApiProperty({ example: 'Al-Farooq Pharmacy', description: 'Business / shop name' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  businessName: string;

  @ApiProperty({ example: 'Ahmed Ali' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  fullName: string;

  @ApiProperty({ example: 'owner@shop.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+92 300 1234567' })
  @IsString()
  @MinLength(7)
  @MaxLength(30)
  phone: string;

  @ApiProperty({ enum: LANDING_BUSINESS_TYPES, example: 'Pharmacy POS' })
  @IsIn(LANDING_BUSINESS_TYPES)
  businessType: string;

  @ApiPropertyOptional({ example: 'Pharmacy POS', description: 'Category label of the plan card the user clicked' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  planCategoryLabel?: string;

  @ApiPropertyOptional({ example: 'Professional', description: 'Plan name of the card the user clicked' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  planName?: string;

  @ApiPropertyOptional({ example: 'Currently using a paper ledger, want to digitize.' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  note?: string;
}

export class ApproveSignupRequestDto {
  @ApiPropertyOptional({ description: 'Plan catalog entry to assign — drives the trial license\'s maxUsers/maxLocations.' })
  @IsUUID()
  @IsOptional()
  planId?: string;

  @ApiPropertyOptional({ example: 14, description: 'Trial length in days. Defaults to DEFAULT_TRIAL_DAYS (14).' })
  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  trialDays?: number;

  @ApiPropertyOptional({
    example: 'al-farooq-pharmacy',
    description: 'Subdomain slug for the POS tenant. Auto-derived from the business name if omitted.',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, {
    message: 'slug must be 2-50 chars, lowercase alphanumeric with optional hyphens',
  })
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({
    enum: BUSINESS_TYPES,
    description: 'Canonical business type for POS provisioning. Required if the submitted businessType label ("Other", etc.) can\'t be auto-mapped.',
  })
  @IsIn(BUSINESS_TYPES)
  @IsOptional()
  businessTypeOverride?: BusinessType;

  @ApiPropertyOptional({ default: true, description: 'Set false to just log this as an approved lead without provisioning a POS login (e.g. enterprise deals handled manually).' })
  @IsBoolean()
  @IsOptional()
  provisionPos?: boolean;
}

export class RejectSignupRequestDto {
  @ApiPropertyOptional({ example: "Outside our current service area." })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reason?: string;
}
