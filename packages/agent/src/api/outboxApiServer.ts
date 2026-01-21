import { Router, Request, Response, NextFunction } from 'express'
import { TAgent } from '@veramo/core'
import { ExpressSupport } from '@sphereon/ssi-express-support'
import { TAgentTypes } from '../types'
import { INBOX_API_BASE_PATH, ASSET_BASE_URI, ASSET_DEFAULT_AVAILABILITY_YEARS } from '../environment-vars'
import { issueEInvoiceCredential } from '../utils/einvoiceCredentialIssuer'
import { validateParsedEInvoice } from '../utils/ublParser'
import { Asset } from '../plugins/asset'
import { getDefaultDID, getIdentifier } from '../utils'
import { CredentialCorrelationType, type AddDigitalCredential } from '@sphereon/ssi-sdk.credential-store'
import { CredentialRole } from '@sphereon/ssi-types'
import type { Siopv2AuthorizationRequestData } from '@sphereon/ssi-sdk.siopv2-oid4vp-op-auth'
import { v4 as uuidv4 } from 'uuid'
import { OutboxItem } from '../plugins/outbox'

export interface OutboxApiServerOptions {
  agent: TAgent<TAgentTypes>
  expressSupport: ExpressSupport
  opts?: {
    basePath?: string
  }
}

/**
 * API Server for outbox operations.
 *
 * Endpoints:
 * - GET /outbox - List all outbox items (with optional status filter)
 * - POST /outbox - Create new outbox item (draft)
 * - GET /outbox/:id - Get outbox item by ID
 * - PUT /outbox/:id - Update outbox item
 * - DELETE /outbox/:id - Delete outbox item
 * - POST /outbox/:id/send - Send outbox item to recipient
 */
export class OutboxApiServer {
  private readonly agent: TAgent<TAgentTypes>
  private readonly router: Router
  private readonly basePath: string

  constructor(options: OutboxApiServerOptions) {
    this.agent = options.agent
    this.basePath = options.opts?.basePath ?? INBOX_API_BASE_PATH
    this.router = Router()

    this.setupRoutes()

    // Register routes with express
    const app = options.expressSupport.express
    app.use(this.basePath, this.router)

    console.log(`[Outbox] API server started at ${this.basePath}`)
  }

  private setupRoutes(): void {
    // Outbox CRUD
    this.router.get('/outbox', this.listOutboxItems.bind(this))
    this.router.post('/outbox', this.createOutboxItem.bind(this))
    this.router.get('/outbox/:id', this.getOutboxItem.bind(this))
    this.router.put('/outbox/:id', this.updateOutboxItem.bind(this))
    this.router.delete('/outbox/:id', this.deleteOutboxItem.bind(this))

    // Send action
    this.router.post('/outbox/:id/send', this.sendOutboxItem.bind(this))
  }

  // ===== Outbox Endpoints =====

  /**
   * List all outbox items with optional filters.
   * Query params:
   * - folder: Filter by folder (drafts, outbox, sent) - maps to status values
   *   - drafts: status in ['draft', 'failed']
   *   - outbox: status in ['sending']
   *   - sent: status in ['sent']
   * - status: Filter by status (draft, sending, sent, failed) - can be comma-separated
   * - recipientDid: Filter by recipient DID
   * - limit: Max number of results
   * - offset: Pagination offset
   */
  private async listOutboxItems(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { folder, status, recipientDid, limit, offset } = req.query

      // Map folder to status filter
      let statusFilter: string | string[] | undefined
      if (folder) {
        switch (folder) {
          case 'drafts':
            statusFilter = ['draft', 'failed']
            break
          case 'outbox':
            statusFilter = ['sending']
            break
          case 'sent':
            statusFilter = ['sent']
            break
          default:
            // Unknown folder, ignore
            break
        }
      } else if (status) {
        // Parse status - can be single value or comma-separated
        const statusStr = status as string
        if (statusStr.includes(',')) {
          statusFilter = statusStr.split(',').map(s => s.trim())
        } else {
          statusFilter = statusStr
        }
      }

      const items = await this.agent.outboxItemList({
        status: statusFilter as any,
        recipientDid: recipientDid as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      })

      res.json(items)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Create a new outbox item (draft).
   */
  private async createOutboxItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        invoiceId,
        invoiceDate,
        dueDate,
        currencyCode,
        taxExclusiveAmount,
        taxAmount,
        taxInclusiveAmount,
        payableAmount,
        sellerData,
        buyerData,
        lineItems,
        evidenceFiles,
        recipientDid,
        recipientName,
        recipientEndpoint,
        recipientEndpointId,
        recipientEndpointType,
        hasUblSource,
        ublXmlHash,
        tenantId,
      } = req.body

