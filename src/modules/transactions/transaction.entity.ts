import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { Plan, BillingCycle } from '../plans/plan.entity';

export type TransactionType = 'new' | 'renewal' | 'upgrade' | 'manual';

/**
 * A record of money actually received for a tenant's subscription — written
 * whenever an admin renews a license or changes its plan (License/Plan rows
 * only ever hold *current* state; this is the append-only history of what
 * was charged, when, and for which billing cycle).
 */
@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  tenant: Tenant;

  @Column()
  tenantId: string;

  @ManyToOne(() => Plan, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'planId' })
  plan: Plan | null;

  @Column({ nullable: true })
  planId: string | null;

  /** The license this payment applied to, if any (manual entries may have none). */
  @Column({ nullable: true })
  licenseId: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: ['monthly', 'yearly'] })
  billingCycle: BillingCycle;

  @Column({ type: 'enum', enum: ['new', 'renewal', 'upgrade', 'manual'] })
  type: TransactionType;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  /** Email of the admin who recorded this (from the JWT — no FK, admins can be deleted). */
  @Column({ nullable: true })
  recordedByAdminEmail: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
