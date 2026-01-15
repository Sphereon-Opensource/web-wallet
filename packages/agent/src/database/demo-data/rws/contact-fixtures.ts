import type { NonPersistedIdentity } from '@sphereon/ssi-sdk.data-store-types'
import { CorrelationIdentifierType, PartyOrigin, PartyTypeType, IdentityOrigin } from '@sphereon/ssi-sdk.data-store-types'
import { IIdentifier } from '@veramo/core'
import agent from '../../../agent'
import { v4 } from 'uuid'
import { AddContactArgs } from '@sphereon/ssi-sdk.contact-manager'
// import { IonPublicKeyPurpose } from '@decentralized-identity/ion-sdk'
import { VC_API_BASE_PATH } from '../../../environment-vars'
import { DIDMethods } from '../../../types'
import { IKeyOpts } from '@sphereon/ssi-sdk-ext.did-provider-web'
import { TKeyType } from '@sphereon/ssi-sdk-ext.key-utils'
import { CredentialRole } from '@sphereon/ssi-types'

const PRIVATE_RECOVERY_KEY_HEX = 'd39e66e720c00b244923eb861122ed25116555ae771ee9a57b749640173d7cf8'
const PRIVATE_UPDATE_KEY_HEX = '0121009becfa9caf6221dce6f4f7b55dd3376e79c4ca83ce92bd43861c2393ec'
const PRIVATE_DID1_KEY_HEX = 'e0453c226bd4458740c45f0d0590e696da2fe9c5c66f81908aedd43a7b7da252'
const PRIVATE_DID2_KEY_HEX = '74213f5204ea414deb4dc2c470d1700b8cc2076ddd8d3ddb06dae08902dddd0c'
const PRIVATE_DID3_KEY_HEX = '90868704b3bb2bdd27e2e831654c4adb2ea7e4f0e090d03aa3ae38020346aa12'
const PRIVATE_DID4_KEY_HEX = 'f367873323bf0dd701ec972d8a17aee7a9dcad13bd6deb64e8653da113094261'
const PRIVATE_DID5_KEY_HEX = 'a167873323bf1ed701ec972d8a17aee7aaecad13bd6deb64e8653da113094256'
const PRIVATE_DID6_KEY_HEX = 'a167873323bf0dd701ec972d8a17aee7aaecad13bd6deb64e8653da113094256'
const PRIVATE_DID7_KEY_HEX = 'b267873323bf0dd701ec972d8a17aee7aaecad13bd6deb64e8653da113094257'
const SPHEREON_DID = 'did:web:sphereon.ngrok.dev'
const SPHEREON_HOSTNAME = 'sphereon.ngrok.dev'
const SPHEREON_INBOX_NAME = 'invoices'
const toContactIdentityDTO = (contact: Record<string, any>, identifier: IIdentifier): NonPersistedIdentity => {
  console.log(`Contact received did ${identifier.did}, contact: ${JSON.stringify(contact)}`, identifier.did)
  return {
    alias: identifier.alias ?? contact.displayName,
    origin: IdentityOrigin.INTERNAL,
    roles: [CredentialRole.ISSUER],
    identifier: {
      type: CorrelationIdentifierType.DID,
      correlationId: identifier.did,
    },
  } as NonPersistedIdentity
}

