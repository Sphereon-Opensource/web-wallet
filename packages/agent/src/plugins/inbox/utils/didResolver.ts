/**
 * DID resolution utilities for inbox operations.
 */

import { ExternalServiceError } from '../../shared/error'
import type { EInvoiceServiceEndpoint } from '../types'

/** FIDES eInvoicing capability service types */
const FIDES_SERVICE_TYPES = [
  'urn:org:fides:einv-direct:1',
  'urn:org:fides:einv-peppol:1',
  'urn:org:fides:einv-ppf-fr:1',
]

/** Service type mapping from short names to FIDES URNs */
const SERVICE_TYPE_MAPPING: Record<string, string> = {
  'einv-direct': 'urn:org:fides:einv-direct:1',
  'einv-peppol': 'urn:org:fides:einv-peppol:1',
  'einv-ppf-fr': 'urn:org:fides:einv-ppf-fr:1',
}

/**
 * Resolve a DID to get the DID document.
 *
 * @param did - The DID to resolve
 * @param throwOnError - If true, throws ExternalServiceError on failure; if false, returns null
 * @returns The DID document or null if resolution failed (when throwOnError is false)
 * @throws {ExternalServiceError} When DID resolution fails and throwOnError is true
 */
export async function resolveRecipientDid(did: string, throwOnError = false): Promise<unknown | null> {
  try {
    // Use the did-resolver library to resolve the DID
    const { Resolver } = await import('did-resolver')
    const { getResolver: getDidWebResolver } = await import('web-did-resolver')
    const { getDidJwkResolver } = await import('@sphereon/ssi-sdk-ext.did-resolver-jwk')
    const { getResolver: getDidKeyResolver } = await import('@sphereon/ssi-sdk-ext.did-resolver-key')

    const resolver = new Resolver({
      ...getDidJwkResolver(),
      ...getDidKeyResolver(),
      ...getDidWebResolver(),
    })

    const result = await resolver.resolve(did)
    if (result.didResolutionMetadata?.error) {
      const errorMessage = `DID resolution error for ${did}: ${result.didResolutionMetadata.error}`
      if (throwOnError) {
        throw new ExternalServiceError('DIDResolver', errorMessage)
      }
      console.error(errorMessage)
      return null
    }

    return result.didDocument
  } catch (error: unknown) {
    // Re-throw ExternalServiceError as-is
    if (error instanceof ExternalServiceError) {
      throw error
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    const errorMessage = `Failed to resolve DID ${did}: ${message}`
    if (throwOnError) {
      throw new ExternalServiceError('DIDResolver', errorMessage, error instanceof Error ? error : undefined)
    }
    console.error(errorMessage)
    return null
  }
}

/**
 * Find the inbox service endpoint in a DID document.
 *
 * Looks for services with type matching:
 * - The serviceType parameter (default: 'EInvoiceInbox')
 * - FIDES eInvoicing capability types
 * - Types containing 'inbox' or 'einvoice'
 *
 * @param didDocument - The DID document to search
 * @param serviceType - The service type to look for
 * @returns The eInvoice service endpoint or null if not found
 */
export function findInboxServiceEndpoint(
  didDocument: Record<string, unknown>,
  serviceType: string
): EInvoiceServiceEndpoint | null {
  const services = didDocument.service
  if (!services || !Array.isArray(services)) {
    return null
  }

  const mappedServiceType = SERVICE_TYPE_MAPPING[serviceType] || serviceType

  // Look for a service matching the type
  const service = services.find((s: Record<string, unknown>) => {
    const types = Array.isArray(s.type) ? s.type : [s.type]
    return types.some(
      (t: string) =>
        t === serviceType ||
        t === mappedServiceType ||
        FIDES_SERVICE_TYPES.includes(t) ||
        t.toLowerCase().includes('inbox') ||
        t.toLowerCase().includes('einvoice')
    )
  })

  if (!service) {
    return null
  }

  // Extract the endpoint URL
  let inboxUrl: string | undefined
  const endpoint = service.serviceEndpoint

  if (typeof endpoint === 'string') {
    inboxUrl = endpoint
  } else if (typeof endpoint === 'object' && endpoint !== null) {
    const ep = endpoint as Record<string, unknown>
    inboxUrl = (ep.uri || ep.url || ep.inboxUrl) as string | undefined
  }

  if (!inboxUrl) {
    return null
  }

  // Extract einvoice metadata from service level (not from serviceEndpoint)
  // According to FIDES schemas, einvoice properties are siblings of serviceEndpoint
  const einvoiceData = (service as Record<string, unknown>).einvoice as Record<string, unknown> | undefined

  return {
    inboxUrl,
    folder: (service as Record<string, unknown>).folder as string | undefined,
    vct: einvoiceData?.vct as string[] | undefined,
  }
}
