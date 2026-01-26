import {getAgent} from '@agent'
import {CredentialRole} from '@sphereon/ssi-types'
import type {Identity, NonPersistedIdentity, Party} from '@sphereon/ssi-sdk.data-store-types'
import {IdentityOrigin, CorrelationIdentifierType} from '@sphereon/ssi-sdk.data-store-types'

/**
 * Helper to find a party by ID
 */
async function getPartyById(partyId: string): Promise<Party | undefined> {
  const agent = getAgent()
  const parties: Party[] = await agent.cmGetContacts({})
  return parties.find(p => p.id === partyId)
}

/**
 * Add an identity (external identifier) to a party
 */
export async function addIdentityToParty(args: {
  partyId: string
  value: string
  type: 'DID' | 'URL'
  alias?: string
  roles?: CredentialRole[]
  origin?: IdentityOrigin
}): Promise<Identity> {
  const {partyId, value, type, alias, roles, origin = IdentityOrigin.EXTERNAL} = args
  const agent = getAgent()

  const newIdentity: NonPersistedIdentity = {
    alias: alias || '',
    roles: roles || [],
    origin,
    identifier: {
      type: type === 'DID' ? CorrelationIdentifierType.DID : CorrelationIdentifierType.URL,
      correlationId: value,
    },
  }

  return agent.cmAddIdentity({
    contactId: partyId,
    identity: newIdentity,
  })
}

/**
 * Update an identity within a party
 */
export async function updateIdentityInParty(args: {
  identityId: string
  alias?: string
  roles?: CredentialRole[]
}): Promise<Identity> {
  const {identityId, alias, roles} = args
  const agent = getAgent()

  // First get the current identity
  const identity = await agent.cmGetIdentity({identityId})

  const updatedIdentity: Identity = {
    ...identity,
    ...(alias !== undefined && {alias}),
    ...(roles !== undefined && {roles}),
  }

  return agent.cmUpdateIdentity({identity: updatedIdentity})
}

/**
 * Remove an identity from a party
 */
export async function removeIdentityFromParty(args: {
  partyId: string
  identityId: string
}): Promise<boolean> {
  const {identityId} = args
  const agent = getAgent()

  return agent.cmRemoveIdentity({
    identityId,
  })
}

/**
 * Move an identity from one party to another
 */
export async function moveIdentityToParty(args: {
  fromPartyId: string
  toPartyId: string
  identityId: string
}): Promise<Identity> {
  const {fromPartyId, toPartyId, identityId} = args
  const agent = getAgent()

  // Get the current identity
  const identity = await agent.cmGetIdentity({identityId})

  // Remove from current party
  await agent.cmRemoveIdentity({
    identityId,
  })

  // Add to new party
  const newIdentity: NonPersistedIdentity = {
    alias: identity.alias,
    roles: identity.roles,
    origin: identity.origin,
    identifier: identity.identifier,
  }

  return agent.cmAddIdentity({
    contactId: toPartyId,
    identity: newIdentity,
  })
}

/**
 * Get all identities for a party
 */
export async function getIdentitiesForParty(partyId: string): Promise<Identity[]> {
  const party = await getPartyById(partyId)
  return party?.identities || []
}

/**
 * Find identity by correlation ID across all parties
 */
export async function findIdentityByCorrelationId(correlationId: string): Promise<{identity: Identity; party: Party} | undefined> {
  const agent = getAgent()
  const parties: Party[] = await agent.cmGetContacts({})

  for (const party of parties) {
    const identity = party.identities?.find(i => i.identifier?.correlationId === correlationId)
    if (identity) {
      return {identity, party}
    }
  }

  return undefined
}

/**
 * Check if an identity with the given correlation ID already exists
 */
export async function identityExists(correlationId: string): Promise<boolean> {
  const result = await findIdentityByCorrelationId(correlationId)
  return result !== undefined
}

/**
 * Validate a DID string format
 */
export function isValidDid(value: string): boolean {
  if (!value) return false
  // Basic DID validation: must start with "did:" followed by method and method-specific-id
  const didRegex = /^did:[a-z0-9]+:.+$/i
  return didRegex.test(value)
}

/**
 * Validate a URL string format
 */
export function isValidUrl(value: string): boolean {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Extract the DID method from a DID string
 */
export function extractDidMethod(did: string): string {
  if (!did.startsWith('did:')) return 'unknown'
  const parts = did.split(':')
  return parts.length >= 2 ? parts[1] : 'unknown'
}
