import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../../common/guards/admin.guard';
import { PosApiClient } from '../../common/clients/pos-api.client';

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
    @Body() body: { message: string; adminName?: string },
  ) {
    return this.posApi.replyTicket(slug, ticketId, body.message, body.adminName);
  }

  @Patch(':slug/:ticketId/status')
  @ApiOperation({ summary: 'Set ticket status to in_progress, resolved, or closed' })
  updateStatus(
    @Param('slug') slug: string,
    @Param('ticketId') ticketId: string,
    @Body() body: { status: 'in_progress' | 'resolved' | 'closed' },
  ) {
    return this.posApi.updateTicketStatus(slug, ticketId, body.status);
  }
}
