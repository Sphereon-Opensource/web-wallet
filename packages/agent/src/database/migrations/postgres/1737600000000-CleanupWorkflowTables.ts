import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Cleanup migration for unused workflow tables.
 *
 * The original CreateWebWallet migration created workflow-related tables (asset, workflow,
 * workflow_step, workflow_document, views) that are no longer used. The CreateInboxAndEInvoice
 * migration also creates an "asset" table but with a different schema for content-addressable storage.
 *
 * This migration:
 * 1. Drops the unused workflow views
 * 2. Drops the unused workflow tables
 * 3. Drops the old "asset" table (workflow-related) so the inbox "asset" table can be created
 *
 * All operations are idempotent (IF EXISTS).
 */
export class CleanupWorkflowTables1737600000000 implements MigrationInterface {
  name = 'CleanupWorkflowTables1737600000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop workflow views first
    await queryRunner.query(`DROP VIEW IF EXISTS "view_latest_workflow_step"`)
    await queryRunner.query(`DROP VIEW IF EXISTS "view_all_workflow_step"`)

    // Drop workflow-related constraints
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "workflow_step" DROP CONSTRAINT IF EXISTS "FK_workflow_step_recipient_id";
      EXCEPTION WHEN undefined_table THEN null;
      END $$;
    `)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "workflow_step" DROP CONSTRAINT IF EXISTS "FK_workflow_step_sender_id";
      EXCEPTION WHEN undefined_table THEN null;
      END $$;
    `)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "workflow_step" DROP CONSTRAINT IF EXISTS "FK_workflow_step_workflow_id";
      EXCEPTION WHEN undefined_table THEN null;
      END $$;
    `)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "workflow_document" DROP CONSTRAINT IF EXISTS "FK_workflow_document_workflow_id";
      EXCEPTION WHEN undefined_table THEN null;
      END $$;
    `)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "workflow_document" DROP CONSTRAINT IF EXISTS "FK_workflow_document_storage_object_id";
      EXCEPTION WHEN undefined_table THEN null;
      END $$;
    `)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "workflow" DROP CONSTRAINT IF EXISTS "FK_workflow_asset_id";
      EXCEPTION WHEN undefined_table THEN null;
      END $$;
    `)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "credential_reference" DROP CONSTRAINT IF EXISTS "FK_credential_reference_asset_id";
      EXCEPTION WHEN undefined_table THEN null;
      END $$;
    `)

    // Drop workflow tables
    await queryRunner.query(`DROP TABLE IF EXISTS "workflow_step"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "workflow_document"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "workflow"`)

    // Check if the old workflow-style asset table exists (has 'name' and 'did' columns)
    // vs the inbox-style asset table (has 'digest_multibase' column)
    const assetColumns = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'asset' AND table_schema = 'public'
    `)

    const columnNames = assetColumns.map((c: { column_name: string }) => c.column_name)
    const isWorkflowAsset = columnNames.includes('did') && !columnNames.includes('digest_multibase')

    if (isWorkflowAsset) {
      // This is the old workflow-style asset table, drop it
      await queryRunner.query(`DROP TABLE IF EXISTS "asset"`)
    }

    // Drop workflow_status type if no longer used
    await queryRunner.query(`DROP TYPE IF EXISTS "workflow_status"`)

    console.log('[CleanupWorkflowTables] Cleaned up unused workflow tables')
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // This migration removes unused POC code, no need to restore
    console.log('[CleanupWorkflowTables] Down migration is a no-op - workflow tables were unused POC code')
  }
}
