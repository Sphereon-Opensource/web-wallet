import { Request, Response, NextFunction } from 'express'
import { parseUblInvoice } from '../utils/ublParser'
import { sendInvoiceToRecipient } from '../services'
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
   * Uses the shared sendInvoiceToRecipient service.
   */
  private async sendEInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body: SendEInvoiceRequest = req.body

      // Validate required fields
      if (!body.invoiceData || !body.recipientDid || !body.recipientEndpoint) {
        this.badRequest(res, 'invoiceData, recipientDid, and recipientEndpoint are required')
        return
      }

      // Use shared service to send the invoice
      const result = await sendInvoiceToRecipient(
        this.agent,
        {
          invoiceData: body.invoiceData,
          evidenceIds: body.evidenceIds || [],
          recipientDid: body.recipientDid,
          recipientEndpoint: body.recipientEndpoint,
          recipientEndpointType: body.recipientEndpointType,
        },
        { logPrefix: '[eInvoice]' }
      )

      if (!result.success) {
        // Determine appropriate error response based on error type
        if (result.error?.includes('No default DID') || result.error?.includes('Could not get identifier')) {
          this.serverError(res, result.error)
        } else if (result.error?.includes('Invalid invoice data')) {
          this.badRequest(res, result.error)
        } else {
          this.badGateway(res, result.error || 'Failed to send eInvoice', {
            credentialHash: result.credentialHash,
          })
        }
        return
      }

      // Success - credential was sent to recipient
      this.success(res, {
        success: true,
        credentialId: result.credentialId,
        credentialHash: result.credentialHash,
        evidenceCount: result.evidenceCount,
        recipientDid: body.recipientDid,
        correlationId: result.correlationId,
      })
    } catch (error: any) {
      console.error('[eInvoice] Error sending eInvoice:', error)
      this.serverError(res, error.message || 'Failed to send eInvoice')
    }
  }
}

// Re-export the options type for convenience
export type EInvoiceApiServerOptions = BaseApiServerOptions
