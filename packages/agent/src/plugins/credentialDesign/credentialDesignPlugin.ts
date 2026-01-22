/**
 * Credential Design plugin implementation.
 *
 * Manages credential design configurations including schemas, branding, and metadata.
 * Leverages existing PL/pgSQL functions for complex create/update operations.
 */

import { DataSource } from 'typeorm'
import { IAgentPlugin } from '@veramo/core'

import type { ICredentialDesignPlugin } from './ICredentialDesignPlugin'
import type { CredentialDesign } from './types'
import type {
  CredentialDesignCreateArgs,
  CredentialDesignUpdateArgs,
  CredentialDesignGetByIdArgs,
  CredentialDesignListArgs,
  CredentialDesignDeleteArgs,
  FormStepGetOrCreateArgs,
} from './types'
import { credentialDesignPluginSchema } from './schema'
import { mapCredentialDesignRow, mapCredentialDesignFromRpc } from './utils/rowMappers'
import { NotFoundError } from '../shared/error'

/**
 * Plugin that manages credential design configurations.
 */
export class CredentialDesignPlugin implements IAgentPlugin {
  readonly methods: ICredentialDesignPlugin
  readonly schema = credentialDesignPluginSchema

  private dbConnection: Promise<DataSource>

  constructor(options: { dbConnection: Promise<DataSource> }) {
    this.dbConnection = options.dbConnection

    this.methods = {
      credentialDesignCreate: this.credentialDesignCreate.bind(this),
      credentialDesignUpdate: this.credentialDesignUpdate.bind(this),
      credentialDesignGetById: this.credentialDesignGetById.bind(this),
      credentialDesignList: this.credentialDesignList.bind(this),
      credentialDesignCount: this.credentialDesignCount.bind(this),
      credentialDesignDelete: this.credentialDesignDelete.bind(this),
      formStepGetOrCreate: this.formStepGetOrCreate.bind(this),
    }
  }

  // ===== Create =====

  /**
   * Create a new credential design using the insert_credential_design() function.
   */
  private async credentialDesignCreate(args: CredentialDesignCreateArgs): Promise<CredentialDesign> {
    const db = await this.dbConnection

    // Get or create form step
    const formStepId = args.formStepId || await this.formStepGetOrCreate({ formId: 'credentialIssuanceWizard' })

    // Prepare branding JSON
    const brandingJson = args.branding ? JSON.stringify({
      logo: args.branding.logo,
      background_image: args.branding.background_image,
      text_color: args.branding.text_color,
      background_color: args.branding.background_color,
    }) : null

    // Call the PL/pgSQL function
    const result = await db.query(
      `SELECT insert_credential_design(
        $1::text,
        $2::text,
        $3::jsonb,
        $4::jsonb,
        $5::uuid,
        $6::jsonb,
        $7::text,
        $8::text,
        $9::text[],
        $10::text[],
        $11::jsonb,
        $12::boolean
      ) as result`,
      [
        args.name,
        args.options.format,
        JSON.stringify(args.schema),
        JSON.stringify(args.uiSchema),
        formStepId,
        brandingJson,
        args.options.vct || null,
        args.options.scope || null,
        args.options.cryptographicBindingMethodsSupported || [],
        args.options.credentialSigningAlgValuesSupported || [],
        JSON.stringify(args.options.proofTypesSupported || {}),
        args.isAdvancedSchema || false,
      ]
    )

    if (!result || result.length === 0 || !result[0].result) {
      throw new Error('Failed to create credential design')
    }

    console.log(`[CredentialDesign] Created: ${args.name}`)
    return mapCredentialDesignFromRpc(result[0].result)
  }

  // ===== Update =====

  /**
   * Update an existing credential design using the update_credential_design() function.
   */
  private async credentialDesignUpdate(args: CredentialDesignUpdateArgs): Promise<CredentialDesign> {
    const db = await this.dbConnection

    // Prepare branding JSON
    const brandingJson = args.branding ? JSON.stringify({
      logo: args.branding.logo,
      background_image: args.branding.background_image,
      text_color: args.branding.text_color,
      background_color: args.branding.background_color,
    }) : null

    // Call the PL/pgSQL function
    const result = await db.query(
      `SELECT update_credential_design(
        $1::uuid,
        $2::text,
        $3::text,
        $4::jsonb,
        $5::jsonb,
        $6::jsonb,
        $7::text,
        $8::text,
        $9::text[],
        $10::text[],
        $11::jsonb,
        $12::boolean
      ) as result`,
      [
        args.id,
        args.name,
        args.options.format,
        JSON.stringify(args.schema),
        JSON.stringify(args.uiSchema),
        brandingJson,
        args.options.vct || null,
        args.options.scope || null,
        args.options.cryptographicBindingMethodsSupported || [],
        args.options.credentialSigningAlgValuesSupported || [],
        JSON.stringify(args.options.proofTypesSupported || {}),
        args.isAdvancedSchema || false,
      ]
    )

    if (!result || result.length === 0 || !result[0].result) {
      throw new NotFoundError('CredentialDesign', args.id)
    }

    console.log(`[CredentialDesign] Updated: ${args.id}`)
    return mapCredentialDesignFromRpc(result[0].result)
  }

