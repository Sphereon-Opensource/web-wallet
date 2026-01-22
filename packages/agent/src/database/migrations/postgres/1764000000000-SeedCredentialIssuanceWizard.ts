import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Idempotent migration to seed the CredentialIssuanceWizard form definition.
 *
 * This ensures the basic credential issuance wizard form structure is always available
 * without requiring manual demo:init commands. Schema definitions for specific
 * credential types should be added separately via the Credential Design feature.
 */
export class SeedCredentialIssuanceWizard1764000000000 implements MigrationInterface {
  name = 'SeedCredentialIssuanceWizard1764000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if CredentialIssuanceWizard already exists
    const existingFormDef = await queryRunner.query(`
      SELECT id FROM form_definition WHERE name = 'CredentialIssuanceWizard'
    `)

    if (existingFormDef && existingFormDef.length > 0) {
      console.log('[Migration] CredentialIssuanceWizard form definition already exists, skipping seed')
      return
    }

    console.log('[Migration] Seeding CredentialIssuanceWizard form definition...')

    // Create form step
    // IMPORTANT: form_id must be 'credentialIssuanceWizard' to match what CredentialDesignPlugin uses
    const formStepResult = await queryRunner.query(`
      INSERT INTO form_step(tenant_id, form_id, step_nr, "order")
      VALUES (NULL, 'credentialIssuanceWizard', 1, 1)
      RETURNING id
    `)
    const formStepId = formStepResult[0].id

    // Create form definition
    const formDefResult = await queryRunner.query(`
      INSERT INTO form_definition(tenant_id, name, description, machine_id)
      VALUES (NULL, 'CredentialIssuanceWizard', 'Form for Credential Issuance Wizard', NULL)
      RETURNING id
    `)
    const formDefId = formDefResult[0].id

    // Link form definition to form step
    await queryRunner.query(`
      INSERT INTO form_def_to_form_step(form_definition_id, form_step_id)
      VALUES ($1, $2)
    `, [formDefId, formStepId])

    console.log('[Migration] CredentialIssuanceWizard form definition seeded successfully')
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Get form definition ID
    const formDefResult = await queryRunner.query(`
      SELECT id FROM form_definition WHERE name = 'CredentialIssuanceWizard'
    `)

    if (!formDefResult || formDefResult.length === 0) {
      console.log('[Migration] CredentialIssuanceWizard not found, nothing to revert')
      return
    }

    const formDefId = formDefResult[0].id

    // Get form step ID
    const formStepResult = await queryRunner.query(`
      SELECT form_step_id FROM form_def_to_form_step WHERE form_definition_id = $1
    `, [formDefId])

    if (formStepResult && formStepResult.length > 0) {
      const formStepId = formStepResult[0].form_step_id

      // Delete form definition link
      await queryRunner.query(`
        DELETE FROM form_def_to_form_step WHERE form_definition_id = $1
      `, [formDefId])

      // Delete form step
      await queryRunner.query(`
        DELETE FROM form_step WHERE id = $1
      `, [formStepId])
    }

    // Delete form definition
    await queryRunner.query(`
      DELETE FROM form_definition WHERE id = $1
    `, [formDefId])

    console.log('[Migration] CredentialIssuanceWizard form definition removed')
  }
}
