import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LicenseService } from './license.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import { Public } from '../../common/guards/public.decorator';
import {
  CreateLicenseDto,
  ActivateLicenseDto,
  HeartbeatDto,
} from './dto';

@ApiTags('Licenses')
@Controller('api/licenses')
export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  @Post()
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a license for a tenant (admin only)' })
  @ApiCreatedResponse({ description: 'License created with a generated license key' })
  create(@Body() dto: CreateLicenseDto) {
    return this.licenseService.create(
      dto.tenantId,
      dto.mode,
      new Date(dto.expiresAt),
      dto.features ?? {},
    );
  }

  @Get('tenant/:tenantId')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all licenses for a tenant (admin only)' })
  @ApiOkResponse({ description: 'Array of license records' })
  listForTenant(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.licenseService.findAllForTenant(tenantId);
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
