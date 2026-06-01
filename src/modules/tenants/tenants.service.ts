import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './tenant.entity';
import { CreateTenantDto, UpdateTenantDto } from './dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant) private readonly repo: Repository<Tenant>,
  ) {}

  create(dto: CreateTenantDto): Promise<Tenant> {
    return this.repo.save(this.repo.create(dto));
  }

  findAll(): Promise<Tenant[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.repo.findOneBy({ id });
    if (!tenant) throw new NotFoundException(`Tenant ${id} not found`);
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto): Promise<Tenant> {
    await this.findOne(id);
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repo.delete(id);
  }
}
