import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './tenant.entity';
import { CreateTenantDto, UpdateTenantDto } from './dto';
import { LicenseService } from '../licenses/license.service';
import { License } from '../licenses/license.entity';
import { PlansService } from '../plans/plans.service';
import { PosApiClient } from '../../common/clients/pos-api.client';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    @InjectRepository(Tenant) private readonly repo: Repository<Tenant>,
    private readonly licenseService: LicenseService,
    private readonly plansService: PlansService,
    private readonly posApiClient: PosApiClient,
  ) {}

  async create(dto: CreateTenantDto): Promise<{ tenant: Tenant; license?: License; posProvision?: any }> {
    const exists = await this.repo.findOneBy({ businessName: dto.businessName });
    if (exists) throw new ConflictException(`Business "${dto.businessName}" is already registered.`);
    if (dto.email) {
      const emailExists = await this.repo.findOneBy({ email: dto.email });
      if (emailExists) throw new ConflictException(`Email "${dto.email}" is already used by tenant "${emailExists.businessName}".`);
    }

    const tenant = await this.repo.save(this.repo.create({
      businessName: dto.businessName,
      email: dto.email,
      phone: dto.phone,
      legacyPlan: dto.plan ?? 'starter',
      planId: dto.planId ?? null,
      notes: dto.notes,
      businessType: dto.businessType ?? null,
      status: 'trial',
      posSlug: null,
    }));

    // ── POS provisioning (cloud mode) ────────────────────────────────────────
    // If the caller supplied slug + businessType + adminPassword and the POS
    // API is configured, provision the tenant schema on the POS backend now.
    let posProvision: any | undefined;
    const canProvision =
      dto.slug && dto.businessType && dto.adminPassword && this.posApiClient.isConfigured;

    if (canProvision) {
      try {
        posProvision = await this.posApiClient.provisionTenant({
          businessName: dto.businessName,
          slug: dto.slug!,
          businessType: dto.businessType!,
          email: dto.email ?? `admin@${dto.slug}.local`,
          password: dto.adminPassword!,
          fullName: dto.adminFullName,
          plan: dto.plan,
        });
        // Link the control-panel record to the POS tenant by slug
        tenant.posSlug = dto.slug!;
        await this.repo.save(tenant);
        this.logger.log(`POS tenant provisioned: slug="${dto.slug}"`);
      } catch (err) {
        // Roll back control-panel record so the slug can be retried
        await this.repo.delete(tenant.id);
        throw err;
      }
    } else if (dto.slug || dto.businessType || dto.adminPassword) {
      this.logger.warn(
        `Partial POS provision fields supplied for "${dto.businessName}" but provisioning skipped — ` +
        `ensure slug, businessType, adminPassword are all set and CLOUD_POS_API_URL is configured.`,
      );
    }

    if (!dto.autoIssueLicense) return { tenant, posProvision };

    let features = dto.autoIssueLicense.features ?? {};
    let expiresAt = dto.autoIssueLicense.expiresAt ? new Date(dto.autoIssueLicense.expiresAt) : undefined;

    if (dto.planId) {
      const plan = await this.plansService.findOne(dto.planId);
      features = { maxUsers: plan.maxUsers, maxLocations: plan.maxLocations, ...features };
      if (!expiresAt) expiresAt = new Date(Date.now() + plan.durationDays * 86_400_000);
    } else {
      features = { maxLocations: 1, maxUsers: 1, restaurantMode: false, pharmacyMode: false, multiRegister: false, ...features };
      if (!expiresAt) expiresAt = new Date(Date.now() + 30 * 86_400_000);
    }

    const license = await this.licenseService.create(
      tenant.id,
      dto.autoIssueLicense.mode ?? 'online',
      expiresAt,
      features,
      dto.planId,
    );
    return { tenant, license, posProvision };
  }

  findAll(): Promise<Tenant[]> {
    return this.repo.find({ relations: ['plan'], order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.repo.findOne({ where: { id }, relations: ['plan'] });
    if (!tenant) throw new NotFoundException(`Tenant ${id} not found`);
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto): Promise<Tenant> {
    await this.findOne(id);
    const { plan, ...rest } = dto;
    await this.repo.update(id, { ...rest, ...(plan ? { legacyPlan: plan } : {}) });
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repo.delete(id);
  }

  /**
   * Translate a tenant id the frontend hands us into this repo's own id.
   *
   * When posApi is configured, list/detail pages display and pass around
   * nestjs-pos's tenant id (see findAll() above), not this repo's own id —
   * the two are unrelated UUIDs generated independently at provisioning
   * time, linked only by the shared `slug`/`posSlug`. Any local table with a
   * `tenantId` FK (License, Transaction) needs the local id, so resolve via
   * slug when a direct id match fails. Same root cause as the tickets/plan-
   * requests slug-routing fix.
   */
  async resolveLocalId(id: string): Promise<string> {
    const direct = await this.repo.findOneBy({ id });
    if (direct) return direct.id;

    if (!this.posApiClient.isConfigured) {
      throw new NotFoundException(`Tenant ${id} not found`);
    }
    const posTenant = await this.posApiClient.getTenant(id);
    const local = await this.repo.findOneBy({ posSlug: posTenant.slug });
    if (!local) throw new NotFoundException(`Tenant ${id} not found`);
    return local.id;
  }
}
