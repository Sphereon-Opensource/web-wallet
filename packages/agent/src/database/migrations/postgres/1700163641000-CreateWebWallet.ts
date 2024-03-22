import { MigrationInterface, QueryRunner } from 'typeorm'
import { enablePostgresUuidExtension } from '@sphereon/ssi-sdk.core'

export class CreateWebWallet1700163641000 implements MigrationInterface {
  name = 'CreateWebWallet1700163641000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await enablePostgresUuidExtension(queryRunner)

    await queryRunner.query(`
         CREATE TYPE "workflow_status" AS ENUM ('New', 'Approved', 'Pending', 'Declined', 'Done', 'Archived')
    `);

    await queryRunner.query(`
        CREATE TABLE "asset"
        (
            "id"          uuid                   NOT NULL DEFAULT uuid_generate_v4(),
            "name"        text                   NOT NULL,
            "did"         text                   NOT NULL UNIQUE,
            "description" text,
            "contact_id"  text,
            "owner_id"    text,
            "owner_alias" text,
            CONSTRAINT "asset_pkey" PRIMARY KEY ("id")
        )
    `);

    await queryRunner.query(`
        CREATE TABLE "credential_reference"
        (
            "id"                uuid NOT NULL DEFAULT uuid_generate_v4(),
            "credential_string" text NOT NULL,
            "asset_id"          uuid,
            "credential_id"     text,
            CONSTRAINT "credential_pkey" PRIMARY KEY ("id")
        )
    `);

    await queryRunner.query(`
        CREATE TABLE "workflow"
        (
            "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
            "created_at" timestamp with time zone NOT NULL DEFAULT now(),
            "owner_id"   text,
            "asset_id"   uuid,
            CONSTRAINT "workflow_pkey" PRIMARY KEY ("id")
        )
    `);

    await queryRunner.query(`
        CREATE TABLE "workflow_document"
        (
            "created_at"          timestamp with time zone DEFAULT now(),
            "workflow_id"         uuid NOT NULL,
            "uploaded_by_did"     text NOT NULL,
            "storage_object_id"   uuid,
            "category"            text,
            "type"                text,
            "correlation_id"      text,
            "asset_id"            text,
            "id"                  uuid NOT NULL            DEFAULT gen_random_uuid(),
            "storage_object_path" text NOT NULL,
            CONSTRAINT "workflow_document_pkey" PRIMARY KEY ("id")
        )
    `);

    await queryRunner.query(`
        CREATE TABLE "workflow_step"
        (
            "id"                      uuid                     NOT NULL DEFAULT gen_random_uuid(),
            "created_at"              timestamp with time zone NOT NULL DEFAULT now(),
            "message"                 text,
            "status"                  public.workflow_status,
            "workflow_id"             uuid,
            "sender_id"               text,
            "action"                  text,
            "code"                    integer,
            "recipient_id"            text,
            "document_correlation_id" text,
            CONSTRAINT "step_pkey" PRIMARY KEY ("id")
        )
    `);

      await queryRunner.query(`
          CREATE TABLE "machine"
          (
              "id"          uuid NOT NULL DEFAULT gen_random_uuid(),
              "name"        text NOT NULL,
              "tenant_id"   uuid,
              "persistence" boolean,
              CONSTRAINT "machine_pkey" PRIMARY KEY ("id")
          )
      `);
      await queryRunner.query(`
          CREATE UNIQUE INDEX "machine_unique_no_tenant" ON "machine" ("name")
              WHERE "tenant_id" IS NULL
      `);

      await queryRunner.query(`
          CREATE UNIQUE INDEX "machine_unique_tenant" ON "machine" ("name", "tenant_id")
              WHERE "tenant_id" IS NOT NULL
      `);


      await queryRunner.query(`
          CREATE TABLE "form_definition"
          (
              "id"          uuid NOT NULL DEFAULT gen_random_uuid(),
              "tenant_id"   uuid,
              "name"        text,
              "description" text,
              "machine_id" uuid,
              CONSTRAINT "formdef_pkey" PRIMARY KEY ("id"),
              CONSTRAINT "fk_machine_name"
                  FOREIGN KEY ("machine_id")
                      REFERENCES "machine"("id")
          )
      `);
      await queryRunner.query(`
          CREATE UNIQUE INDEX "formdef_unique_no_tenant" ON "form_definition" ("name")
              WHERE "tenant_id" IS NULL
      `);

