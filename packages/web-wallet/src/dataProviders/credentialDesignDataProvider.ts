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
import {enrichSchemaWithDisclosureFrame, enrichSchemaWithStatusList} from '@helpers/SchemaUtils'
import {CredentialDesignEntity, SdJwtFormatOptions, StoreCredentialDesignArgs} from '@typings'
import {getAgentBaseUrl} from '@/src/agent/environment'

const getApiUrl = () => `${getAgentBaseUrl()}/api`

export const credentialDesignDataProvider = (): DataProvider => ({
  getList: async <TData extends BaseRecord = BaseRecord>({resource, pagination, filters, sort}: GetListParams): Promise<GetListResponse<TData>> => {
    const {current = 1, pageSize = 10} = pagination || {}
    const offset = (current - 1) * pageSize

    const response = await fetch(`${getApiUrl()}/credential-designs?limit=${pageSize}&offset=${offset}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch credential designs: ${response.statusText}`)
    }

    const {data: designs, total} = await response.json()

    const result = (designs ?? []).map((item: any) => new CredentialDesignEntity(item).asDTO()) as unknown

    return {
      data: result as TData[],
      total: total ?? designs?.length ?? 0,
    }
  },
  getOne: async <TData extends BaseRecord = BaseRecord>({resource, id}: GetOneParams): Promise<GetOneResponse<TData>> => {
    const response = await fetch(`${getApiUrl()}/credential-designs/${id}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch credential design: ${response.statusText}`)
    }

    const {data} = await response.json()
    const result = new CredentialDesignEntity(data).asDTO() as unknown

    return {
      data: result as TData,
    }
  },
  create: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({
    resource,
    variables,
    meta,
  }: CreateParams<TVariables>): Promise<CreateResponse<TData>> => {
    // @ts-ignore
    const {name, schema, uiSchema, branding, statusListUri, options, isAdvancedSchema} = variables

    // Enrich the schema with disclosureFrame (for non-required fields) and statusList (if URI provided)
    const enrichedSchema = enrichSchemaWithStatusList(enrichSchemaWithDisclosureFrame(schema), statusListUri)

    const response = await fetch(`${getApiUrl()}/credential-designs`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        name,
        schema: enrichedSchema,
        uiSchema,
        options: {
          format: options.format,
          vct: options.vct ?? null,
          scope: options.scope ?? null,
          cryptographicBindingMethodsSupported: options.cryptographicBindingMethodsSupported ?? [],
          credentialSigningAlgValuesSupported: options.credentialSigningAlgValuesSupported ?? [],
          proofTypesSupported: options.proofTypesSupported ?? {},
        },
        isAdvancedSchema: isAdvancedSchema ?? false,
        branding: branding
          ? {
              logo: branding.logo,
              background_image: branding.backgroundImage,
              text_color: branding.textColor,
              background_color: branding.backgroundColor,
            }
          : null,
        statusListUri,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `Failed to create credential design: ${response.statusText}`)
    }

    const {data} = await response.json()
    const result = new CredentialDesignEntity(data).asDTO() as unknown

    return {
      data: result as TData,
    }
  },
  createMany: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({
    resource,
    variables,
    meta,
  }: CreateManyParams<TVariables>): Promise<CreateManyResponse<TData>> => {
    // @ts-ignore
    const {credentialDesigns} = variables

    const results = await Promise.all(
      credentialDesigns.map(async (design: StoreCredentialDesignArgs) => {
        const response = await fetch(`${getApiUrl()}/credential-designs`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            name: design.name,
            schema: design.schema,
            uiSchema: design.uiSchema,
            options: {
              format: design.options.format,
              vct: (design.options as SdJwtFormatOptions).vct ?? null,
              scope: design.options.scope ?? null,
              cryptographicBindingMethodsSupported: design.options.cryptographicBindingMethodsSupported ?? [],
              credentialSigningAlgValuesSupported: design.options.credentialSigningAlgValuesSupported ?? [],
              proofTypesSupported: design.options.proofTypesSupported ?? {},
            },
            isAdvancedSchema: design.isAdvancedSchema ?? false,
            branding: design.branding
              ? {
                  logo: design.branding.logo,
                  background_image: design.branding.backgroundImage,
                  text_color: design.branding.textColor,
                  background_color: design.branding.backgroundColor,
                }
              : null,
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to create credential design: ${response.statusText}`)
        }

        return response.json()
      }),
    )

    const data: TData[] = results.map((result: any) => new CredentialDesignEntity(result.data).asDTO())

    return {data}
  },
  update: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({
    resource,
    id,
    variables,
  }: UpdateParams<TVariables>): Promise<UpdateResponse<TData>> => {
    // @ts-ignore
    const {name, schema, uiSchema, branding, options, isAdvancedSchema} = variables

    const updateOptions = {...options}
    if (updateOptions.format !== 'dc+sd-jwt' && updateOptions.format !== 'vc+sd-jwt') {
      delete updateOptions.vct
    }

    const response = await fetch(`${getApiUrl()}/credential-designs/${id}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        name,
        schema,
        uiSchema,
        options: {
          format: updateOptions.format,
          vct: updateOptions.vct ?? null,
          scope: updateOptions.scope ?? null,
          cryptographicBindingMethodsSupported: updateOptions.cryptographicBindingMethodsSupported ?? [],
          credentialSigningAlgValuesSupported: updateOptions.credentialSigningAlgValuesSupported ?? [],
          proofTypesSupported: updateOptions.proofTypesSupported ?? {},
        },
        isAdvancedSchema: isAdvancedSchema ?? false,
        branding: branding
          ? {
              logo: branding.logo,
              background_image: branding.backgroundImage,
              text_color: branding.textColor,
              background_color: branding.backgroundColor,
            }
          : null,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `Failed to update credential design: ${response.statusText}`)
    }

    const {data} = await response.json()

    return {
      data: data as TData,
    }
  },
  deleteOne: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({
    resource,
    id,
  }: DeleteOneParams<TVariables>): Promise<DeleteOneResponse<TData>> => {
    const response = await fetch(`${getApiUrl()}/credential-designs/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to delete credential design: ${response.statusText}`)
    }

    // Return empty data since the record is deleted
    return {
      data: {id} as TData,
    }
  },
  getApiUrl: (): string => {
    return getApiUrl()
  },
})
