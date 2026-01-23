/**
 * Invoice Sending Service
 *
 * Shared service for preparing and sending eInvoice credentials via OID4VP.
 * Used by eInvoice API and Outbox API.
 */

import { TAgent } from '@veramo/core'
import { TAgentTypes } from '../types'
import { ASSET_BASE_URI, ASSET_DEFAULT_AVAILABILITY_YEARS } from '../environment-vars'
import { issueEInvoiceCredential } from '../utils/einvoiceCredentialIssuer'
import { validateParsedEInvoice, ParsedEInvoice } from '../utils/ublParser'
import { Asset } from '../plugins/asset'
import { getDefaultDID, getIdentifier } from '../utils'
import { completeOid4vpPresentation } from './oid4vpPresentationService'

/**
 * Result of sending an invoice
 */
export interface InvoiceSendResult {
  success: boolean
  credentialId?: string
  credentialHash?: string
  correlationId?: string
  evidenceCount?: number
  error?: string
}

/**
 * Invoice data in the format used by the frontend/API
 */
export interface InvoiceData {
  invoiceId: string
  invoiceDate: string
  dueDate?: string
  currencyCode: string
  taxExclusiveAmount: number
  taxAmount: number
  taxInclusiveAmount: number
  payableAmount: number
  sellerName: string
  sellerTaxId?: string
  sellerAddress?: {
    street?: string
    city?: string
    postalCode?: string
    countryCode?: string
  }
  buyerName: string
  buyerTaxId?: string
  buyerAddress?: {
    street?: string
    city?: string
    postalCode?: string
    countryCode?: string
  }
  invoiceTypeCode?: string
  note?: string
  paymentTerms?: string
  paymentMeansCode?: string
}

/**
 * Parameters for sending an invoice to a recipient
 */
export interface SendInvoiceParams {
  /** Invoice data to include in the credential */
  invoiceData: InvoiceData
  /** Asset IDs for evidence files */
  evidenceIds: string[]
  /** Recipient's DID */
  recipientDid: string
  /** Recipient's inbox endpoint URL */
  recipientEndpoint: string
  /** Type of recipient endpoint (e.g., 'EInvoiceInbox') */
  recipientEndpointType?: string
}

/**
 * Options for invoice sending
 */
export interface InvoiceSendingOptions {
  /** Log prefix for console messages */
  logPrefix?: string
}

/**
 * Convert frontend invoice data format to backend ParsedEInvoice format
 */
export function mapToParseEInvoice(data: InvoiceData): ParsedEInvoice {
  return {
    invoice_id: data.invoiceId,
    invoice_date: data.invoiceDate,
    due_date: data.dueDate,
    currency_code: data.currencyCode,
    tax_exclusive_amount: data.taxExclusiveAmount,
    tax_amount: data.taxAmount,
    tax_inclusive_amount: data.taxInclusiveAmount,
    payable_amount: data.payableAmount,
    seller_name: data.sellerName,
    seller_tax_id: data.sellerTaxId,
    seller_address: data.sellerAddress ? {
      street: data.sellerAddress.street,
      city: data.sellerAddress.city,
      postal_code: data.sellerAddress.postalCode,
      country_code: data.sellerAddress.countryCode,
    } : undefined,
    buyer_name: data.buyerName,
    buyer_tax_id: data.buyerTaxId,
    buyer_address: data.buyerAddress ? {
      street: data.buyerAddress.street,
      city: data.buyerAddress.city,
      postal_code: data.buyerAddress.postalCode,
      country_code: data.buyerAddress.countryCode,
    } : undefined,
    invoice_type_code: data.invoiceTypeCode,
    note: data.note,
    payment_terms: data.paymentTerms,
    payment_means_code: data.paymentMeansCode,
  }
}

/**
 * Fetch and publish evidence assets, ensuring they have proper availability windows.
 *
 * @param agent - The Veramo agent instance
 * @param assetIds - Array of asset IDs to fetch and publish
 * @param options - Optional configuration
 * @returns Array of published Asset objects
 */
export async function prepareEvidenceAssets(
  agent: TAgent<TAgentTypes>,
  assetIds: string[],
  options?: InvoiceSendingOptions
): Promise<Asset[]> {
  const prefix = options?.logPrefix ?? '[Invoice]'
  const evidenceFiles: Asset[] = []
  const availableUntil = new Date()
  availableUntil.setFullYear(availableUntil.getFullYear() + ASSET_DEFAULT_AVAILABILITY_YEARS)

  for (const assetId of assetIds) {
    const asset = await agent.assetGetById({ id: assetId })
    if (asset) {
      // Always publish/update asset to ensure it's public with proper availability window
      const needsPublish = !asset.isPublic || !asset.availableUntil || asset.availableUntil < availableUntil
      if (needsPublish) {
        console.log(`${prefix} Publishing asset ${assetId} with ${ASSET_DEFAULT_AVAILABILITY_YEARS} year availability`)
        const publishedAsset = await agent.assetPublish({
          id: assetId,
          availableUntil,
        })
        evidenceFiles.push(publishedAsset)
      } else {
        evidenceFiles.push(asset)
      }
    } else {
      console.warn(`${prefix} Asset not found: ${assetId}`)
    }
  }

  console.log(`${prefix} Loaded and published ${evidenceFiles.length} assets`)
  return evidenceFiles
}

