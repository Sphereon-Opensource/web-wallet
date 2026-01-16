import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import express, { Express } from 'express'
import request from 'supertest'
import { EInvoiceApiServer, SendEInvoiceRequest } from '../../api/einvoiceApiServer'
import { TAgent } from '@veramo/core'
import { TAgentTypes } from '../../types'
import { CredentialRole } from '@sphereon/ssi-types'
import { CredentialCorrelationType } from '@sphereon/ssi-sdk.credential-store'

// Mock the environment variables
jest.mock('../../environment-vars', () => ({
  ASSET_BASE_URI: 'http://localhost:5010',
  ASSET_DEFAULT_AVAILABILITY_YEARS: 7,
}))

// Mock the utility functions
const mockGetDefaultDID = jest.fn<any>()
const mockGetDefaultKeyRef = jest.fn<any>()
const mockGetIdentifier = jest.fn<any>()

jest.mock('../../utils', () => ({
  getDefaultDID: () => mockGetDefaultDID(),
  getDefaultKeyRef: () => mockGetDefaultKeyRef(),
  getIdentifier: (did: string) => mockGetIdentifier(did),
}))

// Mock UBL parser
const mockParseUblInvoice = jest.fn<any>()
const mockValidateParsedEInvoice = jest.fn<any>()

jest.mock('../../utils/ublParser', () => ({
  parseUblInvoice: (xml: string) => mockParseUblInvoice(xml),
  validateParsedEInvoice: (invoice: any) => mockValidateParsedEInvoice(invoice),
}))

// Mock credential issuer
const mockIssueEInvoiceCredential = jest.fn<any>()

jest.mock('../../utils/einvoiceCredentialIssuer', () => ({
  issueEInvoiceCredential: (agent: any, identifier: any, opts: any) => mockIssueEInvoiceCredential(agent, identifier, opts),
}))

// Create a mock agent
const createMockAgent = () => {
  const assets = new Map<string, any>()

  return {
    assetGetById: jest.fn<(args: any) => Promise<any | null>>().mockImplementation(async (args: any) => {
      return assets.get(args.id) || null
    }),

    assetPublish: jest.fn<(args: any) => Promise<any>>().mockImplementation(async (args: any) => {
      const asset = assets.get(args.id)
      if (asset) {
        asset.isPublic = true
        asset.availableUntil = args.availableUntil
        return asset
      }
      throw new Error('Asset not found')
    }),

    inboxSendToRecipient: jest.fn<(args: any) => Promise<any>>().mockImplementation(async (args: any) => {
      return {
        success: true,
        requestUri: 'openid4vp://authorize?request_uri=https://recipient.example.com/auth-request/123',
        correlationId: 'corr-123',
        inboxEndpoint: args.endpoint,
      }
    }),

    siopGetSiopRequest: jest.fn<(args: any) => Promise<any>>().mockImplementation(async (args: any) => {
      return {
        correlationId: 'auth-corr-123',
        authorizationRequest: {},
      }
    }),

    siopSendResponse: jest.fn<(args: any) => Promise<any>>().mockImplementation(async (args: any) => {
      return {
        url: 'https://recipient.example.com/callback',
      }
    }),

    crsAddCredential: jest.fn<(args: any) => Promise<any>>().mockImplementation(async (args: any) => {
      return {
        id: 'cred-store-id-123',
        hash: 'cred-hash-123',
      }
    }),

    crsGetUniqueCredentialByIdOrHash: jest.fn<(args: any) => Promise<any>>().mockImplementation(async (args: any) => {
      return {
        digitalCredential: {
          id: 'cred-store-id-123',
          hash: 'cred-hash-123',
          rawDocument: 'eyJ...credential...',
        },
      }
    }),

    // Helper to add an asset directly for testing
    _addAsset: (id: string, asset: any) => {
      assets.set(id, { ...asset, id })
    },

    // Clear all data for test isolation
    _clearData: () => {
      assets.clear()
    },
  } as unknown as TAgent<TAgentTypes> & {
    _addAsset: (id: string, asset: any) => void
    _clearData: () => void
  }
}