      // Validate required fields
      if (!invoiceId || !invoiceDate || !currencyCode || !recipientDid) {
        res.status(400).json({
          error: 'invoiceId, invoiceDate, currencyCode, and recipientDid are required'
        })
        return
      }

      const item = await this.agent.outboxItemCreate({
        invoiceId,
        invoiceDate,
        dueDate,
        currencyCode,
        taxExclusiveAmount,
        taxAmount,
        taxInclusiveAmount,
        payableAmount,
        sellerData,
        buyerData,
        lineItems,
        evidenceFiles: evidenceFiles || [],
        recipientDid,
        recipientName,
        recipientEndpoint,
        recipientEndpointId,
        recipientEndpointType,
        hasUblSource,
        ublXmlHash,
        tenantId,
      })

      res.status(201).json(item)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get an outbox item by ID.
   */
  private async getOutboxItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params
      const item = await this.agent.outboxItemGet({ id })

      if (!item) {
        res.status(404).json({ error: 'Outbox item not found' })
        return
      }

      res.json(item)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Update an outbox item.
   * Only allowed for items with status 'draft' or 'failed'.
   */
  private async updateOutboxItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params
      const updateData = req.body

      // Check if item exists
      const existing = await this.agent.outboxItemGet({ id })
      if (!existing) {
        res.status(404).json({ error: 'Outbox item not found' })
        return
      }

      // Only allow updates to draft or failed items
      if (existing.status !== 'draft' && existing.status !== 'failed') {
        res.status(400).json({
          error: `Cannot update outbox item with status: ${existing.status}`
        })
        return
      }

      const item = await this.agent.outboxItemUpdate({
        id,
        ...updateData,
      })

