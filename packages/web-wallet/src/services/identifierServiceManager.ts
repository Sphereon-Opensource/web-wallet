/**
 * Unified service manager for identifier service endpoints.
 *
 * This module consolidates all logic for adding, updating, and managing
 * DID service endpoints to ensure consistent behavior across all UI paths.
 */

import { getAgent, getAgentBaseUrl } from '@agent'
import {
  EINV_SERVICE_TYPE,
  EINVOICE_METHODS,
  isEInvoicingServiceType,
  isEInvoicingMethod,
  getEInvoicingDefaults,
  generateInboxEndpoint,
  EInvoiceMethodType,
  EInvoiceDataItem,
} from '@/src/constants/eInvoicingDefaults'
import { IdentifierServiceEndpoint, EInvoiceServiceData } from '@typings'

// ============================================================================
// Types
// ============================================================================

export interface AddServiceOptions {
  /** The DID to add the service to */
  did: string
  /** Service form data from the UI */
  formData: Record<string, unknown>
  /** Base URL for service endpoints (for eInvoicing) */
  serviceEndpointBaseUrl: string
}

export interface AddServiceResult {
  success: boolean
  service?: IdentifierServiceEndpoint
  error?: string
}

export interface ServiceMetadata {
  eInvoice?: EInvoiceServiceData
  eInvoiceMethod?: string
}

// ============================================================================
// DCQL Definition Management
// ============================================================================

const EINVOICE_DCQL_QUERY = {
  queryId: 'einvoice',
  name: 'eInvoice Credential',
  defaultPurpose: 'We need to verify your eInvoice credential for processing electronic invoices.',
  query: {
    credentials: [
      {
        id: 'einvoice',
        format: 'dc+sd-jwt',
        meta: {
          vct_values: ['urn:org:fides:einvoice:1'],
        },
        claims: [
          { path: ['invoice_id'] },
          { path: ['invoice_date'] },
          { path: ['due_date'] },
          { path: ['currency_code'] },
          { path: ['tax_exclusive_amount'] },
          { path: ['tax_amount'] },
          { path: ['tax_inclusive_amount'] },
          { path: ['evidence'] },
        ],
      },
    ],
  },
}

/**
 * Ensure the eInvoice DCQL definition exists in the RP manager persistence.
 */
export async function ensureEInvoiceDcqlDefinition(): Promise<void> {
  try {
    const agent = getAgent()
    const existingDefinitions = await agent.pdmGetDefinitions({
      filter: [{ queryId: EINVOICE_DCQL_QUERY.queryId }],
    })

    if (existingDefinitions.length === 0) {
      await agent.pdmPersistDefinition({
        definitionItem: {
          queryId: EINVOICE_DCQL_QUERY.queryId,
          version: '1',
          name: EINVOICE_DCQL_QUERY.name,
          purpose: EINVOICE_DCQL_QUERY.defaultPurpose,
          query: EINVOICE_DCQL_QUERY.query as any,
        },
      })
      console.log('[IdentifierServiceManager] Created eInvoice DCQL definition')
    } else {
      console.log('[IdentifierServiceManager] eInvoice DCQL definition already exists')
    }
  } catch (error) {
    console.error('[IdentifierServiceManager] Failed to ensure eInvoice DCQL definition:', error)
    // Don't block service creation if DCQL setup fails
  }
}

// ============================================================================
// eInvoice Data Builders
// ============================================================================

/**
 * Build the eInvoice data item for the eInvoice array in the service endpoint
 */
export function buildEInvoiceDataItem(data: Record<string, unknown>, eInvoiceMethod: EInvoiceMethodType): EInvoiceDataItem | null {
  const defaults = getEInvoicingDefaults(eInvoiceMethod)
  if (!defaults) {
    return null
  }

  const baseData: EInvoiceDataItem = {
    entityName: data.entityName as string,
    country: data.country as string,
    documentIdentifiers: [...defaults.documentIdentifiers],
    processIdentifiers: [...defaults.processIdentifiers],
    transportType: defaults.transportType,
  }

  switch (eInvoiceMethod) {
    case EINVOICE_METHODS.DIRECT:
      return baseData

    case EINVOICE_METHODS.PEPPOL:
      return {
        ...baseData,
        peppolParticipantId: data.peppolParticipantId as string,
        ...(data.peppolSmpUrl ? { peppolSmpUrl: data.peppolSmpUrl as string } : {}),
        ...(data.peppolAs4Endpoint ? { peppolAs4Endpoint: data.peppolAs4Endpoint as string } : {}),
      }

    case EINVOICE_METHODS.PPF_FR:
      const recipientIdsStr = data.ppfRecipientIds as string
      const ppfRecipientIds = recipientIdsStr
        ? recipientIdsStr
            .split(',')
            .map((id) => id.trim())
            .filter((id) => id.length > 0)
        : []

      return {
        ...baseData,
        ppfPlatformId: data.ppfPlatformId as string,
        ppfRecipientIds,
        ppfMode: data.ppfMode as 'pdp' | 'direct' | 'via-pdp',
        ...(data.ppfApiEndpoint ? { ppfApiEndpoint: data.ppfApiEndpoint as string } : {}),
      }

    default:
      return null
  }
}

