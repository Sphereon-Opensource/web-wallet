/**
 * DID resolution utilities for inbox operations.
 */

import { ExternalServiceError } from '../../shared/error'
import type { EInvoiceServiceEndpoint } from '../types'

/** The service type for eInvoicing services */
const EINV_SERVICE_TYPE = 'eInvoice'

/** Valid eInvoicing subTypes */
const EINV_SUB_TYPES = ['Direct', 'Peppol', 'PPF-FR']

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
 * Looks for services with:
 * - type: "eInvoice"
 * - Optionally filters by subType if serviceType is specified
 *
 * @param didDocument - The DID document to search
 * @param serviceType - Optional subType to filter by (e.g., 'Direct', 'Peppol', 'PPF-FR')
 * @returns The eInvoice service endpoint or null if not found
 */
export function findInboxServiceEndpoint(
  didDocument: Record<string, unknown>,
  serviceType?: string
): EInvoiceServiceEndpoint | null {
  const services = didDocument.service
  if (!services || !Array.isArray(services)) {
    return null
  }

  // Look for a service with type "eInvoice"
  const service = services.find((s: Record<string, unknown>) => {
    const types = Array.isArray(s.type) ? s.type : [s.type]
    const isEInvoiceType = types.some((t: string) => t === EINV_SERVICE_TYPE)

    if (!isEInvoiceType) {
      return false
    }

    // If a specific subType is requested, check for it
    if (serviceType && EINV_SUB_TYPES.includes(serviceType)) {
      return s.subType === serviceType
    }

    return true
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

  // Extract eInvoice metadata from service level (capital I, array format)
  const eInvoiceData = (service as Record<string, unknown>).eInvoice as Array<Record<string, unknown>> | undefined

  // Note: folder is NOT extracted from DID document - it's internal metadata
  // The serviceEndpoint URL is the only externally-visible endpoint
  return {
    inboxUrl,
    // vct could be extracted from the eInvoice array if needed
    vct: undefined,
  }
}
