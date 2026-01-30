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
import {DID_PREFIX} from '@sphereon/ssi-sdk-ext.did-utils'
import {getAgent, getAgentContext, getAgentBaseUrl} from '@agent'
import {IdentifierKey, IdentifierServiceEndpoint, KeyManagementIdentifier, KeyManagementSystem} from '@typings'
import {isEInvoicingServiceType, EINV_SERVICE_TYPE} from '@/src/constants/eInvoicingDefaults'
import { replaceServicesOnDid, saveServiceMetadata, ensureInboxAndFolder } from '@/src/services/identifierServiceManager'
import {IIdentifier} from '@veramo/core'
import type {EbsiAccessTokenOpts, EbsiEnvironment} from '@sphereon/ssi-sdk.ebsi-support'
import {generateEbsiMethodSpecificId} from '@sphereon/ssi-sdk.ebsi-support'
import {CredentialRole} from '@sphereon/ssi-types'
import {getEnv} from '@/src/services/env'

// TODO CWALL-244 further implement

export type CreateVariables = {
  kms?: string
  alias?: string
  method: string
  codecName?: string
  keys?: Array<IdentifierKey>
  services?: Array<IdentifierServiceEndpoint>
  identifier?: KeyManagementIdentifier
}

export type UpdateVariables = {
  alias?: string
  selectedKeyId?: string
  services?: Array<IdentifierServiceEndpoint>
  keys?: Array<IdentifierKey>
}

type IdentifierRecord = BaseRecord & IIdentifier

const asIdentifierData = <T extends BaseRecord>(data: IdentifierRecord): T => (data as unknown as T)

const updateAlias = async (did: string, newAlias: string): Promise<void> => {
  try {
    await getAgent().didManagerSetAlias({did, alias: newAlias})
  } catch (error) {
    console.error('Error updating alias:', error)
    return Promise.reject(Error(`Failed to update alias: ${error}`))
  }
}

const replaceIdentifierKey = async (did: string, currentKeys: any[], newKeyId: string): Promise<void> => {
  try {
    // Remove existing keys from the identifier
    for (const key of currentKeys) {
      console.log(`Removing key ${key.kid}`)
      await getAgent().didManagerRemoveKey({
        did,
        kid: key.kid,
        options: {},
      })
    }

    // Get the new key from the key manager
    const key = await getAgent().keyManagerGet({kid: newKeyId})
    if (!key) {
      return Promise.reject(Error(`Key with kid ${newKeyId} not found in key manager`))
    }

    // Add the selected key to the identifier's DID document
    await getAgent().didManagerAddKey({
      did,
      key,
      options: {},
    })

    // TODO SSISDK-80
    console.warn('TODO: controllerKeyId not updated - selected key will not persist across reloads')
  } catch (error) {
    console.error('Error replacing key:', error)
    return Promise.reject(Error(`Failed to replace key: ${error}`))
  }
}

const updateIdentifierKeys = async (did: string, currentKeys: any[], newKeys: IdentifierKey[]): Promise<void> => {
  try {
    // Get the list of current key kids
    const currentKeyKids = new Set(currentKeys.map(k => k.kid))

    // Get the list of new key kids (only those with kid set, meaning they already exist)
    const newKeyKids = new Set(newKeys.filter(k => k.kid).map(k => k.kid))

    // Keys to remove: in current but not in new
    const keysToRemove = currentKeys.filter(k => !newKeyKids.has(k.kid))

    // Keys to add: in new but not in current (or keys to generate)
    const keysToAdd = newKeys.filter(k => !k.readonly || !currentKeyKids.has(k.kid!))

    // Remove keys that are no longer needed
    for (const key of keysToRemove) {
      console.log(`Removing key ${key.kid}`)
      await getAgent().didManagerRemoveKey({
        did,
        kid: key.kid,
        options: {},
      })
    }

    // Add new keys
    for (const identifierKey of keysToAdd) {
      if (identifierKey.kid) {
        // Existing key - fetch from key manager and add to identifier
        const key = await getAgent().keyManagerGet({kid: identifierKey.kid})
        if (!key) {
          console.warn(`Key with kid ${identifierKey.kid} not found in key manager, skipping`)
          continue
        }

        console.log(`Adding existing key ${identifierKey.kid} to identifier`)
        await getAgent().didManagerAddKey({
          did,
          key,
          options: {},
        })
      } else {
        // New key to generate
        console.log(`Generating and adding new key of type ${identifierKey.type}`)

        // Create the key first
        const newKey = await getAgent().keyManagerCreate({
          kms: 'local',
          type: identifierKey.type,
          meta: {
            purposes: identifierKey.purposes,
            alias: identifierKey.alias,
          },
        })

        // Then add it to the identifier
        await getAgent().didManagerAddKey({
          did,
          key: newKey,
          options: {},
        })
      }
    }

    console.log(`Updated keys for identifier ${did}`)
  } catch (error) {
    console.error('Error updating identifier keys:', error)
    return Promise.reject(Error(`Failed to update identifier keys: ${error}`))
  }
}