export async function addContactsRWS() {
  try {
    // Get or create contact types (idempotent)
    let personContactType
    let organizationalContactType

    const existingTypes = await agent.cmGetContactTypes()
    personContactType = existingTypes.find((ct: { type: string }) => ct.type === PartyTypeType.NATURAL_PERSON)
    organizationalContactType = existingTypes.find((ct: { type: string }) => ct.type === PartyTypeType.ORGANIZATION)

    if (!personContactType) {
      personContactType = await agent.cmAddContactType({
        name: 'people',
        origin: PartyOrigin.INTERNAL,
        type: PartyTypeType.NATURAL_PERSON,
        tenantId: v4(),
      })
    }

    if (!organizationalContactType) {
      organizationalContactType = await agent.cmAddContactType({
        name: 'organizations',
        origin: PartyOrigin.INTERNAL,
        type: PartyTypeType.ORGANIZATION,
        tenantId: v4(),
      })
    }

    const persona1 = {
      firstName: 'Wendy',
      middleName: 'van',
      lastName: 'RWS',
      displayName: 'Wendy van RWS',
      contactType: personContactType,
      uri: 'rijkswaterstaat.nl',
    } as AddContactArgs

    let identifier = await agent.didManagerCreate(
      existingDidConfig(DIDMethods.DID_JWK, 'w-auth', PRIVATE_DID1_KEY_HEX, {
        type: 'Secp256r1',
      }),
    )
    persona1.identities = [toContactIdentityDTO(persona1, identifier)]
    await agent.cmAddContact(persona1)
    // did:jwk:eyJhbGciOiJFUzI1NiIsInVzZSI6InNpZyIsImt0eSI6IkVDIiwiY3J2IjoiUC0yNTYiLCJ4IjoiSjJLUEFIQjllbUZWTk5PQ1NER2V2ZFM2cXlrUHNBLVVOM0ZfRGd5aUZrSSIsInkiOiIzSXcxZlZKakFCOS1WbjJXdklaa0s0NnNhQTZuYmh6QTBrVDZNdWV5ekNrIn0
    // did:ion:EiDktcw2GgLHQe3WehFFKciKS6rjYNEmKFIs-4_knT-Lpg:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJ3ZW5keSIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiI4N3U3NlRMVFhUT09paEo3RFZoYUloUUlmWkN4WjRja1pkNHNxaEw2OVVjIiwieSI6InlMMEFmUTdaNXBhQk9rTGh2X1h6M0QyY0oxaWdSNkVfZFViT2tSRmtZWDgifSwicHVycG9zZXMiOlsiYXV0aGVudGljYXRpb24iLCJhc3NlcnRpb25NZXRob2QiXSwidHlwZSI6IkVjZHNhU2VjcDI1NmsxVmVyaWZpY2F0aW9uS2V5MjAxOSJ9XX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRElPNlE4M1p2MkFJR09Yb2dRbHVYbEpwNTc2WVNBOWc0dVF1MzVDRVc0Y3cifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUF1eEU4RGhndmhRbzlpZG5hODgycExpY0JQZzlNYTZIS25ENWJKZWJ5ZllBIiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlDNVQ5aTVNSjVzRm9FaDg4cTdKa09qWUNQMXBEODR5ODBNSzRCZUJmeGJKZyJ9fQ

    const persona2 = {
      firstName: 'Hanne',
      middleName: 'van',
      lastName: 'Stonebase',
      displayName: 'Hanne van Stonebase',
      contactType: personContactType,
      uri: 'stonebase.nl',
    } as AddContactArgs

    identifier = await agent.didManagerCreate(
      existingDidConfig(DIDMethods.DID_JWK, 'h-auth', PRIVATE_DID2_KEY_HEX, {
        type: 'Secp256r1',
      }),
    )
    persona2.identities = [toContactIdentityDTO(persona2, identifier)]
    await agent.cmAddContact(persona2)
    // did:jwk:eyJhbGciOiJFUzI1NiIsInVzZSI6InNpZyIsImt0eSI6IkVDIiwiY3J2IjoiUC0yNTYiLCJ4IjoiVWtmNDNDRWJoUmVnc1hKOTZvQU0wQ2R2WnowNUt0QWtIVUVDQWt5WlBkQSIsInkiOiI1cEkwQ0pscVhKY1BxeWtLMENKVkwzNm8xMWFqamVkamQ3c0dIWVIyVHVJIn0
    // did:ion:EiAPtRGoWDBTgilTE3PhmSy0C7IxiL1-16hzv-il_l4dCQ:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJoYW5uZSIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiJKaUdNcXU3VFlUdUlOTzYyV0VzQjczeTA2eFlZQkJ0clN1d0RjM3k2dFowIiwieSI6Im0tZ2xJTXhEN0Q5Z1Zvc2Q3YjdMVmNMRUxWdFVUVDZWbGN2T3cyQUx6NVkifSwicHVycG9zZXMiOlsiYXV0aGVudGljYXRpb24iLCJhc3NlcnRpb25NZXRob2QiXSwidHlwZSI6IkVjZHNhU2VjcDI1NmsxVmVyaWZpY2F0aW9uS2V5MjAxOSJ9XX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRElPNlE4M1p2MkFJR09Yb2dRbHVYbEpwNTc2WVNBOWc0dVF1MzVDRVc0Y3cifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaURpWjNGRmFkUTZTQWJLUDAwZFMza05LMWRoaV9OZTNncWNoNkRFdmZvcXFnIiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlDNVQ5aTVNSjVzRm9FaDg4cTdKa09qWUNQMXBEODR5ODBNSzRCZUJmeGJKZyJ9fQ

    const persona3 = {
      firstName: 'Kees',
      middleName: 'van',
      lastName: 'SGS',
      displayName: 'Kees van SGS',
      contactType: personContactType,
      uri: 'sgs.com',
    } as AddContactArgs

    identifier = await agent.didManagerCreate(
      existingDidConfig(DIDMethods.DID_JWK, 'k-auth', PRIVATE_DID3_KEY_HEX, {
        type: 'Secp256r1',
      }),
    )
    persona3.identities = [toContactIdentityDTO(persona3, identifier)]
    await agent.cmAddContact(persona3)
    //did:jwk:eyJhbGciOiJFUzI1NiIsInVzZSI6InNpZyIsImt0eSI6IkVDIiwiY3J2IjoiUC0yNTYiLCJ4Ijoib1ZCaWxPcERuMTRCLVhKV0FhSzRpZzN0aURiZkM0ZW9waTZLRFgxUXVhdyIsInkiOiI0TzY5UHV1cmRJV0dyRDRmMVZIM2lUR3BZU09LUjJhQTBlMFAyYkxRbEVNIn0
    // did:ion:EiBVz8Hb_8C3BGtUcFa73jbEnSANCGJvQqGNGaTjAmD4PA:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJrZWVzIiwicHVibGljS2V5SndrIjp7ImNydiI6InNlY3AyNTZrMSIsImt0eSI6IkVDIiwieCI6IjRqMzhYUEpRWnExWW0zTkV3ZHJSZFVzY3lUdEhkM25rbEJpN1E3NkxtZTgiLCJ5IjoieU1RYkJ5dTE1d1BrWlpTTWl1R2o5VjJWbDdCeUtnM2Rab3dlVE9CcURXQSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiRWNkc2FTZWNwMjU2azFWZXJpZmljYXRpb25LZXkyMDE5In1dfX1dLCJ1cGRhdGVDb21taXRtZW50IjoiRWlESU82UTgzWnYyQUlHT1hvZ1FsdVhsSnA1NzZZU0E5ZzR1UXUzNUNFVzRjdyJ9LCJzdWZmaXhEYXRhIjp7ImRlbHRhSGFzaCI6IkVpRDhFTElBSkJaMDAwMkh6OHUwWVZhWURBbkhkN2d3NTU3M0lmeW1jQnY1ZVEiLCJyZWNvdmVyeUNvbW1pdG1lbnQiOiJFaUM1VDlpNU1KNXNGb0VoODhxN0prT2pZQ1AxcEQ4NHk4ME1LNEJlQmZ4YkpnIn19

    const organization1 = {
      legalName: 'Example org',
      displayName: 'Example org',
      contactType: organizationalContactType,
      uri: 'sphereon.com',
    } as AddContactArgs

    identifier = await agent.didManagerCreate(
      existingDidConfig(DIDMethods.DID_JWK, 'sphereon-auth', PRIVATE_DID4_KEY_HEX, {
        traceability: false,
        alias: 'sphereon-auth',
        type: 'Secp256r1',
      }),
    )
    console.log(JSON.stringify(identifier, null, 2))
    organization1.identities = [toContactIdentityDTO(organization1, identifier)]
    await agent.cmAddContact(organization1)
    // did:jwk:eyJhbGciOiJFUzI1NiIsInVzZSI6InNpZyIsImt0eSI6IkVDIiwiY3J2IjoiUC0yNTYiLCJ4IjoiWjY3eEc3UFZUUHBDdlp3UjVlR2pteHhqQjdlb2M1cWdYbm9LMloxR2R6YyIsInkiOiJ1ZkpCc3BlNTV5WkZXVWN1T21GRUMtX3NEVE1nVXRndF8tbmV2WHd4UVdZIn0
    // did:ion:EiCgT4nciFugDoVYcImyRBKAoDhTQXF3iHMyF6oS1cMqiA:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJyd3MiLCJwdWJsaWNLZXlKd2siOnsiY3J2Ijoic2VjcDI1NmsxIiwia3R5IjoiRUMiLCJ4IjoiWm5HbFAwT3F3QU9XTF9IZUlJSTZtczlLbkxCQXV2WnJtRjFPTzhnMkhBNCIsInkiOiJsd2Y4QXpmZ1lGXzU5RWRFYnhvQ1pOTXdTaVFRQ1NvY1hFQ0RtbmRfclhzIn0sInB1cnBvc2VzIjpbImF1dGhlbnRpY2F0aW9uIiwiYXNzZXJ0aW9uTWV0aG9kIl0sInR5cGUiOiJFY2RzYVNlY3AyNTZrMVZlcmlmaWNhdGlvbktleTIwMTkifV19fV0sInVwZGF0ZUNvbW1pdG1lbnQiOiJFaURJTzZRODNadjJBSUdPWG9nUWx1WGxKcDU3NllTQTlnNHVRdTM1Q0VXNGN3In0sInN1ZmZpeERhdGEiOnsiZGVsdGFIYXNoIjoiRWlDVjNUMkpuYTdMaVk4MVU2d2RhX1ZPX1VwcTU3eEtqeVh6R2JrME1xYTdUZyIsInJlY292ZXJ5Q29tbWl0bWVudCI6IkVpQzVUOWk1TUo1c0ZvRWg4OHE3SmtPallDUDFwRDg0eTgwTUs0QmVCZnhiSmcifX0

    const organization2 = {
      legalName: 'Stone Base B.V.',
      displayName: 'Stone Base',
      contactType: organizationalContactType,
      uri: 'stonebase.nl',
    } as AddContactArgs

    identifier = await agent.didManagerCreate(
      existingDidConfig(DIDMethods.DID_WEB, 'stonebase-auth', PRIVATE_DID5_KEY_HEX, {
        traceability: true,
        alias: 'did:web:localhost:stonebase',
        type: 'Secp256r1',
      }),
    )
    organization2.identities = [toContactIdentityDTO(organization2, identifier)]
    await agent.cmAddContact(organization2)
    // did:ion:EiAj_YiR0IaPqvA0fYVolNMArSROZTnypAxNvBwQlH53lg:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJzdG9uZWJhc2UiLCJwdWJsaWNLZXlKd2siOnsiY3J2Ijoic2VjcDI1NmsxIiwia3R5IjoiRUMiLCJ4IjoiQTAzV0RublU5N0syTWhzcy1zSno5TGl3d0RWdDRnRHp6N2lqbkwwLUtEayIsInkiOiJidzZFYjFZeHRvdThXay1BTzNlUVR6OEp3R25uYnFTR2tjcl94aTBRZVZjIn0sInB1cnBvc2VzIjpbImF1dGhlbnRpY2F0aW9uIiwiYXNzZXJ0aW9uTWV0aG9kIl0sInR5cGUiOiJFY2RzYVNlY3AyNTZrMVZlcmlmaWNhdGlvbktleTIwMTkifV19fV0sInVwZGF0ZUNvbW1pdG1lbnQiOiJFaURJTzZRODNadjJBSUdPWG9nUWx1WGxKcDU3NllTQTlnNHVRdTM1Q0VXNGN3In0sInN1ZmZpeERhdGEiOnsiZGVsdGFIYXNoIjoiRWlEaFF0N2ltc0VzeGs4WEJLSWoyc1RmcjJOMV9FallrYVRMWFlZNVBSS0hpdyIsInJlY292ZXJ5Q29tbWl0bWVudCI6IkVpQzVUOWk1TUo1c0ZvRWg4OHE3SmtPallDUDFwRDg0eTgwTUs0QmVCZnhiSmcifX0

    const organization3 = {
      legalName: 'SGS S.A.',
      displayName: 'SGS',
      contactType: organizationalContactType,
      uri: 'sgs.com',
    } as AddContactArgs

    identifier = await agent.didManagerCreate(
      existingDidConfig(DIDMethods.DID_WEB, 'sgs-auth', PRIVATE_DID6_KEY_HEX, {
        traceability: true,
        alias: 'did:web:localhost:sgs',
        type: 'Secp256r1',
      }),
    )
    organization3.identities = [toContactIdentityDTO(organization3, identifier)]
    await agent.cmAddContact(organization3)
    // did:ion:EiDobUdzuIh5U8UDtbe6y-Zx1LpiO_AsqlsT-gMZa6vCvA:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJzZ3MiLCJwdWJsaWNLZXlKd2siOnsiY3J2Ijoic2VjcDI1NmsxIiwia3R5IjoiRUMiLCJ4IjoiamNhbm1FcC1HbU9QN1F6RjFkdlJ2YTkwSmRQQlFqTDNmQ1h5eWNmU3RyRSIsInkiOiJfV0FpMlplMWI4SFBLT1Zza2x1bWl3SE9wNW9MZnV1SzY1VmNieE5IejJvIn0sInB1cnBvc2VzIjpbImF1dGhlbnRpY2F0aW9uIiwiYXNzZXJ0aW9uTWV0aG9kIl0sInR5cGUiOiJFY2RzYVNlY3AyNTZrMVZlcmlmaWNhdGlvbktleTIwMTkifV19fV0sInVwZGF0ZUNvbW1pdG1lbnQiOiJFaURJTzZRODNadjJBSUdPWG9nUWx1WGxKcDU3NllTQTlnNHVRdTM1Q0VXNGN3In0sInN1ZmZpeERhdGEiOnsiZGVsdGFIYXNoIjoiRWlEQWgzN2dhOWMwaGFlVXd6R2tWam03aFJXSF82T19mdFJwWloyRnpmWHJJQSIsInJlY292ZXJ5Q29tbWl0bWVudCI6IkVpQzVUOWk1TUo1c0ZvRWg4OHE3SmtPallDUDFwRDg0eTgwTUs0QmVCZnhiSmcifX0

    // Organization with eInvoicing service endpoints for testing eInvoice wizard
    const organization4 = {
      legalName: 'Acme Corporation B.V.',
      displayName: 'Acme Corp',
      contactType: organizationalContactType,
      uri: 'acme-corp.nl',
    } as AddContactArgs

    identifier = await agent.didManagerCreate(
      existingDidConfigWithEInvoice(DIDMethods.DID_WEB, 'acme-auth', PRIVATE_DID7_KEY_HEX, {
        alias: 'did:web:localhost:acme',
        type: 'Secp256r1',
      }),
    )
    organization4.identities = [toContactIdentityDTO(organization4, identifier)]
    await agent.cmAddContact(organization4)
    console.log('[Demo] Added eInvoice-capable contact: Acme Corporation B.V.')

  } catch (e) {
    console.log(e)
  }

  // Sphereon organization - uses the DID loaded from config file
  // Add eInvoice services to the existing DID and create contact
  // This runs independently of other contacts so it succeeds even if others fail
  try {
    const existingTypes = await agent.cmGetContactTypes()
    const organizationalContactType = existingTypes.find((ct: { type: string }) => ct.type === PartyTypeType.ORGANIZATION)
    if (organizationalContactType) {
      await addSphereonOrganization(organizationalContactType)
    } else {
      console.log('[Demo] No organization contact type found. Cannot create Sphereon contact.')
    }
  } catch (e) {
    console.log('[Demo] Error in Sphereon organization creation:', e)
  }
}

