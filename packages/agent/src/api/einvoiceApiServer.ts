import { Router, Request, Response, NextFunction } from 'express'
import { TAgent } from '@veramo/core'
import { ExpressSupport } from '@sphereon/ssi-express-support'
import { TAgentTypes } from '../types'
import { ASSET_BASE_URI, ASSET_DEFAULT_AVAILABILITY_YEARS } from '../environment-vars'
import { issueEInvoiceCredential } from '../utils/einvoiceCredentialIssuer'
import { parseUblInvoice, validateParsedEInvoice } from '../utils/ublParser'
import { Asset } from '../plugins/assetPlugin'
import { getDefaultDID, getDefaultKeyRef, getIdentifier } from '../utils'
import { CredentialCorrelationType, type DigitalCredential, type UniqueDigitalCredential, type AddDigitalCredential } from '@sphereon/ssi-sdk.credential-store'
import { CredentialRole } from '@sphereon/ssi-types'
import type { Siopv2AuthorizationRequestData } from '@sphereon/ssi-sdk.siopv2-oid4vp-op-auth'
import { v4 as uuidv4 } from 'uuid'

export interface EInvoiceApiServerOptions {
  agent: TAgent<TAgentTypes>
  expressSupport: ExpressSupport
  opts?: {
    basePath?: string
  }
}

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
 * - POST /api/einvoice/send - Send an eInvoice to a recipient's inbox via OID4VP
 */
export class EInvoiceApiServer {
  private readonly agent: TAgent<TAgentTypes>
  private readonly router: Router
  private readonly basePath: string

  constructor(options: EInvoiceApiServerOptions) {
    this.agent = options.agent
    this.basePath = options.opts?.basePath ?? '/api'
    this.router = Router()

    this.setupRoutes()

    // Register routes with express
    const app = options.expressSupport.express
    app.use(this.basePath, this.router)

    console.log(`[eInvoice] API server started at ${this.basePath}`)
  }

  private setupRoutes(): void {
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
        res.status(400).json({ error: 'xml field is required and must be a string' })
        return
      }

