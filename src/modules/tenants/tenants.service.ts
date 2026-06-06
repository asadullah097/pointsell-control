import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './tenant.entity';
import { CreateTenantDto, UpdateTenantDto } from './dto';
import { LicenseService } from '../licenses/license.service';
import { License } from '../licenses/license.entity';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant) private readonly repo: Repository<Tenant>,
    private readonly licenseService: LicenseService,
  ) {}

  async create(dto: CreateTenantDto): Promise<{ tenant: Tenant; license?: License }> {
    const tenant = await this.repo.save(this.repo.create({
      businessName: dto.businessName,
      email: dto.email,
      phone: dto.phone,
      plan: dto.plan ?? 'starter',
      notes: dto.notes,
      status: 'trial',
    }));

    if (!dto.autoIssueLicense) return { tenant };

    const license = await this.licenseService.create(
      tenant.id,
      dto.autoIssueLicense.mode ?? 'online',
      new Date(dto.autoIssueLicense.expiresAt),
      dto.autoIssueLicense.features ?? { maxLocations: 1, restaurantMode: false, pharmacyMode: false, multiRegister: false },
    );
    return { tenant, license };
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