/**
 * Add Sphereon organization with eInvoice service endpoints
 * Uses the DID that was loaded from config file (did:web:sphereon.ngrok.dev)
 */
async function addSphereonOrganization(organizationalContactType: any) {
  try {
    // Check if the Sphereon DID exists (should be loaded from config)
    let sphereonIdentifier
    try {
      sphereonIdentifier = await agent.didManagerGet({ did: SPHEREON_DID })
    } catch (e) {
      console.log(`[Demo] Sphereon DID ${SPHEREON_DID} not found. Skipping Sphereon contact creation.`)
      console.log('[Demo] To create this DID, ensure the config file exists in conf/dids/')
      return
    }

    if (!sphereonIdentifier) {
      console.log('[Demo] Sphereon DID not available. Skipping contact creation.')
      return
    }

    console.log(`[Demo] Found Sphereon DID: ${sphereonIdentifier.did}`)

    // Always ensure inbox exists (idempotent) - needed for eInvoice services
    await ensureInboxExists(SPHEREON_DID, SPHEREON_INBOX_NAME, `eInvoice inbox`)

    // Add eInvoice services to the DID if they don't exist
    const existingServices = sphereonIdentifier.services || []
    const hasDirectInbox = existingServices.some((s: { type: string }) => s.type === 'einv-direct')
    const hasPeppolInbox = existingServices.some((s: { type: string }) => s.type === 'einv-peppol')

    // Also ensure folders exist even if services already exist (use service id as folder name)
    for (const service of existingServices) {
      if (service.type === 'einv-direct' || service.type === 'einv-peppol') {
        await ensureInboxFolderExists(SPHEREON_INBOX_NAME, service.id, service.description || `${service.type} inbox`)
      }
    }

    if (!hasDirectInbox) {
      console.log('[Demo] Adding einv-direct service to Sphereon DID...')
      await addEInvoiceServiceWithInbox({
        did: SPHEREON_DID,
        hostname: SPHEREON_HOSTNAME,
        serviceId: 'direct',
        serviceType: 'einv-direct',
        description: 'Direct eInvoicing endpoint for Sphereon',
        einvoice: {
          entityName: 'Sphereon B.V.',
          country: 'NL',
          vct: 'urn:org:fides:einv-direct:1',
          documentIdentifiers: ['urn:fdc:peppol.eu:UBL:2.0:invoice', 'urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:D22A'],
          processIdentifiers: ['urn:fdc:peppol.eu:2017:poacc:billing:01:1.0'],
          transportType: 'HTTP',
        },
      })
    }

    if (!hasPeppolInbox) {
      console.log('[Demo] Adding einv-peppol service to Sphereon DID...')
      await addEInvoiceServiceWithInbox({
        did: SPHEREON_DID,
        hostname: SPHEREON_HOSTNAME,
        serviceId: 'peppol',
        serviceType: 'einv-peppol',
        description: 'PEPPOL eInvoicing endpoint for Sphereon',
        einvoice: {
          entityName: 'Sphereon B.V.',
          country: 'NL',
          vct: 'urn:org:fides:einv-peppol:1',
          peppolParticipantId: '0106:87654321',
          documentIdentifiers: ['urn:fdc:peppol.eu:poacc:billing:3:invoice'],
          processIdentifiers: ['urn:fdc:peppol.eu:2017:poacc:billing:01:1.0'],
          transportType: 'PEPPOL',
        },
      })
    }

    // Create Sphereon organization contact
    // Check if Sphereon contact already exists (idempotent)
    const existingContacts = await agent.cmGetContacts({})
    const existingSphereon = existingContacts.find(
      (contact: { contact?: { legalName?: string; displayName?: string } }) =>
        contact.contact?.legalName === 'Sphereon B.V.' || contact.contact?.displayName === 'Sphereon',
    )

    if (!existingSphereon) {
      const sphereonOrg = {
        legalName: 'Sphereon B.V.',
        displayName: 'Sphereon',
        contactType: organizationalContactType,
        uri: 'sphereon.com',
      } as AddContactArgs

      sphereonOrg.identities = [
        {
          alias: 'Sphereon eInvoice Wallet',
          origin: IdentityOrigin.INTERNAL,
          roles: [CredentialRole.ISSUER, CredentialRole.HOLDER, CredentialRole.VERIFIER],
          identifier: {
            type: CorrelationIdentifierType.DID,
            correlationId: sphereonIdentifier.did,
          },
        } as NonPersistedIdentity,
      ]

      await agent.cmAddContact(sphereonOrg)
      console.log(`[Demo] Added eInvoice-capable contact: Sphereon B.V. (DID: ${sphereonIdentifier.did})`)
    } else {
      console.log('[Demo] Sphereon contact already exists. Skipping contact creation.')
    }
  } catch (e) {
    console.log('[Demo] Error adding Sphereon organization:', e)
  }
}

