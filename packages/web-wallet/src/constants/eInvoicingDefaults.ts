/**
 * eInvoicing Service Types and Default Values
 * Based on FIDES credential schemas for eInvoicing capabilities
 *
 * References:
 * - DEV-29: eInvoice Inbox Implementation Plan
 * - VDX-24: Create Inbox Endpoint Infrastructure
 * - VDX-25: Define DCQL Queries for eInvoice Credentials
 */

// Service type identifiers
export const EINV_SERVICE_TYPES = {
  DIRECT: 'einv-direct',
  PEPPOL: 'einv-peppol',
  PPF_FR: 'einv-ppf-fr',
} as const

// Verifiable Credential Types (VCT)
export const EINV_VCT = {
  DIRECT: 'urn:org:fides:einv-direct:1',
  PEPPOL: 'urn:org:fides:einv-peppol:1',
  PPF_FR: 'urn:org:fides:einv-ppf-fr:1',
} as const

// Transport types
export const EINV_TRANSPORT_TYPES = {
  HTTP: 'HTTP',
  PEPPOL: 'PEPPOL',
  PPF: 'PPF',
} as const

// PPF Mode options for France PPF
export const PPF_MODES = ['pdp', 'direct', 'via-pdp'] as const
export type PpfMode = (typeof PPF_MODES)[number]

// Direct eInvoicing defaults
export const EINV_DIRECT_DEFAULTS = {
  vct: EINV_VCT.DIRECT,
  description: 'Direct eInvoicing service endpoint for receiving electronic invoices via HTTP',
  documentIdentifiers: ['urn:fdc:peppol.eu:UBL:2.0:invoice', 'urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:D22A'],
  processIdentifiers: ['urn:fdc:peppol.eu:2017:poacc:billing:01:1.0', 'urn:oasis:names:specification:ubl:process:BasicBilling:1'],
  transportType: EINV_TRANSPORT_TYPES.HTTP,
} as const

// PEPPOL eInvoicing defaults
export const EINV_PEPPOL_DEFAULTS = {
  vct: EINV_VCT.PEPPOL,
  description: 'PEPPOL eInvoicing service endpoint for receiving electronic invoices via the PEPPOL network',
  documentIdentifiers: ['urn:fdc:peppol.eu:poacc:billing:3:invoice', 'urn:fdc:peppol.eu:poacc:billing:3:creditnote'],
  processIdentifiers: ['urn:fdc:peppol.eu:2017:poacc:billing:01:1.0'],
  transportType: EINV_TRANSPORT_TYPES.PEPPOL,
} as const

// France PPF eInvoicing defaults
export const EINV_PPF_FR_DEFAULTS = {
  vct: EINV_VCT.PPF_FR,
  description: 'France PPF eInvoicing service endpoint for receiving electronic invoices via the French Public Invoicing Portal',
  documentIdentifiers: [
    'urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:D22A',
    'urn:un:unece:uncefact:data:standard:CrossIndustryCreditNote:D22A',
  ],
  processIdentifiers: ['urn:fr:ppf:process:facturx:1'],
  transportType: EINV_TRANSPORT_TYPES.PPF,
  defaultCountry: 'FR',
} as const

// Type for eInvoicing service types
export type EInvServiceType = (typeof EINV_SERVICE_TYPES)[keyof typeof EINV_SERVICE_TYPES]

/**
 * Check if a service type is an eInvoicing type
 */
export const isEInvoicingServiceType = (type: string): type is EInvServiceType => {
  return Object.values(EINV_SERVICE_TYPES).includes(type as EInvServiceType)
}

/**
 * Get defaults for an eInvoicing service type
 */
export const getEInvoicingDefaults = (type: EInvServiceType) => {
  switch (type) {
    case EINV_SERVICE_TYPES.DIRECT:
      return EINV_DIRECT_DEFAULTS
    case EINV_SERVICE_TYPES.PEPPOL:
      return EINV_PEPPOL_DEFAULTS
    case EINV_SERVICE_TYPES.PPF_FR:
      return EINV_PPF_FR_DEFAULTS
    default:
      return null
  }
}

/**
 * Get the inbox path suffix for an eInvoicing service type
 */
export const getInboxPathSuffix = (type: EInvServiceType): string => {
  switch (type) {
    case EINV_SERVICE_TYPES.DIRECT:
      return 'direct'
    case EINV_SERVICE_TYPES.PEPPOL:
      return 'peppol'
    case EINV_SERVICE_TYPES.PPF_FR:
      return 'ppf-fr'
    default:
      return ''
  }
}

/**
 * Generate the full inbox endpoint URL
 */
export const generateInboxEndpoint = (baseUrl: string, serviceId: string, type: EInvServiceType): string => {
  const pathSuffix = getInboxPathSuffix(type)
  // Remove trailing slash from baseUrl if present
  const cleanBaseUrl = baseUrl.replace(/\/$/, '')
  return `${cleanBaseUrl}/api/inbox/${serviceId}/${pathSuffix}`
}

// Export types for external use
export interface EInvDirectServiceData {
  type: typeof EINV_SERVICE_TYPES.DIRECT
  entityName: string
  country: string
  endpoint: string
  documentIdentifiers: readonly string[]
  processIdentifiers: readonly string[]
  transportType: typeof EINV_TRANSPORT_TYPES.HTTP
}

export interface EInvPeppolServiceData {
  type: typeof EINV_SERVICE_TYPES.PEPPOL
  entityName: string
  country: string
  peppolParticipantId: string
  peppolSmpUrl?: string
  peppolAs4Endpoint?: string
  documentIdentifiers: readonly string[]
  processIdentifiers: readonly string[]
  transportType: typeof EINV_TRANSPORT_TYPES.PEPPOL
}

export interface EInvPpfFrServiceData {
  type: typeof EINV_SERVICE_TYPES.PPF_FR
  entityName: string
  country: string
  ppfPlatformId: string
  ppfRecipientIds: string[]
  ppfMode: PpfMode
  ppfApiEndpoint?: string
  documentIdentifiers: readonly string[]
  processIdentifiers: readonly string[]
  transportType: typeof EINV_TRANSPORT_TYPES.PPF
}

export type EInvServiceData = EInvDirectServiceData | EInvPeppolServiceData | EInvPpfFrServiceData
