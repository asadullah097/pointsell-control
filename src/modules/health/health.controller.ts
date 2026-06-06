import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from '../../common/guards/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check — returns DB status and uptime' })
  async check() {
    let dbOk = false;
    try {
      await this.db.query('SELECT 1');
      dbOk = true;
    } catch {}

    return {
      status: dbOk ? 'ok' : 'degraded',
      db: dbOk ? 'connected' : 'unreachable',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
