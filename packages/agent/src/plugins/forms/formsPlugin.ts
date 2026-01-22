/**
 * Forms plugin implementation.
 *
 * Provides read-only access to form definitions, form steps, and schema definitions.
 * This is primarily used for the credential issuance wizard forms.
 */

import { DataSource } from 'typeorm'
import { IAgentPlugin } from '@veramo/core'

import type { IFormsPlugin } from './IFormsPlugin'
import type { FormDefinition, FormSchemaDefinition, FormStep } from './types'
import type {
  FormDefinitionGetByIdArgs,
  FormDefinitionGetByNameArgs,
  FormDefinitionListArgs,
  SchemaDefinitionGetByFormStepArgs,
  FormStepGetByIdArgs,
} from './types'
import { formsPluginSchema } from './schema'
import {
  mapFormDefinitionRow,
  mapFormStepRow,
  mapSchemaDefinitionRow,
} from './utils/rowMappers'

/**
 * Plugin that provides access to form definitions and schemas.
 */
export class FormsPlugin implements IAgentPlugin {
  readonly methods: IFormsPlugin
  readonly schema = formsPluginSchema

  private dbConnection: Promise<DataSource>

  constructor(options: { dbConnection: Promise<DataSource> }) {
    this.dbConnection = options.dbConnection

    this.methods = {
      formDefinitionGetById: this.formDefinitionGetById.bind(this),
      formDefinitionGetByName: this.formDefinitionGetByName.bind(this),
      formDefinitionList: this.formDefinitionList.bind(this),
      schemaDefinitionGetByFormStep: this.schemaDefinitionGetByFormStep.bind(this),
      formStepGetById: this.formStepGetById.bind(this),
    }
  }

  // ===== Form Definition =====

  /**
   * Get a form definition by ID with all related data.
   */
  private async formDefinitionGetById(args: FormDefinitionGetByIdArgs): Promise<FormDefinition | null> {
    const db = await this.dbConnection

    const result = await db.query(`
      SELECT
        fd.id,
        fd.name,
        fd.description,
        fd.tenant_id,
        fd.machine_id,
        (
          SELECT jsonb_build_object(
            'id', m.id,
            'name', m.name,
            'tenant_id', m.tenant_id,
            'persistence', m.persistence
          )
          FROM machine m
          WHERE m.id = fd.machine_id
        ) as machine
      FROM form_definition fd
      WHERE fd.id = $1
    `, [args.id])

    if (!result || result.length === 0) {
      return null
    }

    const formDef = mapFormDefinitionRow(result[0])
    formDef.form_steps = await this.getFormStepsForDefinition(formDef.id)

    return formDef
  }

  /**
   * Get a form definition by name.
   */
  private async formDefinitionGetByName(args: FormDefinitionGetByNameArgs): Promise<FormDefinition | null> {
    const db = await this.dbConnection

    let query = `
      SELECT
        fd.id,
        fd.name,
        fd.description,
        fd.tenant_id,
        fd.machine_id,
        (
          SELECT jsonb_build_object(
            'id', m.id,
            'name', m.name,
            'tenant_id', m.tenant_id,
            'persistence', m.persistence
          )
          FROM machine m
          WHERE m.id = fd.machine_id
        ) as machine
      FROM form_definition fd
      WHERE fd.name = $1
    `

    const params: unknown[] = [args.name]

    if (args.tenantId) {
      query += ` AND fd.tenant_id = $2`
      params.push(args.tenantId)
    }

    const result = await db.query(query, params)

    if (!result || result.length === 0) {
      return null
    }

    const formDef = mapFormDefinitionRow(result[0])
    formDef.form_steps = await this.getFormStepsForDefinition(formDef.id)

    return formDef
  }