      await queryRunner.query(`
          CREATE UNIQUE INDEX "formdef_unique_tenant" ON "form_definition" ("name", "tenant_id")
              WHERE "tenant_id" IS NOT NULL
      `);


      await queryRunner.query(`
          CREATE TABLE "form_step"
          (
              "id"            uuid NOT NULL DEFAULT gen_random_uuid(),
              "tenant_id"     uuid,
              "definition_id" uuid,
              "form_id"       text,
              "step_nr"       numeric,
              "order"         numeric,
              CONSTRAINT "formstep_pkey" PRIMARY KEY ("id")
          )
      `);
      await queryRunner.query(`
          CREATE UNIQUE INDEX "formstep_unique_step" ON "form_step" ("definition_id", "step_nr", "form_id", "order") 
      `); // (tenant_id is of no concern because definitionId is unique)


      await queryRunner.query(`
          CREATE TABLE "schema_definition"
          (
              "id"         uuid NOT NULL DEFAULT gen_random_uuid(),
              "tenant_id"  uuid,
              "schema_type" int,
              "entity_type" text,
              "schema"     text,
              CONSTRAINT "schemadef_pkey" PRIMARY KEY ("id")
          )
      `);

      // Junction tables for many-to-many relations
      await queryRunner.query(`
          CREATE TABLE "form_def_to_form_step"
          (
              "form_definition_id" uuid NOT NULL,
              "form_step_id"       uuid NOT NULL,
              CONSTRAINT "pk_form_definition_step" PRIMARY KEY ("form_definition_id", "form_step_id"),
              CONSTRAINT "fk_form_definition"
                  FOREIGN KEY ("form_definition_id")
                      REFERENCES "form_definition" ("id"),
              CONSTRAINT "fk_form_step"
                  FOREIGN KEY ("form_step_id")
                      REFERENCES "form_step" ("id")
          )
      `);

      await queryRunner.query(`
          CREATE TABLE "form_step_to_schema_definition"
          (
              "form_step_id"         uuid NOT NULL,
              "schema_definition_id" uuid NOT NULL,
              CONSTRAINT "pk_form_step_to_schema_definition" PRIMARY KEY ("form_step_id", "schema_definition_id"),
              CONSTRAINT "fk_form_step"
                  FOREIGN KEY ("form_step_id")
                      REFERENCES "form_step" ("id"),
              CONSTRAINT "fk_schema_definition"
                  FOREIGN KEY ("schema_definition_id")
                      REFERENCES "schema_definition" ("id")
          )
      `);

    // Views
    await queryRunner.query(`
        CREATE VIEW "view_all_workflow_step" AS
        SELECT
          ws.id,
          ws.created_at,
          ws.message,
          ws.status,
          ws.workflow_id,
          ws.sender_id,
          ws.recipient_id,
          ws.document_correlation_id,
          ws.action,
          ws.code,
          w.owner_id AS owner,
          a.name AS asset_name,
          a.id AS asset_id
        FROM
          workflow_step ws
          JOIN workflow w ON ws.workflow_id = w.id
          JOIN asset a ON w.asset_id = a.id
        ORDER BY
          ws.created_at DESC
    `);

    await queryRunner.query(`
        CREATE VIEW "view_latest_workflow_step" AS
        SELECT
          ws.id,
          ws.created_at,
          ws.message,
          ws.status,
          ws.workflow_id,
          ws.sender_id,
          ws.recipient_id,
          ws.document_correlation_id,
          ws.action,
          ws.code,
          w.owner_id AS owner,
          a.name AS asset_name,
          a.id AS asset_id
        FROM
          workflow_step ws
          JOIN workflow w ON ws.workflow_id = w.id
          JOIN asset a ON w.asset_id = a.id
        WHERE
          ws.status <> 'Approved'::workflow_status
    `);

    await queryRunner.query(`
        ALTER TABLE "credential_reference"
            ADD CONSTRAINT "FK_credential_reference_asset_id"
                FOREIGN KEY ("asset_id") REFERENCES "asset" ("id")
    `);

