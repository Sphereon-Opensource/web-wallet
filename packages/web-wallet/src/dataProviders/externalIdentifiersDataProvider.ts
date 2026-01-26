import {
  BaseRecord,
  CreateParams,
  CreateResponse,
  CrudFilter,
  DataProvider,
  DeleteOneParams,
  DeleteOneResponse,
  GetListParams,
  GetListResponse,
  GetOneParams,
  GetOneResponse,
  LogicalFilter,
  UpdateParams,
  UpdateResponse,
} from '@refinedev/core'
import {getAgent} from '@agent'
import {CredentialRole} from '@sphereon/ssi-types'
import type {Identity, NonPersistedIdentity, Party} from '@sphereon/ssi-sdk.data-store-types'
import {IdentityOrigin, CorrelationIdentifierType} from '@sphereon/ssi-sdk.data-store-types'
import {CreateExternalIdentifierData, ExternalIdentifierItem, UpdateExternalIdentifierData} from '@typings'

/**
 * Helper to extract method from DID string
 */
const extractMethodFromDid = (did: string): string => {
  if (!did.startsWith('did:')) return 'unknown'
  const parts = did.split(':')
  return parts.length >= 2 ? parts[1] : 'unknown'
}

/**
 * Helper to extract method from URL
 */
const extractMethodFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch {
    return 'url'
  }
}

/**
 * Helper to determine if a correlation ID is a DID or URL
 */
const getIdentifierType = (correlationId: string, identifierType?: CorrelationIdentifierType): 'DID' | 'URL' => {
  if (identifierType === CorrelationIdentifierType.DID || correlationId.startsWith('did:')) {
    return 'DID'
  }
  return 'URL'
}

/**
 * Helper to generate a unique identifier for an identity within a party
 * Format: partyId:identityIndex or partyId:correlationId
 */
const generateExternalIdentifierId = (partyId: string, identity: Identity): string => {
  return `${partyId}:${identity.identifier?.correlationId || identity.id || ''}`
}

/**
 * Helper to parse external identifier ID back to components
 */
const parseExternalIdentifierId = (id: string): {partyId: string; correlationId: string} => {
  const colonIndex = id.indexOf(':')
  if (colonIndex === -1) {
    return {partyId: id, correlationId: ''}
  }
  return {
    partyId: id.substring(0, colonIndex),
    correlationId: id.substring(colonIndex + 1),
  }
}

/**
 * Map an Identity from a Party to an ExternalIdentifierItem
 */
const mapIdentityToItem = (identity: Identity, party: Party): ExternalIdentifierItem => {
  const correlationId = identity.identifier?.correlationId || ''
  const type = getIdentifierType(correlationId, identity.identifier?.type as CorrelationIdentifierType | undefined)
  const method = type === 'DID' ? extractMethodFromDid(correlationId) : extractMethodFromUrl(correlationId)
  const origin = identity.origin === IdentityOrigin.INTERNAL ? 'Internal' : 'External'

  return {
    id: generateExternalIdentifierId(party.id, identity),
    type,
    method,
    alias: identity.alias || '',
    value: correlationId,
    origin,
    roles: (identity.roles || []) as CredentialRole[],
    partyId: party.id,
    partyName: party.contact?.displayName || '',
  }
}

/**
 * Helper to check if filter is a LogicalFilter
 */
const isLogicalFilter = (filter: CrudFilter): filter is LogicalFilter => {
  return 'field' in filter
}

/**
 * Find a party by ID from a list of parties
 */
const findPartyById = (parties: Party[], partyId: string): Party | undefined => {
  return parties.find(p => p.id === partyId)
}

/**
 * External Identifiers Data Provider
 *
 * Provides CRUD operations for external identifiers (identities within parties).
 * External identifiers are DID or URL identifiers that belong to external parties (contacts).
 */
