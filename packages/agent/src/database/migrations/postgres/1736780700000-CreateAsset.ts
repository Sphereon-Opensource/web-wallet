import { MigrationInterface, QueryRunner } from 'typeorm'
import { enablePostgresUuidExtension } from '@sphereon/ssi-sdk.core'

/**
 * Migration to create asset table for content-addressable document storage.
 *
 * Assets are documents, images, UBLs, and other files that can be:
 * 1. Stored locally with a content-addressable identifier (digestMultibase)
 * 2. Made publicly available via /api/assets/<digestMultibase>
 * 3. Time-limited via available_from and available_until timestamps
 * 4. Referenced in SD-JWT credentials as evidence items
 *
 * The digestMultibase is the primary content-addressable identifier:
 * - Uses multibase encoding (base58btc with 'z' prefix)
 * - Computed from file content using SHA-256/384/512
 * - Enables deduplication and integrity verification
 */
export class CreateAsset1736780700000 implements MigrationInterface {
  name = 'CreateAsset1736780700000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await enablePostgresUuidExtension(queryRunner)

    // Create asset table - stores metadata for content-addressable assets
    await queryRunner.query(`
      CREATE TABLE "asset"
      (
        "id"                uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id"         text,
        "digest_multibase"  text NOT NULL,
        "hash_algorithm"    text NOT NULL DEFAULT 'sha256',
        "filename"          text NOT NULL,
        "original_filename" text,
        "content_type"      text NOT NULL,
        "file_size"         bigint NOT NULL DEFAULT 0,
        "storage_path"      text NOT NULL,
        "asset_type"        text NOT NULL DEFAULT 'Document',
        "description"       text,
        "is_public"         boolean NOT NULL DEFAULT false,
        "available_from"    timestamp with time zone,
        "available_until"   timestamp with time zone,
        "credential_id"     text,
        "metadata"          jsonb,
        "deleted_at"        timestamp with time zone,
        "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at"        timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "asset_pkey" PRIMARY KEY ("id")
      )
    `)

    // Unique index on digest_multibase - ensures content addressability
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_asset_digest_multibase" ON "asset" ("digest_multibase")
    `)

    // Index for public asset lookup with availability window
    await queryRunner.query(`
      CREATE INDEX "idx_asset_public_availability" ON "asset" ("is_public", "available_from", "available_until")
        WHERE "is_public" = true
    `)

    // Index for credential lookup
    await queryRunner.query(`
      CREATE INDEX "idx_asset_credential_id" ON "asset" ("credential_id")
        WHERE "credential_id" IS NOT NULL
    `)

    // Index for tenant isolation
    await queryRunner.query(`
      CREATE INDEX "idx_asset_tenant_id" ON "asset" ("tenant_id")
        WHERE "tenant_id" IS NOT NULL
    `)

    // Index for asset type filtering
    await queryRunner.query(`
      CREATE INDEX "idx_asset_type" ON "asset" ("asset_type")
    `)

    // Grant permissions (following existing pattern for Supabase compatibility)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
          GRANT SELECT, INSERT, UPDATE, DELETE ON "asset" TO service_role;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          GRANT SELECT, INSERT, UPDATE, DELETE ON "asset" TO authenticated;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          GRANT SELECT ON "asset" TO anon;
        END IF;
      END $$;
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_asset_type"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_asset_tenant_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_asset_credential_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_asset_public_availability"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_asset_digest_multibase"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "asset"`)
  }
}
