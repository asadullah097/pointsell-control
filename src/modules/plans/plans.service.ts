import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from './plan.entity';
import { Tenant } from '../tenants/tenant.entity';
import { License } from '../licenses/license.entity';
import { CreatePlanDto, UpdatePlanDto } from './dto';

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(Plan) private readonly planRepo: Repository<Plan>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(License) private readonly licenseRepo: Repository<License>,
  ) {}

  findAll(): Promise<Plan[]> {
    return this.planRepo.find({ order: { sortOrder: 'ASC', createdAt: 'ASC' } });
  }

  async findOne(id: string): Promise<Plan> {
    const plan = await this.planRepo.findOneBy({ id });
    if (!plan) throw new NotFoundException(`Plan ${id} not found`);
    return plan;
  }

  async findByKey(key: string): Promise<Plan> {
    const plan = await this.planRepo.findOneBy({ key });
    if (!plan) throw new NotFoundException(`Plan "${key}" not found`);
    return plan;
  }

  /** Limits to snapshot into a License's `features` at issue/renew time. */
  async getLimits(key: string): Promise<{ maxUsers: number | null; maxLocations: number | null }> {
    const plan = await this.findByKey(key);
    return { maxUsers: plan.maxUsers, maxLocations: plan.maxLocations };
  }

  async create(dto: CreatePlanDto): Promise<Plan> {
    const exists = await this.planRepo.findOneBy({ key: dto.key });
    if (exists) throw new ConflictException(`Plan key "${dto.key}" already exists.`);
    return this.planRepo.save(
      this.planRepo.create({
        key: dto.key,
        name: dto.name,
        description: dto.description ?? null,
        maxUsers: dto.maxUsers ?? null,
        maxLocations: dto.maxLocations ?? null,
        price: dto.price ?? 0,
        billingCycle: dto.billingCycle ?? 'monthly',
        durationDays: dto.durationDays ?? 30,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      }),
    );
  }

  async update(id: string, dto: UpdatePlanDto): Promise<Plan> {
    await this.findOne(id);
    await this.planRepo.update(id, dto);
    return this.findOne(id);
  }

  /** Hard-delete only if unreferenced; otherwise soft-hide so existing tenants keep their snapshot. */
  async remove(id: string): Promise<{ softHidden: boolean }> {
    await this.findOne(id);
    const [tenantCount, licenseCount] = await Promise.all([
      this.tenantRepo.count({ where: { planId: id } }),
      this.licenseRepo.count({ where: { planId: id } }),
    ]);

    if (tenantCount > 0 || licenseCount > 0) {
      await this.planRepo.update(id, { isActive: false });
      return { softHidden: true };
    }

    await this.planRepo.delete(id);
    return { softHidden: false };
  }
}
