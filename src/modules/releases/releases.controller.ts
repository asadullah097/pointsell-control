import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiNotFoundResponse,
  ApiOkResponse, ApiOperation, ApiQuery, ApiTags,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { IsBoolean, IsDateString, IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Repository } from 'typeorm';
import { Release } from './release.entity';
import { Public } from '../../common/guards/public.decorator';
import { AdminGuard } from '../../common/guards/admin.guard';

export class CreateReleaseDto {
  @ApiProperty({ example: '1.2.0' })
  @IsString()
  version: string;

  @ApiPropertyOptional({ example: 'local', default: 'local' })
  @IsString()
  @IsOptional()
  channel?: string;

  @ApiPropertyOptional({ example: 'Bug fixes and performance improvements.' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: 'https://releases.pointsell.app/v1.2.0/PointSell-v1.2.0-local.zip' })
  @IsUrl()
  downloadUrl: string;

  @ApiProperty({ example: 'abc123...', description: 'SHA-256 of the release zip' })
  @IsString()
  sha256: string;

  @ApiProperty({ description: 'Ed25519 signature of {version,sha256,notes} — from sign-manifest.js' })
  @IsString()
  signature: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  published?: boolean;
}

export class UpdateReleaseDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  downloadUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sha256?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  signature?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  published?: boolean;
}

@ApiTags('Releases')
@Controller('api/releases')
export class ReleasesController {
  constructor(
    @InjectRepository(Release) private readonly releaseRepo: Repository<Release>,
  ) {}

  // ── POS-facing (public) ───────────────────────────────────────────────────

  @Get('latest')
  @Public()
  @ApiOperation({ summary: 'Get latest published release — called by POS app on startup' })
  @ApiQuery({ name: 'channel', required: false, example: 'local' })
  @ApiQuery({ name: 'current', required: false, description: 'Installed version semver' })
  async getLatest(
    @Query('channel') channel = 'local',
    @Query('current') current?: string,
  ) {
    const latest = await this.releaseRepo.findOne({
      where: { channel, published: true },
      order: { createdAt: 'DESC' },
    });
    if (!latest) return { updateAvailable: false };
    return {
      updateAvailable: latest.version !== current,
      version: latest.version,
      downloadUrl: latest.downloadUrl,
      sha256: latest.sha256,
      signature: latest.signature,
      notes: latest.notes,
    };
  }

  // ── Admin CRUD ────────────────────────────────────────────────────────────

  @Post()
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new release record (admin)' })
  @ApiCreatedResponse({ type: Release })
  create(@Body() dto: CreateReleaseDto) {
    return this.releaseRepo.save(
      this.releaseRepo.create({
        version: dto.version,
        channel: dto.channel ?? 'local',
        notes: dto.notes ?? null,
        downloadUrl: dto.downloadUrl,
        sha256: dto.sha256,
        signature: dto.signature,
        published: dto.published ?? false,
      }),
    );
  }

  @Get()
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all releases (admin)' })
  @ApiQuery({ name: 'channel', required: false })
  findAll(@Query('channel') channel?: string) {
    return this.releaseRepo.find({
      where: channel ? { channel } : undefined,
      order: { createdAt: 'DESC' },
    });
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a release (notes, urls, publish flag)' })
  @ApiOkResponse({ type: Release })
  @ApiNotFoundResponse()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReleaseDto,
  ) {
    const release = await this.releaseRepo.findOneBy({ id });
    if (!release) throw new NotFoundException('Release not found');
    await this.releaseRepo.update(id, dto);
    return this.releaseRepo.findOneBy({ id });
  }

  @Post(':id/publish')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a release (makes it visible to POS apps)' })
  @ApiOkResponse({ type: Release })
  async publish(@Param('id', ParseUUIDPipe) id: string) {
    const release = await this.releaseRepo.findOneBy({ id });
    if (!release) throw new NotFoundException('Release not found');
    await this.releaseRepo.update(id, { published: true });
    return this.releaseRepo.findOneBy({ id });
  }

  @Post(':id/unpublish')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unpublish a release (hides from POS apps)' })
  async unpublish(@Param('id', ParseUUIDPipe) id: string) {
    const release = await this.releaseRepo.findOneBy({ id });
    if (!release) throw new NotFoundException('Release not found');
    await this.releaseRepo.update(id, { published: false });
    return this.releaseRepo.findOneBy({ id });
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const release = await this.releaseRepo.findOneBy({ id });
    if (!release) throw new NotFoundException('Release not found');
    await this.releaseRepo.delete(id);
  }
}
