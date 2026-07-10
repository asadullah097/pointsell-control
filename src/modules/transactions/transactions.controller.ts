import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../../common/guards/admin.guard';
import { TransactionsService } from './transactions.service';
import { TenantsService } from '../tenants/tenants.service';
import { RecordTransactionDto } from './dto';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('api/transactions')
export class TransactionsController {
  constructor(
    private readonly transactions: TransactionsService,
    private readonly tenantsService: TenantsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List subscription payment history, optionally filtered by tenant/date range' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'from', required: false, description: 'ISO date' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO date' })
  async listAll(
    @Query('tenantId') tenantId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const localTenantId = tenantId ? await this.tenantsService.resolveLocalId(tenantId) : undefined;
    return this.transactions.listAll({ tenantId: localTenantId, from, to });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Revenue summary — month/year to date, monthly vs yearly split, last 12 months' })
  getSummary() {
    return this.transactions.getSummary();
  }

  @Post()
  @ApiOperation({ summary: 'Manually record a payment (e.g. bank transfer / cash) not tied to a renew/change-plan action' })
  async record(@Body() dto: RecordTransactionDto, @Req() req: any) {
    const tenantId = await this.tenantsService.resolveLocalId(dto.tenantId);
    return this.transactions.record({ ...dto, tenantId, type: 'manual', recordedByAdminEmail: req.admin?.email });
  }
}
