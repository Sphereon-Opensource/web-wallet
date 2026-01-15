/**
 * Recipient Service
 *
 * Provides API functions for fetching contacts and resolving their DIDs
 * to find eInvoicing service endpoints.
 */

import {resolver} from '@agent'
import {getAgentBaseUrl} from '@agent/environment'
import {EINV_SERVICE_TYPES, EInvServiceType, isEInvoicingServiceType} from '@/src/constants/eInvoicingDefaults'

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
  serviceType: EInvServiceType
  serviceEndpoint: string
  description?: string
  entityName?: string
  country?: string
  // Additional metadata
  metadata?: {
    vct?: string
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
export const getServiceTypeLabel = (serviceType: EInvServiceType): string => {
  switch (serviceType) {
    case EINV_SERVICE_TYPES.DIRECT:
      return 'Direct'
    case EINV_SERVICE_TYPES.PEPPOL:
      return 'PEPPOL'
    case EINV_SERVICE_TYPES.PPF_FR:
      return 'France PPF'
    default:
      return 'Unknown'
  }
}

/**
 * Fetch all contacts from the contact manager REST API
 */
export async function fetchContacts(): Promise<ContactParty[]> {
  try {
    // Use the REST API directly instead of Veramo client
    const response = await fetch(`${getAgentBaseUrl()}/parties`)

    if (!response.ok) {
      throw new Error(`Failed to fetch contacts: ${response.status}`)
    }

    const parties = await response.json()

    const contacts: ContactParty[] = parties.map((party: any) => {
      // Extract identity (DID) if available
      const identity = party.identities?.[0]
      const did = identity?.identifier?.correlationId || identity?.identifier?.id

      // Extract organization info from party
      const partyType = party.partyType
      const contact = party.contact

      return {
        id: party.id,
        displayName: contact?.displayName || party.legalName || party.displayName || 'Unknown',
        did,
        organizationName: partyType?.name || party.legalName,
        legalName: party.legalName,
        email: contact?.email,
        vatNumber: party.vatNumber,
        chamberOfCommerce: party.chamberOfCommerce,
      }
    })

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
    // Resolve the DID document
    const resolutionResult = await resolver.resolve(did)

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

      // Check if it's an eInvoicing service type
      if (isEInvoicingServiceType(serviceType)) {
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

        // Extract einvoice metadata if available
        const einvoiceData = (service as any).einvoice || {}

        endpoints.push({
          id: service.id,
          serviceType: serviceType as EInvServiceType,
          serviceEndpoint,
          description: (service as any).description || einvoiceData.description,
          entityName: einvoiceData.entityName,
          country: einvoiceData.country,
          metadata: {
            vct: einvoiceData.vct,
            documentIdentifiers: einvoiceData.documentIdentifiers,
            processIdentifiers: einvoiceData.processIdentifiers,
            transportType: einvoiceData.transportType,
            peppolParticipantId: einvoiceData.peppolParticipantId,
            peppolSmpUrl: einvoiceData.peppolSmpUrl,
            peppolAs4Endpoint: einvoiceData.peppolAs4Endpoint,
            ppfPlatformId: einvoiceData.ppfPlatformId,
            ppfRecipientIds: einvoiceData.ppfRecipientIds,
            ppfMode: einvoiceData.ppfMode,
            ppfApiEndpoint: einvoiceData.ppfApiEndpoint,
          },
        })
      }
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
