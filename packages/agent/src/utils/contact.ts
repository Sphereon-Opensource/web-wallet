/**
 * Contact utility functions for ensuring default organization exists.
 */

import { v4 as uuidv4 } from 'uuid'
import {
  CorrelationIdentifierType,
  PartyOrigin,
  PartyTypeType,
  IdentityOrigin,
  type Party,
  type PartyType,
  type NonPersistedIdentity,
} from '@sphereon/ssi-sdk.data-store-types'
import type { AddContactArgs } from '@sphereon/ssi-sdk.contact-manager'
import { CredentialRole } from '@sphereon/ssi-types'

const DEFAULT_ORG_NAME = 'Wallet owner'
const DEFAULT_ORG_DISPLAY_NAME = 'Wallet owner'

/**
 * Ensure a default "Wallet owner" organization exists and is linked to all managed DIDs.
 * This is called at agent startup after DIDs are imported.
 *
 * @param agentInstance - The agent instance with contact manager and DID manager capabilities
 * @param defaultDid - The default DID to prioritize in the organization's identities
 */
export async function ensureDefaultOrganization(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agentInstance: any,
  defaultDid?: string
): Promise<Party | undefined> {
  try {
    // Get or create organization contact type
    let orgContactType: PartyType | undefined
    try {
      const contactTypes = await agentInstance.cmGetContactTypes()
      orgContactType = contactTypes.find((ct: PartyType) => ct.type === PartyTypeType.ORGANIZATION)
    } catch (error) {
      console.log('[Contact] No existing contact types found')
    }

    if (!orgContactType) {
      console.log('[Contact] Creating organization contact type...')
      orgContactType = await agentInstance.cmAddContactType({
        name: 'organizations',
        origin: PartyOrigin.INTERNAL,
        type: PartyTypeType.ORGANIZATION,
        tenantId: uuidv4(),
      })
    }

    // Check if default organization already exists
    let existingOrg: Party | undefined
    try {
      const existingContacts = await agentInstance.cmGetContacts({})
      existingOrg = existingContacts.find((party: Party) => {
        // Check if any identity is linked to our managed DIDs
        if (party.identities && party.identities.length > 0) {
          return party.identities.some(
            (identity) => identity.origin === IdentityOrigin.INTERNAL
          )
        }
        return false
      })
    } catch (error) {
      console.log('[Contact] No existing contacts found')
    }

    if (existingOrg) {
      console.log(`[Contact] Default organization already exists: ${(existingOrg.contact as { displayName?: string })?.displayName}`)
      // TODO: Could update identities here if new DIDs were added
      return existingOrg
    }

    // Get all managed DIDs
    const managedDids = await agentInstance.didManagerFind({})
    if (!managedDids || managedDids.length === 0) {
      console.log('[Contact] No managed DIDs found, skipping default organization creation')
      return undefined
    }

    // Create identities for all managed DIDs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const identities: NonPersistedIdentity[] = managedDids.map((identifier: any) => ({
      alias: identifier.alias || identifier.did,
      origin: IdentityOrigin.INTERNAL,
      roles: [CredentialRole.ISSUER, CredentialRole.HOLDER, CredentialRole.VERIFIER],
      identifier: {
        type: CorrelationIdentifierType.DID,
        correlationId: identifier.did,
      },
    }))

    // Sort identities: did:web (non-localhost) > did:web (localhost) > other DIDs
    // This ensures the most useful DID is first
    identities.sort((a, b) => {
      const didA = a.identifier?.correlationId || ''
      const didB = b.identifier?.correlationId || ''

      const isWebA = didA.startsWith('did:web:')
      const isWebB = didB.startsWith('did:web:')
      const isLocalhostA = didA.includes('localhost')
      const isLocalhostB = didB.includes('localhost')

      // did:web (non-localhost) has highest priority
      if (isWebA && !isLocalhostA && (!isWebB || isLocalhostB)) return -1
      if (isWebB && !isLocalhostB && (!isWebA || isLocalhostA)) return 1

      // did:web (localhost) has second priority
      if (isWebA && isLocalhostA && !isWebB) return -1
      if (isWebB && isLocalhostB && !isWebA) return 1

      // did:web comes before non-did:web
      if (isWebA && !isWebB) return -1
      if (isWebB && !isWebA) return 1

      return 0
    })

    // If a specific default DID is provided and it's a did:web (non-localhost), move it to front
    if (defaultDid && defaultDid.startsWith('did:web:') && !defaultDid.includes('localhost')) {
      const defaultIndex = identities.findIndex(
        (id) => id.identifier?.correlationId === defaultDid
      )
      if (defaultIndex > 0) {
        const [defaultIdentity] = identities.splice(defaultIndex, 1)
        identities.unshift(defaultIdentity)
      }
    }

    // Create the default organization
    // orgContactType is guaranteed to be defined at this point (created above if it didn't exist)
    const orgContact: AddContactArgs = {
      legalName: DEFAULT_ORG_NAME,
      displayName: DEFAULT_ORG_DISPLAY_NAME,
      contactType: orgContactType!,
      uri: 'localhost',
      identities,
    }

    console.log(`[Contact] Creating default organization "${DEFAULT_ORG_DISPLAY_NAME}" with ${identities.length} DID(s)...`)
    const party = await agentInstance.cmAddContact(orgContact)
    console.log(`[Contact] Created default organization: ${(party.contact as { displayName?: string })?.displayName} (${party.id})`)

    return party
  } catch (error) {
    console.error('[Contact] Error ensuring default organization:', error)
    return undefined
  }
}