  /**
   * List form definitions with pagination.
   */
  private async formDefinitionList(args: FormDefinitionListArgs): Promise<FormDefinition[]> {
    const db = await this.dbConnection

    let query = `
      SELECT
        fd.id,
        fd.name,
        fd.description,
        fd.tenant_id,
        fd.machine_id,
        (
          SELECT jsonb_build_object(
            'id', m.id,
            'name', m.name,
            'tenant_id', m.tenant_id,
            'persistence', m.persistence
          )
          FROM machine m
          WHERE m.id = fd.machine_id
        ) as machine
      FROM form_definition fd
      WHERE 1=1
    `

    const params: unknown[] = []
    let paramIndex = 1

    if (args.tenantId !== undefined) {
      query += ` AND fd.tenant_id = $${paramIndex++}`
      params.push(args.tenantId)
    }

    query += ` ORDER BY fd.name ASC`

    if (args.limit !== undefined) {
      query += ` LIMIT $${paramIndex++}`
      params.push(args.limit)
    }

    if (args.offset !== undefined) {
      query += ` OFFSET $${paramIndex++}`
      params.push(args.offset)
    }

    const result = await db.query(query, params)

    const formDefs: FormDefinition[] = []
    for (const row of result) {
      const formDef = mapFormDefinitionRow(row)
      formDef.form_steps = await this.getFormStepsForDefinition(formDef.id)
      formDefs.push(formDef)
    }

    return formDefs
  }

  // ===== Form Steps =====

  /**
   * Get form steps for a form definition.
   */
  private async getFormStepsForDefinition(formDefinitionId: string): Promise<FormStep[]> {
    const db = await this.dbConnection

    const result = await db.query(`
      SELECT
        fs.id,
        fs.form_id,
        fs.step_nr,
        fs."order"
      FROM form_step fs
      INNER JOIN form_def_to_form_step fdfs ON fdfs.form_step_id = fs.id
      WHERE fdfs.form_definition_id = $1
      ORDER BY fs."order" ASC
    `, [formDefinitionId])

    const formSteps: FormStep[] = []
    for (const row of result) {
      const formStep = mapFormStepRow(row)
      formStep.schema_definitions = await this.schemaDefinitionGetByFormStep({ formStepId: formStep.id })
      formSteps.push(formStep)
    }

    return formSteps
  }

  /**
   * Get a form step by ID.
   */
  private async formStepGetById(args: FormStepGetByIdArgs): Promise<FormStep | null> {
    const db = await this.dbConnection

    const result = await db.query(`
      SELECT
        fs.id,
        fs.form_id,
        fs.step_nr,
        fs."order"
      FROM form_step fs
      WHERE fs.id = $1
    `, [args.id])

    if (!result || result.length === 0) {
      return null
    }

    const formStep = mapFormStepRow(result[0])
    formStep.schema_definitions = await this.schemaDefinitionGetByFormStep({ formStepId: formStep.id })

    return formStep
  }

  // ===== Schema Definitions =====

  /**
   * Get schema definitions for a form step with all related metadata.
   */
  private async schemaDefinitionGetByFormStep(args: SchemaDefinitionGetByFormStepArgs): Promise<FormSchemaDefinition[]> {
    const db = await this.dbConnection

    const result = await db.query(`
      SELECT
        sd.id,
        sd.correlation_id,
        sd.schema_type,
        sd.entity_type,
        sd.schema,
        sd.tenant_id,
        sd.extends_id,
        sd.meta_data_set_id,
        (
          SELECT jsonb_build_object(
            'id', mds.id,
            'name', mds.name,
            'tenant_id', mds.tenant_id,
            'meta_data_keys', (
              SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                  'id', mk.id,
                  'set_id', mk.set_id,
                  'key', mk.key,
                  'value_type', mk.value_type,
                  'meta_data_values', (
                    SELECT COALESCE(jsonb_agg(
                      jsonb_build_object(
                        'id', mv.id,
                        'key_id', mv.key_id,
                        'index', mv.index,
                        'text_value', mv.text_value,
                        'number_value', mv.number_value,
                        'boolean_value', mv.boolean_value,
                        'date_value', mv.timestamp_value
                      ) ORDER BY mv.index
                    ), '[]'::jsonb)
                    FROM meta_data_values mv
                    WHERE mv.key_id = mk.id
                  )
                )
              ), '[]'::jsonb)
              FROM meta_data_keys mk
              WHERE mk.set_id = mds.id
            )
          )
          FROM meta_data_set mds
          WHERE mds.id = sd.meta_data_set_id
        ) as meta_data_set
      FROM schema_definition sd
      INNER JOIN form_step_to_schema_definition fsts ON fsts.schema_definition_id = sd.id
      WHERE fsts.form_step_id = $1
    `, [args.formStepId])

    return result.map((row: Record<string, unknown>) => mapSchemaDefinitionRow(row))
  }
}
