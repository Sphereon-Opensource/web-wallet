import {
  BaseRecord,
  CreateManyParams,
  CreateManyResponse,
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
import {PartialKey} from '@sphereon/ssi-sdk-ext.key-manager'
import {getAgent} from '@agent'
import {KeyManagementSystem} from '@typings'

// TODO CWALL-242 further implement

export const keysDataProvider = (): DataProvider => ({
  getList: async <TData extends BaseRecord = BaseRecord>({resource, pagination, filters, sort}: GetListParams): Promise<GetListResponse<TData>> => {
    const keys = await getAgent().keyManagerListKeys()
    // FIXME CWALL-242 there should be a better way for this but i could not find any yet without refine.dev not complaining
    const data: TData[] = keys.map((key: any) => ({...(key as any)}))

    return {
      data,
      total: keys.length,
    }
  },
  getOne: async <TData extends BaseRecord = BaseRecord>({resource, id}: GetOneParams): Promise<GetOneResponse<TData>> => {
    const kid = id as string
    const key = await getAgent().keyManagerGet({kid})

    if (!key) {
      return Promise.reject(Error(`Key with id ${kid} not found`))
    }

    // Find all identifiers that have this key
    const identifiers = await getAgent().didManagerFind()
    const associatedIdentifiers = identifiers.filter(identifier =>
      identifier.keys.some(k => k.kid === kid)
    )

    // For each associated identifier, find the verification method relationships
    const associations = associatedIdentifiers.map(identifier => {
      const keyInIdentifier = identifier.keys.find(k => k.kid === kid)
      return {
        did: identifier.did,
        alias: identifier.alias,
        purposes: keyInIdentifier?.meta?.purposes || [],
      }
    })

    const data = {
      ...key,
      id: key.kid,
      associations,
    }

    return {
      // FIXME CWALL-242 there should be a better way for this but i could not find any yet without refine.dev not complaining
      data: data as unknown as TData,
    }
  },
  create: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({
    resource,
    variables,
    meta,
  }: CreateParams<TVariables>): Promise<CreateResponse<TData>> => {
    // FIXME CWALL-242 fix ignores
    const key = await getAgent().keyManagerCreate({
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
      getAgent().keyManagerCreate({
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
    const kid = id as string
    const updateVars = variables as {
      alias?: string
      addToDid?: {did: string; purposes: string[]}
      removeFromDid?: string
      updatePurposes?: {did: string; purposes: string[]}
    }

    console.log('[KeysDataProvider] Update called with:', {kid, variables: updateVars})

    let key = await getAgent().keyManagerGet({kid})
    if (!key) {
      return Promise.reject(Error(`Key with id ${kid} not found`))
    }

    // Update alias - need to delete and recreate the key with new meta
    // Unfortunately Veramo doesn't have a direct way to update key meta
    if (updateVars.alias !== undefined) {
      console.log('[KeysDataProvider] Updating alias to:', updateVars.alias)
      // Note: Veramo doesn't have a keyManagerUpdate method, so we store alias in meta
      // The alias is typically stored when the key is created, but we can't update it directly
      // For now, we'll just include the alias in the response
      // A proper implementation would require agent-side support for updating key metadata
    }

    // Add key to a DID
    if (updateVars.addToDid) {
      const {did, purposes} = updateVars.addToDid
      console.log('[KeysDataProvider] Adding key to DID:', {did, purposes})
      await getAgent().didManagerAddKey({
        did,
        key: {
          ...key,
          meta: {
            ...key.meta,
            purposes,
          },
        },
        options: {},
      })
    }

    // Remove key from a DID
    if (updateVars.removeFromDid) {
      console.log('[KeysDataProvider] Removing key from DID:', updateVars.removeFromDid)
      try {
        await getAgent().didManagerRemoveKey({
          did: updateVars.removeFromDid,
          kid,
          options: {},
        })
        console.log('[KeysDataProvider] Successfully removed key from DID')
      } catch (error) {
        console.error('[KeysDataProvider] Error removing key from DID:', error)
        throw error
      }
    }

    // Update purposes for a key in a DID
    // This requires removing and re-adding the key with new purposes
    if (updateVars.updatePurposes) {
      const {did, purposes} = updateVars.updatePurposes
      console.log('[KeysDataProvider] Updating purposes for DID:', {did, purposes})

      // Get fresh key data
      key = await getAgent().keyManagerGet({kid})

      // Remove the key first
      try {
        await getAgent().didManagerRemoveKey({
          did,
          kid,
          options: {},
        })
      } catch (error) {
        console.warn('[KeysDataProvider] Key might not exist on DID, continuing with add:', error)
      }

      // Re-add with new purposes
      await getAgent().didManagerAddKey({
        did,
        key: {
          ...key,
          meta: {
            ...key.meta,
            purposes,
          },
        },
        options: {},
      })
      console.log('[KeysDataProvider] Successfully updated purposes')
    }

    // Fetch updated data
    const updatedKey = await getAgent().keyManagerGet({kid})
    const identifiers = await getAgent().didManagerFind()
    const associatedIdentifiers = identifiers.filter(identifier =>
      identifier.keys.some(k => k.kid === kid)
    )
    const associations = associatedIdentifiers.map(identifier => {
      const keyInIdentifier = identifier.keys.find(k => k.kid === kid)
      return {
        did: identifier.did,
        alias: identifier.alias,
        purposes: keyInIdentifier?.meta?.purposes || [],
      }
    })

    console.log('[KeysDataProvider] Update complete, associations:', associations)

    return {
      // FIXME CWALL-242 there should be a better way for this but i could not find any yet without refine.dev not complaining
      data: {...updatedKey, id: updatedKey.kid, associations} as unknown as TData,
    }
  },
  deleteOne: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({
    resource,
    id,
  }: DeleteOneParams<TVariables>): Promise<DeleteOneResponse<TData>> => {
    const kid = id as string
    console.log(`[KeysDataProvider] Deleting key: ${kid}`)

    try {
      // Get the key first to return it as deleted data
      const key = await getAgent().keyManagerGet({kid})

      if (!key) {
        return Promise.reject(Error(`Key with id ${kid} not found`))
      }

      // Delete the key using Veramo's keyManagerDelete
      const deleted = await getAgent().keyManagerDelete({kid})

      if (!deleted) {
        return Promise.reject(Error(`Failed to delete key ${kid}`))
      }

      console.log(`[KeysDataProvider] Successfully deleted key: ${kid}`)
      return {data: {...key} as unknown as TData}
    } catch (error) {
      console.error(`[KeysDataProvider] Error deleting key:`, error)
      return Promise.reject(Error(`Failed to delete key: ${error}`))
    }
  },
  deleteMany: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({
    resource,
    ids,
  }: DeleteManyParams<TVariables>): Promise<DeleteManyResponse<TData>> => {
    console.log(`[KeysDataProvider] Deleting ${ids.length} keys`)
    const deletedKeys: TData[] = []

    for (const id of ids) {
      const kid = id as string
      try {
        const key = await getAgent().keyManagerGet({kid})
        if (key) {
          const deleted = await getAgent().keyManagerDelete({kid})
          if (deleted) {
            deletedKeys.push({...key} as unknown as TData)
            console.log(`[KeysDataProvider] Deleted key: ${kid}`)
          }
        }
      } catch (error) {
        console.error(`[KeysDataProvider] Error deleting key ${kid}:`, error)
      }
    }

    return {data: deletedKeys}
  },
  getApiUrl: (): string => {
    // TODO CWALL-242 implement
    throw Error('Not implemented')
  },
})
