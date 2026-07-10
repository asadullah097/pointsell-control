import * as crypto from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { License } from './license.entity';
import { Tenant } from '../tenants/tenant.entity';
import { PosApiClient } from '../../common/clients/pos-api.client';

/** Path to your private key — only on the control panel server. */
const PRIVATE_KEY_PATH = join(process.cwd(), 'keys', 'private.pem');

@Injectable()
export class LicenseService {
  private readonly logger = new Logger(LicenseService.name);
  private privateKey: string | null = null;

  constructor(
    @InjectRepository(License) private readonly licenseRepo: Repository<License>,
    @InjectRepository(Tenant)  private readonly tenantRepo: Repository<Tenant>,
    private readonly posApiClient: PosApiClient,
  ) {
    this.loadPrivateKey();
  }

  /**
   * Best-effort push of a tenant's plan entitlements to nestjs-pos (cloud-provisioned
   * tenants only — local/on-prem tenants get their limits from the license file itself).
   * Never throws — a failed push shouldn't fail the renew/change-plan response; the
   * next successful heartbeat/renew will retry it.
   */
  private async pushEntitlements(
    tenantId: string,
    entitlements: { maxUsers: number | null; maxLocations: number | null; expiresAt: Date; planKey?: string },
  ): Promise<void> {
    if (!this.posApiClient.isConfigured) return;
    const tenant = await this.tenantRepo.findOneBy({ id: tenantId });
    if (!tenant?.posSlug) return;

    try {
      await this.posApiClient.updateEntitlements(tenant.posSlug, {
        maxUsers: entitlements.maxUsers,
        maxLocations: entitlements.maxLocations,
        expiresAt: entitlements.expiresAt.toISOString(),
        planKey: entitlements.planKey,
      });
    } catch (err) {
      this.logger.warn(`Entitlement push to POS failed for slug "${tenant.posSlug}": ${(err as Error).message}`);
    }
  }

  private loadPrivateKey(): void {
    if (!existsSync(PRIVATE_KEY_PATH)) {
      this.logger.error(
        `Private key not found at ${PRIVATE_KEY_PATH}. ` +
          `License signing will be unavailable. ` +
          `Run: node tools/keygen/generate-keypair.js and copy the key here.`,
      );
      return;
    }
    this.privateKey = readFileSync(PRIVATE_KEY_PATH, 'utf8');
    this.logger.log('Private key loaded — license signing ready.');
  }

  // ── Create a license record ───────────────────────────────────────────────

  async create(
    tenantId: string,
    mode: 'online' | 'offline',
    expiresAt: Date,
    features: Record<string, unknown>,
    planId?: string | null,
  ): Promise<License> {
    const tenant = await this.tenantRepo.findOneByOrFail({ id: tenantId });
    const licenseKey = this.generateLicenseKey();

    const license = this.licenseRepo.create({
      tenantId: tenant.id,
      tenant,
      licenseKey,
      mode,
      expiresAt,
      features,
      planId: planId ?? null,
      status: 'active',
    });
    const saved = await this.licenseRepo.save(license);

    // Keep the tenant's denormalized entitlement mirror in sync.
    await this.tenantRepo.update(tenant.id, {
      planId: planId ?? tenant.planId,
      subscriptionEndsAt: expiresAt,
    });

    await this.pushEntitlements(tenant.id, {
      maxUsers: (features.maxUsers as number | null) ?? null,
      maxLocations: (features.maxLocations as number | null) ?? null,
      expiresAt,
    });

    return saved;
  }

  /** Renewal opens up this many days before expiry — matches heartbeat()'s renewalRequired heuristic. */
  private static readonly RENEWAL_WINDOW_DAYS = 30;

