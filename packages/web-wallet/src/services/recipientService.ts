/**
 * Recipient Service
 *
 * Provides API functions for fetching contacts and resolving their DIDs
 * to find eInvoicing service endpoints.
 */

import {getAgentBaseUrl} from '@agent/environment'
import {EINV_SERVICE_TYPE, EINVOICE_METHODS, EInvoiceMethodType, isEInvoicingServiceType, isEInvoicingMethod} from '@/src/constants/eInvoicingDefaults'

/**
 * Contact party information from the contact manager
 */
export interface ContactParty {
  id: string
  displayName: string
  did?: string
  organizationName?: string
  legalName?: string
  email?: string
  vatNumber?: string
  chamberOfCommerce?: string
}

/**
 * eInvoicing endpoint discovered from DID resolution
 */
export interface EInvoicingEndpoint {
  id: string
  eInvoiceMethod: EInvoiceMethodType
  serviceEndpoint: string
  description?: string
  entityName?: string
  country?: string
  // Additional metadata from eInvoice array
  metadata?: {
    documentIdentifiers?: string[]
    processIdentifiers?: string[]
    transportType?: string
    // PEPPOL-specific
    peppolParticipantId?: string
    peppolSmpUrl?: string
    peppolAs4Endpoint?: string
    // PPF-FR-specific
    ppfPlatformId?: string
    ppfRecipientIds?: string[]
    ppfMode?: string
    ppfApiEndpoint?: string
  }
}

/**
 * Resolved recipient with contact info and einvoicing endpoints
 */
export interface ResolvedRecipient {
  contact: ContactParty
  did: string
  endpoints: EInvoicingEndpoint[]
  selectedEndpointId?: string
  error?: string
}

/**
 * Service label mapping for display
 */
export const getServiceTypeLabel = (eInvoiceMethod: EInvoiceMethodType): string => {
  switch (eInvoiceMethod) {
    case EINVOICE_METHODS.DIRECT:
      return 'Direct'
    case EINVOICE_METHODS.PEPPOL:
      return 'Peppol'
    case EINVOICE_METHODS.PPF_FR:
      return 'France PPF'
    default:
      return eInvoiceMethod
  }
}

/**
 * Fetch all contacts from the contact manager REST API
 * For contacts with multiple did:web identities, creates separate entries for each
 * to allow the user to select which DID to use.
 */
