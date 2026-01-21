import { MigrationInterface, QueryRunner } from 'typeorm'
import { enablePostgresUuidExtension } from '@sphereon/ssi-sdk.core'

/**
 * Consolidated migration for Inbox, Outbox, and eInvoice functionality.
 *
 * This migration creates all tables and schema changes needed for:
 * 1. Inbox system - receiving credentials via OID4VP
 * 2. Outbox system - sending credentials via OID4VP (draft -> sending -> sent/failed)
 * 3. Asset storage - content-addressable document storage for evidence files
 * 4. Service metadata - extends Veramo's service table for eInvoice data
 *
 * Tables created:
 * - inbox: Named containers that can receive credentials
 * - inbox_folder: Folders within inboxes, each tied to a DCQL query
 * - inbox_credential: Junction table linking received credentials to inbox/folder
 * - inbox_allowed_sender: Allowlist for sender validation (optional filtering)
 * - outbox_item: Outbound invoice items with status tracking (draft/sending/sent/failed)
 * - asset: Content-addressable document storage for evidence files
 *
 * Schema changes:
 * - Adds metadata column to Veramo's service table for eInvoice data
 */
export class CreateInboxAndEInvoice1736780400000 implements MigrationInterface {
  name = 'CreateInboxAndEInvoice1736780400000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await enablePostgresUuidExtension(queryRunner)

    // ============================================
    // INBOX TABLES
    // ============================================

