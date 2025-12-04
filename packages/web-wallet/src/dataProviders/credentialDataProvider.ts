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
import { getAgent } from '@agent'
import type {
  DigitalCredential,
  FindDigitalCredentialArgs,
  UpdateCredentialStateArgs,
} from '@sphereon/ssi-sdk.data-store-types'
import {DataResource} from '@typings'
import {FetchOptions} from '@sphereon/ssi-sdk.pd-manager'
import type {GetCredentialsByIdOrHashArgs, OptionalUniqueDigitalCredential} from '@sphereon/ssi-sdk.credential-store'

export type DigitalCredentialFilter = Partial<DigitalCredential>

const filterableFields: (keyof DigitalCredential)[] = [
  'id',
  'tenantId',
  'credentialRole',
  'hash',
  'createdAt',
  'documentFormat',
  'documentType',
  'issuerCorrelationId',
  'issuerCorrelationType',
  'subjectCorrelationType',
  'credentialRole',
  'lastUpdatedAt',
  'revokedAt',
  'validFrom',
  'validUntil',
  'verifiedAt',
  'verifiedState',
]

const assertResource = (resource: string) => {
  if (resource != DataResource.CREDENTIALS) {
    throw new Error(`credentialDataProvider can only handle resource type "${DataResource.CREDENTIALS}"`)
  }
}

export const credentialDataProvider = (): DataProvider => ({
  getList: async <TData extends BaseRecord = BaseRecord>({
    resource,
    pagination,
    filters,
    meta,
    sort,
  }: GetListParams): Promise<GetListResponse<TData>> => {
    assertResource(resource)

    const findArgs: FindDigitalCredentialArgs = []
    let filterItem: DigitalCredentialFilter
    filters?.forEach(filter => {
      if (filter.operator === 'eq') {
        if (filterItem === undefined) {
          filterItem = {}
          findArgs.push(filterItem)
        }
        const filterField = filter.field as keyof DigitalCredentialFilter
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

    const items: Array<DigitalCredential> = await getAgent().crsGetCredentials({filter: findArgs})
    // FIXME CWALL-234 there should be a better way for this but i could not find any yet without refine.dev not complaining
    const data: TData[] = items.map(item => ({...(item as any)}))

    return {
      data,
      total: items.length,
    }
  },
  getOne: async <TData extends BaseRecord = BaseRecord>({resource, id, meta}: GetOneParams): Promise<GetOneResponse<TData>> => {
    assertResource(resource)
    if (meta === undefined || meta.variables === undefined || !('credentialRole' in meta.variables)) {
      return Promise.reject(Error('credentialRole not found in meta query'))
    }
    const args: GetCredentialsByIdOrHashArgs = {credentialRole: meta.variables.credentialRole, idOrHash: id as string}
    const credential: OptionalUniqueDigitalCredential = await getAgent().crsGetUniqueCredentialByIdOrHash(args)
    return {
      data: credential?.digitalCredential as unknown as TData,
    }
  },
  create: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({
    resource,
    variables,
  }: CreateParams<TVariables>): Promise<CreateResponse<TData>> => {
    assertResource(resource)
    const item: DigitalCredential = await getAgent().crsAddCredential({credential: variables as DigitalCredential})
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
    const item: DigitalCredential = await getAgent().crsUpdateCredentialState(variables as UpdateCredentialStateArgs)
    return {
      data: item as unknown as TData,
    }
  },
  deleteOne: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({
    resource,
    id,
    meta,
  }: DeleteOneParams<TVariables>): Promise<DeleteOneResponse<TData>> => {
    assertResource(resource)
    const hashAsId = typeof meta?.idColumnName === 'string' && meta?.idColumnName === 'hash'
    await getAgent().crsDeleteCredential(hashAsId ? {hash: id as string} : {id: id as string})
    return {
      data: {} as TData,
    }
  },
  deleteMany: async <TData, TVariables>(params: DeleteManyParams<TVariables>): Promise<DeleteManyResponse<TData>> => {
    assertResource(params.resource)
    const filter: FindDigitalCredentialArgs = params.ids.map(id => {
      return {id: id as string}
    })
    await getAgent().crsDeleteCredentials({
      filter: filter,
    })
    return {
      data: [] as TData[],
    }
  },

  getApiUrl: (): string => {
    // TODO implement
    throw Error('Not implemented')
  },
})
