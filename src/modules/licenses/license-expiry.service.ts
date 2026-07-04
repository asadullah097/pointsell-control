import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { License } from './license.entity';
import { Tenant } from '../tenants/tenant.entity';

@Injectable()
export class LicenseExpiryService {
  private readonly logger = new Logger(LicenseExpiryService.name);

  constructor(
    @InjectRepository(License) private readonly licenseRepo: Repository<License>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
  ) {}

  /** Runs at 02:00 every night — marks expired licenses, then cascades to their tenants. */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async expireOverdueLicenses(): Promise<void> {
    const overdue = await this.licenseRepo.find({
      where: { status: 'active', expiresAt: LessThan(new Date()) },
    });
    if (overdue.length === 0) return;

    const result = await this.licenseRepo.update(
      { status: 'active', expiresAt: LessThan(new Date()) },
      { status: 'expired' },
    );
    this.logger.warn(`Auto-expired ${result.affected ?? 0} license(s).`);

    // Cascade to tenants — but never touch tenants an admin has explicitly suspended.
    const tenantIds = [...new Set(overdue.map((l) => l.tenantId))];
    const cascaded = await this.tenantRepo.update(
      { id: In(tenantIds), status: In(['active', 'trial']) },
      { status: 'expired' },
    );
    if (cascaded.affected) {
      this.logger.warn(`Marked ${cascaded.affected} tenant(s) as expired.`);
    }
  }
}
