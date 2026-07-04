import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from './plan.entity';

const DEFAULT_PLANS: Array<Partial<Plan> & { key: string; name: string }> = [
  { key: 'basic', name: 'Basic', description: 'For a single shop with one cashier.', maxUsers: 1, maxLocations: 1, durationDays: 30, sortOrder: 0 },
  { key: 'standard', name: 'Standard', description: 'For a growing business with a small team.', maxUsers: 3, maxLocations: 2, durationDays: 30, sortOrder: 1 },
  { key: 'pro', name: 'Pro', description: 'For multi-location businesses with a larger team.', maxUsers: 5, maxLocations: 3, durationDays: 30, sortOrder: 2 },
  { key: 'enterprise', name: 'Enterprise', description: 'Unlimited users and locations.', maxUsers: null, maxLocations: null, durationDays: 365, sortOrder: 3 },
];

@Injectable()
export class PlansSeeder implements OnModuleInit {
  private readonly logger = new Logger(PlansSeeder.name);

  constructor(@InjectRepository(Plan) private readonly planRepo: Repository<Plan>) {}

  async onModuleInit(): Promise<void> {
    for (const def of DEFAULT_PLANS) {
      const exists = await this.planRepo.findOneBy({ key: def.key });
      if (exists) continue;
      await this.planRepo.save(this.planRepo.create(def));
      this.logger.log(`Seeded plan: ${def.key}`);
    }
  }
}
