/**
 * Argument types for outbox plugin methods.
 */

import type { OutboxItemStatus, OutboxPartyData, OutboxLineItem, OutboxEvidenceFile } from './entities'

/** Arguments for creating an outbox item */
export interface OutboxItemCreateArgs {
  tenantId?: string

  // Invoice data
  invoiceId: string
  invoiceDate: string
  dueDate?: string
  currencyCode: string
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
  hasUblSource?: boolean
  ublXmlHash?: string
}

/** Arguments for getting an outbox item by ID */
export interface OutboxItemGetArgs {
  id: string
}

/** Arguments for listing outbox items */
export interface OutboxItemListArgs {
  /** Filter by status (e.g., 'draft', 'sent') */
  status?: OutboxItemStatus | OutboxItemStatus[]
  /** Filter by recipient DID */
  recipientDid?: string
  /** Filter by tenant ID */
  tenantId?: string
  /** Limit number of results */
  limit?: number
  /** Offset for pagination */
  offset?: number
}

/** Arguments for updating an outbox item */
export interface OutboxItemUpdateArgs {
  id: string

  // Allow updating most fields
  invoiceId?: string
  invoiceDate?: string
  dueDate?: string
  currencyCode?: string
  taxExclusiveAmount?: number
  taxAmount?: number
  taxInclusiveAmount?: number
  payableAmount?: number
  sellerData?: OutboxPartyData
  buyerData?: OutboxPartyData
  lineItems?: OutboxLineItem[]
  evidenceFiles?: OutboxEvidenceFile[]
  recipientDid?: string
  recipientName?: string
  recipientEndpoint?: string
  recipientEndpointId?: string
  recipientEndpointType?: string
  hasUblSource?: boolean
  ublXmlHash?: string
}

/** Arguments for updating outbox item status */
export interface OutboxItemUpdateStatusArgs {
  id: string
  status: OutboxItemStatus
  /** Set on send attempt */
  credentialId?: string
  correlationId?: string
  /** Set on failure */
  errorMessage?: string
}

/** Arguments for deleting an outbox item */
export interface OutboxItemDeleteArgs {
  id: string
}

/** Arguments for sending an outbox item */
export interface OutboxItemSendArgs {
  id: string
}
