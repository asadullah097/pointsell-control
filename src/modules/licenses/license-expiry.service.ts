import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { License } from './license.entity';

@Injectable()
export class LicenseExpiryService {
  private readonly logger = new Logger(LicenseExpiryService.name);

  constructor(
    @InjectRepository(License) private readonly licenseRepo: Repository<License>,
  ) {}

  /** Runs at 02:00 every night — marks expired licenses and logs count. */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async expireOverdueLicenses(): Promise<void> {
    const result = await this.licenseRepo.update(
      { status: 'active', expiresAt: LessThan(new Date()) },
      { status: 'expired' },
    );
    if (result.affected && result.affected > 0) {
      this.logger.warn(`Auto-expired ${result.affected} license(s).`);
    }
  }
}
