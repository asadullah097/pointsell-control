import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { BillingCycle } from '../plan.entity';

export class CreatePlanDto {
  @ApiProperty({ example: 'basic', description: 'Machine key — lowercase, unique, never shown to tenants' })
  @IsString()
  @MinLength(2)
  key: string;

  @ApiProperty({ example: 'Basic' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ example: 'For a single shop with one cashier.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 1, nullable: true, description: 'Omit or set null for unlimited' })
  @IsInt()
  @Min(0)
  @IsOptional()
  maxUsers?: number | null;

  @ApiPropertyOptional({ example: 1, nullable: true, description: 'Omit or set null for unlimited' })
  @IsInt()
  @Min(0)
  @IsOptional()
  maxLocations?: number | null;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ enum: ['monthly', 'yearly'], default: 'monthly' })
  @IsEnum(['monthly', 'yearly'])
  @IsOptional()
  billingCycle?: BillingCycle;

  @ApiPropertyOptional({ example: 30 })
  @IsInt()
  @Min(1)
  @IsOptional()
  durationDays?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class UpdatePlanDto {
  @ApiPropertyOptional({ example: 'Basic' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsInt()
  @Min(0)
  @IsOptional()
  maxUsers?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsInt()
  @Min(0)
  @IsOptional()
  maxLocations?: number | null;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ enum: ['monthly', 'yearly'] })
  @IsEnum(['monthly', 'yearly'])
  @IsOptional()
  billingCycle?: BillingCycle;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  durationDays?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
