/**
 * Types for UBL Invoice display components
 * Based on the FIDES eInvoice credential schema (urn:org:fides:einvoice:1)
 */

/**
 * Evidence storage status
 */
export type EvidenceStorageStatus = 'external' | 'fetching' | 'stored'

/**
 * Evidence document attached to the invoice credential
 */
export interface InvoiceEvidence {
  id: string
  type: string[]
  name: string
  description?: string
  digestMultibase: string
  mimeType?: string
  size?: number
  /** Storage status - whether the evidence has been fetched/stored locally */
  storageStatus?: EvidenceStorageStatus
  /** Local path if stored */
  localPath?: string
}

/**
 * Party information (supplier or customer)
 */
export interface InvoiceParty {
  name: string
  vatNumber?: string
  chamberOfCommerce?: string
  iban?: string
  gln?: string
  email?: string
  address?: {
    street: string
    city: string
    postalCode: string
    country: string
  }
  did?: string
  /** Contact ID for linking to contact details page */
  contactId?: string
}

/**
 * Invoice line item from UBL document
 */
export interface InvoiceLineItem {
  lineNumber: number
  description: string
  note?: string
  quantity: number
  quantityUnit: string
  unitPrice: number
  vatPercent: number
  lineTotal: number
}

/**
 * Credential metadata
 */
export interface CredentialInfo {
  vct: string
  format: string
  issuerDid: string
  issuerName: string
  keyId?: string
  algorithm?: string
  issuedAt: string
  expiresAt?: string
  status: 'active' | 'revoked' | 'expired' | 'suspended'
  signatureValid: boolean
}

/**
 * Invoice status
 */
export type InvoiceStatus = 'draft' | 'verified' | 'pending' | 'overdue' | 'paid' | 'invalid'

/**
 * Main UBL Invoice data structure
 * Combines credential schema fields with full UBL data
 */
export interface UBLInvoiceData {
  // Core credential schema fields
  invoiceId: string
  invoiceDate: string
  dueDate: string
  currencyCode: string
  taxExclusiveAmount: number
  taxAmount: number
  taxInclusiveAmount: number
  evidence: InvoiceEvidence[]

  // Extended UBL fields (optional, for full view)
  invoiceType?: string
  paymentTerms?: string
  supplier?: InvoiceParty
  customer?: InvoiceParty
  lineItems?: InvoiceLineItem[]

  // Credential information
  credential?: CredentialInfo

  // Display metadata
  status?: InvoiceStatus
  /** Optional override for status label display (e.g., 'Sent', 'Delivered' for outbox items) */
  statusLabel?: string
}

/**
 * Props for UBLInvoiceCard (summary view)
 */
export interface UBLInvoiceCardProps {
  invoice: UBLInvoiceData
  onViewDetails?: () => void
  onSelect?: (invoice: UBLInvoiceData) => void
  onRemove?: () => void
  selected?: boolean
  showActions?: boolean
}

/**
 * Tab identifiers for detail view
 */
export type InvoiceDetailTab = 'summary' | 'lineItems' | 'parties' | 'evidence' | 'credential'

/**
 * Props for UBLInvoiceDetailView
 */
export interface UBLInvoiceDetailViewProps {
  invoice: UBLInvoiceData
  initialTab?: InvoiceDetailTab
  onClose?: () => void
  /** Callback to fetch evidence from remote URL (when storageStatus is 'external') */
  onFetchEvidence?: (evidence: InvoiceEvidence) => void
  /** Callback to download evidence to disk (when storageStatus is 'stored') */
  onDownloadEvidence?: (evidence: InvoiceEvidence) => void
  /** Callback to view/preview evidence */
  onViewEvidence?: (evidence: InvoiceEvidence) => void
  /** Callback to view contact details - receives the party (supplier/customer) */
  onViewContact?: (party: InvoiceParty) => void
  /** Show action buttons (Approve/Reject) - typically when accessed from inbox */
  showActions?: boolean
  /** Callback when Approve button is clicked */
  onApprove?: (invoice: UBLInvoiceData) => void
  /** Callback when Reject button is clicked */
  onReject?: (invoice: UBLInvoiceData) => void
  /** Whether an action is currently processing */
  isProcessing?: boolean
}

/**
 * Format a number as currency
 */
export const formatCurrency = (amount: number, currencyCode: string): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format a date string
 */
export const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

/**
 * Truncate hash for display
 */
export const truncateHash = (hash: string, length: number = 8): string => {
  if (hash.length <= length * 2) return hash
  return `${hash.slice(0, length)}...${hash.slice(-length)}`
}
