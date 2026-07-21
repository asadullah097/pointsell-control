import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `signup_requests` — public "start trial / contact sales" submissions from the
 * landing page, reviewed by an admin before a real Tenant is provisioned.
 * See signup-requests.service.ts for the full approve/reject flow.
 */
export class AddSignupRequests1785000000000 implements MigrationInterface {
  name = 'AddSignupRequests1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."signup_requests_status_enum" AS ENUM('pending', 'approved', 'rejected')
    `);

    await queryRunner.query(`
      CREATE TABLE "signup_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "businessName" character varying NOT NULL,
        "fullName" character varying NOT NULL,
        "email" character varying NOT NULL,
        "phone" character varying NOT NULL,
        "businessType" character varying NOT NULL,
        "planCategoryLabel" character varying,
        "planName" character varying,
        "note" text,
        "status" "public"."signup_requests_status_enum" NOT NULL DEFAULT 'pending',
        "rejectionReason" text,
        "reviewedByAdminId" character varying,
        "reviewedAt" TIMESTAMP,
        "tenantId" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_signup_requests_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_signup_requests_status" ON "signup_requests" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_signup_requests_email" ON "signup_requests" ("email")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_signup_requests_email"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_signup_requests_status"`);
    await queryRunner.query(`DROP TABLE "signup_requests"`);
    await queryRunner.query(`DROP TYPE "public"."signup_requests_status_enum"`);
  }
}
