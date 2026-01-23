import { Request, Response, NextFunction } from 'express'
import { INBOX_API_BASE_PATH, ASSET_BASE_URI } from '../environment-vars'
import { issueEInvoiceCredential } from '../utils/einvoiceCredentialIssuer'
import { validateParsedEInvoice } from '../utils/ublParser'
import { getDefaultDID, getIdentifier } from '../utils'
import { completeOid4vpPresentation, prepareEvidenceAssets } from '../services'
import { OutboxItem } from '../plugins/outbox'
import { BaseApiServer, BaseApiServerOptions } from './BaseApiServer'

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
export class OutboxApiServer extends BaseApiServer {
  constructor(options: BaseApiServerOptions) {
    super(options, INBOX_API_BASE_PATH, 'Outbox')
  }

  protected setupRoutes(): void {
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
        statusFilter = this.parseArrayQuery(status) || (status as string)
      }

      const items = await this.agent.outboxItemList({
        status: statusFilter as any,
        recipientDid: recipientDid as string | undefined,
        limit: this.parseIntQuery(limit),
        offset: this.parseIntQuery(offset),
      })

      this.success(res, items)
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
        this.badRequest(res, 'invoiceId, invoiceDate, currencyCode, and recipientDid are required')
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

      this.created(res, item)
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
        this.notFound(res, 'Outbox item not found')
        return
      }

      this.success(res, item)
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
        this.notFound(res, 'Outbox item not found')
        return
      }

      // Only allow updates to draft or failed items
      if (existing.status !== 'draft' && existing.status !== 'failed') {
        this.badRequest(res, `Cannot update outbox item with status: ${existing.status}`)
        return
      }

      const item = await this.agent.outboxItemUpdate({
        id,
        ...updateData,
      })

      this.success(res, item)
    } catch (error: any) {
      if (error.message?.includes('Cannot update')) {
        this.badRequest(res, error.message)
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
        this.notFound(res, 'Outbox item not found')
        return
      }

      this.noContent(res)
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
        this.notFound(res, 'Outbox item not found')
        return
      }

      // Check if it can be sent
      if (item.status !== 'draft' && item.status !== 'failed') {
        this.badRequest(res, `Cannot send outbox item with status: ${item.status}`)
        return
      }

      if (!item.recipientEndpoint) {
        this.badRequest(res, 'No recipient endpoint configured')
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

          this.success(res, {
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

          this.serverError(res, sendResult.errorMessage || 'Failed to send eInvoice')
        }
      } catch (sendError: any) {
        // Update status to failed
        await this.agent.outboxItemUpdateStatus({
          id,
          status: 'failed',
          errorMessage: sendError.message || 'Failed to send eInvoice',
        })

        this.serverError(res, sendError.message || 'Failed to send eInvoice')
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

      // Step 2: Fetch and publish evidence assets using shared service
      const evidenceIds = (item.evidenceFiles || []).map(f => f.id)
      const evidenceFiles = await prepareEvidenceAssets(
        this.agent,
        evidenceIds,
        { logPrefix: '[Outbox]' }
      )

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
        const presentationResult = await completeOid4vpPresentation(
          this.agent,
          sendResult.requestUri,
          issuedCredential.credential,
          senderDid,
          { logPrefix: '[Outbox]' }
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
}

// Re-export the options type for convenience
export type OutboxApiServerOptions = BaseApiServerOptions
