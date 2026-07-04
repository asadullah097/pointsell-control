import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { Tenant } from './modules/tenants/tenant.entity';
import { License } from './modules/licenses/license.entity';
import { Release } from './modules/releases/release.entity';
import { Admin } from './modules/auth/admin.entity';
import { Plan } from './modules/plans/plan.entity';

import { AuthController } from './modules/auth/auth.controller';
import { AdminsController } from './modules/auth/admins.controller';
import { TenantsController } from './modules/tenants/tenants.controller';
import { LicenseController } from './modules/licenses/license.controller';
import { ReleasesController } from './modules/releases/releases.controller';
import { DashboardController } from './modules/dashboard/dashboard.controller';
import { HealthController } from './modules/health/health.controller';
import { PlansController } from './modules/plans/plans.controller';

import { LicenseService } from './modules/licenses/license.service';
import { LicenseExpiryService } from './modules/licenses/license-expiry.service';
import { TenantsService } from './modules/tenants/tenants.service';
import { PlansService } from './modules/plans/plans.service';
import { PlansSeeder } from './modules/plans/plans.seeder';
import { AdminSeeder } from './modules/auth/admin.seeder';
import { AdminGuard } from './common/guards/admin.guard';
import { PosApiClient } from './common/clients/pos-api.client';

const publicDir = join(__dirname, '..', 'public');

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),

    // Serve the React admin UI from /public
    ServeStaticModule.forRoot({
      rootPath: publicDir,
      exclude: ['/api/*', '/health'],
      serveStaticOptions: { index: 'index.html', fallthrough: true },
    }),

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
        entities: [Tenant, License, Release, Admin, Plan],
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('NODE_ENV') !== 'production',
      }),
    }),

    TypeOrmModule.forFeature([Tenant, License, Release, Admin, Plan]),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '12h' },
      }),
    }),
  ],
  controllers: [
    HealthController,
    AuthController,
    AdminsController,
    TenantsController,
    LicenseController,
    ReleasesController,
    DashboardController,
    PlansController,
  ],
  providers: [
    LicenseService,
    LicenseExpiryService,
    TenantsService,
    PlansService,
    PlansSeeder,
    AdminSeeder,
    AdminGuard,
    PosApiClient,
  ],
})
export class AppModule {}
