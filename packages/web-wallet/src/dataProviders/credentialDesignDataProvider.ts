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
import {CredentialDesignEntity, StoreCredentialSchemaArgs} from '@typings'

export const credentialDesignDataProvider = (): DataProvider => ({
  getList: async <TData extends BaseRecord = BaseRecord>({resource, pagination, filters, sort}: GetListParams): Promise<GetListResponse<TData>> => {
    const client = supabaseServiceClient()
    const { current = 1, pageSize = 10 } = pagination || {}
    const from = (current - 1) * pageSize
    const to = current * pageSize - 1
    let query = client
      .from('meta_data_set')
      .select(`
        *,
        meta_data_keys:meta_data_keys!fk_meta_data_set (
          *,
          meta_data_values:meta_data_values!fk_meta_data_keys (*)
        ),
        schema_definition:schema_definition!fk_schemadef_metadata (
          *,
          form_step_to_schema_definition:form_step_to_schema_definition!fk_schema_definition (*)
        ),
        credential_design_branding:credential_design_branding!fk_credentialdesignbranding_metadata (
          *,
          logo:ImageAttributes!fk_branding_logo (
            *,
            dimensions:ImageDimensions!FK_ImageAttributes_dimensionsId (*)
          ),
          background_image:ImageAttributes!fk_branding_background_image (
            *,
            dimensions:ImageDimensions!FK_ImageAttributes_dimensionsId (*)
          )
        )
    `, { count: 'exact' })
    query = query.range(from, to)
    const { data, error, count } = await query

    if (error) {
      throw new Error(error.message)
    }

    const result = (data ?? []).map(item => new CredentialDesignEntity(item).asDTO()) as unknown

    return {
      data: result as TData[],
      total: count ?? (data?.length ?? 0)
    }
  },
  getOne: async <TData extends BaseRecord = BaseRecord>({resource, id}: GetOneParams): Promise<GetOneResponse<TData>> => {
    const client = supabaseServiceClient()
    const result = await client
      .from('meta_data_set')
      .select(`
        *,
        meta_data_keys:meta_data_keys!fk_meta_data_set (
          *,
          meta_data_values:meta_data_values!fk_meta_data_keys (*)
        ),
        schema_definition:schema_definition!fk_schemadef_metadata (
          *,
          form_step_to_schema_definition:form_step_to_schema_definition!fk_schema_definition (*)
        ),
        credential_design_branding:credential_design_branding!fk_credentialdesignbranding_metadata (
          *,
          logo:ImageAttributes!fk_branding_logo (
            *,
            dimensions:ImageDimensions!FK_ImageAttributes_dimensionsId (*)
          ),
          background_image:ImageAttributes!fk_branding_background_image (
            *,
            dimensions:ImageDimensions!FK_ImageAttributes_dimensionsId (*)
          )
        )
      `)
      .eq('id', id)
      .single()

    const data = new CredentialDesignEntity(result.data).asDTO() as unknown

    return {
      data: data as TData
    }
  },
  create: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({resource, variables, meta}: CreateParams<TVariables>): Promise<CreateResponse<TData>> => {
    const client = supabaseServiceClient()
    // @ts-ignore
    const { name, credentialFormat, schema, uiSchema, branding } = variables

    let formStepId
    const formStepResult = await client
      .from('form_step')
      .select('*')
      .eq('form_id', 'credentialIssuanceWizard').single()

    if (!formStepResult.data) {
      const formStep = {
        form_id: 'credentialIssuanceWizard',
        step_nr: 1,
        order: 1
      }
      const result  = await client.from('form_step').insert([
        formStep
      ]).single()
      formStepId = (result.data as any).id
    } else {
      formStepId = formStepResult.data.id
    }

    const { data, error } = await client.rpc(
      'insert_credential_design', {
        p_identifier: name,
        p_credential_format: credentialFormat,
        p_schema: schema,
        p_ui_schema: uiSchema,
        p_form_step_id: formStepId,
        p_branding: {
          logo: branding.logo,
          background_image: branding.backgroundImage,
          text_color: branding.textColor,
          background_color: branding.backgroundColor
        }
      }
    )

    if (error) {
      throw new Error(error.message)
    }

    const result = new CredentialDesignEntity(data).asDTO() as unknown

    return {
      data: result as TData
    }
  },
  createMany: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({resource, variables, meta}: CreateManyParams<TVariables>): Promise<CreateManyResponse<TData>> => {
    const client = supabaseServiceClient()
    // @ts-ignore
    const { credentialDesigns } = variables

    let formStepId
    const formStepResult = await client
      .from('form_step')
      .select('*')
      .eq('form_id', 'credentialIssuanceWizard').single()

    if (!formStepResult.data) {
      const formStep = {
        form_id: 'credentialIssuanceWizard',
        step_nr: 1,
        order: 1
      }
      const result  = await client.from('form_step').insert([
        formStep
      ]).single()
      formStepId = (result.data as any).id
    } else {
      formStepId = formStepResult.data.id
    }

    const results = await Promise.all(
      credentialDesigns.map((design: StoreCredentialSchemaArgs) =>
        client.rpc('insert_credential_design', {
          p_identifier: design.name,
          p_credential_format: design.credentialFormat,
          p_schema: design.schema,
          p_ui_schema: design.uiSchema,
          p_form_step_id: formStepId,
          p_branding: {
            logo: design.branding.logo,
            background_image: design.branding.backgroundImage,
            text_color: design.branding.textColor,
            background_color: design.branding.backgroundColor
          }
        })
      )
    )

    const data: TData[] = results.map((result: any) => result.data)

    return { data }
  },
  update: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({resource, id, variables}: UpdateParams<TVariables>): Promise<UpdateResponse<TData>> => {
    const client = supabaseServiceClient()
    // @ts-ignore
    const { name, credentialFormat, schema, uiSchema, branding } = variables

    const { data, error } = await client.rpc('update_credential_design', {
      p_set_id: id,
      p_identifier: name,
      p_credential_format: credentialFormat,
      p_schema: schema,
      p_ui_schema: uiSchema,
      p_branding: {
        logo: branding.logo,
        background_image: branding.backgroundImage,
        text_color: branding.textColor,
        background_color: branding.backgroundColor
      }
    })

    if (error) {
      throw new Error(error.message)
    }

    return {
      data: data as TData
    }
  },
  deleteOne: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({resource, id}: DeleteOneParams<TVariables>): Promise<DeleteOneResponse<TData>> => {
    const client = supabaseServiceClient()

    const { data, error } = await client
      .from('meta_data_set')
      .delete()
      .eq('id', id)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    if (!data) {
      throw new Error(`Record with id ${id} not found`)
    }

    return {
      data: data as TData
    }
  },
  getApiUrl: (): string => {
    throw Error('Not implemented')
  }
})