  // ===== Get =====

  /**
   * Get a credential design by ID with all related data.
   */
  private async credentialDesignGetById(args: CredentialDesignGetByIdArgs): Promise<CredentialDesign | null> {
    const db = await this.dbConnection

    // Use the same complex query structure as the frontend to get all related data
    const result = await db.query(`
      SELECT
        mds.id,
        mds.name,
        mds.tenant_id,
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', mk.id,
              'key', mk.key,
              'set_id', mk.set_id,
              'value_type', mk.value_type,
              'meta_data_values', (
                SELECT COALESCE(jsonb_agg(
                  jsonb_build_object(
                    'id', mv.id,
                    'index', mv.index,
                    'key_id', mv.key_id,
                    'text_value', mv.text_value,
                    'boolean_value', mv.boolean_value
                  ) ORDER BY mv.index
                ), '[]'::jsonb)
                FROM meta_data_values mv
                WHERE mv.key_id = mk.id
              )
            )
          )
          FROM meta_data_keys mk
          WHERE mk.set_id = mds.id
        ) as meta_data_keys,
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', sd.id,
              'schema', sd.schema,
              'tenant_id', sd.tenant_id,
              'extends_id', sd.extends_id,
              'entity_type', sd.entity_type,
              'schema_type', sd.schema_type,
              'correlation_id', sd.correlation_id,
              'meta_data_set_id', sd.meta_data_set_id,
              'form_step_to_schema_definition', (
                SELECT COALESCE(jsonb_agg(
                  jsonb_build_object(
                    'form_step_id', fsts.form_step_id,
                    'schema_definition_id', fsts.schema_definition_id
                  )
                ), '[]'::jsonb)
                FROM form_step_to_schema_definition fsts
                WHERE fsts.schema_definition_id = sd.id
              )
            )
          )
          FROM schema_definition sd
          WHERE sd.meta_data_set_id = mds.id
        ) as schema_definition,
        (
          SELECT jsonb_build_object(
            'id', cdb.id,
            'text_color', cdb.text_color,
            'background_color', cdb.background_color,
            'meta_data_set_id', cdb.meta_data_set_id,
            'logo', CASE
              WHEN cdb.logo IS NOT NULL THEN (
                SELECT jsonb_build_object(
                  'id', ia.id,
                  'uri', ia.uri,
                  'dimensions', CASE
                    WHEN ia."dimensionsId" IS NOT NULL THEN (
                      SELECT jsonb_build_object('id', id2.id, 'width', id2.width, 'height', id2.height)
                      FROM "ImageDimensions" id2
                      WHERE id2.id = ia."dimensionsId"
                    )
                    ELSE NULL
                  END
                )
                FROM "ImageAttributes" ia
                WHERE ia.id = cdb.logo
              )
              ELSE NULL
            END,
            'background_image', CASE
              WHEN cdb.background_image IS NOT NULL THEN (
                SELECT jsonb_build_object(
                  'id', ia.id,
                  'uri', ia.uri,
                  'dimensions', CASE
                    WHEN ia."dimensionsId" IS NOT NULL THEN (
                      SELECT jsonb_build_object('id', id2.id, 'width', id2.width, 'height', id2.height)
                      FROM "ImageDimensions" id2
                      WHERE id2.id = ia."dimensionsId"
                    )
                    ELSE NULL
                  END
                )
                FROM "ImageAttributes" ia
                WHERE ia.id = cdb.background_image
              )
              ELSE NULL
            END
          )
          FROM credential_design_branding cdb
          WHERE cdb.meta_data_set_id = mds.id
        ) as credential_design_branding
      FROM meta_data_set mds
      WHERE mds.id = $1
    `, [args.id])

    if (!result || result.length === 0) {
      return null
    }

    return mapCredentialDesignRow(result[0])
  }

  // ===== List =====

