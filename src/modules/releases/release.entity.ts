import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('releases')
export class Release {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Semver string: e.g. "1.2.0" */
  @Column({ unique: true })
  version: string;

  /** "local" or "cloud" */
  @Column({ default: 'local' })
  channel: string;

  /** Human-readable release notes */
  @Column({ type: 'text', nullable: true })
  notes: string;

  /** URL from which the signed bundle can be downloaded */
  @Column()
  downloadUrl: string;

  /** SHA-256 of the .zip file (for additional client-side verification) */
  @Column()
  sha256: string;

  /** Ed25519 signature of {version,sha256,notes} JSON — verified by the POS app */
  @Column({ type: 'text' })
  signature: string;

  @Column({ default: false })
  published: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
