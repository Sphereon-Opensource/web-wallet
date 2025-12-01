import {
  BaseRecord,
  CreateManyParams,
  CreateManyResponse,
  CreateParams,
  CreateResponse,
  DataProvider,
  DeleteOneParams,
  DeleteOneResponse,
  GetListParams,
  GetListResponse,
  GetOneParams,
  GetOneResponse,
  UpdateParams,
  UpdateResponse,
} from '@refinedev/core'
import {supabaseServiceClient} from '@helpers/SupabaseClient'

export const credentialDesignDataProvider = (): DataProvider => ({
  getList: async <TData extends BaseRecord = BaseRecord>({resource, pagination, filters, sort}: GetListParams): Promise<GetListResponse<TData>> => {
    // TODO SSISDK-86 implement, currently doing a quick fetch here to get the names of the designs
    const credentialDesigns = await supabaseServiceClient
      .from('meta_data_set')
      .select('*')

    const data: TData[] = credentialDesigns.data ?? []

    return {
      data,
      total: data.length,
    }
  },
  getOne: async <TData extends BaseRecord = BaseRecord>({resource, id}: GetOneParams): Promise<GetOneResponse<TData>> => {
    // TODO SSISDK-86 implement
    return {
      data: {} as TData,
    }
  },
  create: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({
    resource,
    variables,
    meta,
  }: CreateParams<TVariables>): Promise<CreateResponse<TData>> => {
    // TODO SSISDK-88 create transaction solution

    // @ts-ignore
    const { credentialName, credentialFormat, schema, uiSchema, branding } = variables

    let formStepId
    const formStepResult = await supabaseServiceClient
      .from('form_step')
      .select('*')
      .eq('form_id', 'credentialIssuanceWizard').single()

    if (!formStepResult.data) {
      const formStep = {
        form_id: 'credentialIssuanceWizard',
        step_nr: 1,
        order: 1
      }
      const result  = await supabaseServiceClient.from('form_step').insert([
        formStep
      ]).single()
      formStepId = (result.data as any).id
    } else {
      formStepId = formStepResult.data.id
    }

    const metaDataSetResult  = await supabaseServiceClient.from('meta_data_set').insert([
      { name: credentialName }
    ]).single()
    const setId = (metaDataSetResult.data as any).id

    const credentialTypeMetaDataKeysResult  = await supabaseServiceClient.from('meta_data_keys').insert([
      {
        set_id: setId,
        key: 'credentialType',
        value_type: 'Text'
      }
    ]).single()
    const credentialTypeKeyId = (credentialTypeMetaDataKeysResult.data as any).id

    await supabaseServiceClient.from('meta_data_values').insert([
      {
        key_id: credentialTypeKeyId,
        index: 0,
        text_value: 'VerifiableCredential'
      }
    ])

    const credentialFormatMetaDataKeysResult  = await supabaseServiceClient.from('meta_data_keys').insert([
      {
        set_id: setId,
        key: 'credentialFormat',
        value_type: 'Text'
      }
    ]).single()
    const credentialFormatKeyId = (credentialFormatMetaDataKeysResult.data as any).id

    await supabaseServiceClient.from('meta_data_values').insert([
      {
        key_id: credentialFormatKeyId,
        index: 0,
        text_value: credentialFormat
      }
    ])

    const schemaDefinition = {
      correlation_id: credentialName,
      schema_type: 'Data',
      entity_type: 'VC',
      schema: JSON.stringify(schema),
      meta_data_set_id: setId
    }

    const uiSchemaDefinition = {
      correlation_id: credentialName,
      schema_type: 'UI_Form',
      entity_type: 'VC',
      schema: JSON.stringify(uiSchema),
      meta_data_set_id: setId
    }

    const schemaDefinitionResult = await supabaseServiceClient.from('schema_definition').insert([
      schemaDefinition, uiSchemaDefinition
    ])

    await supabaseServiceClient.from('form_step_to_schema_definition').insert([
      {
        form_step_id: formStepId,
        schema_definition_id: (schemaDefinitionResult.data?.[0] as any).id
      },
      {
        form_step_id: formStepId,
        schema_definition_id: (schemaDefinitionResult.data?.[1] as any).id
      }
    ])

    const credentialDesignBranding = {
      logo_url: branding.logoUrl,
      background_url: branding.backgroundUrl,
      logo_color: branding.logoColor,
      background_color: branding.backgroundColor,
      meta_data_set_id: setId
    }

    await supabaseServiceClient.from('credential_design_branding').insert([
      credentialDesignBranding
    ])

    return {
      // FIXME CWALL-242 there should be a better way for this but i could not find any yet without refine.dev not complaining
      data: {...({ // TODO SSISDK-86 implement proper return
          formStepId,
          setId,
          keyId: credentialTypeKeyId,
          schema: schemaDefinition,
          uiSchema: uiSchemaDefinition
        } as any)} as TData,
    }
  },
  createMany: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({
    resource,
    variables,
    meta,
  }: CreateManyParams<TVariables>): Promise<CreateManyResponse<TData>> => {
    // TODO SSISDK-86 implement
    const data: TData[] = []
    return { data }
  },
  update: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({
    resource,
    id,
    variables,
  }: UpdateParams<TVariables>): Promise<UpdateResponse<TData>> => {
    // TODO SSISDK-86 implement
    return {
      data: {} as TData,
    }
  },
  deleteOne: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({
    resource,
    id,
  }: DeleteOneParams<TVariables>): Promise<DeleteOneResponse<TData>> => {
    // TODO SSISDK-86 implement
    return {
      data: {} as TData,
    }
  },
  getApiUrl: (): string => {
    // TODO SSISDK-86 implement
    throw Error('Not implemented')
  },
})