/**
 * Send an invoice to a recipient's inbox via OID4VP.
 *
 * This function:
 * 1. Gets the sender's default DID and issuer identifier
 * 2. Fetches and publishes evidence assets
 * 3. Validates and issues the eInvoice credential
 * 4. Initiates OID4VP flow with recipient's inbox
 * 5. Completes the OID4VP presentation flow
 *
 * @param agent - The Veramo agent instance
 * @param params - Parameters for sending the invoice
 * @param options - Optional configuration
 * @returns Result indicating success or failure with credential ID
 */
export async function sendInvoiceToRecipient(
  agent: TAgent<TAgentTypes>,
  params: SendInvoiceParams,
  options?: InvoiceSendingOptions
): Promise<InvoiceSendResult> {
  const prefix = options?.logPrefix ?? '[Invoice]'
  const { invoiceData, evidenceIds, recipientDid, recipientEndpoint, recipientEndpointType } = params

  try {
    console.log(`${prefix} Sending invoice ${invoiceData.invoiceId} to ${recipientDid}`)

    // Step 1: Get sender's DID and identifier
    const senderDid = await getDefaultDID()
    if (!senderDid) {
      return { success: false, error: 'No default DID configured for this agent' }
    }

    const senderIdentifier = await getIdentifier(senderDid)
    if (!senderIdentifier) {
      return { success: false, error: 'Could not get identifier for sender DID' }
    }

    console.log(`${prefix} Sender DID: ${senderDid}`)

    // Step 2: Fetch and publish evidence assets
    const evidenceFiles = await prepareEvidenceAssets(agent, evidenceIds, options)

    // Step 3: Build parsed invoice format and validate
    const parsedInvoice = mapToParseEInvoice(invoiceData)
    const validationErrors = validateParsedEInvoice(parsedInvoice)
    if (validationErrors.length > 0) {
      return { success: false, error: `Invalid invoice data: ${validationErrors.join(', ')}` }
    }

    // Step 4: Issue the eInvoice credential
    const evidenceBaseUrl = ASSET_BASE_URI
    console.log(`${prefix} Asset base URL: ${evidenceBaseUrl}`)

    const issuedCredential = await issueEInvoiceCredential(
      agent,
      senderIdentifier,
      {
        invoiceData: parsedInvoice,
        evidenceFiles,
        evidenceBaseUrl,
        subjectDid: recipientDid,
      }
    )

    console.log(`${prefix} Credential issued with hash: ${issuedCredential.hash}`)

    // Step 5: Send credential to recipient's inbox via OID4VP
    console.log(`${prefix} Sending to inbox, endpoint: ${recipientEndpoint}`)
    const sendResult = await agent.inboxSendToRecipient({
      recipientDid,
      credential: issuedCredential.credential,
      senderDid,
      serviceType: recipientEndpointType || 'EInvoiceInbox',
      endpoint: recipientEndpoint,
    })

    if (!sendResult.success) {
      console.error(`${prefix} Failed to initiate OID4VP flow: ${sendResult.error}`)
      return {
        success: false,
        credentialHash: issuedCredential.hash,
        error: `Failed to initiate OID4VP flow: ${sendResult.error}`,
      }
    }

    console.log(`${prefix} OID4VP flow initiated, request_uri: ${sendResult.requestUri}`)

    // Step 6: Complete the OID4VP presentation flow
    if (sendResult.requestUri) {
      const presentationResult = await completeOid4vpPresentation(
        agent,
        sendResult.requestUri,
        issuedCredential.credential,
        senderDid,
        { logPrefix: prefix }
      )

      if (!presentationResult.success) {
        console.error(`${prefix} Failed to complete OID4VP presentation: ${presentationResult.error}`)
        return {
          success: false,
          credentialId: issuedCredential.hash,
          credentialHash: issuedCredential.hash,
          error: `Failed to complete OID4VP presentation: ${presentationResult.error}`,
        }
      }

      console.log(`${prefix} OID4VP presentation completed successfully`)
    }

    return {
      success: true,
      credentialId: issuedCredential.hash,
      credentialHash: issuedCredential.hash,
      evidenceCount: issuedCredential.evidence.length,
      correlationId: sendResult.correlationId,
    }
  } catch (error: any) {
    console.error(`${prefix} Error sending invoice:`, error)
    return {
      success: false,
      error: error.message || 'Failed to send invoice',
    }
  }
}

export default sendInvoiceToRecipient