    await queryRunner.query(`
        ALTER TABLE "workflow"
            ADD CONSTRAINT "FK_workflow_asset_id"
                FOREIGN KEY ("asset_id") REFERENCES "asset" ("id") ON DELETE SET NULL
    `);

/*
    await queryRunner.query(`
        ALTER TABLE "workflow_document"
            ADD CONSTRAINT "FK_workflow_document_storage_object_id"
                FOREIGN KEY ("storage_object_id") REFERENCES "storage"."objects" ("id")
    `);
*/

    await queryRunner.query(`
        ALTER TABLE "workflow_document"
            ADD CONSTRAINT "FK_workflow_document_workflow_id"
                FOREIGN KEY ("workflow_id") REFERENCES "workflow" ("id")
    `);

    await queryRunner.query(`
        ALTER TABLE "workflow_step"
            ADD CONSTRAINT "FK_workflow_step_workflow_id"
                FOREIGN KEY ("workflow_id") REFERENCES "workflow" ("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
        ALTER TABLE "workflow_step"
            ADD CONSTRAINT "FK_workflow_step_sender_id"
                FOREIGN KEY ("sender_id") REFERENCES "CorrelationIdentifier" ("correlation_id")
    `);

    await queryRunner.query(`
        ALTER TABLE "workflow_step"
            ADD CONSTRAINT "FK_workflow_step_recipient_id"
                FOREIGN KEY ("recipient_id") REFERENCES "CorrelationIdentifier" ("correlation_id")
    `);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`
          DROP TABLE IF EXISTS "form_step_to_schema_definition"
      `);

      await queryRunner.query(`
          DROP TABLE IF EXISTS "form_def_to_form_step"
      `);

      await queryRunner.query(`
          DROP INDEX IF EXISTS "machine_unique_tenant"
      `);
      await queryRunner.query(`
          DROP INDEX IF EXISTS "machine_unique_no_tenant"
      `);
      await queryRunner.query(`
          DROP TABLE IF EXISTS "machine"
      `);

      await queryRunner.query(`
          DROP TABLE IF EXISTS "schema_definition"
      `);

      await queryRunner.query(`
          DROP INDEX IF EXISTS "formstep_unique_step"
      `);
      await queryRunner.query(`
          DROP TABLE IF EXISTS "form_step"
      `);

      await queryRunner.query(`
          DROP INDEX IF EXISTS "formdef_unique_tenant"
      `);
      await queryRunner.query(`
          DROP INDEX IF EXISTS "formdef_unique_no_tenant"
      `);
      await queryRunner.query(`
          DROP TABLE IF EXISTS "form_definition"
      `);

    await queryRunner.query(`
        ALTER TABLE "credential_reference" DROP CONSTRAINT "FK_credential_reference_asset_id"
    `);

    await queryRunner.query(`
        ALTER TABLE "workflow" DROP CONSTRAINT "FK_workflow_asset_id"
    `);

    await queryRunner.query(`
        ALTER TABLE "workflow_document" DROP CONSTRAINT "FK_workflow_document_storage_object_id"
    `);

    await queryRunner.query(`
        ALTER TABLE "workflow_document" DROP CONSTRAINT "FK_workflow_document_workflow_id"
    `);

    await queryRunner.query(`
        ALTER TABLE "workflow_step" DROP CONSTRAINT "FK_workflow_step_workflow_id"
    `);

    await queryRunner.query(`
        DROP TABLE IF EXISTS "workflow_step"
    `);

    await queryRunner.query(`
        DROP TABLE IF EXISTS "workflow_document"
    `);

    await queryRunner.query(`
        DROP TABLE IF EXISTS "workflow"
    `);

    await queryRunner.query(`
        DROP TABLE IF EXISTS "credential_reference"
    `);

    await queryRunner.query(`
        DROP TABLE IF EXISTS "asset"
    `);

    await queryRunner.query(`
        DROP VIEW IF EXISTS "view_all_workflow_step"
    `);

    await queryRunner.query(`
        DROP VIEW IF EXISTS "view_latest_workflow_step"
    `);

    await queryRunner.query(`
        DROP TYPE IF EXISTS "workflow_status"
    `);
  }
}