  /** Extends `expiresAt` on the existing license row rather than creating a new one. */
  async renew(licenseId: string, durationDays?: number): Promise<License> {
    const license = await this.licenseRepo.findOne({ where: { id: licenseId }, relations: ['plan'] });
    if (!license) throw new NotFoundException('License not found.');

    const daysLeft = (license.expiresAt.getTime() - Date.now()) / 86_400_000;
    if (daysLeft >= LicenseService.RENEWAL_WINDOW_DAYS) {
      throw new BadRequestException(
        `This license is still active for ${Math.ceil(daysLeft)} more days — renewal only opens up within ` +
          `${LicenseService.RENEWAL_WINDOW_DAYS} days of expiry (or after it lapses). Use "Change Plan" instead if you need to switch plans now.`,
      );
    }

    const days = durationDays ?? license.plan?.durationDays ?? 30;
    const base = license.expiresAt > new Date() ? license.expiresAt : new Date();
    const expiresAt = new Date(base.getTime() + days * 86_400_000);

    await this.licenseRepo.update(license.id, { expiresAt, status: 'active' });
    await this.tenantRepo.update(license.tenantId, { subscriptionEndsAt: expiresAt, status: 'active' });

    await this.pushEntitlements(license.tenantId, {
      maxUsers: (license.features?.maxUsers as number | null) ?? null,
      maxLocations: (license.features?.maxLocations as number | null) ?? null,
      expiresAt,
      planKey: license.plan?.key,
    });

    this.logger.log(`License renewed: ${license.id} → new expiry ${expiresAt.toISOString()}`);
    return this.licenseRepo.findOneByOrFail({ id: license.id });
  }

  /** Reassigns a license to a different plan, snapshotting its maxUsers/maxLocations. Optionally extends expiry too. */
  async changePlan(licenseId: string, planId: string, plan: { maxUsers: number | null; maxLocations: number | null }, extendDays?: number): Promise<License> {
    const license = await this.licenseRepo.findOneBy({ id: licenseId });
    if (!license) throw new NotFoundException('License not found.');

    const features = { ...license.features, maxUsers: plan.maxUsers, maxLocations: plan.maxLocations };
    const update: Partial<License> = { planId, features };

    let expiresAt = license.expiresAt;
    if (extendDays) {
      const base = license.expiresAt > new Date() ? license.expiresAt : new Date();
      expiresAt = new Date(base.getTime() + extendDays * 86_400_000);
      update.expiresAt = expiresAt;
      update.status = 'active';
    }

    await this.licenseRepo.update(license.id, update);
    await this.tenantRepo.update(license.tenantId, {
      planId,
      subscriptionEndsAt: expiresAt,
      ...(extendDays ? { status: 'active' as const } : {}),
    });

    await this.pushEntitlements(license.tenantId, {
      maxUsers: plan.maxUsers,
      maxLocations: plan.maxLocations,
      expiresAt,
    });

    this.logger.log(`License ${license.id} changed to plan ${planId}`);
    return this.licenseRepo.findOneByOrFail({ id: license.id });
  }

  // ── Online activation (called by the POS /v1/license/activate) ───────────

  async activate(licenseKey: string, fingerprint: string, businessName: string): Promise<{ licenseFile: object }> {
    const license = await this.licenseRepo.findOne({
      where: { licenseKey },
      relations: ['tenant', 'plan'],
    });

    if (!license) throw new NotFoundException('License key not found.');
    if (license.status === 'revoked') throw new BadRequestException('License has been revoked.');
    if (license.status === 'expired' || license.expiresAt < new Date()) {
      throw new BadRequestException('License has expired. Please renew.');
    }
    if (license.machineFingerprint && license.machineFingerprint !== fingerprint) {
      throw new BadRequestException(
        'License is already bound to a different machine. Contact support to transfer.',
      );
    }

    // Bind fingerprint on first activation
    if (!license.machineFingerprint) {
      license.machineFingerprint = fingerprint;
    }
    license.activatedAt = new Date();
    await this.licenseRepo.save(license);

    const licenseFile = this.signLicenseFile({
      licenseId: license.id,
      tenantId: license.tenantId,
      businessName: businessName || license.tenant.businessName,
      machineFingerprint: fingerprint,
      expiresAt: license.expiresAt.toISOString(),
      features: { ...(license.features as any), planKey: license.plan?.key },
      mode: license.mode,
    });

    // Store the last generated file for reference
    await this.licenseRepo.update(license.id, {
      lastGeneratedFile: JSON.stringify(licenseFile),
    });

    this.logger.log(`License activated: ${license.id} → tenant: ${license.tenantId}`);
    return { licenseFile };
  }

