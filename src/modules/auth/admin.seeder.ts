import * as bcrypt from 'bcrypt';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Admin } from './admin.entity';

@Injectable()
export class AdminSeeder implements OnModuleInit {
  private readonly logger = new Logger(AdminSeeder.name);

  constructor(
    @InjectRepository(Admin) private readonly adminRepo: Repository<Admin>,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const count = await this.adminRepo.count();
    if (count > 0) return; // already seeded

    const email    = this.config.get<string>('ADMIN_EMAIL', 'admin@pointsell.app');
    const password = this.config.get<string>('ADMIN_PASSWORD');

    if (!password || password === 'CHANGE_ME') {
      this.logger.warn(
        'ADMIN_PASSWORD is not set or is the default. ' +
        'Set a real password in .env before going to production.',
      );
    }

    const passwordHash = await bcrypt.hash(password ?? 'changeme', 10);
    await this.adminRepo.save(this.adminRepo.create({ email, passwordHash }));

    this.logger.log(`Admin seeded — email: ${email}`);
  }
}
