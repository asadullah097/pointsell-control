import {
  Body, Controller, Delete, Get, HttpCode,
  HttpStatus, Param, ParseUUIDPipe, Patch, Post, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiNoContentResponse, ApiNotFoundResponse,
  ApiOkResponse, ApiOperation, ApiTags,
} from '@nestjs/swagger';
import { Tenant } from './tenant.entity';
import { TenantsService } from './tenants.service';
import { CreateTenantDto, UpdateTenantDto } from './dto';
import { AdminGuard } from '../../common/guards/admin.guard';
import { PosApiClient } from '../../common/clients/pos-api.client';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('api/tenants')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly posApi: PosApiClient,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Register a business',
    description: 'Creates the tenant record. Pass `autoIssueLicense` to atomically issue a license — the response will include the `licenseKey` to give to the client.',
  })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List tenants (cloud: from POS backend; local: from control-panel DB)' })
  findAll() {
    if (this.posApi.isConfigured) return this.posApi.listTenants();
    return this.tenantsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tenant by ID' })
  @ApiNotFoundResponse({ description: 'Tenant not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    if (this.posApi.isConfigured) return this.posApi.getTenant(id);
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update tenant status, plan, or details' })
  @ApiOkResponse({ type: Tenant })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTenantDto) {
    if (this.posApi.isConfigured) return this.posApi.updateTenant(id, dto);
    return this.tenantsService.update(id, dto);
  }

  // ── Lifecycle (cloud only) ────────────────────────────────────────────────

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend a tenant — blocks all POS logins immediately' })
  suspend(@Param('id', ParseUUIDPipe) id: string) {
    if (this.posApi.isConfigured) return this.posApi.suspendTenant(id);
    return this.tenantsService.update(id, { status: 'suspended' });
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate a suspended or trial tenant' })
  activate(@Param('id', ParseUUIDPipe) id: string) {
    if (this.posApi.isConfigured) return this.posApi.activateTenant(id);
    return this.tenantsService.update(id, { status: 'active' });
  }

  @Post(':id/provision')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry schema provisioning (cloud only)' })
  reprovision(@Param('id', ParseUUIDPipe) id: string) {
    if (this.posApi.isConfigured) return this.posApi.reprovisionTenant(id);
    return { message: 'Schema provisioning is only available in cloud mode' };
  }

  @Post(':id/reseed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Re-run idempotent seeders for a tenant (cloud only)' })
  reseed(@Param('id', ParseUUIDPipe) id: string, @Body() body: { businessType?: string }) {
    if (this.posApi.isConfigured) return this.posApi.reseedTenant(id, body?.businessType);
    return { message: 'Reseed is only available in cloud mode' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiOperation({ summary: 'Cancel / delete a tenant' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    if (this.posApi.isConfigured) return this.posApi.deleteTenant(id);
    return this.tenantsService.remove(id);
  }

  // ── Usage metrics (cloud only) ────────────────────────────────────────────

  @Get(':id/metrics')
  @ApiOperation({ summary: 'Live usage metrics: orders, users, products, storage (cloud only)' })
  getMetrics(@Param('id', ParseUUIDPipe) id: string) {
    if (this.posApi.isConfigured) return this.posApi.getTenantMetrics(id);
    return { message: 'Metrics are only available in cloud mode' };
  }

  @Get('metrics/all')
  @ApiOperation({ summary: 'Live usage metrics for all active tenants (cloud only)' })
  getAllMetrics() {
    if (this.posApi.isConfigured) return this.posApi.getAllMetrics();
    return [];
  }

  // ── Plan requests (cloud only) ─────────────────────────────────────────────
  // Routed by POS tenant slug, not this app's own tenant.id — see the same
  // reasoning in tickets.controller.ts. When posApi is configured, findAll()/
  // findOne() above proxy nestjs-pos's tenant rows directly, so `id` on this
  // page is ALREADY the nestjs-pos-side id; resolving it against this app's
  // own local `tenants` table (a different UUID space) always missed, which
  // is why approvals silently never showed up here. Slug is the identifier
  // both sides actually share, and the tenant object the frontend already
  // has (from listTenants()) carries it directly — no lookup needed.

  @Get(':slug/plan-requests')
  @ApiOperation({ summary: "List a tenant's pending plan requests raised from the POS (cloud only)" })
  listPlanRequests(@Param('slug') slug: string) {
    if (!this.posApi.isConfigured) return [];
    return this.posApi.listPlanRequests(slug);
  }

  @Patch(':slug/plan-requests/:requestId')
  @ApiOperation({ summary: 'Approve or reject a plan request (cloud only)' })
  resolvePlanRequest(
    @Param('slug') slug: string,
    @Param('requestId') requestId: string,
    @Body() body: { status: 'approved' | 'rejected'; adminResponse?: string },
  ) {
    if (!this.posApi.isConfigured) {
      return { message: 'Plan requests are only available in cloud mode' };
    }
    return this.posApi.resolvePlanRequest(slug, requestId, body);
  }
}
