import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Plan } from '../plans/plan.entity';

export type TenantStatus   = 'active' | 'suspended' | 'trial' | 'expired';
/** @deprecated display-only legacy label — real limits come from `plan`/`planId` (see Plan entity) */
export type TenantPlan     = 'starter' | 'pro' | 'enterprise';

// Kept in sync with nestjs-pos's SeedBusinessType (common/database/seeds/business-profile.seed.ts)
// and CompleteOnboardingDto's SEED_PROFILES — the full set of seedable business profiles.
// Single source of truth: dto/index.ts imports this instead of redefining its own list.
export const BUSINESS_TYPES = [
  'retail',
  'wholesale',
  'hybrid',
  'pharmacy',
  'grocery',
  'cosmetics',
  'bakery',
  'electronics',
  'hardware',
  'restaurant',
  'service',
] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

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

  /** @deprecated legacy display label, kept for backward compatibility — see `plan`/`planId` for the real entitlement */
  @ApiProperty({ enum: ['starter', 'pro', 'enterprise'], default: 'starter' })
  @Column({ type: 'enum', enum: ['starter', 'pro', 'enterprise'], default: 'starter' })
  legacyPlan: TenantPlan;

  /** The plan catalog entry actually driving this tenant's seat/location limits. */
  @ApiPropertyOptional({ type: () => Plan, nullable: true })
  @ManyToOne(() => Plan, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'planId' })
  plan: Plan | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ nullable: true })
  planId: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  trialEndsAt: Date | null;

  /**
   * Denormalized read-cache of the current entitlement expiry, mirrored from
   * the tenant's active License.expiresAt whenever a license is created/renewed.
   * Lets the Tenants list show expiry without an extra join.
   */
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  subscriptionEndsAt: Date | null;

  @ApiPropertyOptional({ enum: BUSINESS_TYPES })
  @Column({
    type: 'enum',
    enum: BUSINESS_TYPES,
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