interface EInvoiceServiceConfig {
  did: string
  hostname: string
  serviceId: string
  serviceType: string
  description: string
  einvoice: {
    entityName: string
    country: string
    vct: string
    documentIdentifiers: string[]
    processIdentifiers: string[]
    transportType: string
    peppolParticipantId?: string
  }
}

/**
 * Add eInvoice service endpoint and ensure corresponding inbox/folder exists
 * Uses serviceId as folder name, derives inbox name from SPHEREON_INBOX_NAME constant
 */
async function addEInvoiceServiceWithInbox(config: EInvoiceServiceConfig) {
  const { did, hostname, serviceId, serviceType, description, einvoice } = config
  const inboxName = SPHEREON_INBOX_NAME
  const folderName = serviceId

  // Ensure inbox exists
  await ensureInboxExists(did, inboxName, `eInvoice inbox for ${einvoice.entityName}`)

  // Ensure folder exists (using serviceId as folder name)
  await ensureInboxFolderExists(inboxName, folderName, description)

  // Add service to DID
  await agent.didManagerAddService({
    did,
    service: {
      id: serviceId,
      type: serviceType,
      serviceEndpoint: {
        url: `https://${hostname}/inbox/${inboxName}/${folderName}`,
        einvoice,
      },
      description,
    },
  })
}

