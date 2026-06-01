import {
  Body, Controller, Delete, Get, HttpCode,
  HttpStatus, Param, ParseUUIDPipe, Patch, Post, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Tenant } from './tenant.entity';
import { TenantsService } from './tenants.service';
import { CreateTenantDto, UpdateTenantDto } from './dto';
import { AdminGuard } from '../../common/guards/admin.guard';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('api/tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new client business' })
  @ApiCreatedResponse({ type: Tenant, description: 'Tenant created' })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all tenants' })
  @ApiOkResponse({ type: [Tenant] })
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tenant by ID' })
  @ApiOkResponse({ type: Tenant })
  @ApiNotFoundResponse({ description: 'Tenant not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update tenant status, plan, or details' })
  @ApiOkResponse({ type: Tenant })
  @ApiNotFoundResponse({ description: 'Tenant not found' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tenant and all their licenses' })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiNotFoundResponse({ description: 'Tenant not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.remove(id);
  }
}
