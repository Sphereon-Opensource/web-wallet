import {
  BaseRecord,
  CreateParams,
  CreateResponse,
  DataProvider,
  DeleteManyParams,
  DeleteManyResponse,
  DeleteOneParams,
  DeleteOneResponse,
  GetListParams,
  GetListResponse,
  GetOneParams,
  GetOneResponse,
  UpdateParams,
  UpdateResponse,
} from '@refinedev/core'
import agent from '@agent'
import {FindDefinitionArgs, PresentationDefinitionItem} from '@sphereon/ssi-sdk.data-store'
import {DataResource} from '@typings'
import {PresentationDefinitionItemFilter} from '@sphereon/ssi-sdk.data-store'
import {FetchOptions} from '@sphereon/ssi-sdk.pd-manager'

const filterableFields: (keyof PresentationDefinitionItemFilter)[] = ['definitionId', 'tenantId', 'version', 'name', 'purpose', 'id']

// TODO CWALL-234 further implement

const assertResource = (resource: string) => {
  if (resource != DataResource.PRESENTATION_DEFINITIONS) {
    throw new Error(`presentationDefinitionDataProvider can only handle resource type "${DataResource.PRESENTATION_DEFINITIONS}"`)
  }
}

export const presentationDefinitionDataProvider = (): DataProvider => ({
  getList: async <TData extends BaseRecord = BaseRecord>({
    resource,
    pagination,
    filters,
    meta,
    sort,
  }: GetListParams): Promise<GetListResponse<TData>> => {
    assertResource(resource)
    // TODO CWALL-246 switch to our REST implementation

    const findArgs: FindDefinitionArgs = []
    let filterItem: PresentationDefinitionItemFilter
    filters?.forEach(filter => {
      if (filter.operator === 'eq') {
        if (filterItem === undefined) {
          filterItem = {}
          findArgs.push(filterItem)
        }
        const filterField = filter.field as keyof PresentationDefinitionItemFilter
        if (filterableFields.includes(filterField)) {
          filterItem[filterField] = filter.value
        }
      } else {
        throw new Error(`operator ${filter.operator} not yet supported`)
      }
    })

    const fetchOptions: FetchOptions = {}
    if (meta?.variables && 'showVersionHistory' in meta.variables) {
      fetchOptions.showVersionHistory = meta.variables.showVersionHistory
    }

    const items: PresentationDefinitionItem[] = await agent.pdmGetDefinitions({filter: findArgs, opts: fetchOptions})
    // FIXME CWALL-234 there should be a better way for this but i could not find any yet without refine.dev not complaining
    const data: TData[] = items.map(item => ({...(item as any)}))

    return {
      data,
      total: items.length,
    }
  },
  getOne: async <TData extends BaseRecord = BaseRecord>({resource, id}: GetOneParams): Promise<GetOneResponse<TData>> => {
    assertResource(resource)
    const item: PresentationDefinitionItem = await agent.pdmGetDefinition({itemId: id as string})
    return {
      data: item as unknown as TData,
    }
  },
  create: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({
    resource,
    variables,
  }: CreateParams<TVariables>): Promise<CreateResponse<TData>> => {
    assertResource(resource)
    const item: PresentationDefinitionItem = await agent.pdmPersistDefinition({definitionItem: variables as PresentationDefinitionItem})
    return {
      data: item as unknown as TData,
    }
  },
  update: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({
    resource,
    id,
    variables,
  }: UpdateParams<TVariables>): Promise<UpdateResponse<TData>> => {
    assertResource(resource)
    const item: PresentationDefinitionItem = await agent.pdmPersistDefinition({definitionItem: variables as PresentationDefinitionItem})
    return {
      data: item as unknown as TData,
    }
  },
  deleteOne: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({
    resource,
    id,
  }: DeleteOneParams<TVariables>): Promise<DeleteOneResponse<TData>> => {
    assertResource(resource)
    await agent.pdmDeleteDefinition({itemId: id as string})
    return {
      data: {} as TData,
    }
  },
  deleteMany: async <TData, TVariables>(params: DeleteManyParams<TVariables>): Promise<DeleteManyResponse<TData>> => {
    assertResource(params.resource)
    const filter: FindDefinitionArgs = params.ids.map(id => {
      return {id: id as string}
    })
    await agent.pdmDeleteDefinitions({
      filter: filter,
    })
    return {
      data: [] as TData[],
    }
  },

  getApiUrl: (): string => {
    // TODO CWALL-234 implement
    throw Error('Not implemented')
  },
})
