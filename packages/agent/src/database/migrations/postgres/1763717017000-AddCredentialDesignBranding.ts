import { MigrationInterface, QueryRunner } from 'typeorm'
import { enablePostgresUuidExtension } from '@sphereon/ssi-sdk.core'

export class AddCredentialDesignBranding1763717017000 implements MigrationInterface {
  name = 'AddCredentialDesignBranding1763717017000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await enablePostgresUuidExtension(queryRunner)

    await queryRunner.query(`
      CREATE TABLE "credential_design_branding"
      (
        "id"                uuid NOT NULL DEFAULT gen_random_uuid(),
        "logo_url"          uuid,
        "background_url"    uuid,
        "logo_color"        text,
        "background_color"  text,
        "meta_data_set_id"  uuid,
        CONSTRAINT "credentialdesignbranding_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "fk_credentialdesignbranding_metadata"
          FOREIGN KEY ("meta_data_set_id")
            REFERENCES "meta_data_set" ("id")
      )
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          DROP TABLE IF EXISTS "credential_design_branding"
      `)
  }
}
