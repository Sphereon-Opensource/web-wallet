import type {Identity, Party} from '@sphereon/ssi-sdk.data-store-types'

export function getMatchingIdentities(parties: Party[], correlationId: string): Array<{identity: Identity; party: Party}> {
  const ids = parties
    .map(party => {
      const identity = party.identities.find(identity => {
        return identity.identifier.correlationId === correlationId
      })
      if (identity) {
        return {identity, party}
      }
      return undefined
    })
    .filter(val => !!val)

  return ids as Array<{identity: Identity; party: Party}>
}

export function getMatchingIdentity(parties: Party[], correlationId: string): {identity: Identity; party: Party} | undefined {
  const result = getMatchingIdentities(parties, correlationId)
  if (result && result.length > 0) {
    return result[0]
  }

  console.log(`No party found for correlation id: ${correlationId}, parties passed in: ${parties?.length ?? 0}`, parties)
  return undefined
}

/**
 * Find a party by checking if any of their identities match the given DID.
 * Checks correlationId and alias fields.
 */
export function getPartyByDid(parties: Party[], did: string): {identity: Identity; party: Party} | undefined {
  if (!did) return undefined

  for (const party of parties) {
    const identity = party.identities.find(identity => {
      // Check correlationId (which should be the DID)
      if (identity.identifier.correlationId === did) return true
      // Also check the alias which might contain the DID
      if (identity.alias === did) return true
      return false
    })
    if (identity) {
      return {identity, party}
    }
  }
  return undefined
}

/**
 * Extract the issuer DID from a verifiable credential
 */
export function extractIssuerDid(credential: any): string | undefined {
  if (!credential) return undefined

  // Standard VC format: issuer can be string or object with id
  if (credential.issuer) {
    if (typeof credential.issuer === 'string') {
      return credential.issuer
    }
    if (typeof credential.issuer === 'object' && credential.issuer.id) {
      return credential.issuer.id
    }
  }

  // SD-JWT format uses 'iss'
  if (credential.iss && typeof credential.iss === 'string') {
    return credential.iss
  }

  return undefined
}
