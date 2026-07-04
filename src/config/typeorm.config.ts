import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Tenant } from '../modules/tenants/tenant.entity';
import { License } from '../modules/licenses/license.entity';
import { Release } from '../modules/releases/release.entity';
import { Admin } from '../modules/auth/admin.entity';
import { Plan } from '../modules/plans/plan.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS,
  database: process.env.DB_NAME ?? 'pointsell_control',
  entities: [Tenant, License, Release, Admin, Plan],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
