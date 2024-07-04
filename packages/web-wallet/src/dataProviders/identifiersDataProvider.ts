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
import {DID_PREFIX} from '@sphereon/ssi-sdk-ext.did-utils'
import agent from '@agent'
import {KeyManagementSystem} from '@types'
import {IIdentifier} from '@veramo/core'

// TODO CWALL-244 further implement

export const identifiersDataProvider = (): DataProvider => ({
  getList: async <TData extends BaseRecord = BaseRecord>({resource, pagination, filters, sort}: GetListParams): Promise<GetListResponse<TData>> => {
    const identities: IIdentifier[] = await agent.didManagerFind()
    const data: TData[] = identities.map(identity => ({...(identity as any)}))
    return {
      data,
      total: data.length,
    }
  },
  getOne: async <TData extends BaseRecord = BaseRecord>({resource, id}: GetOneParams): Promise<GetOneResponse<TData>> => {
    // TODO CWALL-244 implement
    return {
      data: {} as TData,
    }
  },
  create: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({
    resource,
    variables,
    meta,
  }: CreateParams<TVariables>): Promise<CreateResponse<TData>> => {
    // FIXME CWALL-244 fix ignores
    const identifier = await agent.didManagerCreate({
      kms: KeyManagementSystem.LOCAL,
      // @ts-ignore
      alias: variables.alias,
      // @ts-ignore
      provider: `${DID_PREFIX}${variables.method}`,
      options: {
        // @ts-ignore
        type: variables.keyType,
        // @ts-ignore
        ...(variables.method == 'key' && {codecName: 'EBSI'}),
      },
    })

    return {
      // FIXME CWALL-244 there should be a better way for this but i could not find any yet without refine.dev not complaining
      data: {...(identifier as any)} as TData,
    }
  },
  createMany: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({
    resource,
    variables,
    meta,
  }: CreateManyParams<TVariables>): Promise<CreateManyResponse<TData>> => {
    // TODO CWALL-244 implement
    return {data: []}
  },
  update: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({
    resource,
    id,
    variables,
  }: UpdateParams<TVariables>): Promise<UpdateResponse<TData>> => {
    // TODO CWALL-244 implement
    return {
      data: {} as TData,
    }
  },
  deleteOne: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({
    resource,
    id,
  }: DeleteOneParams<TVariables>): Promise<DeleteOneResponse<TData>> => {
    // TODO CWALL-244 implement
    return {
      data: {} as TData,
    }
  },
  getApiUrl: (): string => {
    // TODO CWALL-244 implement
    return 'some api url'
  },
})