      const parsedData = await parseUblInvoice(xml)
      res.status(200).json(parsedData)
    } catch (error: any) {
      console.error('[eInvoice] Error parsing UBL:', error)
      res.status(400).json({ error: error.message || 'Failed to parse UBL XML' })
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
        res.status(400).json({ error: 'invoiceData, recipientDid, and recipientEndpoint are required' })
        return
      }

      console.log(`[eInvoice] Sending invoice ${body.invoiceData.invoiceId} to ${body.recipientDid}`)

      // Step 1: Get sender's DID and identifier
      const senderDid = await getDefaultDID()
      if (!senderDid) {
        res.status(500).json({ error: 'No default DID configured for this agent' })
        return
      }

      const senderIdentifier = await getIdentifier(senderDid)
      if (!senderIdentifier) {
        res.status(500).json({ error: 'Could not get identifier for sender DID' })
        return
      }

      console.log(`[eInvoice] Sender DID: ${senderDid}`)

      // Step 2: Fetch and publish assets (evidence files)
      // Assets must be published (made public) with availability window before sending
      // so recipients can access them for the required retention period
      const evidenceFiles: Asset[] = []
      const availableUntil = new Date()
      availableUntil.setFullYear(availableUntil.getFullYear() + ASSET_DEFAULT_AVAILABILITY_YEARS)

      for (const assetId of body.evidenceIds || []) {
        const asset = await this.agent.assetGetById({ id: assetId })
        if (asset) {
          // Always publish/update asset to ensure it's public with proper availability window
          // Even if already public, we need to ensure the availability window is set
          const needsPublish = !asset.isPublic || !asset.availableUntil || asset.availableUntil < availableUntil
          if (needsPublish) {
            console.log(`[eInvoice] Publishing asset ${assetId} with ${ASSET_DEFAULT_AVAILABILITY_YEARS} year availability`)
            const publishedAsset = await this.agent.assetPublish({
              id: assetId,
              availableUntil,
            })
            evidenceFiles.push(publishedAsset)
          } else {
            evidenceFiles.push(asset)
          }
        } else {
          console.warn(`[eInvoice] Asset not found: ${assetId}`)
        }
      }

      console.log(`[eInvoice] Loaded and published ${evidenceFiles.length} assets`)

      // Step 3: Issue the eInvoice credential
      // Map frontend invoice data to backend ParsedEInvoice format
      const parsedInvoice = {
        invoice_id: body.invoiceData.invoiceId,
        invoice_date: body.invoiceData.invoiceDate,
        due_date: body.invoiceData.dueDate,
        currency_code: body.invoiceData.currencyCode,
        tax_exclusive_amount: body.invoiceData.taxExclusiveAmount,
        tax_amount: body.invoiceData.taxAmount,
        tax_inclusive_amount: body.invoiceData.taxInclusiveAmount,
        payable_amount: body.invoiceData.payableAmount,
        seller_name: body.invoiceData.sellerName,
        seller_tax_id: body.invoiceData.sellerTaxId,
        seller_address: body.invoiceData.sellerAddress ? {
          street: body.invoiceData.sellerAddress.street,
          city: body.invoiceData.sellerAddress.city,
          postal_code: body.invoiceData.sellerAddress.postalCode,
          country_code: body.invoiceData.sellerAddress.countryCode,
        } : undefined,
        buyer_name: body.invoiceData.buyerName,
        buyer_tax_id: body.invoiceData.buyerTaxId,
        buyer_address: body.invoiceData.buyerAddress ? {
          street: body.invoiceData.buyerAddress.street,
          city: body.invoiceData.buyerAddress.city,
          postal_code: body.invoiceData.buyerAddress.postalCode,
          country_code: body.invoiceData.buyerAddress.countryCode,
        } : undefined,
        invoice_type_code: body.invoiceData.invoiceTypeCode,
        note: body.invoiceData.note,
        payment_terms: body.invoiceData.paymentTerms,
        payment_means_code: body.invoiceData.paymentMeansCode,
      }

      // Validate invoice data
      const validationErrors = validateParsedEInvoice(parsedInvoice)
      if (validationErrors.length > 0) {
        res.status(400).json({ error: `Invalid invoice data: ${validationErrors.join(', ')}` })
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
        res.status(502).json({
          error: `Failed to initiate OID4VP flow: ${sendResult.error}`,
          inboxEndpoint: sendResult.inboxEndpoint,
        })
        return
      }

      console.log(`[eInvoice] OID4VP flow initiated, request_uri: ${sendResult.requestUri}`)

      // Step 5: Complete the OID4VP presentation flow
      if (sendResult.requestUri) {
        try {
          const presentationResult = await this.completeOid4vpPresentation(
            sendResult.requestUri,
            issuedCredential.credential,
            senderDid
          )

          if (!presentationResult.success) {
            console.error(`[eInvoice] Failed to complete OID4VP presentation: ${presentationResult.error}`)
            res.status(502).json({
              error: `Failed to complete OID4VP presentation: ${presentationResult.error}`,
              credentialHash: issuedCredential.hash,
            })
            return
          }

          console.log(`[eInvoice] OID4VP presentation completed successfully`)
        } catch (error: any) {
          console.error(`[eInvoice] Error completing OID4VP presentation:`, error)
          res.status(502).json({
            error: `Error completing OID4VP presentation: ${error.message}`,
            credentialHash: issuedCredential.hash,
          })
          return
        }
      }

      // Success - credential was sent to recipient
      res.status(200).json({
        success: true,
        credentialId: issuedCredential.hash,
        credentialHash: issuedCredential.hash,
        evidenceCount: issuedCredential.evidence.length,
        recipientDid: body.recipientDid,
        correlationId: sendResult.correlationId,
      })
    } catch (error: any) {
      console.error('[eInvoice] Error sending eInvoice:', error)
      res.status(500).json({ error: error.message || 'Failed to send eInvoice' })
    }
  }

  /**
   * Complete the OID4VP presentation flow using the SDK's SIOP OP holder methods.
   *
   * Flow:
   * 1. Store the credential in the credential store
   * 2. Use siopGetSiopRequest to parse the authorization request
   * 3. Use siopSendResponse to send the VP token
   */
  private async completeOid4vpPresentation(
    requestUri: string,
    credential: string,
    holderDid: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[eInvoice] Starting OID4VP presentation using SDK methods`)

      // Step 1: Store the SD-JWT credential in the credential store
      // The SDK will compute the hash, documentType, documentFormat from the rawDocument
      // isIssuerSigned=true indicates this is an already-signed credential (SD-JWT is already signed)
      const credentialToStore: AddDigitalCredential = {
        rawDocument: credential,
        issuerCorrelationId: holderDid,
        issuerCorrelationType: CredentialCorrelationType.DID,
        subjectCorrelationId: holderDid,
        subjectCorrelationType: CredentialCorrelationType.DID,
        credentialRole: CredentialRole.HOLDER,
        isIssuerSigned: true,
      }

      console.log(`[eInvoice] Storing credential in credential store`)
      const storedCredential = await this.agent.crsAddCredential({
        credential: credentialToStore,
      })
      console.log(`[eInvoice] Credential stored with id: ${storedCredential.id}`)

      // Step 2: Use SDK's siopGetSiopRequest to parse the authorization request
      console.log(`[eInvoice] Calling siopGetSiopRequest with URL: ${requestUri}`)
      let authorizationRequestData: Siopv2AuthorizationRequestData

      // Create a session config for the OID4VP holder flow
      const sessionId = `einvoice-${Date.now()}`
      const stateId = uuidv4()
      const didAuthConfig = {
        id: sessionId,
        sessionId,
        stateId,
        redirectUrl: requestUri,
        idOpts: {
          method: 'did' as const,
          identifier: holderDid,
        },
      }

      try {
        authorizationRequestData = await this.agent.siopGetSiopRequest({
          url: requestUri,
          didAuthConfig,
        })
        console.log(`[eInvoice] Authorization request parsed, correlationId: ${authorizationRequestData.correlationId}`)
      } catch (error: any) {
        console.error(`[eInvoice] Failed to parse authorization request:`, error)
        return { success: false, error: `Failed to parse authorization request: ${error.message}` }
      }

      // Step 3: Get the holder's identifier for signing
      const holderIdentifier = await getIdentifier(holderDid)
      if (!holderIdentifier) {
        return { success: false, error: 'Could not get holder identifier' }
      }

      // Step 4: Retrieve the credential as a UniqueDigitalCredential
      console.log(`[eInvoice] Retrieving credential with id: ${storedCredential.id}, hash: ${storedCredential.hash}`)
      const uniqueCredential = await this.agent.crsGetUniqueCredentialByIdOrHash({
        credentialRole: CredentialRole.HOLDER,
        idOrHash: storedCredential.hash,
      })

      if (!uniqueCredential) {
        return { success: false, error: 'Could not retrieve stored credential' }
      }

      console.log(`[eInvoice] UniqueCredential keys: ${Object.keys(uniqueCredential).join(', ')}`)
      console.log(`[eInvoice] Has digitalCredential: ${'digitalCredential' in uniqueCredential}`)
      console.log(`[eInvoice] Calling siopSendResponse with holder: ${holderDid}`)

      try {
        const response = await this.agent.siopSendResponse({
          didAuthConfig,
          authorizationRequestData,
          selectedCredentials: [uniqueCredential],
          idOpts: {
            method: 'did',
            identifier: holderDid,
          },
        })

        console.log(`[eInvoice] OID4VP response sent successfully`)
        console.log(`[eInvoice] Response URL: ${response.url}`)

        return { success: true }
      } catch (error: any) {
        console.error(`[eInvoice] Failed to send OID4VP response:`, error)
        return { success: false, error: `Failed to send OID4VP response: ${error.message}` }
      }
    } catch (error: any) {
      console.error('[eInvoice] Error in OID4VP presentation:', error)
      return { success: false, error: error.message }
    }
  }
}
