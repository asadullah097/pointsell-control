import { Body, Controller, HttpCode, HttpStatus, Post, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Public } from '../../common/guards/public.decorator';
import { Admin } from './admin.entity';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly jwt: JwtService,
    @InjectRepository(Admin) private readonly adminRepo: Repository<Admin>,
  ) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login — returns JWT for all protected endpoints' })
  @ApiOkResponse({ schema: { example: { access_token: 'eyJ...' } } })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto) {
    const admin = await this.adminRepo.findOneBy({ email: dto.email, isActive: true });
    if (!admin) throw new UnauthorizedException('Invalid credentials.');

    const valid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials.');

    const token = this.jwt.sign({ sub: admin.id, email: admin.email, role: 'admin' });
    return { access_token: token };
  }
}