  // ── Heartbeat ─────────────────────────────────────────────────────────────

  async heartbeat(licenseId: string, tenantId: string, version: string): Promise<{ ok: boolean; renewalRequired: boolean }> {
    const license = await this.licenseRepo.findOneBy({ id: licenseId, tenantId });
    if (!license) return { ok: false, renewalRequired: false };

    await this.licenseRepo.update(license.id, { lastHeartbeatAt: new Date() });
    await this.tenantRepo.update(tenantId, { lastHeartbeatAt: new Date(), lastSeenVersion: version });

    const daysLeft = (license.expiresAt.getTime() - Date.now()) / 86_400_000;
    return { ok: license.status === 'active', renewalRequired: daysLeft < 30 };
  }

  // ── Generate offline license file (for pre-signed delivery) ──────────────

  generateOfflineLicenseFile(license: License, businessName: string): object {
    if (!license.machineFingerprint) {
      throw new BadRequestException(
        'Machine fingerprint is required for offline license generation. ' +
          'Ask the client to run GET /v1/license/fingerprint and provide the value.',
      );
    }
    return this.signLicenseFile({
      licenseId: license.id,
      tenantId: license.tenantId,
      businessName,
      machineFingerprint: license.machineFingerprint,
      expiresAt: license.expiresAt.toISOString(),
      features: { ...(license.features as any), planKey: license.plan?.key },
      mode: 'offline',
    });
  }

  // ── Offline file by license id ────────────────────────────────────────────

  async generateOfflineFileById(
    licenseId: string,
    fingerprint: string,
    businessName: string,
  ): Promise<{ licenseFile: object }> {
    const license = await this.licenseRepo.findOne({
      where: { id: licenseId },
      relations: ['tenant', 'plan'],
    });
    if (!license) throw new NotFoundException('License not found.');
    if (license.status === 'revoked') throw new BadRequestException('License is revoked.');

    // Bind fingerprint permanently on first offline generation
    if (!license.machineFingerprint) {
      license.machineFingerprint = fingerprint;
      await this.licenseRepo.save(license);
    } else if (license.machineFingerprint !== fingerprint) {
      throw new BadRequestException(
        'This license is already bound to a different machine fingerprint. ' +
          'Contact support to transfer.',
      );
    }

    const licenseFile = this.generateOfflineLicenseFile(
      license,
      businessName || license.tenant.businessName,
    );
    return { licenseFile };
  }

  // ── List / revoke ─────────────────────────────────────────────────────────

  async findAllForTenant(tenantId: string): Promise<License[]> {
    return this.licenseRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async revoke(licenseId: string): Promise<void> {
    await this.licenseRepo.update(licenseId, { status: 'revoked' });
    this.logger.warn(`License revoked: ${licenseId}`);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private signLicenseFile(data: {
    licenseId: string;
    tenantId: string;
    businessName: string;
    machineFingerprint: string;
    expiresAt: string;
    features: {
      maxLocations: number | null;
      maxUsers?: number | null;
      planKey?: string;
      restaurantMode: boolean;
      pharmacyMode: boolean;
      multiRegister: boolean;
    };
    mode: 'online' | 'offline';
  }): object {
    if (!this.privateKey) {
      throw new Error('Private key not loaded — cannot sign license file.');
    }

    const licenseData = {
      version: 1 as const,
      licenseId: data.licenseId,
      tenantId: data.tenantId,
      businessName: data.businessName,
      machineFingerprint: data.machineFingerprint,
      issuedAt: new Date().toISOString(),
      expiresAt: data.expiresAt,
      features: data.features,
      mode: data.mode,
      graceSeconds: data.mode === 'online' ? 30 * 24 * 3600 : 0,
    };

    const payload = JSON.stringify(licenseData);
    const sign = crypto.createSign('SHA256');
    sign.update(payload);
    sign.end();
    const signature = sign
      .sign({ key: this.privateKey, dsaEncoding: 'ieee-p1363' })
      .toString('base64url');

    return { data: licenseData, signature };
  }

  private generateLicenseKey(): string {
    const segment = () => crypto.randomBytes(3).toString('hex').toUpperCase();
    return `${segment()}-${segment()}-${segment()}-${segment()}`;
  }
}
