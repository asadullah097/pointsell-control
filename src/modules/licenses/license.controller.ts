import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LicenseService } from './license.service';
import { PlansService } from '../plans/plans.service';
import { TransactionsService } from '../transactions/transactions.service';
import { TenantsService } from '../tenants/tenants.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import { Public } from '../../common/guards/public.decorator';
import {
  CreateLicenseDto,
  ActivateLicenseDto,
  HeartbeatDto,
  RenewLicenseDto,
  ChangeLicensePlanDto,
} from './dto';

@ApiTags('Licenses')
@Controller('api/licenses')
export class LicenseController {
  constructor(
    private readonly licenseService: LicenseService,
    private readonly plansService: PlansService,
    private readonly transactionsService: TransactionsService,
    private readonly tenantsService: TenantsService,
  ) {}

  @Post()
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a license for a tenant (admin only)' })
  @ApiCreatedResponse({ description: 'License created with a generated license key' })
  async create(@Body() dto: CreateLicenseDto) {
    const tenantId = await this.tenantsService.resolveLocalId(dto.tenantId);
    let features = dto.features ?? {};
    if (dto.planId) {
      const plan = await this.plansService.findOne(dto.planId);
      features = { maxUsers: plan.maxUsers, maxLocations: plan.maxLocations, ...features };
    }
    return this.licenseService.create(
      tenantId,
      dto.mode,
      new Date(dto.expiresAt),
      features,
      dto.planId,
    );
  }

  @Patch(':id/renew')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Extend expiresAt on the existing license (does not create a new row) and record the payment' })
  async renew(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RenewLicenseDto, @Req() req: any) {
    const license = await this.licenseService.renew(id, dto.durationDays);

    // Record what was actually charged — best-effort, never blocks the renewal itself.
    // Always record, even when the license has no catalog plan attached (features-only
    // licenses): fall back to a sane default rather than silently dropping the payment.
    const plan = license.planId ? await this.plansService.findOne(license.planId).catch(() => null) : null;
    await this.transactionsService.record({
      tenantId: license.tenantId,
      licenseId: license.id,
      planId: plan?.id ?? null,
      amount: dto.amount ?? plan?.price ?? 0,
      billingCycle: plan?.billingCycle ?? 'monthly',
      type: 'renewal',
      note: dto.note,
      recordedByAdminEmail: req.admin?.email,
    });

    return license;
  }

  @Patch(':id/change-plan')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reassign a license to a different plan, snapshotting its limits, and record the payment' })
  async changePlan(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangeLicensePlanDto, @Req() req: any) {
    const plan = await this.plansService.findOne(dto.planId);
    const extendDays = dto.extend ? plan.durationDays : undefined;
    const license = await this.licenseService.changePlan(id, dto.planId, { maxUsers: plan.maxUsers, maxLocations: plan.maxLocations }, extendDays);

    await this.transactionsService.record({
      tenantId: license.tenantId,
      licenseId: license.id,
      planId: plan.id,
      amount: dto.amount ?? plan.price,
      billingCycle: plan.billingCycle,
      type: 'upgrade',
      note: dto.note,
      recordedByAdminEmail: req.admin?.email,
    });

    return license;
  }

  @Get('tenant/:tenantId')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all licenses for a tenant (admin only)' })
  @ApiOkResponse({ description: 'Array of license records' })
  async listForTenant(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    const localId = await this.tenantsService.resolveLocalId(tenantId);
    return this.licenseService.findAllForTenant(localId);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a license (admin only)' })
  @ApiNoContentResponse({ description: 'Revoked' })
  @ApiNotFoundResponse({ description: 'License not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(@Param('id', ParseUUIDPipe) id: string) {
    return this.licenseService.revoke(id);
  }

  /**
   * Called by the POS app to activate a license online.
   * Public — no JWT required (runs before the user has a session).
   */
  @Post('activate')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Online license activation — called by the POS app on first setup' })
  @ApiOkResponse({ description: 'Returns a signed license file to save as license.key' })
  @ApiNotFoundResponse({ description: 'License key not found or already revoked' })
  activate(@Body() dto: ActivateLicenseDto) {
    return this.licenseService.activate(dto.licenseKey, dto.fingerprint, dto.businessName);
  }

  /**
   * Called by the POS app periodically to prove it is still running.
   * Public — authenticated by licenseId + tenantId pair.
   */
  @Post('heartbeat')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'License heartbeat — called daily by the POS app to stay alive' })
  @ApiOkResponse({ schema: { example: { ok: true, renewalRequired: false } } })
  heartbeat(@Body() dto: HeartbeatDto) {
    return this.licenseService.heartbeat(dto.licenseId, dto.tenantId, dto.version);
  }

  /**
   * Offline license generation — admin provides the client machine fingerprint
   * (obtained via GET /v1/license/fingerprint on the client machine) and gets
   * back a signed license file to deliver to the client out-of-band (USB, email).
   */
  @Post(':id/offline-file')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate a signed offline license file',
    description:
      'Client runs `GET /v1/license/fingerprint` on their machine and sends you the fingerprint. ' +
      'Paste it here — the response is the license.key file content to deliver to them.',
  })
  @ApiOkResponse({ schema: { example: { licenseFile: { data: {}, signature: 'base64url...' } } } })
  async generateOfflineFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { fingerprint: string; businessName: string },
  ) {
    return this.licenseService.generateOfflineFileById(id, body.fingerprint, body.businessName);
  }
}