/**
 * Build the internal eInvoice service data (includes inbox configuration)
 */
export function buildInternalServiceData(
  data: Record<string, unknown>,
  eInvoiceMethod: EInvoiceMethodType
): EInvoiceServiceData | null {
  const dataItem = buildEInvoiceDataItem(data, eInvoiceMethod)
  if (!dataItem) {
    return null
  }

  const serviceId = data.id as string
  const inboxName = (data.inboxName as string) || 'einvoices'
  const folderName = (data.folderName as string) || serviceId.replace(/^#/, '')

  return {
    ...dataItem,
    inboxName,
    folderName,
  }
}

// ============================================================================
// Service Endpoint Building
// ============================================================================

/**
 * Build a service endpoint object from form data.
 * Handles both standard and eInvoicing service types.
 */
export function buildServiceEndpoint(
  formData: Record<string, unknown>,
  serviceEndpointBaseUrl: string
): IdentifierServiceEndpoint {
  const serviceType = formData.type as string
  const serviceId = formData.id as string

  // Normalize service ID to include # prefix
  const normalizedId = serviceId.startsWith('#') ? serviceId : `#${serviceId}`

  if (isEInvoicingServiceType(serviceType)) {
    const eInvoiceMethod = formData.eInvoiceMethod as EInvoiceMethodType
    if (!isEInvoicingMethod(eInvoiceMethod)) {
      throw new Error(`Invalid eInvoicing method: ${eInvoiceMethod}`)
    }

    const defaults = getEInvoicingDefaults(eInvoiceMethod)
    const eInvoiceDataItem = buildEInvoiceDataItem(formData, eInvoiceMethod)
    const internalData = buildInternalServiceData(formData, eInvoiceMethod)

    // Build endpoint URL for eInvoicing
    const inboxName = (formData.inboxName as string) || 'einvoices'
    const folderName = (formData.folderName as string) || serviceId.replace(/^#/, '')
    const endpointUrl = generateInboxEndpoint(serviceEndpointBaseUrl, inboxName, folderName)

    return {
      id: normalizedId,
      type: EINV_SERVICE_TYPE,
      serviceEndpoint: endpointUrl,
      description: defaults?.description,
      eInvoiceMethod: eInvoiceMethod,
      eInvoice: eInvoiceDataItem ? [eInvoiceDataItem] : undefined,
      _internal: internalData || undefined,
    }
  }

  // Standard service endpoint
  return {
    id: normalizedId,
    type: serviceType,
    serviceEndpoint: formData.serviceEndpoint as string,
  }
}

// ============================================================================
// Service Metadata Management
// ============================================================================

/**
 * Save service metadata (eInvoice data and eInvoiceMethod) to the agent.
 * This is needed because Veramo doesn't persist custom properties in the DID document.
 */
export async function saveServiceMetadata(
  did: string,
  serviceId: string,
  service: IdentifierServiceEndpoint
): Promise<boolean> {
  // Only save metadata if there's something to save
  if (!service._internal && !service.eInvoiceMethod) {
    return true
  }

  try {
    const metadata: ServiceMetadata = {}

    if (service._internal) {
      metadata.eInvoice = service._internal
    }
    if (service.eInvoiceMethod) {
      metadata.eInvoiceMethod = service.eInvoiceMethod
    }

    console.log(`[IdentifierServiceManager] Saving metadata for service ${serviceId}:`, {
      hasEInvoice: !!metadata.eInvoice,
      eInvoiceMethod: metadata.eInvoiceMethod,
    })

    await getAgent().updateServiceMetadata({
      serviceId,
      did,
      metadata,
    })

    console.log(`[IdentifierServiceManager] Successfully saved metadata for service ${serviceId}`)
    return true
  } catch (error) {
    console.error(`[IdentifierServiceManager] Failed to save metadata for service ${serviceId}:`, error)
    return false
  }
}

// ============================================================================
// Inbox/Folder Management
// ============================================================================

/**
 * Ensure inbox and folder exist for eInvoicing services.
 */
export async function ensureInboxAndFolder(did: string, service: IdentifierServiceEndpoint): Promise<void> {
  if (!isEInvoicingServiceType(service.type)) {
    return
  }

  const internalData = service._internal
  if (!internalData) {
    return
  }

  const agentBaseUrl = getAgentBaseUrl()
  const inboxName = internalData.inboxName || 'einvoices'
  const folderName = internalData.folderName || service.id.replace(/^#/, '').replace('#', '')

  try {
    // Create inbox (will get 409 if it already exists)
    const createInboxResponse = await fetch(`${agentBaseUrl}/inbox`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: inboxName,
        did,
        description: `eInvoicing inbox for ${did}`,
      }),
    })

    if (createInboxResponse.ok) {
      console.log(`[IdentifierServiceManager] Created inbox '${inboxName}'`)
    } else if (createInboxResponse.status === 409) {
      console.log(`[IdentifierServiceManager] Inbox '${inboxName}' already exists`)
    } else {
      const error = await createInboxResponse.text()
      console.warn(`[IdentifierServiceManager] Failed to create inbox: ${error}`)
    }

    // Create folder
    const createFolderResponse = await fetch(`${agentBaseUrl}/inbox/${inboxName}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: folderName,
        dcqlQueryId: 'einvoice',
        description: `eInvoicing folder for service ${service.id}`,
      }),
    })

    if (createFolderResponse.ok) {
      console.log(`[IdentifierServiceManager] Created folder '${folderName}' in inbox '${inboxName}'`)
    } else if (createFolderResponse.status === 409) {
      console.log(`[IdentifierServiceManager] Folder '${folderName}' already exists in inbox '${inboxName}'`)
    } else {
      const error = await createFolderResponse.text()
      console.warn(`[IdentifierServiceManager] Failed to create folder: ${error}`)
    }
  } catch (error) {
    console.error(`[IdentifierServiceManager] Error ensuring inbox/folder:`, error)
    // Don't fail the service endpoint creation if inbox setup fails
  }
}

// ============================================================================
// Main Service Operations
// ============================================================================

/**
 * Add a service to a DID.
 * This is the main entry point for adding services from any UI path.
 */
export async function addServiceToDid(options: AddServiceOptions): Promise<AddServiceResult> {
  const { did, formData, serviceEndpointBaseUrl } = options

  try {
    // Build the service endpoint
    const service = buildServiceEndpoint(formData, serviceEndpointBaseUrl)

    console.log(`[IdentifierServiceManager] Adding service to DID:`, {
      did,
      serviceId: service.id,
      type: service.type,
      eInvoiceMethod: service.eInvoiceMethod,
      hasEInvoice: !!service.eInvoice,
      hasInternal: !!service._internal,
    })

    // If this is an eInvoicing service, ensure the DCQL definition exists
    if (isEInvoicingServiceType(service.type)) {
      await ensureEInvoiceDcqlDefinition()
    }

    // Build service data for DID document (without internal fields)
    const serviceData: Record<string, unknown> = {
      id: service.id,
      type: service.type,
      serviceEndpoint: service.serviceEndpoint,
      description: service.description,
    }

    // Add eInvoice-specific fields for the DID document
    if (service.type === EINV_SERVICE_TYPE) {
      if (service.eInvoiceMethod) {
        serviceData.eInvoiceMethod = service.eInvoiceMethod
      }
      if (service.eInvoice) {
        serviceData.eInvoice = service.eInvoice
      }
    }

    // Add the service to the DID via Veramo
    await getAgent().didManagerAddService({
      did,
      service: serviceData as any,
    })

    // Save metadata (eInvoice and eInvoiceMethod) separately since Veramo doesn't persist custom fields
    await saveServiceMetadata(did, service.id, service)

    // Ensure inbox and folder exist for eInvoicing services
    await ensureInboxAndFolder(did, service)

    return { success: true, service }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[IdentifierServiceManager] Failed to add service:`, error)
    return { success: false, error: errorMessage }
  }
}

