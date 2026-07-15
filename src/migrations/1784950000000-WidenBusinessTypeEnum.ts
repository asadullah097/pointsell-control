import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * tenants.businessType was missing 5 of the 11 profiles nestjs-pos actually
 * seeds (grocery, cosmetics, bakery, electronics, hardware) — the control
 * panel's registration form silently couldn't offer them. See
 * SeedBusinessType in nestjs-pos/src/common/database/seeds/business-profile.seed.ts.
 */
export class WidenBusinessTypeEnum1784950000000 implements MigrationInterface {
  name = 'WidenBusinessTypeEnum1784950000000';
  // ALTER TYPE ADD VALUE cannot run inside a PostgreSQL transaction block
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."tenants_businesstype_enum" ADD VALUE IF NOT EXISTS 'grocery'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."tenants_businesstype_enum" ADD VALUE IF NOT EXISTS 'cosmetics'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."tenants_businesstype_enum" ADD VALUE IF NOT EXISTS 'bakery'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."tenants_businesstype_enum" ADD VALUE IF NOT EXISTS 'electronics'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."tenants_businesstype_enum" ADD VALUE IF NOT EXISTS 'hardware'`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Enum values cannot be removed in PostgreSQL without recreating the type.
    // Safe to leave: unused values are harmless.
  }
}
