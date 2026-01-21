/**
 * Seed script for Sphereon organization contact
 *
 * This script creates the Sphereon organization contact associated with
 * the did:web:sphereon.ngrok.dev DID for eInvoice testing.
 *
 * Usage: npx tsx src/scripts/seedSphereonContact.ts
 */

import agent from '../agent'
import { v4 as uuidv4 } from 'uuid'
import { CorrelationIdentifierType, PartyOrigin, PartyTypeType, IdentityOrigin, type Party } from '@sphereon/ssi-sdk.data-store-types'
import type { AddContactArgs } from '@sphereon/ssi-sdk.contact-manager'
import { CredentialRole } from '@sphereon/ssi-types'
import { getDefaultDID } from '../utils/did'

const SPHEREON_DID = 'did:web:sphereon.ngrok.dev'

async function seedSphereonContact(): Promise<void> {
  console.log('[Seed] Starting Sphereon contact seeding...')

  try {
    // Get the default DID (should be did:web:sphereon.ngrok.dev)
    const defaultDid = await getDefaultDID().catch(() => undefined)
    console.log(`[Seed] Default DID: ${defaultDid}`)

    // Check if the Sphereon DID exists in the agent
    let sphereonDid = defaultDid
    if (!sphereonDid || !sphereonDid.includes('sphereon.ngrok.dev')) {
      // Try to find the DID directly
      const managedDids = await agent.didManagerFind()
      const sphereonIdentifier = managedDids.find((id: { did: string }) => id.did === SPHEREON_DID)
      if (sphereonIdentifier) {
        sphereonDid = sphereonIdentifier.did
      }
    }

    if (!sphereonDid) {
      console.error('[Seed] ERROR: Sphereon DID not found. Please ensure the DID config exists and agent has started.')
      console.error('[Seed] Expected DID: did:web:sphereon.ngrok.dev')
      process.exit(1)
    }

    console.log(`[Seed] Using Sphereon DID: ${sphereonDid}`)

    // Check if Sphereon contact already exists
    try {
      const existingContacts = await agent.cmGetContacts({})
      const existingSphereon = existingContacts.find(
        (party: Party) => {
          const contact = party.contact as { displayName?: string; legalName?: string }
          return contact?.displayName === 'Sphereon' || contact?.legalName === 'Sphereon B.V.'
        },
      )
      if (existingSphereon) {
        console.log('[Seed] Sphereon contact already exists. Skipping creation.')
        process.exit(0)
      }
    } catch (error) {
      console.log('[Seed] No existing contacts found or error checking, proceeding with creation...')
    }

    // Get or create the organization contact type
    let organizationalContactType
    try {
      const contactTypes = await agent.cmGetContactTypes()
      organizationalContactType = contactTypes.find(
        (ct: { type: string }) => ct.type === PartyTypeType.ORGANIZATION,
      )
    } catch (error) {
      console.log('[Seed] No existing contact types found, creating organization type...')
    }

    if (!organizationalContactType) {
      console.log('[Seed] Creating organization contact type...')
      organizationalContactType = await agent.cmAddContactType({
        name: 'organizations',
        origin: PartyOrigin.INTERNAL,
        type: PartyTypeType.ORGANIZATION,
        tenantId: uuidv4(),
      })
    }

    // Create Sphereon organization contact
    const sphereonContact: AddContactArgs = {
      legalName: 'Sphereon B.V.',
      displayName: 'Sphereon',
      contactType: organizationalContactType,
      uri: 'sphereon.com',
      identities: [
        {
          alias: 'Sphereon eInvoice Wallet',
          origin: IdentityOrigin.INTERNAL,
          roles: [CredentialRole.ISSUER, CredentialRole.HOLDER, CredentialRole.VERIFIER],
          identifier: {
            type: CorrelationIdentifierType.DID,
            correlationId: sphereonDid,
          },
        },
      ],
    }

    console.log('[Seed] Creating Sphereon contact...')
    const party = await agent.cmAddContact(sphereonContact)
    const createdContact = party.contact as { displayName?: string }
    console.log(`[Seed] Created Sphereon contact: ${createdContact?.displayName} (${party.id})`)

    console.log('')
    console.log('[Seed] ============================================')
    console.log('[Seed] Sphereon contact seeding completed!')
    console.log(`[Seed] Contact: ${createdContact?.displayName}`)
    console.log(`[Seed] DID: ${sphereonDid}`)
    console.log('[Seed] ============================================')
    process.exit(0)
  } catch (error) {
    console.error('[Seed] Error:', error)
    process.exit(1)
  }
}

// Run the seed function
seedSphereonContact().catch((error) => {
  console.error('[Seed] Error:', error)
  process.exit(1)
})
