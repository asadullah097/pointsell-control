import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  NotFoundException, Param, ParseUUIDPipe, Patch, Post, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse,
  ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Admin } from './admin.entity';
import { AdminGuard } from '../../common/guards/admin.guard';

class CreateAdminDto {
  @ApiProperty({ example: 'ops@pointsell.app' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongP@ss1', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}

class UpdateAdminDto {
  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

@ApiTags('Admins')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('api/auth/admins')
export class AdminsController {
  constructor(
    @InjectRepository(Admin) private readonly adminRepo: Repository<Admin>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all admin accounts' })
  @ApiOkResponse({ type: [Admin] })
  findAll() {
    return this.adminRepo.find({ select: ['id', 'email', 'isActive', 'createdAt'], order: { createdAt: 'ASC' } });
  }

  @Post()
  @ApiOperation({ summary: 'Create a new admin account' })
  @ApiCreatedResponse({ type: Admin })
  async create(@Body() dto: CreateAdminDto) {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const admin = this.adminRepo.create({ email: dto.email, passwordHash });
    const saved = await this.adminRepo.save(admin);
    const { passwordHash: _, ...safe } = saved;
    return safe;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update admin email, password, or active status' })
  @ApiOkResponse({ type: Admin })
  @ApiNotFoundResponse()
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAdminDto) {
    const admin = await this.adminRepo.findOneBy({ id });
    if (!admin) throw new NotFoundException('Admin not found');

    const patch: Partial<Admin> = {};
    if (dto.email) patch.email = dto.email;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;
    if (dto.password) patch.passwordHash = await bcrypt.hash(dto.password, 12);

    await this.adminRepo.update(id, patch);
    const updated = await this.adminRepo.findOneBy({ id });
    const { passwordHash: _, ...safe } = updated!;
    return safe;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiOperation({ summary: 'Delete an admin account' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const admin = await this.adminRepo.findOneBy({ id });
    if (!admin) throw new NotFoundException('Admin not found');
    await this.adminRepo.delete(id);
  }
}
