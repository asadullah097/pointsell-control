import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';

export type LicenseMode   = 'online' | 'offline';
export type LicenseStatus = 'active' | 'revoked' | 'expired';

@Entity('licenses')
export class License {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  tenant: Tenant;

  @Column()
  tenantId: string;

  /** The human-readable key the client enters to activate (e.g. XXXX-XXXX-XXXX-XXXX) */
  @Column({ unique: true })
  licenseKey: string;

  /** SHA-256 machine fingerprint bound to this license */
  @Column({ nullable: true })
  machineFingerprint: string | null;

  @Column({ type: 'enum', enum: ['online', 'offline'], default: 'offline' })
  mode: LicenseMode;

  @Column({ type: 'enum', enum: ['active', 'revoked', 'expired'], default: 'active' })
  status: LicenseStatus;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  /** Features enabled for this license (stored as JSON) */
  @Column({ type: 'jsonb', default: '{}' })
  features: Record<string, unknown>;

  /** The signed license file content last generated for this license */
  @Column({ type: 'text', nullable: true })
  lastGeneratedFile: string | null;

  @Column({ type: 'timestamp', nullable: true })
  activatedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastHeartbeatAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
