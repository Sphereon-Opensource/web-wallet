import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Migration to add parsed_data column to inbox_credential table.
 *
 * This column stores parsed evidence data (line items, party details, etc.)
 * fetched from external evidence files referenced in the credential.
 *
 * Also adds evidence_fetched_at timestamp to track when evidence was fetched.
 */
export class AddInboxCredentialParsedData1736780800000 implements MigrationInterface {
  name = 'AddInboxCredentialParsedData1736780800000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add parsed_data JSONB column to store parsed evidence data
    // This includes line items, supplier/customer details, payment terms, etc.
    await queryRunner.query(`
      ALTER TABLE "inbox_credential"
      ADD COLUMN "parsed_data" jsonb
    `)

    // Add timestamp to track when evidence was fetched and parsed
    await queryRunner.query(`
      ALTER TABLE "inbox_credential"
      ADD COLUMN "evidence_fetched_at" timestamp with time zone
    `)

    // Add index for querying credentials by evidence fetch status
    await queryRunner.query(`
      CREATE INDEX "idx_inbox_credential_evidence_fetched" ON "inbox_credential" ("evidence_fetched_at")
        WHERE "evidence_fetched_at" IS NOT NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inbox_credential_evidence_fetched"`)
    await queryRunner.query(`ALTER TABLE "inbox_credential" DROP COLUMN IF EXISTS "evidence_fetched_at"`)
    await queryRunner.query(`ALTER TABLE "inbox_credential" DROP COLUMN IF EXISTS "parsed_data"`)
  }
}
