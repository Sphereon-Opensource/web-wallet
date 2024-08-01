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
import {PartialKey} from '@sphereon/ssi-sdk-ext.key-manager'
import agent from '@agent'
import {KeyManagementSystem} from '@typings'

// TODO CWALL-242 further implement

export const keysDataProvider = (): DataProvider => ({
  getList: async <TData extends BaseRecord = BaseRecord>({resource, pagination, filters, sort}: GetListParams): Promise<GetListResponse<TData>> => {
    const keys = await agent.keyManagerListKeys()
    // FIXME CWALL-242 there should be a better way for this but i could not find any yet without refine.dev not complaining
    const data: TData[] = keys.map((key: any) => ({...(key as any)}))

    return {
      data,
      total: keys.length,
    }
  },
  getOne: async <TData extends BaseRecord = BaseRecord>({resource, id}: GetOneParams): Promise<GetOneResponse<TData>> => {
    // TODO CWALL-242 implement
    return {
      data: {} as TData,
    }
  },
  create: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({
    resource,
    variables,
    meta,
  }: CreateParams<TVariables>): Promise<CreateResponse<TData>> => {
    // FIXME CWALL-242 fix ignores
    const key = await agent.keyManagerCreate({
      kms: KeyManagementSystem.LOCAL,
      // @ts-ignore
      type: variables.type,
      meta: {
        // @ts-ignore
        purposes: variables.purposes,
        // @ts-ignore
        alias: variables.alias,
      },
    })

    return {
      // FIXME CWALL-242 there should be a better way for this but i could not find any yet without refine.dev not complaining
      data: {...(key as any)} as TData,
    }
  },
  createMany: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({
    resource,
    variables,
    meta,
  }: CreateManyParams<TVariables>): Promise<CreateManyResponse<TData>> => {
    // @ts-ignore
    const keyCreations: Array<Promise<PartialKey>> = variables.map(async key =>
      // FIXME CWALL-242 fix ignores
      agent.keyManagerCreate({
        kms: 'local',
        // @ts-ignore
        type: key.type,
        meta: {
          // @ts-ignore
          purposes: key.purposes,
          // @ts-ignore
          alias: key.alias,
        },
      }),
    )
    const keys = await Promise.all(keyCreations)
    // FIXME CWALL-242 there should be a better way for this but i could not find any yet without refine.dev not complaining
    const data: TData[] = keys.map(key => ({...(key as any)}))
    return {data}
  },
  update: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({
    resource,
    id,
    variables,
  }: UpdateParams<TVariables>): Promise<UpdateResponse<TData>> => {
    // TODO CWALL-242 implement
    return {
      data: {} as TData,
    }
  },
  deleteOne: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({
    resource,
    id,
  }: DeleteOneParams<TVariables>): Promise<DeleteOneResponse<TData>> => {
    // TODO CWALL-242 implement
    return {
      data: {} as TData,
    }
  },
  getApiUrl: (): string => {
    // TODO CWALL-242 implement
    throw Error('Not implemented')
  },
})
