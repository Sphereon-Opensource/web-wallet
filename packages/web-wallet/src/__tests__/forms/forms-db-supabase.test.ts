import {supabaseServiceClient} from '@helpers/SupabaseClient'
import {
  EntityType,
  FormDefinitionEntity,
  FormDefinitionDTO,
  FormDefToFormStepEntity,
  FormStepEntity,
  FormStepDTO,
  FormStepToSchemaDefinitionEntity,
  SchemaDefinitionEntity,
  SchemaDefinitionDTO,
  SchemaType,
  MachineDTO,
  MachineEntity,
  MachineEntityType,
  FormDefinitionEntityType,
  SchemaDefinitionEntityType,
  FormStepEntityType,
  FormDefToFormStepEntityType,
  FormStepToSchemaDefinitionEntityType,
} from '@typings'
import {v4 as uuidv4} from 'uuid'
import {
  MetaDataKeysDTO,
  MetaDataKeysEntity,
  MetaDataSetDTO,
  MetaDataSetEntity,
  MetaDataValuesDTO,
  MetaDataValuesEntity,
  ValueType,
} from '../../types/metadata'
import {FormsService} from '../../services/forms/FormsService'
import {CredentialFormSelectionType} from '@sphereon/ui-components.ssi-react'

describe('Forms related Database Operations', () => {
  let createdMachineDTO: MachineDTO | undefined
  let createdSchemaDefinitionDTO1: SchemaDefinitionDTO | undefined
  let createdSchemaDefinitionDTO2: SchemaDefinitionDTO | undefined
  let createdFormStep: FormStepDTO | undefined
  let createdFormDefinitionDTO: FormDefinitionDTO | undefined
  let createdMetaDataSetDTO: MetaDataSetDTO | undefined
  let formDefToFormStepRelations: FormDefToFormStepEntity[] = []
  let formStepToSchemaDefRelations: FormStepToSchemaDefinitionEntity[] = []

  afterAll(async () => {
    for (const value of formStepToSchemaDefRelations) {
      await supabaseServiceClient.from('form_step_to_schema_definition').delete().match({
        form_step_id: value.form_step_id,
        schema_definition_id: value.schema_definition_id,
      })
    }
    for (const value of formDefToFormStepRelations) {
      await supabaseServiceClient.from('form_def_to_form_step').delete().match({
        form_definition_id: value.form_definition_id,
        form_step_id: value.form_step_id,
      })
    }
    if (createdSchemaDefinitionDTO1 !== undefined) {
      await supabaseServiceClient.from('schema_definition').delete().match({id: createdSchemaDefinitionDTO1.id})
    }
    if (createdSchemaDefinitionDTO2 !== undefined) {
      await supabaseServiceClient.from('schema_definition').delete().match({id: createdSchemaDefinitionDTO2.id})
    }
    if (createdFormStep !== undefined) {
      await supabaseServiceClient.from('form_step').delete().match({id: createdFormStep.id})
    }
    if (createdFormDefinitionDTO !== undefined) {
      await supabaseServiceClient.from('form_definition').delete().match({id: createdFormDefinitionDTO.id})
    }
    if (createdMachineDTO !== undefined) {
      await supabaseServiceClient.from('machine').delete().match({id: createdMachineDTO.id})
    }
  })

  test('insert a Machine', async () => {
    const actual = new MachineDTO({
      name: 'test_machine_id',
      tenantId: uuidv4() as string,
      persistence: true,
    })
    const insertResult = await supabaseServiceClient.from('machine').insert([actual.asEntity()]).select().single<MachineEntityType>()
    expect(insertResult).toBeTruthy()
    expect(insertResult.status).toEqual(201)
    expect(insertResult.data).toBeTruthy()
    expect(insertResult.data).toBeInstanceOf(Object)

    createdMachineDTO = MachineEntity.toDTO(insertResult.data!)
    expect(createdMachineDTO.id).toHaveLength(36)
    expect(createdMachineDTO.name).toEqual(actual.name)
    expect(createdMachineDTO.tenantId).toEqual(actual.tenantId)
    expect(createdMachineDTO.persistence).toEqual(actual.persistence)
  })

  test('insert a FormDefinition', async () => {
    expect(createdMachineDTO).toBeInstanceOf(Object)

    const formDefinitionDTO = new FormDefinitionDTO({
      name: 'Test Form Definition',
      description: 'This is a test form definition.',
      machine: createdMachineDTO,
      tenantId: createdMachineDTO!.tenantId,
    })

    const insertResult = await supabaseServiceClient
      .from('form_definition')
      .insert([formDefinitionDTO.asEntity()])
      .select()
      .single<FormDefinitionEntityType>()
    expect(insertResult.status).toEqual(201)
    expect(insertResult.data).toBeTruthy()
    expect(insertResult.data).toBeInstanceOf(Object)

    createdFormDefinitionDTO = FormDefinitionEntity.toDTO(insertResult.data!, [], [createdMachineDTO!], [], [])
    expect(createdFormDefinitionDTO).toBeTruthy()
    expect(createdFormDefinitionDTO.id).toHaveLength(36)
    expect(createdFormDefinitionDTO.name).toEqual(formDefinitionDTO.name)
    expect(createdFormDefinitionDTO.tenantId).toEqual(formDefinitionDTO.tenantId)
    expect(createdFormDefinitionDTO.description).toEqual(formDefinitionDTO.description)
    expect(createdFormDefinitionDTO.machine.id).toEqual(formDefinitionDTO.machine.id)
  })

  test('Create a MetaDataSet', async () => {
    const metaDataSet = new MetaDataSetDTO({
      name: 'Test Meta Data Set',
      tenantId: uuidv4(),
    })

    const insertResult = await supabaseServiceClient.from('meta_data_set').insert([metaDataSet.asEntity()]).select().single()

    expect(insertResult.status).toEqual(201)
    expect(insertResult.data).toBeTruthy()
    expect(insertResult.data).toBeInstanceOf(Object)

    createdMetaDataSetDTO = MetaDataSetEntity.toDTO(insertResult.data, [])
    expect(createdMetaDataSetDTO.id).toHaveLength(36)
    expect(createdMetaDataSetDTO.name).toEqual(metaDataSet.name)
    expect(createdMetaDataSetDTO.tenantId).toEqual(metaDataSet.tenantId)
  })

  test('Insert MetaDataKeys and Values', async () => {
    const metaDataKey = new MetaDataKeysDTO({
      setId: createdMetaDataSetDTO!.id,
      key: 'credentialType',
      valueType: ValueType.Text,
    })

    const metaDataKeyResult = await supabaseServiceClient
      .from('meta_data_keys')
      .insert([metaDataKey.asEntity()])
      .select()
      .single<MetaDataKeysEntity>()

    expect(metaDataKeyResult.status).toEqual(201)
    expect(metaDataKeyResult.data).toBeTruthy()
    expect(metaDataKeyResult.data).toBeInstanceOf(Object)

    const metaDataValue = new MetaDataValuesDTO({
      keyId: metaDataKeyResult.data?.id,
      index: 0,
      textValue: 'VerifyableCredential',
    })

    const metaDataValueResult = await supabaseServiceClient
      .from('meta_data_values')
      .insert([metaDataValue.asEntity()])
      .select()
      .single<MetaDataValuesEntity>()

    expect(metaDataValueResult.status).toEqual(201)
    expect(metaDataValueResult.data).toBeTruthy()
    expect(metaDataValueResult.data).toBeInstanceOf(Object)
  })

  test('insert a SchemaDefinition1', async () => {
    expect(createdFormDefinitionDTO).toBeTruthy()

    const schemaDefinition = new SchemaDefinitionDTO({
      tenantId: createdFormDefinitionDTO!.tenantId,
      correlationId: 'aCredential',
      schemaType: SchemaType.Data,
      entityType: EntityType.VC,
      schema: JSON.stringify({example: 'schema1'}),
      metaDataSet: createdMetaDataSetDTO,
    })

    const insertResult = await supabaseServiceClient
      .from('schema_definition')
      .insert([schemaDefinition.asEntity()])
      .select()
      .single<SchemaDefinitionEntityType>()
    expect(insertResult.status).toEqual(201)
    expect(insertResult.data).toBeTruthy()
    expect(insertResult.data).toBeInstanceOf(Object)

    createdSchemaDefinitionDTO1 = SchemaDefinitionEntity.toDTO(insertResult.data!, [], [])
    expect(createdSchemaDefinitionDTO1.id).toHaveLength(36)
    expect(createdSchemaDefinitionDTO1.schemaType).toEqual(schemaDefinition.schemaType)
    expect(createdSchemaDefinitionDTO1.entityType).toEqual(schemaDefinition.entityType)
    expect(createdSchemaDefinitionDTO1.schema).toEqual(schemaDefinition.schema)
  })

  test('insert a SchemaDefinition2', async () => {
    expect(createdFormDefinitionDTO).toBeTruthy()

    const schemaDefinition = new SchemaDefinitionDTO({
      tenantId: createdFormDefinitionDTO!.tenantId,
      correlationId: 'aCredential',
      schemaType: SchemaType.UI_Form,
      entityType: EntityType.VC,
      schema: JSON.stringify({example: 'schema2'}),
      metaDataSet: createdMetaDataSetDTO,
    })

    const insertResult = await supabaseServiceClient
      .from('schema_definition')
      .insert([schemaDefinition.asEntity()])
      .select()
      .single<SchemaDefinitionEntityType>()
    expect(insertResult.status).toEqual(201)
    expect(insertResult.data).toBeTruthy()
    expect(insertResult.data).toBeInstanceOf(Object)

    createdSchemaDefinitionDTO2 = SchemaDefinitionEntity.toDTO(insertResult.data!, [], [])
    expect(createdSchemaDefinitionDTO2.id).toHaveLength(36)
    expect(createdSchemaDefinitionDTO2.schemaType).toEqual(schemaDefinition.schemaType)
    expect(createdSchemaDefinitionDTO2.entityType).toEqual(schemaDefinition.entityType)
    expect(createdSchemaDefinitionDTO2.schema).toEqual(schemaDefinition.schema)
  })

  test('insert a FormStep and link it to FormDefinition', async () => {
    expect(createdFormDefinitionDTO).toBeTruthy()
    if (!createdFormDefinitionDTO || !createdSchemaDefinitionDTO1 || !createdSchemaDefinitionDTO2) {
      return
    }

    const formStep = new FormStepDTO({
        tenantId: createdFormDefinitionDTO.tenantId,
        formId: uuidv4(),
        stepNr: 1,
        order: 1,
      }),
      formStepDTO = formStep.asEntity()
    const insertFormDefToFormStepResult = await supabaseServiceClient.from('form_step').insert([formStepDTO]).select().single<FormStepEntityType>()
    expect(insertFormDefToFormStepResult.status).toEqual(201)
    expect(insertFormDefToFormStepResult.data).toBeTruthy()

    createdFormStep = FormStepEntity.toDTO(insertFormDefToFormStepResult.data!, [createdSchemaDefinitionDTO1!, createdSchemaDefinitionDTO2!])
    expect(createdFormStep.id).toHaveLength(36)
    expect(createdFormStep.tenantId).toEqual(formStep.tenantId)
    expect(createdFormStep.formId).toEqual(formStep.formId)
    expect(createdFormStep.stepNr).toEqual(formStep.stepNr)
    expect(createdFormStep.order).toEqual(formStep.order)

    // Now we have a form step ID, we can create its many-to-many relations
    const formDefToFormStepEntity = new FormDefToFormStepEntity({
      form_definition_id: createdFormDefinitionDTO!.id!,
      form_step_id: createdFormStep.id,
    })
    const formDefToFormStepResult = await supabaseServiceClient
      .from('form_def_to_form_step')
      .insert([formDefToFormStepEntity])
      .select()
      .single<FormDefToFormStepEntityType>()
    expect(formDefToFormStepResult.status).toEqual(201)
    expect(formDefToFormStepResult.data).toBeTruthy()
    expect(formDefToFormStepResult.data).toBeInstanceOf(Object)

    let fdToFsResultEntity = formDefToFormStepResult.data
    expect(fdToFsResultEntity).toBeTruthy()
    expect(fdToFsResultEntity!.form_step_id).toEqual(formDefToFormStepEntity.form_step_id)
    expect(fdToFsResultEntity!.form_definition_id).toEqual(formDefToFormStepEntity.form_definition_id)
    formDefToFormStepRelations.push(formDefToFormStepEntity)

    // Create form definition to form step many-to-many relations
    let formStepToSchemaDefEntity = new FormStepToSchemaDefinitionEntity({
      form_step_id: createdFormStep!.id!,
      schema_definition_id: createdSchemaDefinitionDTO1.id,
    })
    let formStepToSchemaDefResult = await supabaseServiceClient
      .from('form_step_to_schema_definition')
      .insert([formStepToSchemaDefEntity])
      .select()
      .single<FormStepToSchemaDefinitionEntityType>()
    expect(formStepToSchemaDefResult.status).toEqual(201)
    expect(formStepToSchemaDefResult.data).toBeTruthy()
    expect(formStepToSchemaDefResult.data).toBeInstanceOf(Object)

    let fsToFdResultEntity = formStepToSchemaDefResult.data
    expect(fsToFdResultEntity).toBeTruthy()
    expect(fsToFdResultEntity!.form_step_id).toEqual(formStepToSchemaDefEntity.form_step_id)
    expect(fsToFdResultEntity!.schema_definition_id).toEqual(formStepToSchemaDefEntity.schema_definition_id)
    formStepToSchemaDefRelations.push(formStepToSchemaDefEntity)

    formStepToSchemaDefEntity = new FormStepToSchemaDefinitionEntity({
      form_step_id: createdFormStep!.id!,
      schema_definition_id: createdSchemaDefinitionDTO2.id,
    })
    formStepToSchemaDefResult = await supabaseServiceClient
      .from('form_step_to_schema_definition')
      .insert([formStepToSchemaDefEntity])
      .select()
      .single<FormStepToSchemaDefinitionEntityType>()
    expect(formStepToSchemaDefResult.status).toEqual(201)
    expect(formStepToSchemaDefResult.data).toBeTruthy()
    expect(formStepToSchemaDefResult.data).toBeInstanceOf(Object)

    fsToFdResultEntity = formStepToSchemaDefResult.data
    expect(fsToFdResultEntity).toBeTruthy()
    expect(fsToFdResultEntity!.form_step_id).toEqual(formStepToSchemaDefEntity.form_step_id)
    expect(fsToFdResultEntity!.schema_definition_id).toEqual(formStepToSchemaDefEntity.schema_definition_id)
    formStepToSchemaDefRelations.push(formStepToSchemaDefEntity)
  })

  test('Reload form definition entity', async () => {
    const formDefResult = await supabaseServiceClient
      .from('form_definition')
      .select(
        `*, machine!fk_machine(*),
                form_def_to_form_step!fk_form_definition(form_step!fk_form_step(*))`,
      )
      // TODO Not been able to include schemaDefinition. Maybe I am doing something wrong or Supabase does not handle many-to-many within many-to-many correctly
      .eq('id', createdFormDefinitionDTO?.id!)
      .single()
    expect(formDefResult.status).toEqual(200)
    expect(formDefResult.data).toBeTruthy()
    expect(formDefResult.data).toBeInstanceOf(Object)

    expect(formDefResult.data.machine).toBeTruthy()

    expect(formDefResult.data.form_def_to_form_step).toBeTruthy()
    expect(formDefResult.data.form_def_to_form_step).toBeInstanceOf(Array)

    const formStep = formDefResult.data.form_def_to_form_step[0].form_step as FormStepEntityType
    const formStepDTO = FormStepEntity.toDTO(formStep, [])
    expect(formStepDTO.formId).toBeTruthy()
    expect(formStepDTO.stepNr).toEqual(1)
    expect(formStepDTO.tenantId).toEqual(createdMachineDTO?.tenantId)

    // Phase two, get schema definitions
    const schemaDefsResult = await supabaseServiceClient
      .from('form_step_to_schema_definition')
      .select(
        `
      schema_definition!fk_schema_definition(
        *,
        meta_data_set!inner(
          *,
          meta_data_keys!inner(
            *,
            meta_data_values!inner(*)
          )
        )
      )
          `,
      )
      .eq('form_step_id', formStepDTO.id)

    expect(schemaDefsResult.status).toEqual(200)
    expect(schemaDefsResult.data).toBeTruthy()
    expect(schemaDefsResult.data).toBeInstanceOf(Array)
    expect(schemaDefsResult.data!.length).toBe(2)
  })

  test('Retrieve a form definition using form service', async () => {
    const formsService: FormsService = new FormsService()
    const formDef = await formsService.getFormDefinition({id: createdFormDefinitionDTO!.id!})
    testFormDef(formDef)

    const credentialSelectionTypes: CredentialFormSelectionType[] = formsService.getCredentialFormSelectionTypes(formDef, 1)
    testCredentialSelectionTypes(credentialSelectionTypes)
  })
})

