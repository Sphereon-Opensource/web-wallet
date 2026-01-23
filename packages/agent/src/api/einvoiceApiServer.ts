import { Request, Response, NextFunction } from 'express'
import { ASSET_BASE_URI } from '../environment-vars'
import { issueEInvoiceCredential } from '../utils/einvoiceCredentialIssuer'
import { parseUblInvoice, validateParsedEInvoice } from '../utils/ublParser'
import { getDefaultDID, getIdentifier } from '../utils'
import { completeOid4vpPresentation, prepareEvidenceAssets, mapToParseEInvoice } from '../services'
import { BaseApiServer, BaseApiServerOptions } from './BaseApiServer'

/**
 * Request body for sending an eInvoice
 */
export interface SendEInvoiceRequest {
  invoiceData: {
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
  evidenceIds: string[]
  recipientDid: string
  recipientEndpoint: string
  recipientEndpointType?: string
  sentInvoiceId?: string
}

/**
 * API Server for eInvoice operations.
 *
 * Endpoints:
 * - POST /api/einvoice/parse-ubl - Parse a UBL Invoice XML
 * - POST /api/einvoice/send - Send an eInvoice to a recipient's inbox via OID4VP
 */
export class EInvoiceApiServer extends BaseApiServer {
  constructor(options: BaseApiServerOptions) {
    super(options, '/api', 'eInvoice')
  }

  protected setupRoutes(): void {
    this.router.post('/einvoice/parse-ubl', this.parseUbl.bind(this))
    this.router.post('/einvoice/send', this.sendEInvoice.bind(this))
  }

  /**
   * POST /api/einvoice/parse-ubl
   *
   * Parse a UBL Invoice XML and return the extracted data.
   *
   * Request body: { xml: string }
   * Response: ParsedEInvoice
   */
  private async parseUbl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { xml } = req.body

      if (!xml || typeof xml !== 'string') {
        this.badRequest(res, 'xml field is required and must be a string')
        return
      }

      const parsedData = await parseUblInvoice(xml)
      this.success(res, parsedData)
    } catch (error: any) {
      console.error('[eInvoice] Error parsing UBL:', error)
      this.badRequest(res, error.message || 'Failed to parse UBL XML')
    }
  }

  /**
   * POST /api/einvoice/send
   *
   * Send an eInvoice to a recipient's inbox via OID4VP.
   *
   * This endpoint:
   * 1. Gets the sender's default DID and issuer identifier
   * 2. Fetches evidence files by IDs
   * 3. Creates the eInvoice credential
   * 4. Initiates OID4VP flow with recipient's inbox
   * 5. Completes the OID4VP presentation flow
   */
  private async sendEInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body: SendEInvoiceRequest = req.body

      // Validate required fields
      if (!body.invoiceData || !body.recipientDid || !body.recipientEndpoint) {
        this.badRequest(res, 'invoiceData, recipientDid, and recipientEndpoint are required')
        return
      }

      console.log(`[eInvoice] Sending invoice ${body.invoiceData.invoiceId} to ${body.recipientDid}`)

      // Step 1: Get sender's DID and identifier
      const senderDid = await getDefaultDID()
      if (!senderDid) {
        this.serverError(res, 'No default DID configured for this agent')
        return
      }

      const senderIdentifier = await getIdentifier(senderDid)
      if (!senderIdentifier) {
        this.serverError(res, 'Could not get identifier for sender DID')
        return
      }

      console.log(`[eInvoice] Sender DID: ${senderDid}`)

      // Step 2: Fetch and publish assets using shared service
      const evidenceFiles = await prepareEvidenceAssets(
        this.agent,
        body.evidenceIds || [],
        { logPrefix: '[eInvoice]' }
      )

      // Step 3: Issue the eInvoice credential
      // Map frontend invoice data to backend ParsedEInvoice format using shared mapper
      const parsedInvoice = mapToParseEInvoice(body.invoiceData)

      // Validate invoice data
      const validationErrors = validateParsedEInvoice(parsedInvoice)
      if (validationErrors.length > 0) {
        this.badRequest(res, `Invalid invoice data: ${validationErrors.join(', ')}`)
        return
      }

      // Use ASSET_BASE_URI (which defaults to AGENT_BASE_URI in environment-vars)
      const evidenceBaseUrl = ASSET_BASE_URI

      console.log(`[eInvoice] Asset base URL: ${evidenceBaseUrl}`)

      // Issue the credential
      const issuedCredential = await issueEInvoiceCredential(
        this.agent,
        senderIdentifier,
        {
          invoiceData: parsedInvoice,
          evidenceFiles,
          evidenceBaseUrl,
          subjectDid: body.recipientDid,
        }
      )

      console.log(`[eInvoice] Credential issued with hash: ${issuedCredential.hash}`)

      // Step 4: Send credential to recipient's inbox via OID4VP
      // First, POST to the inbox endpoint to initiate the flow
      console.log(`[eInvoice] Sending to inbox, endpoint: ${body.recipientEndpoint}`)
      const sendResult = await this.agent.inboxSendToRecipient({
        recipientDid: body.recipientDid,
        credential: issuedCredential.credential,
        senderDid: senderDid,
        serviceType: body.recipientEndpointType || 'EInvoiceInbox',
        endpoint: body.recipientEndpoint,
      })

      if (!sendResult.success) {
        console.error(`[eInvoice] Failed to initiate OID4VP flow: ${sendResult.error}`)
        this.badGateway(res, `Failed to initiate OID4VP flow: ${sendResult.error}`, {
          inboxEndpoint: sendResult.inboxEndpoint,
        })
        return
      }

      console.log(`[eInvoice] OID4VP flow initiated, request_uri: ${sendResult.requestUri}`)

      // Step 5: Complete the OID4VP presentation flow
      if (sendResult.requestUri) {
        try {
          const presentationResult = await completeOid4vpPresentation(
            this.agent,
            sendResult.requestUri,
            issuedCredential.credential,
            senderDid,
            { logPrefix: '[eInvoice]' }
          )

          if (!presentationResult.success) {
            console.error(`[eInvoice] Failed to complete OID4VP presentation: ${presentationResult.error}`)
            this.badGateway(res, `Failed to complete OID4VP presentation: ${presentationResult.error}`, {
              credentialHash: issuedCredential.hash,
            })
            return
          }

          console.log(`[eInvoice] OID4VP presentation completed successfully`)
        } catch (error: any) {
          console.error(`[eInvoice] Error completing OID4VP presentation:`, error)
          this.badGateway(res, `Error completing OID4VP presentation: ${error.message}`, {
            credentialHash: issuedCredential.hash,
          })
          return
        }
      }

      // Success - credential was sent to recipient
      this.success(res, {
        success: true,
        credentialId: issuedCredential.hash,
        credentialHash: issuedCredential.hash,
        evidenceCount: issuedCredential.evidence.length,
        recipientDid: body.recipientDid,
        correlationId: sendResult.correlationId,
      })
    } catch (error: any) {
      console.error('[eInvoice] Error sending eInvoice:', error)
      this.serverError(res, error.message || 'Failed to send eInvoice')
    }
  }
}

// Re-export the options type for convenience
export type EInvoiceApiServerOptions = BaseApiServerOptions
