import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { Tenant } from './modules/tenants/tenant.entity';
import { License } from './modules/licenses/license.entity';
import { Release } from './modules/releases/release.entity';
import { LicenseController } from './modules/licenses/license.controller';
import { LicenseService } from './modules/licenses/license.service';
import { ReleasesController } from './modules/releases/releases.controller';
import { TenantsController } from './modules/tenants/tenants.controller';
import { TenantsService } from './modules/tenants/tenants.service';
import { AuthController } from './modules/auth/auth.controller';
import { Admin } from './modules/auth/admin.entity';
import { AdminSeeder } from './modules/auth/admin.seeder';
import { AdminGuard } from './common/guards/admin.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USER', 'postgres'),
        password: config.get('DB_PASS'),
        database: config.get('DB_NAME', 'pointsell_control'),
        entities: [Tenant, License, Release, Admin],
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('NODE_ENV') !== 'production',
      }),
    }),

    TypeOrmModule.forFeature([Tenant, License, Release, Admin]),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '12h' },
      }),
    }),
  ],
  controllers: [AuthController, TenantsController, LicenseController, ReleasesController],
  providers: [LicenseService, TenantsService, AdminSeeder, AdminGuard],
})
export class AppModule {}
