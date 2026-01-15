import { MigrationInterface, QueryRunner } from 'typeorm'
import { enablePostgresUuidExtension } from '@sphereon/ssi-sdk.core'

/**
 * Migration to create inbox tables for receiving credentials via OID4VP.
 *
 * Tables:
 * - inbox: Named containers that can receive credentials
 * - inbox_folder: Folders within inboxes, each tied to a DCQL query
 * - inbox_credential: Junction table linking received credentials to inbox/folder
 * - inbox_allowed_sender: Allowlist for sender validation (optional filtering)
 */
export class CreateInbox1736780400000 implements MigrationInterface {
  name = 'CreateInbox1736780400000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await enablePostgresUuidExtension(queryRunner)

    // Create inbox table - named containers for receiving credentials
    await queryRunner.query(`
      CREATE TABLE "inbox"
      (
        "id"          uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id"   uuid,
        "name"        text NOT NULL,
        "did"         text NOT NULL,
        "description" text,
        "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "inbox_pkey" PRIMARY KEY ("id")
      )
    `)

    // Unique constraint on name (within tenant if multi-tenant)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "inbox_name_unique_no_tenant" ON "inbox" ("name")
        WHERE "tenant_id" IS NULL
    `)

    await queryRunner.query(`
      CREATE UNIQUE INDEX "inbox_name_unique_tenant" ON "inbox" ("name", "tenant_id")
        WHERE "tenant_id" IS NOT NULL
    `)

    // Create inbox_folder table - folders within inboxes, tied to DCQL queries
    await queryRunner.query(`
      CREATE TABLE "inbox_folder"
      (
        "id"            uuid NOT NULL DEFAULT gen_random_uuid(),
        "inbox_id"      uuid NOT NULL,
        "name"          text NOT NULL,
        "dcql_query_id" text,
        "description"   text,
        "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at"    timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "inbox_folder_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "fk_inbox_folder_inbox" FOREIGN KEY ("inbox_id")
          REFERENCES "inbox" ("id") ON DELETE CASCADE
      )
    `)

    // Unique constraint on folder name within inbox
    await queryRunner.query(`
      CREATE UNIQUE INDEX "inbox_folder_name_unique" ON "inbox_folder" ("inbox_id", "name")
    `)

    // Index for folder lookup by inbox
    await queryRunner.query(`
      CREATE INDEX "idx_inbox_folder_inbox_id" ON "inbox_folder" ("inbox_id")
    `)

    // Create inbox_credential table - links received credentials to inbox/folder
    // Uses client_id and client_id_prefix (per OID4VP spec) to support DIDs, OpenID Federation, X.509, etc.
    await queryRunner.query(`
      CREATE TABLE "inbox_credential"
      (
        "id"                uuid NOT NULL DEFAULT gen_random_uuid(),
        "inbox_id"          uuid NOT NULL,
        "folder_id"         uuid NOT NULL,
        "credential_id"     text NOT NULL,
        "client_id"         text NOT NULL,
        "client_id_prefix"  text,
        "correlation_id"    text NOT NULL,
        "received_at"       timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "inbox_credential_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "fk_inbox_credential_inbox" FOREIGN KEY ("inbox_id")
          REFERENCES "inbox" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_inbox_credential_folder" FOREIGN KEY ("folder_id")
          REFERENCES "inbox_folder" ("id") ON DELETE CASCADE
      )
    `)

    // Index for credential lookup
    await queryRunner.query(`
      CREATE INDEX "idx_inbox_credential_inbox_id" ON "inbox_credential" ("inbox_id")
    `)

    await queryRunner.query(`
      CREATE INDEX "idx_inbox_credential_folder_id" ON "inbox_credential" ("folder_id")
    `)

    await queryRunner.query(`
      CREATE INDEX "idx_inbox_credential_correlation_id" ON "inbox_credential" ("correlation_id")
    `)

    // Create inbox_allowed_sender table - optional allowlist for sender validation
    // Uses client_id and client_id_prefix (per OID4VP spec) to support various identifier types
    await queryRunner.query(`
      CREATE TABLE "inbox_allowed_sender"
      (
        "id"                uuid NOT NULL DEFAULT gen_random_uuid(),
        "inbox_id"          uuid NOT NULL,
        "client_id"         text NOT NULL,
        "client_id_prefix"  text,
        "description"       text,
        "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "inbox_allowed_sender_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "fk_inbox_allowed_sender_inbox" FOREIGN KEY ("inbox_id")
          REFERENCES "inbox" ("id") ON DELETE CASCADE
      )
    `)

    // Unique constraint on client_id within inbox (with scheme)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "inbox_allowed_sender_unique" ON "inbox_allowed_sender" ("inbox_id", "client_id", COALESCE("client_id_prefix", ''))
    `)

    // Index for sender lookup
    await queryRunner.query(`
      CREATE INDEX "idx_inbox_allowed_sender_inbox_id" ON "inbox_allowed_sender" ("inbox_id")
    `)

    // Grant permissions (following existing pattern for Supabase compatibility)
    // Use DO block to handle missing roles gracefully
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
          GRANT SELECT, INSERT, UPDATE, DELETE ON "inbox" TO service_role;
          GRANT SELECT, INSERT, UPDATE, DELETE ON "inbox_folder" TO service_role;
          GRANT SELECT, INSERT, UPDATE, DELETE ON "inbox_credential" TO service_role;
          GRANT SELECT, INSERT, UPDATE, DELETE ON "inbox_allowed_sender" TO service_role;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          GRANT SELECT, INSERT, UPDATE, DELETE ON "inbox" TO authenticated;
          GRANT SELECT, INSERT, UPDATE, DELETE ON "inbox_folder" TO authenticated;
          GRANT SELECT, INSERT, UPDATE, DELETE ON "inbox_credential" TO authenticated;
          GRANT SELECT, INSERT, UPDATE, DELETE ON "inbox_allowed_sender" TO authenticated;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          GRANT SELECT, INSERT, UPDATE, DELETE ON "inbox" TO anon;
          GRANT SELECT, INSERT, UPDATE, DELETE ON "inbox_folder" TO anon;
          GRANT SELECT, INSERT, UPDATE, DELETE ON "inbox_credential" TO anon;
          GRANT SELECT, INSERT, UPDATE, DELETE ON "inbox_allowed_sender" TO anon;
        END IF;
      END $$;
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inbox_allowed_sender_inbox_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "inbox_allowed_sender_unique"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inbox_credential_correlation_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inbox_credential_folder_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inbox_credential_inbox_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inbox_folder_inbox_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "inbox_folder_name_unique"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "inbox_name_unique_tenant"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "inbox_name_unique_no_tenant"`)

    // Drop tables in reverse order (respecting foreign keys)
    await queryRunner.query(`DROP TABLE IF EXISTS "inbox_allowed_sender"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "inbox_credential"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "inbox_folder"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "inbox"`)
  }
}