      res.json(item)
    } catch (error: any) {
      if (error.message?.includes('Cannot update')) {
        res.status(400).json({ error: error.message })
        return
      }
      next(error)
    }
  }

  /**
   * Delete an outbox item.
   */
  private async deleteOutboxItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params
      const deleted = await this.agent.outboxItemDelete({ id })

      if (!deleted) {
        res.status(404).json({ error: 'Outbox item not found' })
        return
      }

      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }

  /**
   * Send an outbox item to its recipient.
   * This initiates the actual send process.
   */
  private async sendOutboxItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params

      // Get the item first
      const item = await this.agent.outboxItemGet({ id })
      if (!item) {
        res.status(404).json({ error: 'Outbox item not found' })
        return
      }

      // Check if it can be sent
      if (item.status !== 'draft' && item.status !== 'failed') {
        res.status(400).json({
          error: `Cannot send outbox item with status: ${item.status}`
        })
        return
      }

      if (!item.recipientEndpoint) {
        res.status(400).json({ error: 'No recipient endpoint configured' })
        return
      }

      // Update status to sending
      await this.agent.outboxItemUpdateStatus({
        id,
        status: 'sending',
      })

      // Call the eInvoice send API (the actual send logic)
      // This is done in a separate try-catch so we can handle errors properly
      try {
        const sendResult = await this.sendToRecipient(item)

        if (sendResult.success) {
          // Update status to sent
          await this.agent.outboxItemUpdateStatus({
            id,
            status: 'sent',
            credentialId: sendResult.credentialId,
            correlationId: sendResult.correlationId,
          })

          res.json({
            success: true,
            credentialId: sendResult.credentialId,
            correlationId: sendResult.correlationId,
          })
        } else {
          // Update status to failed
          await this.agent.outboxItemUpdateStatus({
            id,
            status: 'failed',
            errorMessage: sendResult.errorMessage,
          })

          res.status(500).json({
            success: false,
            error: sendResult.errorMessage,
          })
        }
      } catch (sendError: any) {
        // Update status to failed
        await this.agent.outboxItemUpdateStatus({
          id,
          status: 'failed',
          errorMessage: sendError.message || 'Failed to send eInvoice',
        })

        res.status(500).json({
          success: false,
          error: sendError.message || 'Failed to send eInvoice',
        })
      }
    } catch (error) {
      next(error)
    }
  }

  /**
   * Actually send the invoice to the recipient.
   * This follows the same flow as einvoiceApiServer.ts:
   * 1. Get sender's DID and identifier
   * 2. Fetch and publish evidence assets
   * 3. Issue the eInvoice credential
   * 4. Send via OID4VP
   * 5. Complete the OID4VP presentation flow
   */
  private async sendToRecipient(item: OutboxItem): Promise<{
    success: boolean
    credentialId?: string
    correlationId?: string
    errorMessage?: string
  }> {
    try {
      console.log(`[Outbox] Sending invoice ${item.invoiceId} to ${item.recipientDid}`)

      // Step 1: Get sender's DID and identifier
      const senderDid = await getDefaultDID()
      if (!senderDid) {
        return { success: false, errorMessage: 'No default DID configured for this agent' }
      }

      const senderIdentifier = await getIdentifier(senderDid)
      if (!senderIdentifier) {
        return { success: false, errorMessage: 'Could not get identifier for sender DID' }
      }

      console.log(`[Outbox] Sender DID: ${senderDid}`)

      // Step 2: Fetch and publish evidence assets
      const evidenceFiles: Asset[] = []
      const availableUntil = new Date()
      availableUntil.setFullYear(availableUntil.getFullYear() + ASSET_DEFAULT_AVAILABILITY_YEARS)

      for (const evidenceFile of item.evidenceFiles || []) {
        const asset = await this.agent.assetGetById({ id: evidenceFile.id })
        if (asset) {
          // Publish asset if not already public or availability window needs update
          const needsPublish = !asset.isPublic || !asset.availableUntil || asset.availableUntil < availableUntil
          if (needsPublish) {
            console.log(`[Outbox] Publishing asset ${evidenceFile.id} with ${ASSET_DEFAULT_AVAILABILITY_YEARS} year availability`)
            const publishedAsset = await this.agent.assetPublish({
              id: evidenceFile.id,
              availableUntil,
            })
            evidenceFiles.push(publishedAsset)
          } else {
            evidenceFiles.push(asset)
          }
        } else {
          console.warn(`[Outbox] Asset not found: ${evidenceFile.id}`)
        }
      }

      console.log(`[Outbox] Loaded and published ${evidenceFiles.length} assets`)

      // Step 3: Build parsed invoice format and issue credential
      const parsedInvoice = {
        invoice_id: item.invoiceId,
        invoice_date: item.invoiceDate,
        due_date: item.dueDate,
        currency_code: item.currencyCode,
        tax_exclusive_amount: item.taxExclusiveAmount ?? 0,
        tax_amount: item.taxAmount ?? 0,
        tax_inclusive_amount: item.taxInclusiveAmount ?? 0,
        payable_amount: item.payableAmount ?? 0,
        seller_name: item.sellerData?.name || 'Unknown Seller',
        seller_tax_id: item.sellerData?.vatNumber,
        seller_address: item.sellerData?.address ? {
          street: item.sellerData.address.street,
          city: item.sellerData.address.city,
          postal_code: item.sellerData.address.postalCode,
          country_code: item.sellerData.address.country,
        } : undefined,
        buyer_name: item.buyerData?.name || 'Unknown Buyer',
        buyer_tax_id: item.buyerData?.vatNumber,
        buyer_address: item.buyerData?.address ? {
          street: item.buyerData.address.street,
          city: item.buyerData.address.city,
          postal_code: item.buyerData.address.postalCode,
          country_code: item.buyerData.address.country,
        } : undefined,
      }

      // Validate invoice data
      const validationErrors = validateParsedEInvoice(parsedInvoice)
      if (validationErrors.length > 0) {
        return { success: false, errorMessage: `Invalid invoice data: ${validationErrors.join(', ')}` }
      }

      const evidenceBaseUrl = ASSET_BASE_URI
      console.log(`[Outbox] Asset base URL: ${evidenceBaseUrl}`)

      // Issue the credential
      const issuedCredential = await issueEInvoiceCredential(
        this.agent,
        senderIdentifier,
        {
          invoiceData: parsedInvoice,
          evidenceFiles,
          evidenceBaseUrl,
          subjectDid: item.recipientDid,
        }
      )

      console.log(`[Outbox] Credential issued with hash: ${issuedCredential.hash}`)

      // Step 4: Send credential to recipient's inbox via OID4VP
      console.log(`[Outbox] Sending to inbox, endpoint: ${item.recipientEndpoint}`)
      const sendResult = await this.agent.inboxSendToRecipient({
        recipientDid: item.recipientDid,
        credential: issuedCredential.credential,
        senderDid: senderDid,
        serviceType: item.recipientEndpointType || 'EInvoiceInbox',
        endpoint: item.recipientEndpoint,
      })

      if (!sendResult.success) {
        console.error(`[Outbox] Failed to initiate OID4VP flow: ${sendResult.error}`)
        return {
          success: false,
          errorMessage: `Failed to initiate OID4VP flow: ${sendResult.error}`,
        }
      }

      console.log(`[Outbox] OID4VP flow initiated, request_uri: ${sendResult.requestUri}`)

      // Step 5: Complete the OID4VP presentation flow
      if (sendResult.requestUri) {
        const presentationResult = await this.completeOid4vpPresentation(
          sendResult.requestUri,
          issuedCredential.credential,
          senderDid
        )

        if (!presentationResult.success) {
          console.error(`[Outbox] Failed to complete OID4VP presentation: ${presentationResult.error}`)
          return {
            success: false,
            credentialId: issuedCredential.hash,
            errorMessage: `Failed to complete OID4VP presentation: ${presentationResult.error}`,
          }
        }

        console.log(`[Outbox] OID4VP presentation completed successfully`)
      }

      return {
        success: true,
        credentialId: issuedCredential.hash,
        correlationId: sendResult.correlationId,
      }
    } catch (error: any) {
      console.error('[Outbox] Error sending invoice:', error)
      return {
        success: false,
        errorMessage: error.message || 'Failed to send to recipient',
      }
    }
  }

  /**
   * Complete the OID4VP presentation flow using the SDK's SIOP OP holder methods.
   */
  private async completeOid4vpPresentation(
    requestUri: string,
    credential: string,
    holderDid: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[Outbox] Starting OID4VP presentation using SDK methods`)

      // Step 1: Store the SD-JWT credential in the credential store
      const credentialToStore: AddDigitalCredential = {
        rawDocument: credential,
        issuerCorrelationId: holderDid,
        issuerCorrelationType: CredentialCorrelationType.DID,
        subjectCorrelationId: holderDid,
        subjectCorrelationType: CredentialCorrelationType.DID,
        credentialRole: CredentialRole.HOLDER,
        isIssuerSigned: true,
      }

      console.log(`[Outbox] Storing credential in credential store`)
      const storedCredential = await this.agent.crsAddCredential({
        credential: credentialToStore,
      })
      console.log(`[Outbox] Credential stored with id: ${storedCredential.id}`)

      // Step 2: Use SDK's siopGetSiopRequest to parse the authorization request
      console.log(`[Outbox] Calling siopGetSiopRequest with URL: ${requestUri}`)
      let authorizationRequestData: Siopv2AuthorizationRequestData

      const sessionId = `outbox-${Date.now()}`
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
        console.log(`[Outbox] Authorization request parsed, correlationId: ${authorizationRequestData.correlationId}`)
      } catch (error: any) {
        console.error(`[Outbox] Failed to parse authorization request:`, error)
        return { success: false, error: `Failed to parse authorization request: ${error.message}` }
      }

      // Step 3: Get the holder's identifier for signing
      const holderIdentifier = await getIdentifier(holderDid)
      if (!holderIdentifier) {
        return { success: false, error: 'Could not get holder identifier' }
      }

      // Step 4: Retrieve the credential as a UniqueDigitalCredential
      console.log(`[Outbox] Retrieving credential with id: ${storedCredential.id}, hash: ${storedCredential.hash}`)
      const uniqueCredential = await this.agent.crsGetUniqueCredentialByIdOrHash({
        credentialRole: CredentialRole.HOLDER,
        idOrHash: storedCredential.hash,
      })

      if (!uniqueCredential) {
        return { success: false, error: 'Could not retrieve stored credential' }
      }

      console.log(`[Outbox] Calling siopSendResponse with holder: ${holderDid}`)

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

        console.log(`[Outbox] OID4VP response sent successfully`)
        console.log(`[Outbox] Response URL: ${response.url}`)

        return { success: true }
      } catch (error: any) {
        console.error(`[Outbox] Failed to send OID4VP response:`, error)
        return { success: false, error: `Failed to send OID4VP response: ${error.message}` }
      }
    } catch (error: any) {
      console.error('[Outbox] Error in OID4VP presentation:', error)
      return { success: false, error: error.message }
    }
  }
}
