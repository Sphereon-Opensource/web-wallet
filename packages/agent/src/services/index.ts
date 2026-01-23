/**
 * Shared Services
 *
 * This module exports shared services used across multiple API servers.
 */

export {
  completeOid4vpPresentation,
  type Oid4vpPresentationResult,
  type Oid4vpPresentationOptions,
} from './oid4vpPresentationService'

export {
  sendInvoiceToRecipient,
  prepareEvidenceAssets,
  mapToParseEInvoice,
  type InvoiceSendResult,
  type InvoiceData,
  type SendInvoiceParams,
  type InvoiceSendingOptions,
} from './invoiceSendingService'
