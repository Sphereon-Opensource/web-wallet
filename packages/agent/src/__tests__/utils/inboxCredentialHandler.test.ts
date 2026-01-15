import { jest, describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals'
import { TAgent } from '@veramo/core'
import { TAgentTypes } from '../../types'
import { InboxApiServer } from '../../api/inboxApiServer'
import {
  linkCredentialToInbox,
  storeInboxContext,
  getInboxContext,
  hasInboxContext,
  clearInboxContext,
} from '../../utils/inboxCredentialHandler'

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

describe('inboxCredentialHandler', () => {
  // Create a mock agent
  const createMockAgent = () => {
    return {
      inboxCredentialLink: jest.fn<(args: any) => Promise<any>>().mockResolvedValue({
        id: 'link-123',
        inboxId: 'inbox-123',
        folderId: 'folder-123',
        credentialId: 'cred-123',
        clientId: 'did:web:sender.com',
        clientIdPrefix: 'decentralized_identifier',
        correlationId: 'corr-123',
        receivedAt: new Date(),
      }),
    } as unknown as TAgent<TAgentTypes>
  }

  beforeEach(() => {
    // Clear the context store before each test
    InboxApiServer.inboxContextStore.clear()
  })

  describe('storeInboxContext', () => {
    it('should store inbox context for a correlation ID', () => {
      const context = {
        inboxName: 'test-inbox',
        folderName: 'invoices',
        clientId: 'did:web:sender.com',
        clientIdPrefix: 'decentralized_identifier',
      }

      storeInboxContext('corr-123', context)

      expect(InboxApiServer.inboxContextStore.has('corr-123')).toBe(true)
      expect(InboxApiServer.inboxContextStore.get('corr-123')).toEqual(context)
    })

    it('should overwrite existing context for the same correlation ID', () => {
      const context1 = {
        inboxName: 'inbox-1',
        folderName: 'folder-1',
      }
      const context2 = {
        inboxName: 'inbox-2',
        folderName: 'folder-2',
      }

      storeInboxContext('corr-123', context1)
      storeInboxContext('corr-123', context2)

      expect(InboxApiServer.inboxContextStore.get('corr-123')).toEqual(context2)
    })
  })

  describe('getInboxContext', () => {
    it('should retrieve stored inbox context', () => {
      const context = {
        inboxName: 'test-inbox',
        folderName: 'invoices',
      }
      InboxApiServer.inboxContextStore.set('corr-123', context)

      const result = getInboxContext('corr-123')

      expect(result).toEqual(context)
    })

    it('should return undefined when context does not exist', () => {
      const result = getInboxContext('nonexistent')

      expect(result).toBeUndefined()
    })
  })

  describe('hasInboxContext', () => {
    it('should return true when context exists', () => {
      InboxApiServer.inboxContextStore.set('corr-123', {
        inboxName: 'test-inbox',
        folderName: 'invoices',
      })

      const result = hasInboxContext('corr-123')

      expect(result).toBe(true)
    })

    it('should return false when context does not exist', () => {
      const result = hasInboxContext('nonexistent')

      expect(result).toBe(false)
    })
  })

  describe('clearInboxContext', () => {
    it('should remove stored inbox context', () => {
      InboxApiServer.inboxContextStore.set('corr-123', {
        inboxName: 'test-inbox',
        folderName: 'invoices',
      })

      clearInboxContext('corr-123')

      expect(InboxApiServer.inboxContextStore.has('corr-123')).toBe(false)
    })

    it('should not throw when clearing non-existent context', () => {
      expect(() => clearInboxContext('nonexistent')).not.toThrow()
    })
  })

  describe('linkCredentialToInbox', () => {
    it('should link a credential to inbox when context exists', async () => {
      const mockAgent = createMockAgent()
      const context = {
        inboxName: 'test-inbox',
        folderName: 'invoices',
        clientId: 'did:web:sender.com',
        clientIdPrefix: 'decentralized_identifier',
      }
      InboxApiServer.inboxContextStore.set('corr-123', context)

      const result = await linkCredentialToInbox(mockAgent, 'corr-123', 'cred-123')

      expect(result).toBe(true)
      expect(mockAgent.inboxCredentialLink).toHaveBeenCalledWith({
        inboxName: 'test-inbox',
        folderName: 'invoices',
        credentialId: 'cred-123',
        clientId: 'did:web:sender.com',
        clientIdPrefix: 'decentralized_identifier',
        correlationId: 'corr-123',
      })
    })

    it('should clean up context after successful linking', async () => {
      const mockAgent = createMockAgent()
      InboxApiServer.inboxContextStore.set('corr-123', {
        inboxName: 'test-inbox',
        folderName: 'invoices',
      })

      await linkCredentialToInbox(mockAgent, 'corr-123', 'cred-123')

      expect(InboxApiServer.inboxContextStore.has('corr-123')).toBe(false)
    })

    it('should return false when no context exists', async () => {
      const mockAgent = createMockAgent()

      const result = await linkCredentialToInbox(mockAgent, 'nonexistent', 'cred-123')

      expect(result).toBe(false)
      expect(mockAgent.inboxCredentialLink).not.toHaveBeenCalled()
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('No inbox context found for correlation ID: nonexistent')
      )
    })

    it('should use "unknown" as clientId when not provided in context', async () => {
      const mockAgent = createMockAgent()
      InboxApiServer.inboxContextStore.set('corr-123', {
        inboxName: 'test-inbox',
        folderName: 'invoices',
        // No clientId or clientIdPrefix
      })

      await linkCredentialToInbox(mockAgent, 'corr-123', 'cred-123')

      expect(mockAgent.inboxCredentialLink).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'unknown',
          clientIdPrefix: undefined,
        })
      )
    })

    it('should return false and log error when linking fails', async () => {
      const mockAgent = {
        inboxCredentialLink: jest.fn<(args: any) => Promise<any>>().mockRejectedValue(new Error('Database error')),
      } as unknown as TAgent<TAgentTypes>

      InboxApiServer.inboxContextStore.set('corr-123', {
        inboxName: 'test-inbox',
        folderName: 'invoices',
      })

      const result = await linkCredentialToInbox(mockAgent, 'corr-123', 'cred-123')

      expect(result).toBe(false)
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to link credential to inbox:'),
        expect.any(Error)
      )
    })

    it('should not clean up context when linking fails', async () => {
      const mockAgent = {
        inboxCredentialLink: jest.fn<(args: any) => Promise<any>>().mockRejectedValue(new Error('Database error')),
      } as unknown as TAgent<TAgentTypes>

      InboxApiServer.inboxContextStore.set('corr-123', {
        inboxName: 'test-inbox',
        folderName: 'invoices',
      })

      await linkCredentialToInbox(mockAgent, 'corr-123', 'cred-123')

      // Context should still exist after failed linking
      // (This is the current behavior - in production you might want to decide differently)
      expect(InboxApiServer.inboxContextStore.has('corr-123')).toBe(true)
    })
  })

  describe('Integration scenarios', () => {
    it('should support the full OID4VP flow', async () => {
      const mockAgent = createMockAgent()
      const correlationId = 'flow-123'

      // Step 1: Store context when initiating OID4VP flow
      storeInboxContext(correlationId, {
        inboxName: 'einvoice-inbox',
        folderName: 'incoming',
        clientId: 'did:web:sender.example.com',
        clientIdPrefix: 'decentralized_identifier',
      })

      // Verify context is stored
      expect(hasInboxContext(correlationId)).toBe(true)

      // Step 2: After VP verification, link the credential
      const result = await linkCredentialToInbox(mockAgent, correlationId, 'verified-cred-456')

      expect(result).toBe(true)
      expect(mockAgent.inboxCredentialLink).toHaveBeenCalledWith({
        inboxName: 'einvoice-inbox',
        folderName: 'incoming',
        credentialId: 'verified-cred-456',
        clientId: 'did:web:sender.example.com',
        clientIdPrefix: 'decentralized_identifier',
        correlationId: 'flow-123',
      })

      // Context should be cleaned up
      expect(hasInboxContext(correlationId)).toBe(false)
    })

    it('should handle multiple concurrent flows', async () => {
      const mockAgent = createMockAgent()

      // Start multiple flows
      storeInboxContext('flow-1', { inboxName: 'inbox-1', folderName: 'folder-1' })
      storeInboxContext('flow-2', { inboxName: 'inbox-2', folderName: 'folder-2' })
      storeInboxContext('flow-3', { inboxName: 'inbox-3', folderName: 'folder-3' })

      // All contexts should exist
      expect(hasInboxContext('flow-1')).toBe(true)
      expect(hasInboxContext('flow-2')).toBe(true)
      expect(hasInboxContext('flow-3')).toBe(true)

      // Complete flow-2
      await linkCredentialToInbox(mockAgent, 'flow-2', 'cred-2')

      // Only flow-2 context should be cleaned up
      expect(hasInboxContext('flow-1')).toBe(true)
      expect(hasInboxContext('flow-2')).toBe(false)
      expect(hasInboxContext('flow-3')).toBe(true)

      // Complete remaining flows
      await linkCredentialToInbox(mockAgent, 'flow-1', 'cred-1')
      await linkCredentialToInbox(mockAgent, 'flow-3', 'cred-3')

      // All contexts should be cleaned up
      expect(hasInboxContext('flow-1')).toBe(false)
      expect(hasInboxContext('flow-3')).toBe(false)
    })
  })
})
