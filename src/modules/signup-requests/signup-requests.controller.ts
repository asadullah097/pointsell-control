import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { SignupRequestsService } from './signup-requests.service';
import { ApproveSignupRequestDto, CreateSignupRequestDto, RejectSignupRequestDto } from './dto';
import { SignupRequest } from './signup-request.entity';
import { Public } from '../../common/guards/public.decorator';

@ApiTags('Signup Requests')
@Controller('api/signup-requests')
export class SignupRequestsController {
  constructor(private readonly service: SignupRequestsService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Submit a "start trial / contact sales" request from the public landing page' })
  create(@Body() dto: CreateSignupRequestDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List signup requests (admin)' })
  @ApiOkResponse({ type: [SignupRequest] })
  findAll(@Query('status') status?: SignupRequest['status']) {
    return this.service.findAll(status);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a signup request by id (admin)' })
  @ApiOkResponse({ type: SignupRequest })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/approve')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve a signup request (admin)',
    description: 'Creates the Tenant + a trial-length license, provisions a POS login (unless provisionPos:false), and emails the owner their credentials.',
  })
  approve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ApproveSignupRequestDto, @Req() req: Request) {
    return this.service.approve(id, dto, (req as any).admin?.sub ?? null);
  }

  @Post(':id/reject')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a signup request (admin) — emails the owner a polite decline.' })
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectSignupRequestDto, @Req() req: Request) {
    return this.service.reject(id, dto, (req as any).admin?.sub ?? null);
  }
}
