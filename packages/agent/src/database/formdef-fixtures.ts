// FIXME this is a quick & dirty, create a proper typeorm based implementation

import {promises as fs} from 'fs'
import path from 'path'
import {getDbConnection} from './databaseService'
import {DB_CONNECTION_NAME} from '../environment'

interface Schema {
  schemaType: string
  schemaFile: string
}

interface Key {
  key: string
  valueType: string
  values: any[]
}

interface MetadataSet {
  name: string
  keys: Key[]
  schemas: Schema[]
}

interface FormFixtures {
  entityType: string
  formName: string
  formDescription: string
  formId: string
  machineId: string | null | undefined
  metadataSets: MetadataSet[]
}

export async function addFormDefs(directory: string) {
  // Path to form-fixtures.json
  const configPath = path.join(directory, 'form-fixtures.json')

  // Read and parse the configuration file
  const configContent = await fs.readFile(configPath, 'utf-8')
  const fixtures: FormFixtures = JSON.parse(configContent)

  const ds = await getDbConnection(DB_CONNECTION_NAME)

  const queryRunner = ds.createQueryRunner()
  await queryRunner.connect()
  await queryRunner.startTransaction()

  try {
    // Insert Form Step
    let response = await queryRunner.query(
      `INSERT INTO form_step(tenant_id, form_id, step_nr, "order")
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [null, fixtures.formId, 1, 1],
    )
    const formStepId = response[0].id

    // Process each Metadata Set
    for (const metadataSet of fixtures.metadataSets) {
      // Insert Metadata Set
      response = await queryRunner.query(
        `INSERT INTO meta_data_set(tenant_id, name)
         VALUES ($1, $2) RETURNING id`,
        [null, metadataSet.name],
      )
      const setId = response[0].id

      // Insert Keys and Values
      for (const key of metadataSet.keys) {
        // Insert Key
        response = await queryRunner.query(
          `INSERT INTO meta_data_keys(set_id, key, value_type)
           VALUES ($1, $2, $3) RETURNING id`,
          [setId, key.key, key.valueType],
        )
        const keyId = response[0].id

        // Insert Values
        const valuePromises = key.values.map((value, index) => {
          const textValue = typeof value === 'string' ? value : null
          const numberValue = typeof value === 'number' ? value : null
          const booleanValue = typeof value === 'boolean' ? value : null
          const timestampValue = value instanceof Date ? value.toISOString() : null

          return queryRunner.query(
            `INSERT INTO meta_data_values(key_id, index, text_value, number_value, boolean_value, timestamp_value)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [keyId, index, textValue, numberValue, booleanValue, timestampValue],
          )
        })

        try {
          await Promise.all(valuePromises)
        } catch (valueError) {
          console.error(`Error inserting meta_data_values for key_id: ${keyId}`, valueError)
          throw valueError
        }
      }

      // Insert Schemas
      for (const schema of metadataSet.schemas) {
        // Resolve the schema file path
        const schemaPath = path.join(directory, schema.schemaFile)

        // Import the schema JSON
        const schemaContent = await fs.readFile(schemaPath, 'utf-8')
        const schemaJson = JSON.parse(schemaContent)

        // Insert Schema Definition
        response = await queryRunner.query(
          `INSERT INTO schema_definition (tenant_id, extends_id, correlation_id, schema_type, entity_type, schema,
                                          meta_data_set_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [
            null,
            null,
            metadataSet.name, // Assuming correlation_id is the metadata set name
            schema.schemaType,
            fixtures.entityType,
            JSON.stringify(schemaJson),
            setId,
          ],
        )
        const schemaDefId = response[0].id

        // Link Schema Definition to Form Step
        await queryRunner.query(
          `INSERT INTO form_step_to_schema_definition(form_step_id, schema_definition_id)
           VALUES ($1, $2)`,
          [formStepId, schemaDefId],
        )
      }
    }

    // Insert Form Definition
    response = await queryRunner.query(
      `INSERT INTO form_definition(tenant_id, name, description, machine_id)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [null, fixtures.formName, fixtures.formDescription, fixtures.machineId ?? null],
    )
    const formDefId = response[0].id

    // Link Form Definition to Form Step
    await queryRunner.query(
      `INSERT INTO form_def_to_form_step(form_definition_id, form_step_id)
       VALUES ($1, $2)`,
      [formDefId, formStepId],
    )

    await queryRunner.commitTransaction()
  } catch (error) {
    await queryRunner.rollbackTransaction()
    throw error
  } finally {
    await ds.destroy()
  }
}
