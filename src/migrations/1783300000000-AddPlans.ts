import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the Plan/Package catalog and links it into Tenant + License.
 * The `dev`/test environments run with `synchronize: true` and never execute
 * this file directly — it exists for production deploys (`npm run migration:run`).
 */
export class AddPlans1783300000000 implements MigrationInterface {
  name = 'AddPlans1783300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."plans_billingcycle_enum" AS ENUM('monthly', 'yearly')
    `);

    await queryRunner.query(`
      CREATE TABLE "plans" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "key" character varying NOT NULL,
        "name" character varying NOT NULL,
        "description" text,
        "maxUsers" integer,
        "maxLocations" integer,
        "price" numeric(10,2) NOT NULL DEFAULT '0',
        "billingCycle" "public"."plans_billingcycle_enum" NOT NULL DEFAULT 'monthly',
        "durationDays" integer NOT NULL DEFAULT 30,
        "isActive" boolean NOT NULL DEFAULT true,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_plans_key" UNIQUE ("key"),
        CONSTRAINT "PK_plans_id" PRIMARY KEY ("id")
      )
    `);

    // Seed the four default tiers (idempotent — PlansSeeder also no-ops if these already exist).
    await queryRunner.query(`
      INSERT INTO "plans" ("key","name","description","maxUsers","maxLocations","durationDays","sortOrder") VALUES
        ('basic', 'Basic', 'For a single shop with one cashier.', 1, 1, 30, 0),
        ('standard', 'Standard', 'For a growing business with a small team.', 3, 2, 30, 1),
        ('pro', 'Pro', 'For multi-location businesses with a larger team.', 5, 3, 30, 2),
        ('enterprise', 'Enterprise', 'Unlimited users and locations.', NULL, NULL, 365, 3)
      ON CONFLICT ("key") DO NOTHING
    `);

    // tenants: rename the old bare-enum `plan` to `legacyPlan` (display-only), add the real planId FK.
    await queryRunner.query(`ALTER TABLE "tenants" RENAME COLUMN "plan" TO "legacyPlan"`);
    await queryRunner.query(`ALTER TABLE "tenants" ADD COLUMN "planId" uuid`);
    await queryRunner.query(`
      ALTER TABLE "tenants" ADD CONSTRAINT "FK_tenants_planId"
      FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // licenses: add planId FK — the snapshot of maxUsers/maxLocations still lives in `features` jsonb.
    await queryRunner.query(`ALTER TABLE "licenses" ADD COLUMN "planId" uuid`);
    await queryRunner.query(`
      ALTER TABLE "licenses" ADD CONSTRAINT "FK_licenses_planId"
      FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "licenses" DROP CONSTRAINT "FK_licenses_planId"`);
    await queryRunner.query(`ALTER TABLE "licenses" DROP COLUMN "planId"`);

    await queryRunner.query(`ALTER TABLE "tenants" DROP CONSTRAINT "FK_tenants_planId"`);
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "planId"`);
    await queryRunner.query(`ALTER TABLE "tenants" RENAME COLUMN "legacyPlan" TO "plan"`);

    await queryRunner.query(`DROP TABLE "plans"`);
    await queryRunner.query(`DROP TYPE "public"."plans_billingcycle_enum"`);
  }
}
