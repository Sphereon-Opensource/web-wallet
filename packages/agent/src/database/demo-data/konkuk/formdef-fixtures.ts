import classAchievementUISchema from './classAchievementUISchema.json' assert { type: 'json' }
import classAchievementDataSchema from './classAchievementSchema.json' assert { type: 'json' }
import microDegreeUISchema from './microDegreeUISchema.json' assert { type: 'json' }
import microDegreeDataSchema from './microDegreeSchema.json' assert { type: 'json' }
import studentUISchema from './studentUISchema.json' assert { type: 'json' }
import studentDataSchema from './studentSchema.json' assert { type: 'json' }
import employeeUISchema from './employeeUISchema.json' assert { type: 'json' }
import employeeDataSchema from './employeeSchema.json' assert { type: 'json' }
import { getDbConnection } from '../../databaseService'
import { DB_CONNECTION_NAME } from '../../../environment-vars'

export async function addFormDefsKonkuk() {
  const ds = await getDbConnection(DB_CONNECTION_NAME)

  // Metadata
  let response = await ds.query(`INSERT INTO meta_data_set(tenant_id, name)
                                   VALUES (NULL, 'Credential Issuance Wizard')
                                   RETURNING id`)
  const setId = response[0].id

  response = await ds.query(`INSERT INTO meta_data_keys(set_id, key, value_type)
                               VALUES ('${setId}', 'credentialType', 'Text')
                               RETURNING id`)
  const keyId = response[0].id
  // FIXME!!! add konkuk VC values
  response = await ds.query(`INSERT INTO meta_data_values(key_id, index, text_value, number_value, boolean_value,
                                                            timestamp_value)
                               VALUES ('${keyId}', 0, 'VerifiableCredential', NULL, NULL, NULL)`)

  response = await ds.query(`INSERT INTO meta_data_values(key_id, index, text_value, number_value, boolean_value,
                                                            timestamp_value)
                               VALUES ('${keyId}', 1, 'Omzetbelasting', NULL, NULL, NULL)`)

  // Form step
  response = await ds.query(`INSERT INTO form_step(tenant_id, form_id, step_nr, "order")
                               VALUES (NULL, 'credentialIssuanceWizard1', 1, 1)
                               RETURNING id`)
  const formStepId = response[0].id

  // Schema defs
  response = await ds.query(`INSERT INTO schema_definition (tenant_id, extends_id, schema_type, entity_type, schema,
                                                              meta_data_set_id)
                               VALUES (NULL, NULL, 'UI_Form', 'VC', '${JSON.stringify(classAchievementUISchema)}',
                                       '${setId}')
                               RETURNING id`)
  await ds.query(`INSERT INTO form_step_to_schema_definition(form_step_id, schema_definition_id)
                    VALUES ('${formStepId}', '${response[0].id}')`)

  response = await ds.query(`INSERT INTO schema_definition (tenant_id, extends_id, schema_type, entity_type, schema,
                                                              meta_data_set_id)
                               VALUES (NULL, NULL, 'Data', 'VC', '${JSON.stringify(classAchievementDataSchema)}',
                                       '${setId}')
                               RETURNING id`)
  await ds.query(`INSERT INTO form_step_to_schema_definition(form_step_id, schema_definition_id)
                    VALUES ('${formStepId}', '${response[0].id}')`)

  response = await ds.query(`INSERT INTO schema_definition (tenant_id, extends_id, schema_type, entity_type, schema,
                                                              meta_data_set_id)
                               VALUES (NULL, NULL, 'UI_Form', 'VC', '${JSON.stringify(microDegreeUISchema)}',
                                       '${setId}')
                               RETURNING id`)
  await ds.query(`INSERT INTO form_step_to_schema_definition(form_step_id, schema_definition_id)
                    VALUES ('${formStepId}', '${response[0].id}')`)

  response = await ds.query(`INSERT INTO schema_definition (tenant_id, extends_id, schema_type, entity_type, schema,
                                                              meta_data_set_id)
                               VALUES (NULL, NULL, 'Data', 'VC', '${JSON.stringify(microDegreeDataSchema)}',
                                       '${setId}')
                               RETURNING id`)
  await ds.query(`INSERT INTO form_step_to_schema_definition(form_step_id, schema_definition_id)
                    VALUES ('${formStepId}', '${response[0].id}')`)

  response = await ds.query(`INSERT INTO schema_definition (tenant_id, extends_id, schema_type, entity_type, schema,
                                                              meta_data_set_id)
                               VALUES (NULL, NULL, 'UI_Form', 'VC', '${JSON.stringify(studentUISchema)}',
                                       '${setId}')
                               RETURNING id`)
  await ds.query(`INSERT INTO form_step_to_schema_definition(form_step_id, schema_definition_id)
                    VALUES ('${formStepId}', '${response[0].id}')`)

  response = await ds.query(`INSERT INTO schema_definition (tenant_id, extends_id, schema_type, entity_type, schema,
                                                              meta_data_set_id)
                               VALUES (NULL, NULL, 'Data', 'VC', '${JSON.stringify(studentDataSchema)}',
                                       '${setId}')
                               RETURNING id`)
  await ds.query(`INSERT INTO form_step_to_schema_definition(form_step_id, schema_definition_id)
                    VALUES ('${formStepId}', '${response[0].id}')`)

  response = await ds.query(`INSERT INTO schema_definition (tenant_id, extends_id, schema_type, entity_type, schema,
                                                              meta_data_set_id)
                               VALUES (NULL, NULL, 'UI_Form', 'VC', '${JSON.stringify(employeeUISchema)}',
                                       '${setId}')
                               RETURNING id`)
  await ds.query(`INSERT INTO form_step_to_schema_definition(form_step_id, schema_definition_id)
                    VALUES ('${formStepId}', '${response[0].id}')`)

  response = await ds.query(`INSERT INTO schema_definition (tenant_id, extends_id, schema_type, entity_type, schema,
                                                              meta_data_set_id)
                               VALUES (NULL, NULL, 'Data', 'VC', '${JSON.stringify(employeeDataSchema)}',
                                       '${setId}')
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
