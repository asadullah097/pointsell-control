import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type TenantStatus   = 'active' | 'suspended' | 'trial' | 'expired';
export type TenantPlan     = 'starter' | 'pro' | 'enterprise';
export type BusinessType   = 'retail' | 'wholesale' | 'hybrid' | 'pharmacy' | 'restaurant' | 'service';

@Entity('tenants')
export class Tenant {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Al-Farooq Pharmacy' })
  @Column({ unique: true })
  businessName: string;

  @ApiPropertyOptional({ example: 'owner@shop.com' })
  @Column({ unique: true, nullable: true })
  email: string;

  @ApiPropertyOptional({ example: '+92-300-1234567' })
  @Column({ nullable: true })
  phone: string;

  @ApiProperty({ enum: ['active', 'suspended', 'trial', 'expired'], default: 'trial' })
  @Column({ type: 'enum', enum: ['active', 'suspended', 'trial', 'expired'], default: 'trial' })
  status: TenantStatus;

  @ApiProperty({ enum: ['starter', 'pro', 'enterprise'], default: 'starter' })
  @Column({ type: 'enum', enum: ['starter', 'pro', 'enterprise'], default: 'starter' })
  plan: TenantPlan;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  trialEndsAt: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  subscriptionEndsAt: Date | null;

  @ApiPropertyOptional({ enum: ['retail', 'wholesale', 'hybrid', 'pharmacy', 'restaurant', 'service'] })
  @Column({
    type: 'enum',
    enum: ['retail', 'wholesale', 'hybrid', 'pharmacy', 'restaurant', 'service'],
    nullable: true,
  })
  businessType: BusinessType | null;

  @ApiPropertyOptional({ example: 'Referred by Ahmed' })
  @Column({ nullable: true })
  notes: string;

  @ApiPropertyOptional({ example: 'alfarooq-pharmacy', description: 'Slug of the linked tenant in the POS backend (set after provisioning)' })
  @Column({ nullable: true, unique: true })
  posSlug: string | null;

  @ApiPropertyOptional({ example: '1.2.0', description: 'Last POS version seen via heartbeat' })
  @Column({ nullable: true })
  lastSeenVersion: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  lastHeartbeatAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @UpdateDateColumn()
  updatedAt: Date;
}