function testFormDef(formDef: FormDefinitionDTO) {
  expect(formDef.id).toBeDefined()
  expect(formDef.id!.length).toBeGreaterThan(0)

  expect(formDef.tenantId).toBeDefined()
  expect(formDef.tenantId!.length).toBeGreaterThan(0)

  expect(formDef.name).toBeDefined()
  expect(formDef.name.length).toBeGreaterThan(0)

  expect(formDef.description).toBeDefined()

  const machine = formDef.machine
  expect(machine).toBeDefined()
  if (machine) {
    expect(machine.id).toBeDefined()
    expect(machine.id.length).toBeGreaterThan(0)

    expect(machine.name).toBeDefined()
    expect(machine.name.length).toBeGreaterThan(0)

    expect(machine.tenantId).toBeDefined()
    expect(machine.tenantId!.length).toBeGreaterThan(0)

    expect(machine.persistence).toBeDefined()
  }

  const formStep = formDef.formSteps[0]
  expect(formStep).toBeDefined()
  if (formStep) {
    expect(formStep.id).toBeDefined()
    expect(formStep.id.length).toBeGreaterThan(0)

    expect(formStep.tenantId).toBeDefined()
    expect(formStep.tenantId!.length).toBeGreaterThan(0)

    expect(formStep.formId).toBeDefined()
    expect(formStep.formId.length).toBeGreaterThan(0)

    expect(formStep.stepNr).toBeDefined()
    expect(formStep.order).toBeDefined()
  }

  const schemaDefinition = formStep?.schemaDefinitions[0]
  expect(schemaDefinition).toBeDefined()
  if (schemaDefinition) {
    expect(schemaDefinition.id).toBeDefined()
    expect(schemaDefinition.id.length).toBeGreaterThan(0)

    expect(schemaDefinition.tenantId).toBeDefined()
    expect(schemaDefinition.tenantId!.length).toBeGreaterThan(0)

    expect(schemaDefinition.correlationId).toBeDefined()
    expect(schemaDefinition.schemaType).toBeDefined()

    const metaDataSet = schemaDefinition.metaDataSet
    expect(metaDataSet).toBeDefined()
    if (metaDataSet) {
      expect(metaDataSet.id).toBeDefined()
      expect(metaDataSet.id.length).toBeGreaterThan(0)

      expect(metaDataSet.tenantId).toBeDefined()
      expect(metaDataSet.tenantId!.length).toBeGreaterThan(0)

      expect(metaDataSet.name).toBeDefined()
      expect(metaDataSet.name.length).toBeGreaterThan(0)

      const metaKey = metaDataSet.keys[0]
      expect(metaKey).toBeDefined()
      if (metaKey) {
        expect(metaKey.id).toBeDefined()
        expect(metaKey.id.length).toBeGreaterThan(0)

        expect(metaKey.setId).toBeDefined()
        expect(metaKey.setId.length).toBeGreaterThan(0)

        expect(metaKey.key).toBeDefined()
        expect(metaKey.key.length).toBeGreaterThan(0)

        expect(metaKey.valueType).toBeDefined()

        const metaValue = metaKey.values[0]
        expect(metaValue).toBeDefined()
        if (metaValue) {
          expect(metaValue.id).toBeDefined()
          expect(metaValue.id.length).toBeGreaterThan(0)

          expect(metaValue.keyId).toBeDefined()
          expect(metaValue.keyId.length).toBeGreaterThan(0)
          expect(metaValue.textValue).toBeDefined()
          expect(metaValue.textValue!.length).toBeGreaterThan(0)
        }
      }
    }
  }
}

function testCredentialSelectionTypes(credentialSelectionTypes: CredentialFormSelectionType[]) {
  expect(credentialSelectionTypes).toBeTruthy()
  expect(credentialSelectionTypes).toHaveLength(1)

  const credentialSelection = credentialSelectionTypes[0]
  expect(credentialSelection).toBeDefined()

  expect(credentialSelection.label).toBe('Test Form Definition')

  expect(credentialSelection.schema).toBeDefined()
  expect((credentialSelection.schema! as any).example).toBe('schema1')

  expect(credentialSelection.uiSchema).toBeDefined()
  expect((credentialSelection.uiSchema! as any).example).toBe('schema2')

  expect(credentialSelection.credentialType).toBeDefined()
  expect(credentialSelection.credentialType).toHaveLength(1)
  expect(credentialSelection.credentialType[0]).toBe('VerifyableCredential')
}
export {}