  /**
   * List credential designs with pagination.
   */
  private async credentialDesignList(args: CredentialDesignListArgs): Promise<CredentialDesign[]> {
    const db = await this.dbConnection

    let query = `
      SELECT
        mds.id,
        mds.name,
        mds.tenant_id,
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', mk.id,
              'key', mk.key,
              'set_id', mk.set_id,
              'value_type', mk.value_type,
              'meta_data_values', (
                SELECT COALESCE(jsonb_agg(
                  jsonb_build_object(
                    'id', mv.id,
                    'index', mv.index,
                    'key_id', mv.key_id,
                    'text_value', mv.text_value,
                    'boolean_value', mv.boolean_value
                  ) ORDER BY mv.index
                ), '[]'::jsonb)
                FROM meta_data_values mv
                WHERE mv.key_id = mk.id
              )
            )
          )
          FROM meta_data_keys mk
          WHERE mk.set_id = mds.id
        ) as meta_data_keys,
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', sd.id,
              'schema', sd.schema,
              'tenant_id', sd.tenant_id,
              'extends_id', sd.extends_id,
              'entity_type', sd.entity_type,
              'schema_type', sd.schema_type,
              'correlation_id', sd.correlation_id,
              'meta_data_set_id', sd.meta_data_set_id,
              'form_step_to_schema_definition', (
                SELECT COALESCE(jsonb_agg(
                  jsonb_build_object(
                    'form_step_id', fsts.form_step_id,
                    'schema_definition_id', fsts.schema_definition_id
                  )
                ), '[]'::jsonb)
                FROM form_step_to_schema_definition fsts
                WHERE fsts.schema_definition_id = sd.id
              )
            )
          )
          FROM schema_definition sd
          WHERE sd.meta_data_set_id = mds.id
        ) as schema_definition,
        (
          SELECT jsonb_build_object(
            'id', cdb.id,
            'text_color', cdb.text_color,
            'background_color', cdb.background_color,
            'meta_data_set_id', cdb.meta_data_set_id,
            'logo', CASE
              WHEN cdb.logo IS NOT NULL THEN (
                SELECT jsonb_build_object(
                  'id', ia.id,
                  'uri', ia.uri,
                  'dimensions', CASE
                    WHEN ia."dimensionsId" IS NOT NULL THEN (
                      SELECT jsonb_build_object('id', id2.id, 'width', id2.width, 'height', id2.height)
                      FROM "ImageDimensions" id2
                      WHERE id2.id = ia."dimensionsId"
                    )
                    ELSE NULL
                  END
                )
                FROM "ImageAttributes" ia
                WHERE ia.id = cdb.logo
              )
              ELSE NULL
            END,
            'background_image', CASE
              WHEN cdb.background_image IS NOT NULL THEN (
                SELECT jsonb_build_object(
                  'id', ia.id,
                  'uri', ia.uri,
                  'dimensions', CASE
                    WHEN ia."dimensionsId" IS NOT NULL THEN (
                      SELECT jsonb_build_object('id', id2.id, 'width', id2.width, 'height', id2.height)
                      FROM "ImageDimensions" id2
                      WHERE id2.id = ia."dimensionsId"
                    )
                    ELSE NULL
                  END
                )
                FROM "ImageAttributes" ia
                WHERE ia.id = cdb.background_image
              )
              ELSE NULL
            END
          )
          FROM credential_design_branding cdb
          WHERE cdb.meta_data_set_id = mds.id
        ) as credential_design_branding
      FROM meta_data_set mds
      WHERE 1=1
    `

    const params: unknown[] = []
    let paramIndex = 1

    if (args.tenantId !== undefined) {
      query += ` AND mds.tenant_id = $${paramIndex++}`
      params.push(args.tenantId)
    }

    query += ` ORDER BY mds.name ASC`

    if (args.limit !== undefined) {
      query += ` LIMIT $${paramIndex++}`
      params.push(args.limit)
    }

    if (args.offset !== undefined) {
      query += ` OFFSET $${paramIndex++}`
      params.push(args.offset)
    }

    const result = await db.query(query, params)
    return result.map((row: Record<string, unknown>) => mapCredentialDesignRow(row))
  }

  // ===== Count =====

  /**
   * Get total count of credential designs.
   */
  private async credentialDesignCount(args: CredentialDesignListArgs): Promise<number> {
    const db = await this.dbConnection

    let query = `SELECT COUNT(*) as count FROM meta_data_set mds WHERE 1=1`
    const params: unknown[] = []
    let paramIndex = 1

    if (args.tenantId !== undefined) {
      query += ` AND mds.tenant_id = $${paramIndex++}`
      params.push(args.tenantId)
    }

    const result = await db.query(query, params)
    return parseInt(result[0].count, 10)
  }

  // ===== Delete =====

  /**
   * Delete a credential design by ID.
   * Cascade delete handles related metadata, schema definitions, and branding.
   */
  private async credentialDesignDelete(args: CredentialDesignDeleteArgs): Promise<boolean> {
    const db = await this.dbConnection

    // First check if the design exists
    const existing = await db.query(
      `SELECT id FROM meta_data_set WHERE id = $1`,
      [args.id]
    )

    if (!existing || existing.length === 0) {
      return false
    }

    // The foreign key cascades will delete related data
    await db.query(
      `DELETE FROM meta_data_set WHERE id = $1`,
      [args.id]
    )

    console.log(`[CredentialDesign] Deleted: ${args.id}`)
    return true
  }

  // ===== Form Step =====

  /**
   * Get or create a form step for the specified form ID.
   */
  private async formStepGetOrCreate(args: FormStepGetOrCreateArgs): Promise<string> {
    const db = await this.dbConnection

    // Try to get existing form step
    const existing = await db.query(
      `SELECT id FROM form_step WHERE form_id = $1 LIMIT 1`,
      [args.formId]
    )

    if (existing && existing.length > 0) {
      return existing[0].id
    }

    // Create new form step
    const result = await db.query(
      `INSERT INTO form_step (form_id, step_nr, "order") VALUES ($1, 1, 1) RETURNING id`,
      [args.formId]
    )

    console.log(`[CredentialDesign] Created form step for: ${args.formId}`)
    return result[0].id
  }
}
