// FIXME this is a quick & dirty, create a proper typeorm based implementation

import {promises as fs} from 'fs'
import path from 'path'
import {getDbConnection} from './databaseService'
import {DB_CONNECTION_NAME} from '../environment-vars'

type Schema = {schemaType: string; schemaFile: string}
type Key = {key: string; valueType: string; values: any[]}
type MetadataSet = {name: string; keys: Key[]; schemas?: Schema[]}

type Fixtures = {
  entityType: string
  formName: string
  formDescription?: string
  formId: string
  machineId?: string
  metadataSets: MetadataSet[]
}

async function getOrCreateFormStep(queryRunner: any, formId: string): Promise<number> {
  const existing = await queryRunner.query(
    `SELECT id
     FROM form_step
     WHERE form_id = $1`,
    [formId],
  )
  if (existing.length > 0) {
    return existing[0].id
  }

  const resp = await queryRunner.query(
    `INSERT INTO form_step(tenant_id, form_id, step_nr, "order")
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [null, formId, 1, 1],
  )
  return resp[0].id
}

async function getOrCreateFormDefinition(
  queryRunner: any,
  formName: string,
  formDescription: string | null,
  machineId: string | null,
): Promise<number> {
  // Find existing form_definition by name (which is unique per tenant)
  let rows = await queryRunner.query(
    `SELECT id, description, machine_id
     FROM form_definition
     WHERE name = $1
       AND tenant_id IS NULL`,
    [formName],
  )
  let formDefId: number

  if (rows.length > 0) {
    formDefId = rows[0].id
    // Update if any fields changed
    if ((rows[0].description ?? null) !== (formDescription ?? null) ||
      (rows[0].machine_id ?? null) !== (machineId ?? null)) {
      await queryRunner.query(
        `UPDATE form_definition
         SET description = $2,
             machine_id = $3
         WHERE id = $1`,
        [formDefId, formDescription ?? null, machineId ?? null],
      )
    }
  } else {
    // Create new form_definition
    const resp = await queryRunner.query(
      `INSERT INTO form_definition(tenant_id, name, description, machine_id)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [null, formName, formDescription ?? null, machineId ?? null],
    )
    formDefId = resp[0].id
  }

  return formDefId
}

async function linkFormDefToFormStep(
  queryRunner: any,
  formDefId: number,
  formStepId: number,
): Promise<void> {
  // Check if link already exists
  const existing = await queryRunner.query(
    `SELECT 1
     FROM form_def_to_form_step
     WHERE form_definition_id = $1
       AND form_step_id = $2`,
    [formDefId, formStepId],
  )

  if (existing.length === 0) {
    await queryRunner.query(
      `INSERT INTO form_def_to_form_step(form_definition_id, form_step_id)
       VALUES ($1, $2)`,
      [formDefId, formStepId],
    )
  }
}

async function upsertSchemaAndLinkToStep(
  queryRunner: any,
  directory: string,
  formStepId: number,
  entityType: string,
  schemaType: string,
  schemaFile: string,
  correlationId: string,
  metadataSetId: number,
): Promise<void> {
  // Read schema file
  const schemaPath = path.join(directory, schemaFile)
  const schemaContent = await fs.readFile(schemaPath, 'utf-8')
  const schemaJson = JSON.parse(schemaContent)

  // Check if schema already exists
  let rows = await queryRunner.query(
    `SELECT id
     FROM schema_definition
     WHERE schema_type = $1
       AND correlation_id = $2
       AND entity_type = $3`,
    [schemaType, correlationId, entityType],
  )
  let schemaDefId: number
  if (rows.length > 0) {
    schemaDefId = rows[0].id
    // Update schema content and metadata set link
    await queryRunner.query(
      `UPDATE schema_definition
       SET schema           = $2,
           meta_data_set_id = $3
       WHERE id = $1`,
      [schemaDefId, JSON.stringify(schemaJson), metadataSetId],
    )
  } else {
    const resp = await queryRunner.query(
      `INSERT INTO schema_definition(tenant_id, extends_id, correlation_id, schema_type,
                                     entity_type, schema, meta_data_set_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [null, null, correlationId, schemaType, entityType, JSON.stringify(schemaJson), metadataSetId],
    )
    schemaDefId = resp[0].id
  }

  // Link to form step (idempotent)
  const link = await queryRunner.query(
    `SELECT 1
     FROM form_step_to_schema_definition
     WHERE form_step_id = $1
       AND schema_definition_id = $2`,
    [formStepId, schemaDefId],
  )
  if (link.length === 0) {
    await queryRunner.query(
      `INSERT INTO form_step_to_schema_definition(form_step_id, schema_definition_id)
       VALUES ($1, $2)`,
      [formStepId, schemaDefId],
    )
  }
}

async function getOrCreateMetadataSet(queryRunner: any, setName: string): Promise<number> {
  const rows = await queryRunner.query(
    `SELECT id
     FROM meta_data_set
     WHERE name = $1`,
    [setName],
  )
  if (rows.length > 0) {
    return rows[0].id
  }

  const resp = await queryRunner.query(
    `INSERT INTO meta_data_set(tenant_id, name)
     VALUES ($1, $2) RETURNING id`,
    [null, setName],
  )
  return resp[0].id
}

async function upsertKeyWithValues(
  queryRunner: any,
  setId: number,
  keyObj: {key: string; valueType: string; values: any[]},
): Promise<void> {
  // Find existing key
  let rows = await queryRunner.query(
    `SELECT id, value_type
     FROM meta_data_keys
     WHERE set_id = $1
       AND key = $2`,
    [setId, keyObj.key],
  )

  let keyId: number
  if (rows.length > 0) {
    keyId = rows[0].id
    // Update value type if changed
    if (rows[0].value_type !== keyObj.valueType) {
      await queryRunner.query(
        `UPDATE meta_data_keys
         SET value_type = $2
         WHERE id = $1`,
        [keyId, keyObj.valueType],
      )
    }
    // Delete old values to replace with new ones
    await queryRunner.query(`DELETE
                             FROM meta_data_values
                             WHERE key_id = $1`, [keyId])
  } else {
    const resp = await queryRunner.query(
      `INSERT INTO meta_data_keys(set_id, key, value_type)
       VALUES ($1, $2, $3) RETURNING id`,
      [setId, keyObj.key, keyObj.valueType],
    )
    keyId = resp[0].id
  }

  // Insert new values
  for (let i = 0; i < (keyObj.values ?? []).length; i++) {
    const v = keyObj.values[i]
    const textValue = typeof v === 'string' ? v : null
    const numberValue = typeof v === 'number' ? v : null
    const booleanValue = typeof v === 'boolean' ? v : null
    const timestampValue = (v && typeof v === 'object' && typeof v.toISOString === 'function')
      ? v.toISOString()
      : null

    await queryRunner.query(
      `INSERT INTO meta_data_values(key_id, index, text_value, number_value, boolean_value, timestamp_value)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [keyId, i, textValue, numberValue, booleanValue, timestampValue],
    )
  }
}

