/**
 * Row mappers for converting database rows to entity objects.
 */

import type { OutboxItem, OutboxItemStatus, OutboxPartyData, OutboxLineItem, OutboxEvidenceFile } from '../types'

/**
 * Maps a database row to an OutboxItem entity.
 */
export function mapOutboxItemRow(row: Record<string, unknown>): OutboxItem {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string | undefined,
    status: row.status as OutboxItemStatus,

    // Invoice identification
    invoiceId: row.invoice_id as string,
    invoiceDate: row.invoice_date as string,
    dueDate: row.due_date as string | undefined,
    currencyCode: row.currency_code as string,

    // Amounts
    taxExclusiveAmount: row.tax_exclusive_amount != null ? parseFloat(row.tax_exclusive_amount as string) : undefined,
    taxAmount: row.tax_amount != null ? parseFloat(row.tax_amount as string) : undefined,
    taxInclusiveAmount: row.tax_inclusive_amount != null ? parseFloat(row.tax_inclusive_amount as string) : undefined,
    payableAmount: row.payable_amount != null ? parseFloat(row.payable_amount as string) : undefined,

    // Party info (JSONB)
    sellerData: row.seller_data as OutboxPartyData | undefined,
    buyerData: row.buyer_data as OutboxPartyData | undefined,
    lineItems: row.line_items as OutboxLineItem[] | undefined,

    // Evidence files (JSONB)
    evidenceFiles: (row.evidence_files as OutboxEvidenceFile[]) || [],

    // Recipient info
    recipientDid: row.recipient_did as string,
    recipientName: row.recipient_name as string | undefined,
    recipientEndpoint: row.recipient_endpoint as string | undefined,
    recipientEndpointId: row.recipient_endpoint_id as string | undefined,
    recipientEndpointType: row.recipient_endpoint_type as string | undefined,

    // Source info
    hasUblSource: row.has_ubl_source as boolean,
    ublXmlHash: row.ubl_xml_hash as string | undefined,

    // Result info
    credentialId: row.credential_id as string | undefined,
    correlationId: row.correlation_id as string | undefined,
    errorMessage: row.error_message as string | undefined,

    // Timestamps
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    sentAt: row.sent_at ? new Date(row.sent_at as string) : undefined,
    deliveredAt: row.delivered_at ? new Date(row.delivered_at as string) : undefined,
  }
}