/**
 * Ensure inbox exists for a DID (idempotent)
 */
async function ensureInboxExists(did: string, inboxName: string, description: string) {
  try {
    const existingInbox = await agent.inboxGet({ name: inboxName }).catch(() => null)
    if (existingInbox) {
      console.log(`[Demo] Inbox "${inboxName}" already exists.`)
      return existingInbox
    }

    console.log(`[Demo] Creating inbox "${inboxName}" for DID ${did}...`)
    const inbox = await agent.inboxCreate({
      name: inboxName,
      did: did,
      description: description,
    })
    console.log(`[Demo] Created inbox "${inboxName}"`)
    return inbox
  } catch (e) {
    console.log(`[Demo] Error creating inbox "${inboxName}":`, e)
    return null
  }
}

/**
 * Ensure inbox folder exists (idempotent)
 */
async function ensureInboxFolderExists(inboxName: string, folderName: string, description: string, dcqlQueryId: string = 'einvoice') {
  try {
    const existingFolder = await agent.inboxFolderGet({ inboxName, folderName }).catch(() => null)
    if (existingFolder) {
      console.log(`[Demo] Folder "${folderName}" in inbox "${inboxName}" already exists.`)
      return existingFolder
    }

    console.log(`[Demo] Creating folder "${folderName}" in inbox "${inboxName}" with DCQL query "${dcqlQueryId}"...`)
    const folder = await agent.inboxFolderCreate({
      inboxName: inboxName,
      name: folderName,
      dcqlQueryId: dcqlQueryId,
      description: description,
    })
    console.log(`[Demo] Created folder "${folderName}"`)
    return folder
  } catch (e) {
    console.log(`[Demo] Error creating folder "${folderName}":`, e)
    return null
  }
}

