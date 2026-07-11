import { Body, Controller, Get, Param, Patch, Post, Res, UseGuards } from '@nestjs/common';
import { Readable } from 'stream';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../../common/guards/admin.guard';
import { PosApiClient } from '../../common/clients/pos-api.client';
import { AdminReplyDto, UpdateTicketStatusDto } from './dto';

/**
 * Routed by POS tenant slug, not this app's own tenant.id. Tickets are
 * aggregated straight from nestjs-pos's own tenants table (see
 * PosApiClient.listAllTickets()), which has no relation to this app's local
 * `tenants` row IDs — the two are separate databases with independently
 * generated UUIDs. Slug is the one identifier both sides actually share
 * (nestjs-pos tenant.slug === this app's tenant.posSlug), and the aggregate
 * list already carries it on every ticket, so there's no lookup needed here.
 */
@ApiTags('Support Tickets')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('api/tickets')
export class TicketsController {
  constructor(private readonly posApi: PosApiClient) {}

  @Get()
  @ApiOperation({ summary: 'Aggregate ticket list across every business, newest activity first (cloud only)' })
  listAll() {
    if (!this.posApi.isConfigured) return [];
    return this.posApi.listAllTickets();
  }

  @Get(':slug/:ticketId')
  @ApiOperation({ summary: 'Get a ticket with its full message thread' })
  getOne(@Param('slug') slug: string, @Param('ticketId') ticketId: string) {
    return this.posApi.getTicket(slug, ticketId);
  }

  @Post(':slug/:ticketId/reply')
  @ApiOperation({ summary: 'Post an admin reply' })
  reply(
    @Param('slug') slug: string,
    @Param('ticketId') ticketId: string,
    @Body() body: AdminReplyDto,
  ) {
    return this.posApi.replyTicket(slug, ticketId, body.message, body.adminName);
  }

  @Patch(':slug/:ticketId/status')
  @ApiOperation({ summary: 'Set ticket status to in_progress, resolved, or closed' })
  updateStatus(
    @Param('slug') slug: string,
    @Param('ticketId') ticketId: string,
    @Body() body: UpdateTicketStatusDto,
  ) {
    return this.posApi.updateTicketStatus(slug, ticketId, body.status);
  }

  @Get(':slug/:ticketId/attachments/:attachmentId')
  @ApiOperation({ summary: 'Download/view a ticket attachment' })
  async downloadAttachment(
    @Param('slug') slug: string,
    @Param('ticketId') ticketId: string,
    @Param('attachmentId') attachmentId: string,
    @Res() res: any,
  ) {
    const upstream = await this.posApi.fetchTicketAttachment(slug, ticketId, attachmentId);
    const contentType = upstream.headers.get('content-type');
    const contentDisposition = upstream.headers.get('content-disposition');
    if (contentType) res.setHeader('content-type', contentType);
    if (contentDisposition) res.setHeader('content-disposition', contentDisposition);
    Readable.fromWeb(upstream.body as any).pipe(res);
  }
}
