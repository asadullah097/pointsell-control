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
  @ApiOperation({ summary: 'Register a new client (local) or provision in cloud POS' })
  create(@Body() dto: CreateTenantDto) {
    // Local installs: tracked in control-panel DB only
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
}