// Create mock ExpressSupport
const createMockExpressSupport = (app: Express) => ({
  express: app,
})

// Sample parsed UBL invoice
const sampleParsedInvoice = {
  invoice_id: 'INV-2024-001',
  invoice_date: '2024-01-15',
  due_date: '2024-02-15',
  currency_code: 'EUR',
  tax_exclusive_amount: 1000,
  tax_amount: 210,
  tax_inclusive_amount: 1210,
  payable_amount: 1210,
  seller_name: 'Seller Corp',
  seller_tax_id: 'NL123456789B01',
  seller_address: {
    street: '123 Main St',
    city: 'Amsterdam',
    postal_code: '1000AA',
    country_code: 'NL',
  },
  buyer_name: 'Buyer Inc',
  buyer_tax_id: 'NL987654321B01',
  buyer_address: {
    street: '456 Oak Ave',
    city: 'Rotterdam',
    postal_code: '2000BB',
    country_code: 'NL',
  },
  invoice_type_code: '380',
  note: 'Payment within 30 days',
}

// Sample send request
const createSendRequest = (overrides: Partial<SendEInvoiceRequest> = {}): SendEInvoiceRequest => ({
  invoiceData: {
    invoiceId: 'INV-2024-001',
    invoiceDate: '2024-01-15',
    dueDate: '2024-02-15',
    currencyCode: 'EUR',
    taxExclusiveAmount: 1000,
    taxAmount: 210,
    taxInclusiveAmount: 1210,
    payableAmount: 1210,
    sellerName: 'Seller Corp',
    sellerTaxId: 'NL123456789B01',
    sellerAddress: {
      street: '123 Main St',
      city: 'Amsterdam',
      postalCode: '1000AA',
      countryCode: 'NL',
    },
    buyerName: 'Buyer Inc',
    buyerTaxId: 'NL987654321B01',
    buyerAddress: {
      street: '456 Oak Ave',
      city: 'Rotterdam',
      postalCode: '2000BB',
      countryCode: 'NL',
    },
    invoiceTypeCode: '380',
  },
  evidenceIds: [],
  recipientDid: 'did:web:recipient.example.com',
  recipientEndpoint: 'https://recipient.example.com/inbox/invoices',
  ...overrides,
})

