import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThan, Repository } from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { License } from '../licenses/license.entity';
import { AdminGuard } from '../../common/guards/admin.guard';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('api/dashboard')
export class DashboardController {
  constructor(
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(License) private readonly licenseRepo: Repository<License>,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Aggregate stats for the dashboard' })
  @ApiOkResponse({
    schema: {
      example: {
        tenants: { total: 12, active: 9, trial: 2, suspended: 1 },
        licenses: { total: 14, active: 11, expiringSoon: 2, expired: 1, revoked: 0 },
        recentHeartbeats: 8,
      },
    },
  })
  async getStats() {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const staleThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const [
      totalTenants,
      activeTenants,
      trialTenants,
      suspendedTenants,
      totalLicenses,
      activeLicenses,
      expiringSoon,
      expiredLicenses,
      revokedLicenses,
      recentHeartbeats,
    ] = await Promise.all([
      this.tenantRepo.count(),
      this.tenantRepo.count({ where: { status: 'active' } }),
      this.tenantRepo.count({ where: { status: 'trial' } }),
      this.tenantRepo.count({ where: { status: 'suspended' } }),
      this.licenseRepo.count(),
      this.licenseRepo.count({ where: { status: 'active' } }),
      this.licenseRepo.count({ where: { status: 'active', expiresAt: LessThan(in30Days) } }),
      this.licenseRepo.count({ where: { status: 'expired' } }),
      this.licenseRepo.count({ where: { status: 'revoked' } }),
      this.tenantRepo.count({ where: { lastHeartbeatAt: MoreThan(staleThreshold) } }),
    ]);

    return {
      tenants: { total: totalTenants, active: activeTenants, trial: trialTenants, suspended: suspendedTenants },
      licenses: { total: totalLicenses, active: activeLicenses, expiringSoon, expired: expiredLicenses, revoked: revokedLicenses },
      recentHeartbeats,
    };
  }
}