function existingDidConfig(
  method: DIDMethods,
  kid: string,
  privateDIDKeyHex: String,
  opts?: { traceability?: boolean; alias?: string; type?: TKeyType },
) {
  const services = opts?.traceability
    ? [
        {
          id: 'traceability',
          type: 'TraceabilityAPI',
          serviceEndpoint: VC_API_BASE_PATH,
        },
      ]
    : undefined

  let options = {}
  if (method === DIDMethods.DID_WEB) {
    options = {
      kid,
      keys: [
        {
          key: {
            privateKeyHex: privateDIDKeyHex,
            kid,
            type: opts?.type ?? 'Secp256r1',
          },
          type: opts?.type ?? 'Secp256r1',
          isController: true,
        } as IKeyOpts,
      ],
    }
    /*} else if (method === DIDMethods.DID_ION) {
    options = {
      anchor: true,
      recoveryKey: {
        kid: `recovery-key-${kid}`,
        key: {
          privateKeyHex: PRIVATE_RECOVERY_KEY_HEX,
        },
      },
      updateKey: {
        kid: `update-key-${kid}`,
        key: {
          privateKeyHex: PRIVATE_UPDATE_KEY_HEX,
        },
      },
      verificationMethods: [
        {
          kid,
          purposes: [IonPublicKeyPurpose.Authentication, IonPublicKeyPurpose.AssertionMethod],
          key: {
            privateKeyHex: privateDIDKeyHex,
          },
        },
      ],
      services,
    }*/
  } else if (method === DIDMethods.DID_JWK) {
    options = {
      kid,
      key: {
        privateKeyHex: privateDIDKeyHex,
        kid,
        type: opts?.type ?? 'Secp256r1',
        keyType: opts?.type ?? 'Secp256r1',
      },
    }
  } else {
    options = { services }
  }
  return {
    provider: `did:${method}`,
    options,
    services,
    ...(opts?.alias && { alias: opts.alias }),
  }
}