export async function addFormDefs(directory: string): Promise<void> {
  const configPath = path.join(directory, 'form-fixtures.json')
  const fixturesContent = await fs.readFile(configPath, 'utf-8')
  const fixtures: Fixtures = JSON.parse(fixturesContent)

  const dataSource = await getDbConnection(DB_CONNECTION_NAME)
  const queryRunner = dataSource.createQueryRunner()
  await queryRunner.connect()
  await queryRunner.startTransaction()

  try {
    // 1. Get or create form step (by formId)
    const formStepId = await getOrCreateFormStep(queryRunner, fixtures.formId)

    // 2. Get or create form definition (by name - which is unique)
    const formDefId = await getOrCreateFormDefinition(
      queryRunner,
      fixtures.formName,
      fixtures.formDescription ?? null,
      fixtures.machineId ?? null,
    )

    // 3. Link form_definition to form_step (idempotent)
    await linkFormDefToFormStep(queryRunner, formDefId, formStepId)

    // 4. Process metadata sets: merge keys and schemas
    for (const set of fixtures.metadataSets ?? []) {
      const setId = await getOrCreateMetadataSet(queryRunner, set.name)

      // Upsert keys with their values
      for (const key of set.keys ?? []) {
        await upsertKeyWithValues(queryRunner, setId, key)
      }

      // Upsert schemas and link to form step
      for (const sch of set.schemas ?? []) {
        await upsertSchemaAndLinkToStep(
          queryRunner,
          directory,
          formStepId,
          fixtures.entityType,
          sch.schemaType,
          sch.schemaFile,
          set.name, // Use metadata set name as correlation_id
          setId,
        )
      }
    }

    await queryRunner.commitTransaction()
  } catch (error) {
    await queryRunner.rollbackTransaction()
    throw error
  } finally {
    await queryRunner.release()
  }
}

export async function removeMetadataSet(setName: string): Promise<void> {
  const dataSource = await getDbConnection(DB_CONNECTION_NAME)
  const queryRunner = dataSource.createQueryRunner()
  await queryRunner.connect()
  await queryRunner.startTransaction()

  try {
    const set = await queryRunner.query(`SELECT id
                                FROM meta_data_set
                                WHERE name = $1`, [setName])
    if (set.length === 0) {
      await queryRunner.rollbackTransaction()
      return
    }
    const setId = set[0].id

    // Get schema definitions linked to this metadata set
    const schemas = await queryRunner.query(
      `SELECT id
       FROM schema_definition
       WHERE meta_data_set_id = $1`,
      [setId],
    )

    // Delete junction table links first (form_step_to_schema_definition)
    for (const schema of schemas) {
      await queryRunner.query(
        `DELETE
         FROM form_step_to_schema_definition
         WHERE schema_definition_id = $1`,
        [schema.id],
      )
    }

    // Now delete schema definitions
    await queryRunner.query(
      `DELETE
       FROM schema_definition
       WHERE meta_data_set_id = $1`,
      [setId],
    )

    // Delete values
    const keys = await queryRunner.query(`SELECT id
                                 FROM meta_data_keys
                                 WHERE set_id = $1`, [setId])
    for (const k of keys) {
      await queryRunner.query(
        `DELETE
         FROM meta_data_values
         WHERE key_id = $1`,
        [k.id],
      )
    }

    // Delete keys
    await queryRunner.query(
      `DELETE
       FROM meta_data_keys
       WHERE set_id = $1`,
      [setId],
    )

    await queryRunner.query(
      `DELETE
       FROM credential_design_branding
       WHERE meta_data_set_id = $1`,
      [setId],
    )

    // Delete metadata set
    await queryRunner.query(
      `DELETE
       FROM meta_data_set
       WHERE id = $1`,
      [setId],
    )

    await queryRunner.commitTransaction()
  } catch (error) {
    await queryRunner.rollbackTransaction()
    throw error
  } finally {
    await queryRunner.release()
  }
}
