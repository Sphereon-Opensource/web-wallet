import {getDbConnection} from "../../databaseService"
import {DB_CONNECTION_NAME} from "../../../environment"
import uboUISchema from "./ultimateBeneficialOwnerUISchema.json" assert {type: "json"}
import uboDataSchema from "./ultimateBeneficalOwner.json" assert {type: "json"}
import naturalPersonUISchema from "./naturalPersonUISchema.json" assert {type: "json"}
import naturalPersonDataSchema from "./naturalPersonSchema.json" assert {type: "json"}


export async function addFormDefsUbo() {
    const ds = await getDbConnection(DB_CONNECTION_NAME)

    // Metadata NaturalPerson
    let response = await ds.query(`INSERT INTO meta_data_set(tenant_id, name)
                                   VALUES (NULL, 'Natural Person')
                                   RETURNING id`)
    const setIdNaturalPerson = response[0].id;

    response = await ds.query(`INSERT INTO meta_data_keys(set_id, key, value_type)
                               VALUES ('${setIdNaturalPerson}', 'credentialType', 'Text')
                               RETURNING id`)
    const keyIdNaturalPerson = response[0].id;

    response = await ds.query(`INSERT INTO meta_data_values(key_id, index, text_value, number_value, boolean_value,
                                                            timestamp_value)
                               VALUES ('${keyIdNaturalPerson}', 0, 'VerifiableCredential', NULL, NULL, NULL)`)

    response = await ds.query(`INSERT INTO meta_data_values(key_id, index, text_value, number_value, boolean_value,
                                                            timestamp_value)
                               VALUES ('${keyIdNaturalPerson}', 1, 'NaturalPerson', NULL, NULL, NULL)`)


    // Metadata UBO
    response = await ds.query(`INSERT INTO meta_data_set(tenant_id, name)
                                   VALUES (NULL, 'UBO')
                                   RETURNING id`)
    const setIdUBO = response[0].id;

    response = await ds.query(`INSERT INTO meta_data_keys(set_id, key, value_type)
                               VALUES ('${setIdUBO}', 'credentialType', 'Text')
                               RETURNING id`)

    const keyIdUBO = response[0].id;

    response = await ds.query(`INSERT INTO meta_data_values(key_id, index, text_value, number_value, boolean_value,
                                                            timestamp_value)
                               VALUES ('${keyIdUBO}', 0, 'VerifiableCredential', NULL, NULL, NULL)`)

    response = await ds.query(`INSERT INTO meta_data_values(key_id, index, text_value, number_value, boolean_value,
                                                            timestamp_value)
                               VALUES ('${keyIdUBO}', 1, 'UBO', NULL, NULL, NULL)`)


    // Form step
    response = await ds.query(`INSERT INTO form_step(tenant_id, form_id, step_nr, "order")
                               VALUES (NULL, 'credentialIssuanceWizard1', 1, 1)
                               RETURNING id`)
    const formStepId = response[0].id;


    // Schema defs
    response = await ds.query(`INSERT INTO schema_definition (tenant_id, extends_id, correlation_id, schema_type, entity_type, schema,
                                                              meta_data_set_id)
                               VALUES (NULL, NULL, 'NaturalPerson', 'UI_Form', 'VC', '${JSON.stringify(naturalPersonUISchema)}',
                                       '${setIdNaturalPerson}')
                               RETURNING id`)
    await ds.query(`INSERT INTO form_step_to_schema_definition(form_step_id, schema_definition_id)
                    VALUES ('${formStepId}', '${response[0].id}')`)

    response = await ds.query(`INSERT INTO schema_definition (tenant_id, extends_id, correlation_id, schema_type, entity_type, schema,
                                                              meta_data_set_id)
                               VALUES (NULL, NULL, 'NaturalPerson', 'Data', 'VC', '${JSON.stringify(naturalPersonDataSchema)}',
                                       '${setIdNaturalPerson}')
                               RETURNING id`)
    await ds.query(`INSERT INTO form_step_to_schema_definition(form_step_id, schema_definition_id)
                    VALUES ('${formStepId}', '${response[0].id}')`)

    response = await ds.query(`INSERT INTO schema_definition (tenant_id, extends_id, correlation_id, schema_type, entity_type, schema,
                                                              meta_data_set_id)
                               VALUES (NULL, NULL, 'UBO', 'UI_Form', 'VC', '${JSON.stringify(uboUISchema)}',
                                       '${setIdUBO}')
                               RETURNING id`)
    await ds.query(`INSERT INTO form_step_to_schema_definition(form_step_id, schema_definition_id)
                    VALUES ('${formStepId}', '${response[0].id}')`)

    response = await ds.query(`INSERT INTO schema_definition (tenant_id, extends_id, correlation_id, schema_type, entity_type, schema,
                                                              meta_data_set_id)
                               VALUES (NULL, NULL, 'UBO', 'Data', 'VC', '${JSON.stringify(uboDataSchema)}',
                                       '${setIdUBO}')
                               RETURNING id`)
    await ds.query(`INSERT INTO form_step_to_schema_definition(form_step_id, schema_definition_id)
                    VALUES ('${formStepId}', '${response[0].id}')`)

    // Form definition
    response = await ds.query(`INSERT INTO form_definition(tenant_id, name, description, machine_id)
                               VALUES (NULL, 'CredentialIssuanceWizard', 'Form for Credential Issuance Wizard', NULL)
                               RETURNING id`)
    const formDefId = response[0].id;

    await ds.query(`INSERT INTO form_def_to_form_step(form_definition_id, form_step_id)
                    VALUES ('${formDefId}', '${formStepId}')`)

}