/**
 * Create DID configuration with eInvoicing service endpoints for testing
 */
function existingDidConfigWithEInvoice(
  method: DIDMethods,
  kid: string,
  privateDIDKeyHex: String,
  opts?: { alias?: string; type?: TKeyType },
) {
  // eInvoicing service endpoints
  const services = [
    {
      id: 'einv-direct-inbox',
      type: 'einv-direct',
      serviceEndpoint: 'http://localhost:5010/api/inbox/acme/direct',
      description: 'Direct eInvoicing endpoint for Acme Corporation',
      einvoice: {
        entityName: 'Acme Corporation B.V.',
        country: 'NL',
        vct: 'urn:org:fides:einv-direct:1',
        documentIdentifiers: ['urn:fdc:peppol.eu:UBL:2.0:invoice', 'urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:D22A'],
        processIdentifiers: ['urn:fdc:peppol.eu:2017:poacc:billing:01:1.0'],
        transportType: 'HTTP',
      },
    },
    {
      id: 'einv-peppol-inbox',
      type: 'einv-peppol',
      serviceEndpoint: 'http://localhost:5010/api/inbox/acme/peppol',
      description: 'PEPPOL eInvoicing endpoint for Acme Corporation',
      einvoice: {
        entityName: 'Acme Corporation B.V.',
        country: 'NL',
        vct: 'urn:org:fides:einv-peppol:1',
        peppolParticipantId: '0106:12345678',
        documentIdentifiers: ['urn:fdc:peppol.eu:poacc:billing:3:invoice'],
        processIdentifiers: ['urn:fdc:peppol.eu:2017:poacc:billing:01:1.0'],
        transportType: 'PEPPOL',
      },
    },
  ]

  let options = {}
  if (method === DIDMethods.DID_WEB) {
    options = {
      kid,
      keys: [
        {
          key: {
            privateKeyHex: privateDIDKeyHex,
            kid,
            type: opts?.type ?? 'Secp256r1',
          },
          type: opts?.type ?? 'Secp256r1',
          isController: true,
        } as IKeyOpts,
      ],
    }
  } else if (method === DIDMethods.DID_JWK) {
    options = {
      kid,
      key: {
        privateKeyHex: privateDIDKeyHex,
        kid,
        type: opts?.type ?? 'Secp256r1',
        keyType: opts?.type ?? 'Secp256r1',
      },
    }
  }

  return {
    provider: `did:${method}`,
    options,
    services,
    ...(opts?.alias && { alias: opts.alias }),
  }
}
