import {Identity, Party} from '@sphereon/ssi-sdk.data-store'

export function getMatchingIdentities(parties: Party[], did: string): Array<{identity: Identity; party: Party}> {
  if (!did.startsWith('did:')) {
    throw new Error(
      `DID has an invalid format, it does not start with did:. The supplied DID value is: ${did.length > 16 ? did.substring(0, 16) : did}...`,
    )
  }
  const checkDid = did.replaceAll('\n', '')
  const ids = parties
    .map(party => {
      const identity = party.identities.find(identity => identity.identifier.correlationId === checkDid)
      if (identity) {
        return {identity, party}
      }
      return undefined
    })
    .filter(val => !!val)
  return ids as Array<{identity: Identity; party: Party}>
}

export function getMatchingIdentity(parties: Party[], did: string): {identity: Identity; party: Party} | undefined {
  const result = getMatchingIdentities(parties, did)
  if (result && result.length > 0) {
    return result[0]
  }
  console.log(`No party found for did: ${did}, parties passed in: ${parties?.length ?? 0}`,parties)
  return undefined
}
