import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type BillingCycle = 'monthly' | 'yearly';

@Entity('plans')
export class Plan {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Machine key, e.g. "basic" — referenced by License.features.planKey and nestjs-pos's Tenant.planKey */
  @ApiProperty({ example: 'basic' })
  @Column({ unique: true })
  key: string;

  @ApiProperty({ example: 'Basic' })
  @Column()
  name: string;

  @ApiPropertyOptional({ example: 'For a single shop with one cashier.' })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** null = unlimited */
  @ApiProperty({ example: 1, nullable: true })
  @Column({ type: 'int', nullable: true })
  maxUsers: number | null;

  /** null = unlimited */
  @ApiProperty({ example: 1, nullable: true })
  @Column({ type: 'int', nullable: true })
  maxLocations: number | null;

  @ApiProperty({ example: 0 })
  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  price: number;

  @ApiProperty({ enum: ['monthly', 'yearly'], default: 'monthly' })
  @Column({ type: 'enum', enum: ['monthly', 'yearly'], default: 'monthly' })
  billingCycle: BillingCycle;

  /** License validity granted per purchase/renewal, in days */
  @ApiProperty({ example: 30 })
  @Column({ type: 'int', default: 30 })
  durationDays: number;

  /** Soft-hide from "available to assign" lists without breaking tenants already on it */
  @ApiProperty({ example: true })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ example: 0 })
  @Column({ default: 0 })
  sortOrder: number;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @UpdateDateColumn()
  updatedAt: Date;
}
