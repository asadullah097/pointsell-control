import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type SignupRequestStatus = 'pending' | 'approved' | 'rejected';

/** Raw category label the landing page's plan picker sends — see tijarah-landing-page's Pricing.tsx `categories`. */
export const LANDING_BUSINESS_TYPES = ['Retail POS', 'Restaurant POS', 'Pharmacy POS', 'Other'] as const;
export type LandingBusinessType = (typeof LANDING_BUSINESS_TYPES)[number];

/**
 * A "start free trial" / "contact sales" submission from the public landing page,
 * awaiting admin review. Approving one provisions a real Tenant (+ POS login + trial
 * license) via TenantsService and emails the owner their credentials; rejecting one
 * just notifies them. See signup-requests.service.ts for the full flow.
 */
@Entity('signup_requests')
export class SignupRequest {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Al-Farooq Pharmacy' })
  @Column()
  businessName: string;

  @ApiProperty({ example: 'Ahmed Ali' })
  @Column()
  fullName: string;

  @ApiProperty({ example: 'owner@shop.com' })
  @Column()
  email: string;

  @ApiProperty({ example: '+92 300 1234567' })
  @Column()
  phone: string;

  @ApiProperty({ enum: LANDING_BUSINESS_TYPES, example: 'Pharmacy POS' })
  @Column()
  businessType: string;

  @ApiPropertyOptional({ example: 'Pharmacy POS' })
  @Column({ nullable: true })
  planCategoryLabel: string | null;

  @ApiPropertyOptional({ example: 'Professional' })
  @Column({ nullable: true })
  planName: string | null;

  @ApiPropertyOptional({ example: 'Currently using a paper ledger, want to digitize.' })
  @Column({ type: 'text', nullable: true })
  note: string | null;

  @ApiProperty({ enum: ['pending', 'approved', 'rejected'], default: 'pending' })
  @Column({ type: 'enum', enum: ['pending', 'approved', 'rejected'], default: 'pending' })
  status: SignupRequestStatus;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @ApiPropertyOptional({ description: 'Admin id who approved/rejected this request' })
  @Column({ nullable: true })
  reviewedByAdminId: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @ApiPropertyOptional({ description: 'The Tenant created once this request is approved' })
  @Column({ nullable: true })
  tenantId: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @UpdateDateColumn()
  updatedAt: Date;
}