export async function fetchContacts(): Promise<ContactParty[]> {
  try {
    // Use the REST API directly instead of Veramo client
    const response = await fetch(`${getAgentBaseUrl()}/parties`)

    if (!response.ok) {
      throw new Error(`Failed to fetch contacts: ${response.status}`)
    }

    const parties = await response.json()

    const contacts: ContactParty[] = []

    for (const party of parties) {
      const partyType = party.partyType
      const contact = party.contact
      const identities = party.identities || []

      // Filter to only DIDs, excluding did:jwk and did:key (cannot have service endpoints)
      const validIdentities = identities.filter((identity: any) => {
        const did = identity?.identifier?.correlationId || identity?.identifier?.id
        if (!did) return false
        // Must be a DID (starts with "did:")
        if (!did.startsWith('did:')) return false
        // Exclude did:jwk and did:key as they cannot have service endpoints
        if (did.startsWith('did:jwk:') || did.startsWith('did:key:')) return false
        return true
      })

      // Sort identities: did:web non-localhost first, then other DIDs
      validIdentities.sort((a: any, b: any) => {
        const didA = a?.identifier?.correlationId || a?.identifier?.id || ''
        const didB = b?.identifier?.correlationId || b?.identifier?.id || ''
        // Prioritize did:web
        const isWebA = didA.startsWith('did:web:')
        const isWebB = didB.startsWith('did:web:')
        if (isWebA && !isWebB) return -1
        if (!isWebA && isWebB) return 1
        // For did:web, prioritize non-localhost
        if (isWebA && isWebB) {
          const isLocalhostA = didA.includes('localhost')
          const isLocalhostB = didB.includes('localhost')
          if (!isLocalhostA && isLocalhostB) return -1
          if (isLocalhostA && !isLocalhostB) return 1
        }
        return 0
      })

      // Create a contact entry for each valid DID identity
      if (validIdentities.length > 0) {
        // Filter out internal/default party type names
        const rawPartyTypeName = partyType?.name
        const partyTypeName = rawPartyTypeName && !rawPartyTypeName.toLowerCase().includes('default') && !rawPartyTypeName.includes('_')
          ? rawPartyTypeName
          : undefined

        for (const identity of validIdentities) {
          const did = identity?.identifier?.correlationId || identity?.identifier?.id
          const alias = identity?.alias

          // Format display name - show alias/DID suffix if multiple identities
          const didSuffix = did.startsWith('did:web:') ? did.replace('did:web:', '') : did.split(':').slice(0, 2).join(':')

          contacts.push({
            id: `${party.id}#${did}`, // Unique ID combining party and DID
            displayName: validIdentities.length > 1
              ? `${contact?.displayName || party.legalName || 'Unknown'} (${alias || didSuffix})`
              : contact?.displayName || party.legalName || party.displayName || 'Unknown',
            did,
            organizationName: partyTypeName || party.legalName,
            legalName: party.legalName,
            email: contact?.email,
            vatNumber: party.vatNumber,
            chamberOfCommerce: party.chamberOfCommerce,
          })
        }
      }
    }

    // Filter to only contacts that have a DID
    return contacts.filter((c) => c.did)
  } catch (error) {
    console.error('[RecipientService] Error fetching contacts:', error)
    return []
  }
}

/**
 * Resolve a DID and extract eInvoicing service endpoints
 */
export async function resolveEInvoicingEndpoints(did: string): Promise<EInvoicingEndpoint[]> {
  try {
    // Resolve the DID document via the agent backend REST API (avoids CORS issues for external DIDs)
    const agentBaseUrl = getAgentBaseUrl()
    const encodedDid = encodeURIComponent(did)
    const response = await fetch(`${agentBaseUrl}/did/identifiers/${encodedDid}`)

    if (!response.ok) {
      console.warn('[RecipientService] Failed to resolve DID:', did, response.status)
      return []
    }

    const resolutionResult = await response.json()

    if (!resolutionResult.didDocument) {
      console.warn('[RecipientService] No DID document found for:', did)
      return []
    }

    const didDocument = resolutionResult.didDocument
    const services = didDocument.service || []

    // Filter and map eInvoicing services
    const endpoints: EInvoicingEndpoint[] = []

    for (const service of services) {
      const serviceType = service.type

      // Check if it's an eInvoicing service (type === "eInvoice")
      if (!isEInvoicingServiceType(serviceType)) {
        continue
      }

      // Get the eInvoiceMethod
      const eInvoiceMethod = (service as any).eInvoiceMethod as string
      if (!eInvoiceMethod || !isEInvoicingMethod(eInvoiceMethod)) {
        console.warn('[RecipientService] Service missing valid eInvoiceMethod:', service.id)
        continue
      }

      // Extract service endpoint (can be string or array)
      let serviceEndpoint: string
      if (typeof service.serviceEndpoint === 'string') {
        serviceEndpoint = service.serviceEndpoint
      } else if (Array.isArray(service.serviceEndpoint) && service.serviceEndpoint.length > 0) {
        serviceEndpoint = service.serviceEndpoint[0]
      } else if (typeof service.serviceEndpoint === 'object' && service.serviceEndpoint !== null) {
        // Handle object format (could have url or uri property)
        const ep = service.serviceEndpoint as any
        serviceEndpoint = ep.url || ep.uri || ep.endpoint || ''
        if (!serviceEndpoint) {
          continue // Skip if no valid endpoint URL found
        }
      } else {
        continue // Skip if no valid endpoint
      }

      // Extract eInvoice metadata from the eInvoice array (capital I)
      const eInvoiceArray = (service as any).eInvoice as Array<Record<string, unknown>> | undefined
      const eInvoiceData = eInvoiceArray && eInvoiceArray.length > 0 ? eInvoiceArray[0] : {}

      endpoints.push({
        id: service.id,
        eInvoiceMethod: eInvoiceMethod as EInvoiceMethodType,
        serviceEndpoint,
        description: (service as any).description,
        entityName: eInvoiceData.entityName as string | undefined,
        country: eInvoiceData.country as string | undefined,
        metadata: {
          documentIdentifiers: eInvoiceData.documentIdentifiers as string[] | undefined,
          processIdentifiers: eInvoiceData.processIdentifiers as string[] | undefined,
          transportType: eInvoiceData.transportType as string | undefined,
          peppolParticipantId: eInvoiceData.peppolParticipantId as string | undefined,
          peppolSmpUrl: eInvoiceData.peppolSmpUrl as string | undefined,
          peppolAs4Endpoint: eInvoiceData.peppolAs4Endpoint as string | undefined,
          ppfPlatformId: eInvoiceData.ppfPlatformId as string | undefined,
          ppfRecipientIds: eInvoiceData.ppfRecipientIds as string[] | undefined,
          ppfMode: eInvoiceData.ppfMode as string | undefined,
          ppfApiEndpoint: eInvoiceData.ppfApiEndpoint as string | undefined,
        },
      })
    }

    return endpoints
  } catch (error) {
    console.error('[RecipientService] Error resolving DID:', did, error)
    // Return empty array which will trigger "no endpoints" error
    return []
  }
}

