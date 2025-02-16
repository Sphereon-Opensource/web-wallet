import { getDbConnection } from '../../databaseService'
import { DB_CONNECTION_NAME } from '../../../environment-vars'
import omzetbelastingUISchema from './omzetbelastingUISchema.json' assert { type: 'json' }
import omzetbelastingDataSchema from './omzetbelastingSchema.json' assert { type: 'json' }
import woonplaatsVerklaringUISchema from './woonplaatsVerklaringUISchema.json' assert { type: 'json' }
import woonplaatsVerklaringDataSchema from './woonplaatsVerklaringSchema.json' assert { type: 'json' }

export async function addFormDefsBelastingdienst() {
  const ds = await getDbConnection(DB_CONNECTION_NAME)

  // Metadata Omzetbelasting
  let response = await ds.query(`INSERT INTO meta_data_set(tenant_id, name)
                                   VALUES (NULL, 'Omzetbelasting')
                                   RETURNING id`)
  const setIdOmzetbelasting = response[0].id

  response = await ds.query(`INSERT INTO meta_data_keys(set_id, key, value_type)
                               VALUES ('${setIdOmzetbelasting}', 'credentialType', 'Text')
                               RETURNING id`)
  const keyIdOmzetbelasting = response[0].id

  response = await ds.query(`INSERT INTO meta_data_values(key_id, index, text_value, number_value, boolean_value,
                                                            timestamp_value)
                               VALUES ('${keyIdOmzetbelasting}', 0, 'VerifiableCredential', NULL, NULL, NULL)`)

  response = await ds.query(`INSERT INTO meta_data_values(key_id, index, text_value, number_value, boolean_value,
                                                            timestamp_value)
                               VALUES ('${keyIdOmzetbelasting}', 1, 'Omzetbelasting', NULL, NULL, NULL)`)

  // Metadata Woonplaatsverklaring
  response = await ds.query(`INSERT INTO meta_data_set(tenant_id, name)
                                   VALUES (NULL, 'Woonplaatsverklaring')
                                   RETURNING id`)
  const setIdWoonplaatsverklaring = response[0].id

  response = await ds.query(`INSERT INTO meta_data_keys(set_id, key, value_type)
                               VALUES ('${setIdWoonplaatsverklaring}', 'credentialType', 'Text')
                               RETURNING id`)

  const keyIdWoonplaatsverklaring = response[0].id

  response = await ds.query(`INSERT INTO meta_data_values(key_id, index, text_value, number_value, boolean_value,
                                                            timestamp_value)
                               VALUES ('${keyIdWoonplaatsverklaring}', 0, 'VerifiableCredential', NULL, NULL, NULL)`)

  response = await ds.query(`INSERT INTO meta_data_values(key_id, index, text_value, number_value, boolean_value,
                                                            timestamp_value)
                               VALUES ('${keyIdWoonplaatsverklaring}', 1, 'Woonplaatsverklaring', NULL, NULL, NULL)`)

  // Form step
  response = await ds.query(`INSERT INTO form_step(tenant_id, form_id, step_nr, "order")
                               VALUES (NULL, 'credentialIssuanceWizard1', 1, 1)
                               RETURNING id`)
  const formStepId = response[0].id

  // Schema defs
  response = await ds.query(`INSERT INTO schema_definition (tenant_id, extends_id, correlation_id, schema_type, entity_type, schema,
                                                              meta_data_set_id)
                               VALUES (NULL, NULL, 'Omzetbelasting', 'UI_Form', 'VC', '${JSON.stringify(omzetbelastingUISchema)}',
                                       '${setIdOmzetbelasting}')
                               RETURNING id`)
  await ds.query(`INSERT INTO form_step_to_schema_definition(form_step_id, schema_definition_id)
                    VALUES ('${formStepId}', '${response[0].id}')`)

  response = await ds.query(`INSERT INTO schema_definition (tenant_id, extends_id, correlation_id, schema_type, entity_type, schema,
                                                              meta_data_set_id)
                               VALUES (NULL, NULL, 'Omzetbelasting', 'Data', 'VC', '${JSON.stringify(omzetbelastingDataSchema)}',
                                       '${setIdOmzetbelasting}')
                               RETURNING id`)
  await ds.query(`INSERT INTO form_step_to_schema_definition(form_step_id, schema_definition_id)
                    VALUES ('${formStepId}', '${response[0].id}')`)

  response = await ds.query(`INSERT INTO schema_definition (tenant_id, extends_id, correlation_id, schema_type, entity_type, schema,
                                                              meta_data_set_id)
                               VALUES (NULL, NULL, 'Woonplaatsverklaring', 'UI_Form', 'VC', '${JSON.stringify(woonplaatsVerklaringUISchema)}',
                                       '${setIdWoonplaatsverklaring}')
                               RETURNING id`)
  await ds.query(`INSERT INTO form_step_to_schema_definition(form_step_id, schema_definition_id)
                    VALUES ('${formStepId}', '${response[0].id}')`)

  response = await ds.query(`INSERT INTO schema_definition (tenant_id, extends_id, correlation_id, schema_type, entity_type, schema,
                                                              meta_data_set_id)
                               VALUES (NULL, NULL, 'Woonplaatsverklaring', 'Data', 'VC', '${JSON.stringify(woonplaatsVerklaringDataSchema)}',
                                       '${setIdWoonplaatsverklaring}')
                               RETURNING id`)
  await ds.query(`INSERT INTO form_step_to_schema_definition(form_step_id, schema_definition_id)
                    VALUES ('${formStepId}', '${response[0].id}')`)

  // Form definition
  response = await ds.query(`INSERT INTO form_definition(tenant_id, name, description, machine_id)
                               VALUES (NULL, 'CredentialIssuanceWizard', 'Form for Credential Issuance Wizard', NULL)
                               RETURNING id`)
  const formDefId = response[0].id

  await ds.query(`INSERT INTO form_def_to_form_step(form_definition_id, form_step_id)
                    VALUES ('${formDefId}', '${formStepId}')`)
}
