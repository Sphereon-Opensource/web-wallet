import moviesUISchema from './moviesUISchema.json' assert { type: 'json' }
import moviesDataSchema from './movies.json' assert { type: 'json' }
import swimmingpoolUISchema from './swimmingpoolUISchema.json' assert { type: 'json' }
import swimmingpoolDataSchema from './swimmingpool.json' assert { type: 'json' }
import employeeUISchema from './employeeUISchema.json' assert { type: 'json' }
import employeeDataSchema from './employeeSchema.json' assert { type: 'json' }
import { getDbConnection } from '../../databaseService'
import { DB_CONNECTION_NAME } from '../../../environment-vars'

export async function addFormDefsGeneric() {
  const ds = await getDbConnection(DB_CONNECTION_NAME)

  // Metadata
  let response = await ds.query(`INSERT INTO meta_data_set(tenant_id, name)
                                   VALUES (NULL, 'Movie ticket')
                                   RETURNING id`)
  const setIdMovie = response[0].id

  response = await ds.query(`INSERT INTO meta_data_keys(set_id, key, value_type)
                               VALUES ('${setIdMovie}', 'credentialType', 'Text')
                               RETURNING id`)
  const keyIdMovie = response[0].id
  // // FIXME!!! add konkuk VC values
  // response = await ds.query(`INSERT INTO meta_data_values(key_id, index, text_value, number_value, boolean_value,
  //                                                           timestamp_value)
  //                              VALUES ('${keyIdMovie}', 0, 'VerifiableCredential', NULL, NULL, NULL)`)

  response = await ds.query(`INSERT INTO meta_data_values(key_id, index, text_value, number_value, boolean_value,
                                                            timestamp_value)
                               VALUES ('${keyIdMovie}', 1, 'MovieTicket', NULL, NULL, NULL)`)



  response = await ds.query(`INSERT INTO meta_data_set(tenant_id, name)
                             VALUES (NULL, 'Swimmingpool')
                               RETURNING id`)
  const setIdSwimmingpool = response[0].id

  response = await ds.query(`INSERT INTO meta_data_keys(set_id, key, value_type)
                             VALUES ('${setIdSwimmingpool}', 'credentialType', 'Text')
                               RETURNING id`)
  const keyIdSwimmingpool = response[0].id

  // response = await ds.query(`INSERT INTO meta_data_values(key_id, index, text_value, number_value, boolean_value,
  //                                                           timestamp_value)
  //                              VALUES ('${keyIdSwimmingpool}', 0, 'VerifiableCredential', NULL, NULL, NULL)`)

  response = await ds.query(`INSERT INTO meta_data_values(key_id, index, text_value, number_value, boolean_value,
                                                          timestamp_value)
                             VALUES ('${keyIdSwimmingpool}', 1, 'Swimmingpool', NULL, NULL, NULL)`)



  response = await ds.query(`INSERT INTO meta_data_set(tenant_id, name)
                             VALUES (NULL, 'Employee')
                               RETURNING id`)
  const setIdEmployee = response[0].id

  response = await ds.query(`INSERT INTO meta_data_keys(set_id, key, value_type)
                             VALUES ('${setIdEmployee}', 'credentialType', 'Text')
                               RETURNING id`)
  const keyIdEmployee = response[0].id

  // response = await ds.query(`INSERT INTO meta_data_values(key_id, index, text_value, number_value, boolean_value,
  //                                                         timestamp_value)
  //                            VALUES ('${keyIdEmployee}', 0, 'VerifiableCredential', NULL, NULL, NULL)`)

  response = await ds.query(`INSERT INTO meta_data_values(key_id, index, text_value, number_value, boolean_value,
                                                          timestamp_value)
                             VALUES ('${keyIdEmployee}', 1, 'Employee', NULL, NULL, NULL)`)




  // Form step
  response = await ds.query(`INSERT INTO form_step(tenant_id, form_id, step_nr, "order")
                               VALUES (NULL, 'credentialIssuanceWizard1', 1, 1)
                               RETURNING id`)
  const formStepId = response[0].id

  response = await ds.query(`INSERT INTO schema_definition (tenant_id, extends_id, correlation_id, schema_type, entity_type, schema,
                                                              meta_data_set_id)
                               VALUES (NULL, NULL, 'MovieTicket', 'UI_Form', 'VC', '${JSON.stringify(moviesUISchema)}',
                                       '${setIdMovie}')
                               RETURNING id`)
  await ds.query(`INSERT INTO form_step_to_schema_definition(form_step_id, schema_definition_id)
                    VALUES ('${formStepId}', '${response[0].id}')`)

  response = await ds.query(`INSERT INTO schema_definition (tenant_id, extends_id, correlation_id, schema_type, entity_type, schema,
                                                              meta_data_set_id)
                               VALUES (NULL, NULL, 'MovieTicket', 'Data', 'VC', '${JSON.stringify(moviesDataSchema)}',
                                       '${setIdMovie}')
                               RETURNING id`)
  await ds.query(`INSERT INTO form_step_to_schema_definition(form_step_id, schema_definition_id)
                    VALUES ('${formStepId}', '${response[0].id}')`)




  response = await ds.query(`INSERT INTO schema_definition (tenant_id, extends_id, correlation_id, schema_type, entity_type, schema,
                                                              meta_data_set_id)
                               VALUES (NULL, NULL, 'Swimmingpool', 'UI_Form', 'VC', '${JSON.stringify(swimmingpoolUISchema)}',
                                       '${setIdSwimmingpool}')
                               RETURNING id`)
  await ds.query(`INSERT INTO form_step_to_schema_definition(form_step_id, schema_definition_id)
                    VALUES ('${formStepId}', '${response[0].id}')`)

  response = await ds.query(`INSERT INTO schema_definition (tenant_id, extends_id, correlation_id, schema_type, entity_type, schema,
                                                              meta_data_set_id)
                               VALUES (NULL, NULL, 'Swimmingpool', 'Data', 'VC', '${JSON.stringify(swimmingpoolDataSchema)}',
                                       '${setIdSwimmingpool}')
                               RETURNING id`)
  await ds.query(`INSERT INTO form_step_to_schema_definition(form_step_id, schema_definition_id)
                    VALUES ('${formStepId}', '${response[0].id}')`)




  response = await ds.query(`INSERT INTO schema_definition (tenant_id, extends_id, correlation_id, schema_type, entity_type, schema,
                                                              meta_data_set_id)
                               VALUES (NULL, NULL, 'Employee', 'UI_Form', 'VC', '${JSON.stringify(employeeUISchema)}',
                                       '${setIdEmployee}')
                               RETURNING id`)
  await ds.query(`INSERT INTO form_step_to_schema_definition(form_step_id, schema_definition_id)
                    VALUES ('${formStepId}', '${response[0].id}')`)

  response = await ds.query(`INSERT INTO schema_definition (tenant_id, extends_id, correlation_id, schema_type, entity_type, schema,
                                                              meta_data_set_id)
                               VALUES (NULL, NULL, 'Employee', 'Data', 'VC', '${JSON.stringify(employeeDataSchema)}',
                                       '${setIdEmployee}')
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