/**
 * Resolve a contact to get their eInvoicing endpoints
 */
export async function resolveRecipient(contact: ContactParty): Promise<ResolvedRecipient> {
  if (!contact.did) {
    return {
      contact,
      did: '',
      endpoints: [],
      error: 'Contact does not have a DID configured',
    }
  }

  try {
    const endpoints = await resolveEInvoicingEndpoints(contact.did)

    if (endpoints.length === 0) {
      return {
        contact,
        did: contact.did,
        endpoints: [],
        error: 'No eInvoicing endpoints found in DID document. The recipient cannot receive eInvoices via this wallet.',
      }
    }

    return {
      contact,
      did: contact.did,
      endpoints,
      selectedEndpointId: endpoints[0].id, // Default to first endpoint
    }
  } catch (error) {
    console.error('[RecipientService] Error resolving recipient:', error)
    return {
      contact,
      did: contact.did,
      endpoints: [],
      error: `Failed to resolve DID: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Search contacts by name or organization
 */
export async function searchContacts(query: string): Promise<ContactParty[]> {
  const allContacts = await fetchContacts()
  const lowerQuery = query.toLowerCase()

  return allContacts.filter(
    (contact) =>
      contact.displayName?.toLowerCase().includes(lowerQuery) ||
      contact.organizationName?.toLowerCase().includes(lowerQuery) ||
      contact.legalName?.toLowerCase().includes(lowerQuery) ||
      contact.email?.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Try to match a buyer name from UBL to an existing contact
 */
export async function matchContactByName(buyerName: string): Promise<ContactParty | undefined> {
  if (!buyerName) return undefined

  const contacts = await fetchContacts()
  const lowerName = buyerName.toLowerCase().trim()

  // First try exact match
  let match = contacts.find(
    (c) =>
      c.displayName?.toLowerCase() === lowerName ||
      c.organizationName?.toLowerCase() === lowerName ||
      c.legalName?.toLowerCase() === lowerName
  )

  if (!match) {
    // Try partial match
    match = contacts.find(
      (c) =>
        c.displayName?.toLowerCase().includes(lowerName) ||
        c.organizationName?.toLowerCase().includes(lowerName) ||
        c.legalName?.toLowerCase().includes(lowerName) ||
        lowerName.includes(c.displayName?.toLowerCase() || '') ||
        lowerName.includes(c.organizationName?.toLowerCase() || '')
    )
  }

  return match
}