/**
 * Replace all services on a DID.
 * Delegates to the unified identifierServiceManager for consistent behavior.
 */
const replaceServices = async (did: string, currentServices: any[], newServices: IdentifierServiceEndpoint[]): Promise<void> => {
  const success = await replaceServicesOnDid(did, currentServices, newServices)
  if (!success) {
    throw new Error('Failed to replace services')
  }
}

export const identifiersDataProvider = (): DataProvider => ({
  getList: async <TData extends BaseRecord = BaseRecord>({
                                                           resource,
                                                           pagination,
                                                           filters,
                                                         }: GetListParams): Promise<GetListResponse<TData>> => {
    const identities: IIdentifier[] = await getAgent().didManagerFind()
    const data: TData[] = identities.map(identity => ({...(identity as any)}))
    return {
      data,
      total: data.length,
    }
  },
  getOne: async <TData extends BaseRecord = BaseRecord>({
                                                          resource,
                                                          id,
                                                        }: GetOneParams): Promise<GetOneResponse<TData>> => {
    const identities: IIdentifier[] = await getAgent().didManagerFind()
    const identity = identities.find(i => i.did === id)

    if (!identity) {
      return Promise.reject(Error(`Identifier with id ${id} not found`))
    }

    // Enrich services with metadata (including eInvoice data and eInvoiceMethod)
    const enrichedServices = await Promise.all(
      (identity.services || []).map(async (service) => {
        try {
          const metadata = await getAgent().getServiceMetadata({
            serviceId: service.id,
            did: identity.did,
          })
          if (metadata) {
            const enriched: Record<string, unknown> = {...service}
            // Store internal metadata for later use
            if (metadata.eInvoice) {
              enriched._internal = metadata.eInvoice
              // Also set the eInvoice array for display
              enriched.eInvoice = Array.isArray(metadata.eInvoice) ? metadata.eInvoice : [metadata.eInvoice]
            }
            // Restore eInvoiceMethod from metadata
            if (metadata.eInvoiceMethod) {
              enriched.eInvoiceMethod = metadata.eInvoiceMethod
            }
            return enriched
          }
        } catch (error) {
          console.warn(`Failed to get metadata for service ${service.id}:`, error)
        }
        return service
      })
    )

    const enrichedIdentity = {...identity, services: enrichedServices as any}
    const result: IdentifierRecord = {...enrichedIdentity, id: enrichedIdentity.did}
    return {data: asIdentifierData<TData>(result)}
  },

  // @ts-ignore
  create: async <TData extends BaseRecord & IIdentifier, TVars extends CreateVariables>({
                                                                                          resource,
                                                                                          variables,
                                                                                          meta,
                                                                                        }: CreateParams<TVars>): Promise<CreateResponse<TData>> => {
    const {keys = [], method, identifier: kmIdentifier} = variables
    let {kms = KeyManagementSystem.LOCAL} = variables
    const clientId = getEnv('BROWSER_PUBLIC_CLIENT_ID') ?? `${window.location.protocol}//${window.location.hostname}`
    const network = kmIdentifier?.network
    const ebsi = kmIdentifier?.ebsi
    let alias = variables.alias

    const options: Record<string, any> = {
      ...(keys.length === 1 && {type: keys[0].type}),
      ...(variables.codecName && {codecName: variables.codecName}),
      ...(variables.services && {services: variables?.services}),
    }

    let ebsiAccessTokenOpts: EbsiAccessTokenOpts | undefined
    let ebsiLedgerOperation = ebsi?.executeLedgerOperation ?? ebsi?.tao?.url === 'https://api-conformance.ebsi.eu/conformance/v3/issuer-mock'
    if (method === 'web') {
      if (!variables?.identifier?.web?.hostName) {
        return Promise.reject(Error(`Expected web options to be set when creating a DID:web`))
      }
      let path = variables.identifier.web.path
      options['hostName'] = variables.identifier.web.hostName
      options['path'] = path
      alias = variables.identifier.web.hostName.replace('http://', '').replace('https://', '')
      if (path && !path.endsWith('./well-known') && !path.endsWith('./well-known/')) {
        if (!path.startsWith('/')) {
          path = `/${path}`
        }
        if (path.endsWith('/did.json')) {
          path = path.substring(0, path.length - 10)
        }
        const suffix = path.replace(/\//g, ':').replace(/%2F/g, ':')
        alias += suffix
        console.log(`DID Web: ${alias}, path: ${path}`)
      }

      // Process keys - fetch existing ones or prepare for generation
      options['keys'] = await Promise.all(
        keys.map(async (idKey: IdentifierKey) => {
          // If the key has a kid, fetch it from the key manager
          if (idKey.kid) {
            const existingKey = await getAgent().keyManagerGet({kid: idKey.kid})
            kms = existingKey.kms
            return {
              key: {
                ...existingKey,
                meta: {
                  ...existingKey.meta,
                  purposes: idKey.purposes,
                },
              },
              type: existingKey.type,
            }

          }
          // Otherwise, prepare for key generation
          return {
            key: {
              type: idKey.type,
              meta: {purposes: idKey.purposes},
            },
            type: idKey.type,
          }
        }),
      )
    } else if (method === 'ebsi') {
      const ebsiKeys = keys.filter(key => key.readonly)
      const methodSpecificId = generateEbsiMethodSpecificId()
      options['methodSpecificId'] = methodSpecificId
      const jwksUri = `${clientId}/.well-known/jwks/dids/did:ebsi:${methodSpecificId}`
      const secp2561k1Key = ebsiKeys.find(key => key.type === 'Secp256k1')!
      options['secp256k1Key'] = {
        type: secp2561k1Key.type,
        purposes: secp2561k1Key.purposes,
        kid: secp2561k1Key.alias,
        kms,
      }
      const secp2561r1Key = ebsiKeys.find(key => key.type === 'Secp256r1')!
      options['secp256r1Key'] = {
        type: secp2561r1Key.type,
        purposes: secp2561r1Key.purposes,
        kid: secp2561r1Key.alias,
        kms,
      }
      const additionalKeys = keys.filter(key => !key.readonly && key !== secp2561r1Key && key !== secp2561k1Key)
      if (additionalKeys.length > 0) {
        options['keys'] = additionalKeys.map(key => {
          return {
            type: key.type,
            kid: key.alias ?? '',
            purposes: key.purposes,
            kms,
          }
        })
      }

      // We can only do this for the mock for now
      options['executeLedgerOperation'] = false
      ebsiAccessTokenOpts = {
        redirectUri: jwksUri,
        clientId,
        credentialIssuer: ebsi?.tao?.url!,
        jwksUri,
        environment: network as EbsiEnvironment, //FIXME this is casting a possible undefined where environment is mandatory
        attestationToOnboardCredentialRole: CredentialRole.HOLDER,
      }
    }

    const identifier = await getAgent().didManagerCreate({
      kms,
      alias,
      provider: `${DID_PREFIX}${method}`,
      options,
    })

    if (method === 'ebsi' && ebsiLedgerOperation && ebsiAccessTokenOpts) {
      console.log(`EBSI Ledger operation`)

      await getAgent().ebsiCreateDidOnLedger(
        {
          identifier,
          accessTokenOpts: ebsiAccessTokenOpts,
        },
        // @ts-ignore
        getAgentContext(),
      )
    }

    // Update metadata for services with eInvoice data/eInvoiceMethod and ensure inbox/folder exist
    // Veramo's didManagerCreate doesn't persist custom metadata, so we need to update it separately
    // Uses unified identifierServiceManager for consistent behavior
    if (variables.services) {
      for (const service of variables.services) {
        // Save metadata (eInvoice and eInvoiceMethod)
        await saveServiceMetadata(identifier.did, service.id, service)

        // For eInvoicing services, ensure the inbox and folder exist
        if (isEInvoicingServiceType(service.type)) {
          await ensureInboxAndFolder(identifier.did, service)
        }
      }
    }

    return {
      // FIXME CWALL-244 there should be a better way for this but i could not find any yet without refine.dev not complaining
      data: {...identifier, id: identifier.did} as TData,
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
    const updateVars = variables as UpdateVariables
    const identities: IIdentifier[] = await getAgent().didManagerFind()
    const identifier = identities.find(i => i.did === id)

    if (!identifier) {
      return Promise.reject(Error(`Identifier with id ${id} not found`))
    }

    // Only support updating did:web for now
    if (!identifier.did.startsWith('did:web')) {
      return Promise.reject(Error(`Only did:web identifiers can be updated`))
    }

    try {
      // Update alias if provided
      if (updateVars.alias && updateVars.alias !== identifier.alias) {
        await updateAlias(identifier.did, updateVars.alias)
      }

      // Update keys if provided
      if (updateVars.keys) {
        await updateIdentifierKeys(identifier.did, identifier.keys, updateVars.keys)
      } else if (updateVars.selectedKeyId) {
        // Legacy single key replacement
        await replaceIdentifierKey(identifier.did, identifier.keys, updateVars.selectedKeyId)
      }

      // Update services if provided
      if (updateVars.services) {
        await replaceServices(identifier.did, identifier.services || [], updateVars.services)
      }

      const updatedIdentifier = await getAgent().didManagerGet({did: identifier.did})

      // Update the controllerKeyId to match the selected key (legacy)
      if (updateVars.selectedKeyId && updatedIdentifier.keys.length > 0) {
        updatedIdentifier.controllerKeyId = updateVars.selectedKeyId
      }

      const result: IdentifierRecord = {...updatedIdentifier, id: updatedIdentifier.did}
      return {data: asIdentifierData<TData>(result)}
    } catch (error) {
      return Promise.reject(Error(`Failed to update identifier: ${error}`))
    }
  },
  deleteOne: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({
                                                                              resource,
                                                                              id,
                                                                            }: DeleteOneParams<TVariables>): Promise<DeleteOneResponse<TData>> => {
    const did = id as string
    console.log(`[IdentifiersDataProvider] Deleting identifier: ${did}`)

    try {
      // Get the identifier first to return it as deleted data
      const identities: IIdentifier[] = await getAgent().didManagerFind()
      const identifier = identities.find(i => i.did === did)

      if (!identifier) {
        return Promise.reject(Error(`Identifier with id ${did} not found`))
      }

      // Delete the identifier using Veramo's didManagerDelete
      const deleted = await getAgent().didManagerDelete({did})

      if (!deleted) {
        return Promise.reject(Error(`Failed to delete identifier ${did}`))
      }

      console.log(`[IdentifiersDataProvider] Successfully deleted identifier: ${did}`)

      const result: IdentifierRecord = {...identifier, id: identifier.did}
      return {data: asIdentifierData<TData>(result)}
    } catch (error) {
      console.error(`[IdentifiersDataProvider] Error deleting identifier:`, error)
      return Promise.reject(Error(`Failed to delete identifier: ${error}`))
    }
  },
  deleteMany: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({
                                                                               resource,
                                                                               ids,
                                                                             }: DeleteManyParams<TVariables>): Promise<DeleteManyResponse<TData>> => {
    console.log(`[IdentifiersDataProvider] Deleting ${ids.length} identifiers`)
    const deletedIdentifiers: TData[] = []

    for (const id of ids) {
      const did = id as string
      try {
        const identities: IIdentifier[] = await getAgent().didManagerFind()
        const identifier = identities.find(i => i.did === did)

        if (identifier) {
          const deleted = await getAgent().didManagerDelete({did})
          if (deleted) {
            deletedIdentifiers.push({...identifier, id: identifier.did} as unknown as TData)
            console.log(`[IdentifiersDataProvider] Deleted identifier: ${did}`)
          }
        }
      } catch (error) {
        console.error(`[IdentifiersDataProvider] Error deleting identifier ${did}:`, error)
      }
    }

    return {data: deletedIdentifiers}
  },
  getApiUrl: (): string => {
    // TODO CWALL-244 implement
    throw Error('Not implemented')
  },
})