/**
 * Remove a service from a DID.
 */
export async function removeServiceFromDid(did: string, serviceId: string): Promise<boolean> {
  try {
    await getAgent().didManagerRemoveService({
      did,
      id: serviceId,
    })
    console.log(`[IdentifierServiceManager] Removed service ${serviceId} from ${did}`)
    return true
  } catch (error) {
    console.error(`[IdentifierServiceManager] Failed to remove service ${serviceId}:`, error)
    return false
  }
}

/**
 * Replace all services on a DID.
 * Removes existing services and adds the new ones.
 */
export async function replaceServicesOnDid(
  did: string,
  currentServices: any[],
  newServices: IdentifierServiceEndpoint[]
): Promise<boolean> {
  console.log(`[IdentifierServiceManager] Replacing services on DID:`, {
    did,
    currentCount: currentServices?.length || 0,
    newCount: newServices?.length || 0,
  })

  try {
    // Remove all existing services
    if (currentServices && currentServices.length > 0) {
      for (const service of currentServices) {
        await removeServiceFromDid(did, service.id)
      }
    }

    // Add new services
    for (const service of newServices) {
      // Build service data for DID document
      const serviceData: Record<string, unknown> = {
        id: service.id,
        type: service.type,
        serviceEndpoint: service.serviceEndpoint,
        description: service.description,
      }

      // Add eInvoice-specific fields
      if (service.type === EINV_SERVICE_TYPE) {
        if (service.eInvoiceMethod) {
          serviceData.eInvoiceMethod = service.eInvoiceMethod
        }
        if (service.eInvoice) {
          serviceData.eInvoice = service.eInvoice
        }
      }

      // Add to DID
      await getAgent().didManagerAddService({
        did,
        service: serviceData as any,
      })

      // Save metadata
      await saveServiceMetadata(did, service.id, service)

      // Ensure inbox/folder for eInvoicing
      if (isEInvoicingServiceType(service.type)) {
        await ensureInboxAndFolder(did, service)
      }
    }

    console.log(`[IdentifierServiceManager] Successfully replaced services on ${did}`)
    return true
  } catch (error) {
    console.error(`[IdentifierServiceManager] Error replacing services:`, error)
    return false
  }
}
