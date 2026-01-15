import { jest, describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals'
import { DataSource } from 'typeorm'
import { InboxPlugin, InboxSendToRecipientArgs, InboxSendToRecipientResult } from '../../plugins/inboxPlugin'

// Mock console methods to avoid noise in tests
const originalConsoleLog = console.log
const originalConsoleWarn = console.warn
const originalConsoleError = console.error

beforeAll(() => {
  console.log = jest.fn()
  console.warn = jest.fn()
  console.error = jest.fn()
})

afterAll(() => {
  console.log = originalConsoleLog
  console.warn = originalConsoleWarn
  console.error = originalConsoleError
})

// Mock the DID resolver modules
jest.mock('did-resolver', () => ({
  Resolver: jest.fn().mockImplementation(() => ({
    resolve: jest.fn<any>(),
  })),
}))

jest.mock('web-did-resolver', () => ({
  getResolver: jest.fn().mockReturnValue({}),
}))

jest.mock('@sphereon/ssi-sdk-ext.did-resolver-jwk', () => ({
  getDidJwkResolver: jest.fn().mockReturnValue({}),
}))

jest.mock('@sphereon/ssi-sdk-ext.did-resolver-key', () => ({
  getResolver: jest.fn().mockReturnValue({}),
}))

// Mock global fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>
global.fetch = mockFetch

describe('InboxPlugin - Send To Recipient', () => {
  let plugin: InboxPlugin
  let mockDataSource: jest.Mocked<DataSource>

  const createMockDataSource = () => {
    return {
      query: jest.fn<(query: string, params?: any[]) => Promise<any[]>>().mockResolvedValue([]),
      driver: {
        options: {
          type: 'postgres',
        },
      },
    } as unknown as jest.Mocked<DataSource>
  }

  beforeEach(() => {
    mockDataSource = createMockDataSource()
    plugin = new InboxPlugin({
      dbConnection: Promise.resolve(mockDataSource),
    })
    jest.clearAllMocks()
    mockFetch.mockReset()
  })

  describe('inboxSendToRecipient', () => {
    const baseArgs: InboxSendToRecipientArgs = {
      recipientDid: 'did:web:recipient.example.com',
      credential: 'eyJ0eXAiOiJ2YytzZC1qd3QiLCJhbGciOiJFUzI1NiJ9...',
      senderDid: 'did:web:sender.example.com',
    }

    it('should return error when DID resolution fails', async () => {
      // Mock the Resolver to return error
      const { Resolver } = await import('did-resolver')
      ;(Resolver as jest.Mock).mockImplementation(() => ({
        resolve: jest.fn<any>().mockResolvedValue({
          didResolutionMetadata: { error: 'notFound' },
          didDocument: null,
        }),
      }))

      const result = await plugin.methods.inboxSendToRecipient(baseArgs)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Could not resolve DID document')
    })

    it('should return error when no inbox service endpoint found', async () => {
      const { Resolver } = await import('did-resolver')
      ;(Resolver as jest.Mock).mockImplementation(() => ({
        resolve: jest.fn<any>().mockResolvedValue({
          didResolutionMetadata: {},
          didDocument: {
            id: 'did:web:recipient.example.com',
            service: [
              {
                id: 'did:web:recipient.example.com#other-service',
                type: 'OtherService',
                serviceEndpoint: 'https://example.com/other',
              },
            ],
          },
        }),
      }))

      const result = await plugin.methods.inboxSendToRecipient(baseArgs)

      expect(result.success).toBe(false)
      expect(result.error).toContain('No EInvoiceInbox service endpoint found')
    })

    it('should return error when DID document has no services', async () => {
      const { Resolver } = await import('did-resolver')
      ;(Resolver as jest.Mock).mockImplementation(() => ({
        resolve: jest.fn<any>().mockResolvedValue({
          didResolutionMetadata: {},
          didDocument: {
            id: 'did:web:recipient.example.com',
            // No service array
          },
        }),
      }))

      const result = await plugin.methods.inboxSendToRecipient(baseArgs)

      expect(result.success).toBe(false)
      expect(result.error).toContain('No EInvoiceInbox service endpoint found')
    })

    it('should find inbox service with EInvoiceInbox type', async () => {
      const { Resolver } = await import('did-resolver')
      ;(Resolver as jest.Mock).mockImplementation(() => ({
        resolve: jest.fn<any>().mockResolvedValue({
          didResolutionMetadata: {},
          didDocument: {
            id: 'did:web:recipient.example.com',
            service: [
              {
                id: 'did:web:recipient.example.com#einvoice-inbox',
                type: 'EInvoiceInbox',
                serviceEndpoint: 'https://recipient.example.com/inbox/invoices/incoming',
              },
            ],
          },
        }),
      }))

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            request_uri: 'https://recipient.example.com/oid4vp/request/123',
            client_id: 'decentralized_identifier:did:web:recipient.example.com',
            correlation_id: 'corr-123',
          }),
      } as Response)

      const result = await plugin.methods.inboxSendToRecipient(baseArgs)

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://recipient.example.com/inbox/invoices/incoming',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: 'decentralized_identifier:did:web:sender.example.com',
          }),
        })
      )
    })

    it('should find inbox service with type containing "inbox"', async () => {
      const { Resolver } = await import('did-resolver')
      ;(Resolver as jest.Mock).mockImplementation(() => ({
        resolve: jest.fn<any>().mockResolvedValue({
          didResolutionMetadata: {},
          didDocument: {
            id: 'did:web:recipient.example.com',
            service: [
              {
                id: 'did:web:recipient.example.com#invoice-inbox',
                type: 'InvoiceInbox',
                serviceEndpoint: 'https://recipient.example.com/inbox',
              },
            ],
          },
        }),
      }))

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ request_uri: 'uri', client_id: 'cid' }),
      } as Response)

      const result = await plugin.methods.inboxSendToRecipient(baseArgs)

      expect(result.success).toBe(true)
    })

    it('should find inbox service with type containing "einvoice"', async () => {
      const { Resolver } = await import('did-resolver')
      ;(Resolver as jest.Mock).mockImplementation(() => ({
        resolve: jest.fn<any>().mockResolvedValue({
          didResolutionMetadata: {},
          didDocument: {
            id: 'did:web:recipient.example.com',
            service: [
              {
                id: 'did:web:recipient.example.com#einvoice',
                type: 'EInvoiceService',
                serviceEndpoint: 'https://recipient.example.com/einvoice',
              },
            ],
          },
        }),
      }))

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ request_uri: 'uri', client_id: 'cid' }),
      } as Response)

      const result = await plugin.methods.inboxSendToRecipient(baseArgs)

      expect(result.success).toBe(true)
    })

    it('should handle structured serviceEndpoint with uri field', async () => {
      const { Resolver } = await import('did-resolver')
      ;(Resolver as jest.Mock).mockImplementation(() => ({
        resolve: jest.fn<any>().mockResolvedValue({
          didResolutionMetadata: {},
          didDocument: {
            id: 'did:web:recipient.example.com',
            service: [
              {
                id: 'did:web:recipient.example.com#einvoice-inbox',
                type: 'EInvoiceInbox',
                serviceEndpoint: {
                  uri: 'https://recipient.example.com/inbox/structured',
                  folder: 'incoming',
                  vct: ['urn:org:fides:einvoice:1'],
                },
              },
            ],
          },
        }),
      }))

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ request_uri: 'uri', client_id: 'cid' }),
      } as Response)

      const result = await plugin.methods.inboxSendToRecipient(baseArgs)

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://recipient.example.com/inbox/structured',
        expect.any(Object)
      )
    })

    it('should return error when inbox endpoint returns non-OK response', async () => {
      const { Resolver } = await import('did-resolver')
      ;(Resolver as jest.Mock).mockImplementation(() => ({
        resolve: jest.fn<any>().mockResolvedValue({
          didResolutionMetadata: {},
          didDocument: {
            id: 'did:web:recipient.example.com',
            service: [
              {
                id: 'did:web:recipient.example.com#einvoice-inbox',
                type: 'EInvoiceInbox',
                serviceEndpoint: 'https://recipient.example.com/inbox',
              },
            ],
          },
        }),
      }))

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      } as Response)

      const result = await plugin.methods.inboxSendToRecipient(baseArgs)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Inbox endpoint returned error 500')
      expect(result.inboxEndpoint).toBe('https://recipient.example.com/inbox')
    })

    it('should return error when inbox endpoint returns 404', async () => {
      const { Resolver } = await import('did-resolver')
      ;(Resolver as jest.Mock).mockImplementation(() => ({
        resolve: jest.fn<any>().mockResolvedValue({
          didResolutionMetadata: {},
          didDocument: {
            id: 'did:web:recipient.example.com',
            service: [
              {
                id: 'did:web:recipient.example.com#einvoice-inbox',
                type: 'EInvoiceInbox',
                serviceEndpoint: 'https://recipient.example.com/inbox',
              },
            ],
          },
        }),
      }))

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not Found'),
      } as Response)

      const result = await plugin.methods.inboxSendToRecipient(baseArgs)

      expect(result.success).toBe(false)
      expect(result.error).toContain('404')
    })

    it('should return success with all response fields', async () => {
      const { Resolver } = await import('did-resolver')
      ;(Resolver as jest.Mock).mockImplementation(() => ({
        resolve: jest.fn<any>().mockResolvedValue({
          didResolutionMetadata: {},
          didDocument: {
            id: 'did:web:recipient.example.com',
            service: [
              {
                id: 'did:web:recipient.example.com#einvoice-inbox',
                type: 'EInvoiceInbox',
                serviceEndpoint: 'https://recipient.example.com/inbox/invoices/incoming',
              },
            ],
          },
        }),
      }))

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            request_uri: 'https://recipient.example.com/oid4vp/request/abc123',
            client_id: 'decentralized_identifier:did:web:recipient.example.com',
            correlation_id: 'correlation-xyz',
          }),
      } as Response)

      const result = await plugin.methods.inboxSendToRecipient(baseArgs)

      expect(result.success).toBe(true)
      expect(result.requestUri).toBe('https://recipient.example.com/oid4vp/request/abc123')
      expect(result.recipientClientId).toBe('decentralized_identifier:did:web:recipient.example.com')
      expect(result.correlationId).toBe('correlation-xyz')
      expect(result.inboxEndpoint).toBe('https://recipient.example.com/inbox/invoices/incoming')
    })

    it('should use custom serviceType when provided', async () => {
      const { Resolver } = await import('did-resolver')
      ;(Resolver as jest.Mock).mockImplementation(() => ({
        resolve: jest.fn<any>().mockResolvedValue({
          didResolutionMetadata: {},
          didDocument: {
            id: 'did:web:recipient.example.com',
            service: [
              {
                id: 'did:web:recipient.example.com#custom-inbox',
                type: 'CustomInboxType',
                serviceEndpoint: 'https://recipient.example.com/custom-inbox',
              },
            ],
          },
        }),
      }))

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ request_uri: 'uri', client_id: 'cid' }),
      } as Response)

      const result = await plugin.methods.inboxSendToRecipient({
        ...baseArgs,
        serviceType: 'CustomInboxType',
      })

      expect(result.success).toBe(true)
    })

    it('should handle network errors gracefully', async () => {
      const { Resolver } = await import('did-resolver')
      ;(Resolver as jest.Mock).mockImplementation(() => ({
        resolve: jest.fn<any>().mockResolvedValue({
          didResolutionMetadata: {},
          didDocument: {
            id: 'did:web:recipient.example.com',
            service: [
              {
                id: 'did:web:recipient.example.com#einvoice-inbox',
                type: 'EInvoiceInbox',
                serviceEndpoint: 'https://recipient.example.com/inbox',
              },
            ],
          },
        }),
      }))

      mockFetch.mockRejectedValue(new Error('Network error: Connection refused'))

      const result = await plugin.methods.inboxSendToRecipient(baseArgs)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error')
    })

    it('should handle timeout errors', async () => {
      const { Resolver } = await import('did-resolver')
      ;(Resolver as jest.Mock).mockImplementation(() => ({
        resolve: jest.fn<any>().mockResolvedValue({
          didResolutionMetadata: {},
          didDocument: {
            id: 'did:web:recipient.example.com',
            service: [
              {
                id: 'did:web:recipient.example.com#einvoice-inbox',
                type: 'EInvoiceInbox',
                serviceEndpoint: 'https://recipient.example.com/inbox',
              },
            ],
          },
        }),
      }))

      const timeoutError = new Error('The operation was aborted')
      timeoutError.name = 'AbortError'
      mockFetch.mockRejectedValue(timeoutError)

      const result = await plugin.methods.inboxSendToRecipient(baseArgs)

      expect(result.success).toBe(false)
      expect(result.error).toContain('aborted')
    })

    it('should handle service with array type', async () => {
      const { Resolver } = await import('did-resolver')
      ;(Resolver as jest.Mock).mockImplementation(() => ({
        resolve: jest.fn<any>().mockResolvedValue({
          didResolutionMetadata: {},
          didDocument: {
            id: 'did:web:recipient.example.com',
            service: [
              {
                id: 'did:web:recipient.example.com#einvoice-inbox',
                type: ['LinkedDomains', 'EInvoiceInbox'],
                serviceEndpoint: 'https://recipient.example.com/inbox',
              },
            ],
          },
        }),
      }))

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ request_uri: 'uri', client_id: 'cid' }),
      } as Response)

      const result = await plugin.methods.inboxSendToRecipient(baseArgs)

      expect(result.success).toBe(true)
    })
  })
})
