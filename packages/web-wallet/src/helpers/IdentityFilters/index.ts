import {Identity, Party} from '@sphereon/ssi-sdk.data-store'

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
