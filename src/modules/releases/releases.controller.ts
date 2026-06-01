import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Release } from './release.entity';
import { Public } from '../../common/guards/public.decorator';

@ApiTags('Releases')
@Controller('api/releases')
export class ReleasesController {
  constructor(
    @InjectRepository(Release) private readonly releaseRepo: Repository<Release>,
  ) {}

  /**
   * Returns the latest published release for a given channel.
   * Called by the POS app to check for updates.
   * Public — no auth required.
   */
  @Get('latest')
  @Public()
  @ApiOperation({ summary: 'Get latest published release (called by POS app)' })
  @ApiQuery({ name: 'channel', required: false, example: 'local' })
  @ApiQuery({ name: 'current', required: false, description: 'Current version installed' })
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
}
