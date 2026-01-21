/**
 * Outbox entity types for storing outbound eInvoice items.
 */

/** Status of an outbox item */
export type OutboxItemStatus = 'draft' | 'sending' | 'sent' | 'failed'

/** Evidence file metadata */
export interface OutboxEvidenceFile {
  id: string
  digestMultibase: string
  filename: string
  contentType: string
  evidenceType: 'UBLInvoice' | 'SupportingDocument'
}

/** Party data (seller or buyer) */
export interface OutboxPartyData {
  name: string
  vatNumber?: string
  chamberOfCommerce?: string
  gln?: string
  iban?: string
  email?: string
  address?: {
    street: string
    city: string
    postalCode: string
    country: string
  }
}

/** Invoice line item */
export interface OutboxLineItem {
  lineNumber: number
  description: string
  note?: string
  quantity: number
  quantityUnit?: string
  unitPrice: number
  vatPercent: number
  lineTotal: number
}

/** Outbox item entity */
export interface OutboxItem {
  id: string
  tenantId?: string
  status: OutboxItemStatus

  // Invoice identification
  invoiceId: string
  invoiceDate: string
  dueDate?: string
  currencyCode: string

  // Amounts
  taxExclusiveAmount?: number
  taxAmount?: number
  taxInclusiveAmount?: number
  payableAmount?: number

  // Party info
  sellerData?: OutboxPartyData
  buyerData?: OutboxPartyData
  lineItems?: OutboxLineItem[]

  // Evidence files
  evidenceFiles: OutboxEvidenceFile[]

  // Recipient info
  recipientDid: string
  recipientName?: string
  recipientEndpoint?: string
  recipientEndpointId?: string
  recipientEndpointType?: string

  // Source info
  hasUblSource: boolean
  ublXmlHash?: string

  // Result info
  credentialId?: string
  correlationId?: string
  errorMessage?: string

  // Timestamps
  createdAt: Date
  updatedAt: Date
  sentAt?: Date
  deliveredAt?: Date
}