export const externalIdentifiersDataProvider = (): DataProvider => ({
  /**
   * Get list of all external identifiers across all parties
   */
  getList: async <TData extends BaseRecord = BaseRecord>({
    pagination,
    filters,
  }: GetListParams): Promise<GetListResponse<TData>> => {
    try {
      const agent = getAgent()
      const parties: Party[] = await agent.cmGetContacts({})

      const items: ExternalIdentifierItem[] = []

      for (const party of parties) {
        const identities = party.identities || []
        for (const identity of identities) {
          // Only include EXTERNAL origin identities
          if (identity.origin === IdentityOrigin.EXTERNAL) {
            items.push(mapIdentityToItem(identity, party))
          }
        }
      }

      // Apply filters if present
      let filteredItems = items
      if (filters && filters.length > 0) {
        for (const filter of filters) {
          if (isLogicalFilter(filter)) {
            if (filter.field === 'origin' && filter.value) {
              filteredItems = filteredItems.filter(item => item.origin === filter.value)
            }
            if (filter.field === 'type' && filter.value) {
              filteredItems = filteredItems.filter(item => item.type === filter.value)
            }
            if (filter.field === 'partyId' && filter.value) {
              filteredItems = filteredItems.filter(item => item.partyId === filter.value)
            }
          }
        }
      }

      // Apply pagination
      const current = pagination?.current || 1
      const pageSize = pagination?.pageSize || filteredItems.length
      const start = (current - 1) * pageSize
      const paginatedItems = filteredItems.slice(start, start + pageSize)

      return {
        data: paginatedItems as unknown as TData[],
        total: filteredItems.length,
      }
    } catch (error) {
      console.error('[ExternalIdentifiersDataProvider] Error fetching list:', error)
      return {data: [], total: 0}
    }
  },

  /**
   * Get a single external identifier by ID
   */
  getOne: async <TData extends BaseRecord = BaseRecord>({
    id,
  }: GetOneParams): Promise<GetOneResponse<TData>> => {
    try {
      const {partyId, correlationId} = parseExternalIdentifierId(id as string)
      const agent = getAgent()
      // Get all parties and find the one we need
      const parties: Party[] = await agent.cmGetContacts({})
      const party = findPartyById(parties, partyId)

      if (!party) {
        throw new Error(`Party with id ${partyId} not found`)
      }

      const identity = party.identities?.find(i => i.identifier?.correlationId === correlationId)

      if (!identity) {
        throw new Error(`Identity with correlationId ${correlationId} not found in party ${partyId}`)
      }

      const item = mapIdentityToItem(identity, party)
      return {data: item as unknown as TData}
    } catch (error) {
      console.error('[ExternalIdentifiersDataProvider] Error fetching one:', error)
      throw error
    }
  },

  /**
   * Create a new external identifier (add identity to a party)
   */
  create: async <TData extends BaseRecord = BaseRecord, TVars = CreateExternalIdentifierData>({
    variables,
  }: CreateParams<TVars>): Promise<CreateResponse<TData>> => {
    try {
      const data = variables as unknown as CreateExternalIdentifierData
      const {value, type, alias, roles, partyId} = data

      if (!partyId) {
        throw new Error('partyId is required when creating an external identifier')
      }

      const agent = getAgent()

      // Create the new identity
      const newIdentity: NonPersistedIdentity = {
        alias: alias || '',
        roles: roles || [],
        origin: IdentityOrigin.EXTERNAL,
        identifier: {
          type: type === 'DID' ? CorrelationIdentifierType.DID : CorrelationIdentifierType.URL,
          correlationId: value,
        },
      }

      // Add identity to party
      await agent.cmAddIdentity({
        contactId: partyId,
        identity: newIdentity,
      })

      // Fetch updated parties to get full data
      const parties: Party[] = await agent.cmGetContacts({})
      const updatedParty = findPartyById(parties, partyId)

      if (!updatedParty) {
        throw new Error('Failed to find party after adding identity')
      }

      const identity = updatedParty.identities?.find(i => i.identifier?.correlationId === value)

      if (!identity) {
        throw new Error('Failed to find newly created identity')
      }

      const item = mapIdentityToItem(identity, updatedParty)
      return {data: item as unknown as TData}
    } catch (error) {
      console.error('[ExternalIdentifiersDataProvider] Error creating:', error)
      throw error
    }
  },

  /**
   * Update an external identifier
   */
  update: async <TData extends BaseRecord = BaseRecord, TVars = UpdateExternalIdentifierData>({
    id,
    variables,
  }: UpdateParams<TVars>): Promise<UpdateResponse<TData>> => {
    try {
      const data = variables as unknown as UpdateExternalIdentifierData
      const {partyId: currentPartyId, correlationId} = parseExternalIdentifierId(id as string)

      const agent = getAgent()

      // Get all parties and find the one we need
      const parties: Party[] = await agent.cmGetContacts({})
      const party = findPartyById(parties, currentPartyId)

      if (!party) {
        throw new Error(`Party with id ${currentPartyId} not found`)
      }

      const identity = party.identities?.find(i => i.identifier?.correlationId === correlationId)

      if (!identity) {
        throw new Error(`Identity not found`)
      }

      // If partyId is changing, we need to move the identity
      if (data.partyId && data.partyId !== currentPartyId) {
        // Remove from current party
        await agent.cmRemoveIdentity({
          identityId: identity.id!,
        })

        // Add to new party
        const newIdentity: NonPersistedIdentity = {
          alias: data.alias ?? identity.alias,
          roles: data.roles ?? identity.roles,
          origin: identity.origin,
          identifier: identity.identifier,
        }

        await agent.cmAddIdentity({
          contactId: data.partyId,
          identity: newIdentity,
        })

        // Fetch updated parties
        const updatedParties: Party[] = await agent.cmGetContacts({})
        const newParty = findPartyById(updatedParties, data.partyId)

        if (!newParty) {
          throw new Error('Failed to find new party after moving identity')
        }

        const movedIdentity = newParty.identities?.find(i => i.identifier?.correlationId === correlationId)

        if (!movedIdentity) {
          throw new Error('Failed to find moved identity')
        }

        const item = mapIdentityToItem(movedIdentity, newParty)
        return {data: item as unknown as TData}
      }

      // Update in place using cmUpdateIdentity
      const updatedIdentity: Identity = {
        ...identity,
        alias: data.alias ?? identity.alias,
        roles: data.roles ?? identity.roles,
      }

      await agent.cmUpdateIdentity({
        identity: updatedIdentity,
      })

      // Fetch updated parties
      const updatedParties: Party[] = await agent.cmGetContacts({})
      const updatedParty = findPartyById(updatedParties, currentPartyId)

      if (!updatedParty) {
        throw new Error('Failed to find party after updating identity')
      }

      const resultIdentity = updatedParty.identities?.find(i => i.identifier?.correlationId === correlationId)

      if (!resultIdentity) {
        throw new Error('Failed to find updated identity')
      }

      const item = mapIdentityToItem(resultIdentity, updatedParty)
      return {data: item as unknown as TData}
    } catch (error) {
      console.error('[ExternalIdentifiersDataProvider] Error updating:', error)
      throw error
    }
  },

  /**
   * Delete an external identifier (remove identity from party)
   */
  deleteOne: async <TData extends BaseRecord = BaseRecord, TVars = {}>({
    id,
  }: DeleteOneParams<TVars>): Promise<DeleteOneResponse<TData>> => {
    try {
      const {partyId, correlationId} = parseExternalIdentifierId(id as string)
      const agent = getAgent()

      // Get all parties and find the one we need
      const parties: Party[] = await agent.cmGetContacts({})
      const party = findPartyById(parties, partyId)

      if (!party) {
        throw new Error(`Party with id ${partyId} not found`)
      }

      const identity = party.identities?.find(i => i.identifier?.correlationId === correlationId)

      if (!identity) {
        throw new Error(`Identity not found`)
      }

      // Store item before deletion for return
      const item = mapIdentityToItem(identity, party)

      // Remove identity from party
      await agent.cmRemoveIdentity({
        identityId: identity.id!,
      })

      return {data: item as unknown as TData}
    } catch (error) {
      console.error('[ExternalIdentifiersDataProvider] Error deleting:', error)
      throw error
    }
  },

  /**
   * Not implemented - use regular create
   */
  createMany: async () => {
    throw new Error('createMany not implemented')
  },

  /**
   * Not implemented - use regular delete
   */
  deleteMany: async () => {
    throw new Error('deleteMany not implemented')
  },

  getApiUrl: (): string => {
    throw new Error('getApiUrl not implemented')
  },
})