    // Create inbox table - named containers for receiving credentials
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inbox"
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
      CREATE UNIQUE INDEX IF NOT EXISTS "inbox_name_unique_no_tenant" ON "inbox" ("name")
        WHERE "tenant_id" IS NULL
    `)

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "inbox_name_unique_tenant" ON "inbox" ("name", "tenant_id")
        WHERE "tenant_id" IS NOT NULL
    `)

    // Create inbox_folder table - folders within inboxes, tied to DCQL queries
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inbox_folder"
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
      CREATE UNIQUE INDEX IF NOT EXISTS "inbox_folder_name_unique" ON "inbox_folder" ("inbox_id", "name")
    `)

    // Index for folder lookup by inbox
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_inbox_folder_inbox_id" ON "inbox_folder" ("inbox_id")
    `)

    // Create inbox_credential table - links received credentials to inbox/folder
    // Uses client_id and client_id_prefix (per OID4VP spec) to support DIDs, OpenID Federation, X.509, etc.
    // Includes parsed_data for storing parsed evidence data (line items, party details, etc.)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inbox_credential"
      (
        "id"                  uuid NOT NULL DEFAULT gen_random_uuid(),
        "inbox_id"            uuid NOT NULL,
        "folder_id"           uuid NOT NULL,
        "credential_id"       text NOT NULL,
        "client_id"           text NOT NULL,
        "client_id_prefix"    text,
        "correlation_id"      text NOT NULL,
        "received_at"         timestamp with time zone NOT NULL DEFAULT now(),
        "parsed_data"         jsonb,
        "evidence_fetched_at" timestamp with time zone,
        CONSTRAINT "inbox_credential_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "fk_inbox_credential_inbox" FOREIGN KEY ("inbox_id")
          REFERENCES "inbox" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_inbox_credential_folder" FOREIGN KEY ("folder_id")
          REFERENCES "inbox_folder" ("id") ON DELETE CASCADE
      )
    `)

    // Indexes for credential lookup
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_inbox_credential_inbox_id" ON "inbox_credential" ("inbox_id")
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_inbox_credential_folder_id" ON "inbox_credential" ("folder_id")
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_inbox_credential_correlation_id" ON "inbox_credential" ("correlation_id")
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_inbox_credential_evidence_fetched" ON "inbox_credential" ("evidence_fetched_at")
        WHERE "evidence_fetched_at" IS NOT NULL
    `)

    // Create inbox_allowed_sender table - optional allowlist for sender validation
    // Uses client_id and client_id_prefix (per OID4VP spec) to support various identifier types
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inbox_allowed_sender"
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
      CREATE UNIQUE INDEX IF NOT EXISTS "inbox_allowed_sender_unique" ON "inbox_allowed_sender" ("inbox_id", "client_id", COALESCE("client_id_prefix", ''))
    `)

    // Index for sender lookup
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_inbox_allowed_sender_inbox_id" ON "inbox_allowed_sender" ("inbox_id")
    `)

    // ============================================
    // ASSET TABLE
    // ============================================

    // Create asset table - stores metadata for content-addressable assets
    // Assets are documents, images, UBLs, and other files that can be:
    // 1. Stored locally with a content-addressable identifier (digestMultibase)
    // 2. Made publicly available via /api/assets/<digestMultibase>
    // 3. Time-limited via available_from and available_until timestamps
    // 4. Referenced in SD-JWT credentials as evidence items
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "asset"
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
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_asset_digest_multibase" ON "asset" ("digest_multibase")
    `)

    // Index for public asset lookup with availability window
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_asset_public_availability" ON "asset" ("is_public", "available_from", "available_until")
        WHERE "is_public" = true
    `)

    // Index for credential lookup
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_asset_credential_id" ON "asset" ("credential_id")
        WHERE "credential_id" IS NOT NULL
    `)

    // Index for tenant isolation
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_asset_tenant_id" ON "asset" ("tenant_id")
        WHERE "tenant_id" IS NOT NULL
    `)

    // Index for asset type filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_asset_type" ON "asset" ("asset_type")
    `)

    // ============================================
    // OUTBOX TABLE
    // ============================================

    // Create outbox_item table - stores outbound invoice items
    // Status flow: draft -> sending -> sent (success) or failed (can retry)
    // Stores all invoice data needed to create and send the credential
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "outbox_item"
      (
        "id"                      uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id"               uuid,
        "status"                  text NOT NULL DEFAULT 'draft',

        -- Invoice identification
        "invoice_id"              text NOT NULL,
        "invoice_date"            text NOT NULL,
        "due_date"                text,
        "currency_code"           text NOT NULL DEFAULT 'EUR',

        -- Amounts
        "tax_exclusive_amount"    decimal(15,2),
        "tax_amount"              decimal(15,2),
        "tax_inclusive_amount"    decimal(15,2),
        "payable_amount"          decimal(15,2),

        -- Party info (stored as JSONB for flexibility)
        "seller_data"             jsonb,
        "buyer_data"              jsonb,
        "line_items"              jsonb,

        -- Evidence files (array of {id, digestMultibase, filename, contentType, evidenceType})
        "evidence_files"          jsonb NOT NULL DEFAULT '[]',

        -- Recipient info
        "recipient_did"           text NOT NULL,
        "recipient_name"          text,
        "recipient_endpoint"      text,
        "recipient_endpoint_id"   text,
        "recipient_endpoint_type" text,

        -- Source info
        "has_ubl_source"          boolean NOT NULL DEFAULT false,
        "ubl_xml_hash"            text,

        -- Result info (set after send attempt)
        "credential_id"           text,
        "correlation_id"          text,
        "error_message"           text,

        -- Timestamps
        "created_at"              timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at"              timestamp with time zone NOT NULL DEFAULT now(),
        "sent_at"                 timestamp with time zone,
        "delivered_at"            timestamp with time zone,

        CONSTRAINT "outbox_item_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "outbox_item_status_check" CHECK ("status" IN ('draft', 'sending', 'sent', 'failed'))
      )
    `)

    // Index for status-based queries (outbox = drafts + failed, sent = delivered)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_outbox_item_status" ON "outbox_item" ("status")
    `)

    // Index for tenant isolation
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_outbox_item_tenant_id" ON "outbox_item" ("tenant_id")
        WHERE "tenant_id" IS NOT NULL
    `)

    // Index for finding items by invoice_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_outbox_item_invoice_id" ON "outbox_item" ("invoice_id")
    `)

    // Index for recipient lookup
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_outbox_item_recipient_did" ON "outbox_item" ("recipient_did")
    `)

    // Index for created_at for sorting
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_outbox_item_created_at" ON "outbox_item" ("created_at" DESC)
    `)

    // ============================================
    // SERVICE METADATA (extends Veramo's service table)
    // ============================================

    // Check if the service table exists (created by Veramo migrations)
    const serviceTable = await queryRunner.getTable('service')
    if (serviceTable) {
      // Check if metadata column already exists
      const hasMetadataColumn = serviceTable.columns.some((col) => col.name === 'metadata')
      if (!hasMetadataColumn) {
        await queryRunner.query(`
          ALTER TABLE "service"
          ADD COLUMN IF NOT EXISTS "metadata" jsonb
        `)
      }
    }

    // ============================================
    // PERMISSIONS (Supabase compatibility)
    // ============================================

    // Grant permissions for all tables
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
          GRANT SELECT, INSERT, UPDATE, DELETE ON "inbox" TO service_role;
          GRANT SELECT, INSERT, UPDATE, DELETE ON "inbox_folder" TO service_role;
          GRANT SELECT, INSERT, UPDATE, DELETE ON "inbox_credential" TO service_role;
          GRANT SELECT, INSERT, UPDATE, DELETE ON "inbox_allowed_sender" TO service_role;
          GRANT SELECT, INSERT, UPDATE, DELETE ON "outbox_item" TO service_role;
          GRANT SELECT, INSERT, UPDATE, DELETE ON "asset" TO service_role;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          GRANT SELECT, INSERT, UPDATE, DELETE ON "inbox" TO authenticated;
          GRANT SELECT, INSERT, UPDATE, DELETE ON "inbox_folder" TO authenticated;
          GRANT SELECT, INSERT, UPDATE, DELETE ON "inbox_credential" TO authenticated;
          GRANT SELECT, INSERT, UPDATE, DELETE ON "inbox_allowed_sender" TO authenticated;
          GRANT SELECT, INSERT, UPDATE, DELETE ON "outbox_item" TO authenticated;
          GRANT SELECT, INSERT, UPDATE, DELETE ON "asset" TO authenticated;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          GRANT SELECT, INSERT, UPDATE, DELETE ON "inbox" TO anon;
          GRANT SELECT, INSERT, UPDATE, DELETE ON "inbox_folder" TO anon;
          GRANT SELECT, INSERT, UPDATE, DELETE ON "inbox_credential" TO anon;
          GRANT SELECT, INSERT, UPDATE, DELETE ON "inbox_allowed_sender" TO anon;
          GRANT SELECT, INSERT, UPDATE, DELETE ON "outbox_item" TO anon;
          GRANT SELECT ON "asset" TO anon;
        END IF;
      END $$;
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop service metadata column
    const serviceTable = await queryRunner.getTable('service')
    if (serviceTable) {
      const hasMetadataColumn = serviceTable.columns.some((col) => col.name === 'metadata')
      if (hasMetadataColumn) {
        await queryRunner.query(`ALTER TABLE "service" DROP COLUMN IF EXISTS "metadata"`)
      }
    }

    // Drop outbox indexes and table
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_outbox_item_created_at"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_outbox_item_recipient_did"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_outbox_item_invoice_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_outbox_item_tenant_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_outbox_item_status"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "outbox_item"`)

    // Drop asset indexes and table
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_asset_type"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_asset_tenant_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_asset_credential_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_asset_public_availability"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_asset_digest_multibase"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "asset"`)

    // Drop inbox indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inbox_allowed_sender_inbox_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "inbox_allowed_sender_unique"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inbox_credential_evidence_fetched"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inbox_credential_correlation_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inbox_credential_folder_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inbox_credential_inbox_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inbox_folder_inbox_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "inbox_folder_name_unique"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "inbox_name_unique_tenant"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "inbox_name_unique_no_tenant"`)

    // Drop inbox tables in reverse order (respecting foreign keys)
    await queryRunner.query(`DROP TABLE IF EXISTS "inbox_allowed_sender"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "inbox_credential"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "inbox_folder"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "inbox"`)
  }
}
