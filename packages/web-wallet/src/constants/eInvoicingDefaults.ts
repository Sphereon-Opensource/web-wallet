/**
 * eInvoicing Service Types and Default Values
 * Based on FIDES credential schemas for eInvoicing capabilities
 *
 * DID Document service format:
 * {
 *   "type": "eInvoice",
 *   "id": "service-id",
 *   "serviceEndpoint": "https://example.com/inbox/einvoices/folder",
 *   "subType": "Peppol",
 *   "eInvoice": [{ entityName, country, ... }]
 * }
 */

// The service type is always "eInvoice"
export const EINV_SERVICE_TYPE = 'eInvoice' as const

// SubType identifiers for the specific eInvoicing network
export const EINV_SUB_TYPES = {
  DIRECT: 'Direct',
  PEPPOL: 'Peppol',
  PPF_FR: 'PPF-FR',
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

// Type for eInvoicing sub types
export type EInvSubType = (typeof EINV_SUB_TYPES)[keyof typeof EINV_SUB_TYPES]

// Direct eInvoicing defaults
export const EINV_DIRECT_DEFAULTS = {
  description: 'Direct eInvoicing service endpoint for receiving electronic invoices via HTTP',
  documentIdentifiers: ['urn:fdc:peppol.eu:UBL:2.0:invoice', 'urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:D22A'],
  processIdentifiers: ['urn:fdc:peppol.eu:2017:poacc:billing:01:1.0', 'urn:oasis:names:specification:ubl:process:BasicBilling:1'],
  transportType: EINV_TRANSPORT_TYPES.HTTP,
} as const

// PEPPOL eInvoicing defaults
export const EINV_PEPPOL_DEFAULTS = {
  description: 'PEPPOL eInvoicing service endpoint for receiving electronic invoices via the PEPPOL network',
  documentIdentifiers: ['urn:fdc:peppol.eu:poacc:billing:3:invoice', 'urn:fdc:peppol.eu:poacc:billing:3:creditnote'],
  processIdentifiers: ['urn:fdc:peppol.eu:2017:poacc:billing:01:1.0'],
  transportType: EINV_TRANSPORT_TYPES.PEPPOL,
} as const

// France PPF eInvoicing defaults
export const EINV_PPF_FR_DEFAULTS = {
  description: 'France PPF eInvoicing service endpoint for receiving electronic invoices via the French Public Invoicing Portal',
  documentIdentifiers: [
    'urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:D22A',
    'urn:un:unece:uncefact:data:standard:CrossIndustryCreditNote:D22A',
  ],
  processIdentifiers: ['urn:fr:ppf:process:facturx:1'],
  transportType: EINV_TRANSPORT_TYPES.PPF,
  defaultCountry: 'FR',
} as const

/**
 * Check if a service type is the eInvoice type
 */
export const isEInvoicingServiceType = (type: string): boolean => {
  return type === EINV_SERVICE_TYPE
}

/**
 * Check if a subType is a valid eInvoicing subType
 */
export const isEInvoicingSubType = (subType: string): subType is EInvSubType => {
  return Object.values(EINV_SUB_TYPES).includes(subType as EInvSubType)
}

/**
 * Get defaults for an eInvoicing subType
 */
export const getEInvoicingDefaults = (subType: EInvSubType) => {
  switch (subType) {
    case EINV_SUB_TYPES.DIRECT:
      return EINV_DIRECT_DEFAULTS
    case EINV_SUB_TYPES.PEPPOL:
      return EINV_PEPPOL_DEFAULTS
    case EINV_SUB_TYPES.PPF_FR:
      return EINV_PPF_FR_DEFAULTS
    default:
      return null
  }
}

/**
 * Generate the full inbox endpoint URL for receiving eInvoices via OID4VP.
 *
 * The URL structure is: {baseUrl}/inbox/{inboxName}/{folderName}
 * - baseUrl: The DID's public base URL (derived from did:web hostname)
 * - inboxName: The inbox to receive into (defaults to "einvoices")
 * - folderName: The folder within the inbox (defaults to serviceId)
 */
export const generateInboxEndpoint = (
  baseUrl: string,
  inboxName: string = 'einvoices',
  folderName: string
): string => {
  // Remove trailing slash from baseUrl if present
  const cleanBaseUrl = baseUrl.replace(/\/$/, '')
  // Clean the folder name (remove # prefix if present)
  const cleanFolderName = folderName.replace(/^#/, '')
  return `${cleanBaseUrl}/inbox/${inboxName}/${cleanFolderName}`
}

/**
 * eInvoice data item stored in the eInvoice array of a service endpoint.
 * Contains entity and network-specific information.
 */
export interface EInvoiceDataItem {
  entityName: string
  country: string
  documentIdentifiers: string[]
  processIdentifiers: string[]
  transportType: string
  // PEPPOL-specific
  peppolParticipantId?: string
  peppolSmpUrl?: string
  peppolAs4Endpoint?: string
  // PPF-FR-specific
  ppfPlatformId?: string
  ppfRecipientIds?: string[]
  ppfMode?: PpfMode
  ppfApiEndpoint?: string
}

/**
 * Internal eInvoice service data structure used during creation.
 * Contains both the public DID document data and internal inbox configuration.
 */
export interface EInvoiceServiceData {
  // Data that goes into the eInvoice array in DID document
  entityName: string
  country: string
  documentIdentifiers: string[]
  processIdentifiers: string[]
  transportType: string
  // Internal inbox configuration (not exposed in DID document)
  inboxName?: string // defaults to "einvoices"
  folderName?: string // defaults to service ID
  // PEPPOL-specific
  peppolParticipantId?: string
  peppolSmpUrl?: string
  peppolAs4Endpoint?: string
  // PPF-FR-specific
  ppfPlatformId?: string
  ppfRecipientIds?: string[]
  ppfMode?: PpfMode
  ppfApiEndpoint?: string
}
