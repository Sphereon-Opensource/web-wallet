import { Request, Response, NextFunction } from 'express'
import { INBOX_API_BASE_PATH } from '../environment-vars'
import { sendInvoiceToRecipient, mapOutboxItemToInvoiceData } from '../services'
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
      const item = await this.getResourceOrNotFound(
        () => this.agent.outboxItemGet({ id }),
        res,
        'Outbox item'
      )
      if (!item) return
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
      const existing = await this.getResourceOrNotFound(
        () => this.agent.outboxItemGet({ id }),
        res,
        'Outbox item'
      )
      if (!existing) return

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
      await this.deleteResourceOrNotFound(
        () => this.agent.outboxItemDelete({ id }),
        res,
        'Outbox item'
      )
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
   * Uses the shared sendInvoiceToRecipient service.
   */
  private async sendToRecipient(item: OutboxItem): Promise<{
    success: boolean
    credentialId?: string
    correlationId?: string
    errorMessage?: string
  }> {
    // Map OutboxItem to InvoiceData format and extract evidence IDs
    const invoiceData = mapOutboxItemToInvoiceData(item)
    const evidenceIds = (item.evidenceFiles || []).map(f => f.id)

    const result = await sendInvoiceToRecipient(
      this.agent,
      {
        invoiceData,
        evidenceIds,
        recipientDid: item.recipientDid,
        recipientEndpoint: item.recipientEndpoint!,
        recipientEndpointType: item.recipientEndpointType,
      },
      { logPrefix: '[Outbox]' }
    )

    return {
      success: result.success,
      credentialId: result.credentialId,
      correlationId: result.correlationId,
      errorMessage: result.error,
    }
  }
}

// Re-export the options type for convenience
export type OutboxApiServerOptions = BaseApiServerOptions