describe('EInvoiceApiServer', () => {
  let app: Express
  let mockAgent: ReturnType<typeof createMockAgent>
  let server: EInvoiceApiServer

  beforeEach(() => {
    app = express()
    app.use(express.json())
    mockAgent = createMockAgent()
    server = new EInvoiceApiServer({
      agent: mockAgent,
      expressSupport: createMockExpressSupport(app) as any,
    })

    // Setup default mocks
    mockGetDefaultDID.mockResolvedValue('did:web:sender.example.com')
    mockGetDefaultKeyRef.mockResolvedValue('key-ref-123')
    mockGetIdentifier.mockResolvedValue({
      did: 'did:web:sender.example.com',
      keys: [{ kid: 'key-ref-123' }],
    })
    mockParseUblInvoice.mockResolvedValue(sampleParsedInvoice)
    mockValidateParsedEInvoice.mockReturnValue([])
    mockIssueEInvoiceCredential.mockResolvedValue({
      credential: 'eyJ...sdJwt...',
      hash: 'cred-hash-123',
      evidence: [],
    })
  })

  afterEach(() => {
    mockAgent._clearData()
    jest.clearAllMocks()
  })

  describe('POST /api/einvoice/parse-ubl', () => {
    it('should parse valid UBL XML', async () => {
      const ublXml = '<Invoice>...</Invoice>'

      const response = await request(app)
        .post('/api/einvoice/parse-ubl')
        .send({ xml: ublXml })

      expect(response.status).toBe(200)
      expect(response.body).toEqual(sampleParsedInvoice)
      expect(mockParseUblInvoice).toHaveBeenCalledWith(ublXml)
    })

    it('should return 400 when xml field is missing', async () => {
      const response = await request(app)
        .post('/api/einvoice/parse-ubl')
        .send({})

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('xml field is required and must be a string')
    })

    it('should return 400 when xml field is not a string', async () => {
      const response = await request(app)
        .post('/api/einvoice/parse-ubl')
        .send({ xml: 123 })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('xml field is required and must be a string')
    })

    it('should return 400 when UBL parsing fails', async () => {
      mockParseUblInvoice.mockRejectedValue(new Error('Invalid UBL format'))

      const response = await request(app)
        .post('/api/einvoice/parse-ubl')
        .send({ xml: 'invalid xml' })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Invalid UBL format')
    })
  })

  describe('POST /api/einvoice/send', () => {
    it('should send an eInvoice successfully', async () => {
      const sendRequest = createSendRequest()

      const response = await request(app)
        .post('/api/einvoice/send')
        .send(sendRequest)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.credentialHash).toBe('cred-hash-123')
      expect(response.body.recipientDid).toBe(sendRequest.recipientDid)
    })

    it('should return 400 when invoiceData is missing', async () => {
      const response = await request(app)
        .post('/api/einvoice/send')
        .send({
          recipientDid: 'did:web:recipient.example.com',
          recipientEndpoint: 'https://recipient.example.com/inbox',
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('invoiceData, recipientDid, and recipientEndpoint are required')
    })

    it('should return 400 when recipientDid is missing', async () => {
      const response = await request(app)
        .post('/api/einvoice/send')
        .send({
          invoiceData: createSendRequest().invoiceData,
          recipientEndpoint: 'https://recipient.example.com/inbox',
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('invoiceData, recipientDid, and recipientEndpoint are required')
    })

    it('should return 400 when recipientEndpoint is missing', async () => {
      const response = await request(app)
        .post('/api/einvoice/send')
        .send({
          invoiceData: createSendRequest().invoiceData,
          recipientDid: 'did:web:recipient.example.com',
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('invoiceData, recipientDid, and recipientEndpoint are required')
    })

    it('should return 500 when no default DID is configured', async () => {
      mockGetDefaultDID.mockResolvedValue(null)

      const response = await request(app)
        .post('/api/einvoice/send')
        .send(createSendRequest())

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('No default DID configured for this agent')
    })

    it('should return 500 when identifier cannot be retrieved', async () => {
      mockGetIdentifier.mockResolvedValue(null)

      const response = await request(app)
        .post('/api/einvoice/send')
        .send(createSendRequest())

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Could not get identifier for sender DID')
    })

    it('should return 400 when invoice validation fails', async () => {
      mockValidateParsedEInvoice.mockReturnValue(['Missing invoice_id', 'Missing seller_name'])

      const response = await request(app)
        .post('/api/einvoice/send')
        .send(createSendRequest())

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Invalid invoice data: Missing invoice_id, Missing seller_name')
    })

    it('should publish evidence assets with availability window', async () => {
      const assetId = 'asset-123'
      mockAgent._addAsset(assetId, {
        digestMultibase: 'z123abc',
        filename: 'evidence.pdf',
        contentType: 'application/pdf',
        isPublic: false,
      })

      const sendRequest = createSendRequest({ evidenceIds: [assetId] })

      const response = await request(app)
        .post('/api/einvoice/send')
        .send(sendRequest)

      expect(response.status).toBe(200)
      expect(mockAgent.assetPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          id: assetId,
          availableUntil: expect.any(Date),
        })
      )
    })

    it('should skip publishing assets that are already public with valid availability', async () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 10) // 10 years in future

      const assetId = 'asset-123'
      mockAgent._addAsset(assetId, {
        digestMultibase: 'z123abc',
        filename: 'evidence.pdf',
        contentType: 'application/pdf',
        isPublic: true,
        availableUntil: futureDate,
      })

      const sendRequest = createSendRequest({ evidenceIds: [assetId] })

      await request(app)
        .post('/api/einvoice/send')
        .send(sendRequest)

      // Should not call assetPublish because asset is already public with valid availability
      expect(mockAgent.assetPublish).not.toHaveBeenCalled()
    })

    it('should return 502 when OID4VP flow initiation fails', async () => {
      ;(mockAgent.inboxSendToRecipient as jest.Mock<any>).mockResolvedValueOnce({
        success: false,
        error: 'Inbox not found',
        inboxEndpoint: 'https://recipient.example.com/inbox',
      })

      const response = await request(app)
        .post('/api/einvoice/send')
        .send(createSendRequest())

      expect(response.status).toBe(502)
      expect(response.body.error).toContain('Failed to initiate OID4VP flow')
    })

    it('should return 502 when OID4VP presentation fails', async () => {
      ;(mockAgent.siopSendResponse as jest.Mock<any>).mockRejectedValueOnce(new Error('Presentation rejected'))

      const response = await request(app)
        .post('/api/einvoice/send')
        .send(createSendRequest())

      expect(response.status).toBe(502)
      expect(response.body.error).toContain('Failed to send OID4VP response')
    })

    it('should call issueEInvoiceCredential with correct parameters', async () => {
      const sendRequest = createSendRequest()

      await request(app)
        .post('/api/einvoice/send')
        .send(sendRequest)

      expect(mockIssueEInvoiceCredential).toHaveBeenCalledWith(
        mockAgent,
        expect.objectContaining({ did: 'did:web:sender.example.com' }),
        expect.objectContaining({
          invoiceData: expect.objectContaining({
            invoice_id: sendRequest.invoiceData.invoiceId,
            seller_name: sendRequest.invoiceData.sellerName,
            buyer_name: sendRequest.invoiceData.buyerName,
          }),
          subjectDid: sendRequest.recipientDid,
          evidenceBaseUrl: 'http://localhost:5010',
        })
      )
    })

    it('should store credential in credential store', async () => {
      await request(app)
        .post('/api/einvoice/send')
        .send(createSendRequest())

      expect(mockAgent.crsAddCredential).toHaveBeenCalledWith({
        credential: expect.objectContaining({
          rawDocument: 'eyJ...sdJwt...',
          credentialRole: CredentialRole.HOLDER,
          isIssuerSigned: true,
        }),
      })
    })

    it('should complete full OID4VP flow', async () => {
      await request(app)
        .post('/api/einvoice/send')
        .send(createSendRequest())

      // Should have called all OID4VP methods in sequence
      expect(mockAgent.inboxSendToRecipient).toHaveBeenCalled()
      expect(mockAgent.crsAddCredential).toHaveBeenCalled()
      expect(mockAgent.siopGetSiopRequest).toHaveBeenCalled()
      expect(mockAgent.crsGetUniqueCredentialByIdOrHash).toHaveBeenCalled()
      expect(mockAgent.siopSendResponse).toHaveBeenCalled()
    })

    it('should return 500 on unexpected error', async () => {
      mockIssueEInvoiceCredential.mockRejectedValue(new Error('Unexpected error'))

      const response = await request(app)
        .post('/api/einvoice/send')
        .send(createSendRequest())

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Unexpected error')
    })

    it('should warn but continue when evidence asset is not found', async () => {
      const sendRequest = createSendRequest({ evidenceIds: ['nonexistent-asset'] })

      const response = await request(app)
        .post('/api/einvoice/send')
        .send(sendRequest)

      // Should still succeed - missing assets are just warnings
      expect(response.status).toBe(200)
      expect(response.body.evidenceCount).toBe(0)
    })

    it('should handle recipientEndpointType parameter', async () => {
      const sendRequest = createSendRequest({
        recipientEndpointType: 'EInvoicePeppolInbox',
      })

      await request(app)
        .post('/api/einvoice/send')
        .send(sendRequest)

      expect(mockAgent.inboxSendToRecipient).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceType: 'EInvoicePeppolInbox',
        })
      )
    })

    it('should use default serviceType when recipientEndpointType is not provided', async () => {
      const sendRequest = createSendRequest()
      delete sendRequest.recipientEndpointType

      await request(app)
        .post('/api/einvoice/send')
        .send(sendRequest)

      expect(mockAgent.inboxSendToRecipient).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceType: 'EInvoiceInbox',
        })
      )
    })
  })
})
