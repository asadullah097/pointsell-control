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

/** Path to your private key — only on the control panel server. */
const PRIVATE_KEY_PATH = join(process.cwd(), 'keys', 'private.pem');

@Injectable()
export class LicenseService {
  private readonly logger = new Logger(LicenseService.name);
  private privateKey: string | null = null;

  constructor(
    @InjectRepository(License) private readonly licenseRepo: Repository<License>,
    @InjectRepository(Tenant)  private readonly tenantRepo: Repository<Tenant>,
  ) {
    this.loadPrivateKey();
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
      status: 'active',
    });
    return this.licenseRepo.save(license);
  }

  // ── Online activation (called by the POS /v1/license/activate) ───────────

  async activate(licenseKey: string, fingerprint: string, businessName: string): Promise<{ licenseFile: object }> {
    const license = await this.licenseRepo.findOne({
      where: { licenseKey },
      relations: ['tenant'],
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
      features: license.features as any,
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
      features: license.features as any,
      mode: 'offline',
    });
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
      maxLocations: number;
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
