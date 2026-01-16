import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { DataSource } from 'typeorm'
import {
  InboxPlugin,
  Inbox,
  InboxFolder,
  InboxCredential,
  InboxAllowedSender,
} from '../../plugins/inbox'

// Mock DataSource
const createMockDataSource = () => {
  const queryResults: Map<string, any[]> = new Map()
  let deleteRowCount = 1

  const mockQueryFn = jest.fn<(sql: string, params?: any[]) => Promise<any>>()
  mockQueryFn.mockImplementation((sql: string, params?: any[]) => {
      // Handle INSERT queries
      if (sql.includes('INSERT INTO')) {
        return Promise.resolve({ rowCount: 1 })
      }

      // Handle DELETE queries
      if (sql.includes('DELETE FROM')) {
        return Promise.resolve({ rowCount: deleteRowCount })
      }

      // Handle SELECT COUNT queries
      if (sql.includes('SELECT COUNT')) {
        const key = `count_${params?.[0] || 'default'}`
        const count = queryResults.get(key)?.[0]?.count || '0'
        return Promise.resolve([{ count }])
      }

      // Handle SELECT 1 queries (for existence checks)
      if (sql.includes('SELECT 1')) {
        const key = `exists_${params?.join('_') || 'default'}`
        return Promise.resolve(queryResults.get(key) || [])
      }

      // Handle general SELECT queries
      const key = `select_${params?.[0] || 'default'}`
      return Promise.resolve(queryResults.get(key) || [])
    })

  const mockDataSource = {
    query: mockQueryFn,
    driver: {
      options: {
        type: 'postgres',
      },
    },
  } as unknown as DataSource

  return {
    dataSource: mockDataSource,
    setQueryResult: (key: string, result: any[]) => queryResults.set(key, result),
    setDeleteRowCount: (count: number) => { deleteRowCount = count },
    getQueryCalls: () => mockQueryFn.mock.calls,
    clearMocks: () => {
      mockQueryFn.mockClear()
      queryResults.clear()
      deleteRowCount = 1
    },
  }
}

describe('InboxPlugin', () => {
  let plugin: InboxPlugin
  let mockDb: ReturnType<typeof createMockDataSource>
  let dbConnectionPromise: Promise<DataSource>

  beforeEach(() => {
    mockDb = createMockDataSource()
    dbConnectionPromise = Promise.resolve(mockDb.dataSource)
    plugin = new InboxPlugin({ dbConnection: dbConnectionPromise })
  })

  afterEach(() => {
    mockDb.clearMocks()
  })

  describe('Inbox CRUD', () => {
    describe('inboxCreate', () => {
      it('should create an inbox with required fields', async () => {
        const result = await plugin.methods.inboxCreate({
          name: 'test-inbox',
          did: 'did:web:example.com',
        })

        expect(result).toBeDefined()
        expect(result.name).toBe('test-inbox')
        expect(result.did).toBe('did:web:example.com')
        expect(result.id).toBeDefined()
        expect(result.createdAt).toBeInstanceOf(Date)
        expect(result.updatedAt).toBeInstanceOf(Date)
      })

      it('should create an inbox with optional fields', async () => {
        const result = await plugin.methods.inboxCreate({
          name: 'test-inbox',
          did: 'did:web:example.com',
          description: 'Test description',
          tenantId: 'tenant-123',
        })

        expect(result.description).toBe('Test description')
        expect(result.tenantId).toBe('tenant-123')
      })

      it('should call database with correct INSERT query', async () => {
        await plugin.methods.inboxCreate({
          name: 'test-inbox',
          did: 'did:web:example.com',
        })

        const calls = mockDb.getQueryCalls()
        expect(calls.length).toBe(1)
        expect(calls[0][0]).toContain('INSERT INTO "inbox"')
      })
    })

    describe('inboxGet', () => {
      it('should return inbox when found', async () => {
        const mockInbox = {
          id: 'inbox-123',
          tenant_id: null,
          name: 'test-inbox',
          did: 'did:web:example.com',
          description: 'Test',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        mockDb.setQueryResult('select_test-inbox', [mockInbox])

        const result = await plugin.methods.inboxGet({ name: 'test-inbox' })

        expect(result).toBeDefined()
        expect(result?.name).toBe('test-inbox')
        expect(result?.did).toBe('did:web:example.com')
      })

      it('should return null when inbox not found', async () => {
        mockDb.setQueryResult('select_nonexistent', [])

        const result = await plugin.methods.inboxGet({ name: 'nonexistent' })

        expect(result).toBeNull()
      })
    })

    describe('inboxGetAll', () => {
      it('should return all inboxes', async () => {
        const mockInboxes = [
          {
            id: 'inbox-1',
            tenant_id: null,
            name: 'inbox-1',
            did: 'did:web:example1.com',
            description: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'inbox-2',
            tenant_id: null,
            name: 'inbox-2',
            did: 'did:web:example2.com',
            description: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]
        mockDb.setQueryResult('select_default', mockInboxes)

        const result = await plugin.methods.inboxGetAll()

        expect(result).toHaveLength(2)
        expect(result[0].name).toBe('inbox-1')
        expect(result[1].name).toBe('inbox-2')
      })

      it('should return empty array when no inboxes exist', async () => {
        mockDb.setQueryResult('select_default', [])

        const result = await plugin.methods.inboxGetAll()

        expect(result).toHaveLength(0)
      })
    })

    describe('inboxDelete', () => {
      it('should return true when inbox is deleted', async () => {
        mockDb.setDeleteRowCount(1)

        const result = await plugin.methods.inboxDelete({ name: 'test-inbox' })

        expect(result).toBe(true)
      })

      it('should return false when inbox does not exist', async () => {
        mockDb.setDeleteRowCount(0)

        const result = await plugin.methods.inboxDelete({ name: 'nonexistent' })

        expect(result).toBe(false)
      })
    })
  })

  describe('Folder CRUD', () => {
    const mockInbox = {
      id: 'inbox-123',
      tenant_id: null,
      name: 'test-inbox',
      did: 'did:web:example.com',
      description: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    describe('inboxFolderCreate', () => {
      it('should create a folder in an existing inbox', async () => {
        mockDb.setQueryResult('select_test-inbox', [mockInbox])

        const result = await plugin.methods.inboxFolderCreate({
          inboxName: 'test-inbox',
          name: 'invoices',
          dcqlQueryId: 'einvoice-query',
          description: 'Invoice folder',
        })

        expect(result).toBeDefined()
        expect(result.name).toBe('invoices')
        expect(result.dcqlQueryId).toBe('einvoice-query')
        expect(result.inboxId).toBe('inbox-123')
      })

      it('should throw error when inbox does not exist', async () => {
        mockDb.setQueryResult('select_nonexistent', [])

        await expect(
          plugin.methods.inboxFolderCreate({
            inboxName: 'nonexistent',
            name: 'invoices',
          })
        ).rejects.toThrow('Inbox not found: nonexistent')
      })
    })

    describe('inboxFolderGet', () => {
      it('should return folder when found', async () => {
        mockDb.setQueryResult('select_test-inbox', [mockInbox])
        mockDb.setQueryResult('select_inbox-123', [
          {
            id: 'folder-123',
            inbox_id: 'inbox-123',
            name: 'invoices',
            dcql_query_id: 'einvoice-query',
            description: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])

        const result = await plugin.methods.inboxFolderGet({
          inboxName: 'test-inbox',
          folderName: 'invoices',
        })

        expect(result).toBeDefined()
        expect(result?.name).toBe('invoices')
      })

      it('should return null when inbox does not exist', async () => {
        mockDb.setQueryResult('select_nonexistent', [])

        const result = await plugin.methods.inboxFolderGet({
          inboxName: 'nonexistent',
          folderName: 'invoices',
        })

        expect(result).toBeNull()
      })
    })

    describe('inboxFolderGetByInbox', () => {
      it('should return all folders in an inbox', async () => {
        mockDb.setQueryResult('select_test-inbox', [mockInbox])
        mockDb.setQueryResult('select_inbox-123', [
          {
            id: 'folder-1',
            inbox_id: 'inbox-123',
            name: 'invoices',
            dcql_query_id: 'einvoice-query',
            description: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'folder-2',
            inbox_id: 'inbox-123',
            name: 'receipts',
            dcql_query_id: 'receipt-query',
            description: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])

        const result = await plugin.methods.inboxFolderGetByInbox({
          inboxName: 'test-inbox',
        })

        expect(result).toHaveLength(2)
      })

      it('should return empty array when inbox does not exist', async () => {
        mockDb.setQueryResult('select_nonexistent', [])

        const result = await plugin.methods.inboxFolderGetByInbox({
          inboxName: 'nonexistent',
        })

        expect(result).toHaveLength(0)
      })
    })

    describe('inboxFolderDelete', () => {
      it('should return true when folder is deleted', async () => {
        mockDb.setQueryResult('select_test-inbox', [mockInbox])
        mockDb.setDeleteRowCount(1)

        const result = await plugin.methods.inboxFolderDelete({
          inboxName: 'test-inbox',
          folderName: 'invoices',
        })

        expect(result).toBe(true)
      })

      it('should return false when folder does not exist', async () => {
        mockDb.setQueryResult('select_test-inbox', [mockInbox])
        mockDb.setDeleteRowCount(0)

        const result = await plugin.methods.inboxFolderDelete({
          inboxName: 'test-inbox',
          folderName: 'nonexistent',
        })

        expect(result).toBe(false)
      })

      it('should return false when inbox does not exist', async () => {
        mockDb.setQueryResult('select_nonexistent', [])

        const result = await plugin.methods.inboxFolderDelete({
          inboxName: 'nonexistent',
          folderName: 'invoices',
        })

        expect(result).toBe(false)
      })
    })
  })

  describe('Allowed Sender Management', () => {
    const mockInbox = {
      id: 'inbox-123',
      tenant_id: null,
      name: 'test-inbox',
      did: 'did:web:example.com',
      description: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    describe('inboxAllowedSenderAdd', () => {
      it('should add a sender to the allowlist', async () => {
        mockDb.setQueryResult('select_test-inbox', [mockInbox])

        const result = await plugin.methods.inboxAllowedSenderAdd({
          inboxName: 'test-inbox',
          clientId: 'did:web:sender.com',
          clientIdPrefix: 'decentralized_identifier',
          description: 'Trusted sender',
        })

        expect(result).toBeDefined()
        expect(result.clientId).toBe('did:web:sender.com')
        expect(result.clientIdPrefix).toBe('decentralized_identifier')
      })

      it('should throw error when inbox does not exist', async () => {
        mockDb.setQueryResult('select_nonexistent', [])

        await expect(
          plugin.methods.inboxAllowedSenderAdd({
            inboxName: 'nonexistent',
            clientId: 'did:web:sender.com',
          })
        ).rejects.toThrow('Inbox not found: nonexistent')
      })
    })

    describe('inboxIsSenderAllowed', () => {
      it('should return true when no allowlist is configured', async () => {
        mockDb.setQueryResult('select_test-inbox', [mockInbox])
        mockDb.setQueryResult('count_inbox-123', [{ count: '0' }])

        const result = await plugin.methods.inboxIsSenderAllowed({
          inboxName: 'test-inbox',
          clientId: 'did:web:anyone.com',
        })

        expect(result).toBe(true)
      })

      it('should return true when sender is in allowlist', async () => {
        mockDb.setQueryResult('select_test-inbox', [mockInbox])
        mockDb.setQueryResult('count_inbox-123', [{ count: '1' }])
        mockDb.setQueryResult('exists_inbox-123_did:web:sender.com_decentralized_identifier', [{ '1': 1 }])

        const result = await plugin.methods.inboxIsSenderAllowed({
          inboxName: 'test-inbox',
          clientId: 'did:web:sender.com',
          clientIdPrefix: 'decentralized_identifier',
        })

        expect(result).toBe(true)
      })

      it('should return false when sender is not in allowlist', async () => {
        mockDb.setQueryResult('select_test-inbox', [mockInbox])
        mockDb.setQueryResult('count_inbox-123', [{ count: '1' }])
        mockDb.setQueryResult('exists_inbox-123_did:web:unknown.com', [])

        const result = await plugin.methods.inboxIsSenderAllowed({
          inboxName: 'test-inbox',
          clientId: 'did:web:unknown.com',
        })

        expect(result).toBe(false)
      })

      it('should return false when inbox does not exist', async () => {
        mockDb.setQueryResult('select_nonexistent', [])

        const result = await plugin.methods.inboxIsSenderAllowed({
          inboxName: 'nonexistent',
          clientId: 'did:web:sender.com',
        })

        expect(result).toBe(false)
      })
    })

    describe('inboxAllowedSenderRemove', () => {
      it('should return true when sender is removed', async () => {
        mockDb.setQueryResult('select_test-inbox', [mockInbox])
        mockDb.setDeleteRowCount(1)

        const result = await plugin.methods.inboxAllowedSenderRemove({
          inboxName: 'test-inbox',
          clientId: 'did:web:sender.com',
          clientIdPrefix: 'decentralized_identifier',
        })

        expect(result).toBe(true)
      })

      it('should return false when sender not found', async () => {
        mockDb.setQueryResult('select_test-inbox', [mockInbox])
        mockDb.setDeleteRowCount(0)

        const result = await plugin.methods.inboxAllowedSenderRemove({
          inboxName: 'test-inbox',
          clientId: 'did:web:unknown.com',
        })

        expect(result).toBe(false)
      })

      it('should return false when inbox does not exist', async () => {
        mockDb.setQueryResult('select_nonexistent', [])

        const result = await plugin.methods.inboxAllowedSenderRemove({
          inboxName: 'nonexistent',
          clientId: 'did:web:sender.com',
        })

        expect(result).toBe(false)
      })

      it('should handle removal without clientIdPrefix', async () => {
        mockDb.setQueryResult('select_test-inbox', [mockInbox])
        mockDb.setDeleteRowCount(1)

        const result = await plugin.methods.inboxAllowedSenderRemove({
          inboxName: 'test-inbox',
          clientId: 'did:web:sender.com',
        })

        expect(result).toBe(true)
        const calls = mockDb.getQueryCalls()
        const deleteCall = calls.find(c => c[0].includes('DELETE'))
        expect(deleteCall?.[0]).toContain('client_id_prefix" IS NULL')
      })
    })

    describe('inboxAllowedSenderList', () => {
      it('should list all allowed senders', async () => {
        mockDb.setQueryResult('select_test-inbox', [mockInbox])
        mockDb.setQueryResult('select_inbox-123', [
          {
            id: 'sender-1',
            inbox_id: 'inbox-123',
            client_id: 'did:web:sender1.com',
            client_id_prefix: 'decentralized_identifier',
            description: 'Sender 1',
            created_at: new Date().toISOString(),
          },
          {
            id: 'sender-2',
            inbox_id: 'inbox-123',
            client_id: 'did:web:sender2.com',
            client_id_prefix: null,
            description: null,
            created_at: new Date().toISOString(),
          },
        ])

        const result = await plugin.methods.inboxAllowedSenderList({
          inboxName: 'test-inbox',
        })

        expect(result).toHaveLength(2)
        expect(result[0].clientId).toBe('did:web:sender1.com')
        expect(result[0].clientIdPrefix).toBe('decentralized_identifier')
        expect(result[1].clientId).toBe('did:web:sender2.com')
        expect(result[1].clientIdPrefix).toBeNull()
      })

      it('should return empty array when inbox does not exist', async () => {
        mockDb.setQueryResult('select_nonexistent', [])

        const result = await plugin.methods.inboxAllowedSenderList({
          inboxName: 'nonexistent',
        })

        expect(result).toHaveLength(0)
      })

      it('should return empty array when no senders configured', async () => {
        mockDb.setQueryResult('select_test-inbox', [mockInbox])
        mockDb.setQueryResult('select_inbox-123', [])

        const result = await plugin.methods.inboxAllowedSenderList({
          inboxName: 'test-inbox',
        })

        expect(result).toHaveLength(0)
      })
    })
  })

  describe('Credential Linking', () => {
    const mockInbox = {
      id: 'inbox-123',
      tenant_id: null,
      name: 'test-inbox',
      did: 'did:web:example.com',
      description: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const mockFolder = {
      id: 'folder-123',
      inbox_id: 'inbox-123',
      name: 'invoices',
      dcql_query_id: 'einvoice-query',
      description: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    describe('inboxCredentialLink', () => {
      it('should link a credential to inbox folder', async () => {
        mockDb.setQueryResult('select_test-inbox', [mockInbox])
        mockDb.setQueryResult('select_inbox-123', [mockFolder])

        const result = await plugin.methods.inboxCredentialLink({
          inboxName: 'test-inbox',
          folderName: 'invoices',
          credentialId: 'cred-123',
          clientId: 'did:web:sender.com',
          clientIdPrefix: 'decentralized_identifier',
          correlationId: 'corr-123',
        })

        expect(result).toBeDefined()
        expect(result.credentialId).toBe('cred-123')
        expect(result.clientId).toBe('did:web:sender.com')
        expect(result.correlationId).toBe('corr-123')
      })

      it('should throw error when inbox does not exist', async () => {
        mockDb.setQueryResult('select_nonexistent', [])

        await expect(
          plugin.methods.inboxCredentialLink({
            inboxName: 'nonexistent',
            folderName: 'invoices',
            credentialId: 'cred-123',
            clientId: 'did:web:sender.com',
            correlationId: 'corr-123',
          })
        ).rejects.toThrow('Inbox not found: nonexistent')
      })

      it('should throw error when folder does not exist', async () => {
        mockDb.setQueryResult('select_test-inbox', [mockInbox])
        mockDb.setQueryResult('select_inbox-123', [])

        await expect(
          plugin.methods.inboxCredentialLink({
            inboxName: 'test-inbox',
            folderName: 'nonexistent',
            credentialId: 'cred-123',
            clientId: 'did:web:sender.com',
            correlationId: 'corr-123',
          })
        ).rejects.toThrow('Folder not found: nonexistent in inbox test-inbox')
      })
    })

    describe('inboxCredentialList', () => {
      it('should list credentials in inbox', async () => {
        mockDb.setQueryResult('select_test-inbox', [mockInbox])
        mockDb.setQueryResult('select_inbox-123', [
          {
            id: 'link-1',
            inbox_id: 'inbox-123',
            folder_id: 'folder-123',
            credential_id: 'cred-1',
            client_id: 'did:web:sender1.com',
            client_id_prefix: 'decentralized_identifier',
            correlation_id: 'corr-1',
            received_at: new Date().toISOString(),
          },
          {
            id: 'link-2',
            inbox_id: 'inbox-123',
            folder_id: 'folder-123',
            credential_id: 'cred-2',
            client_id: 'did:web:sender2.com',
            client_id_prefix: null,
            correlation_id: 'corr-2',
            received_at: new Date().toISOString(),
          },
        ])

        const result = await plugin.methods.inboxCredentialList({
          inboxName: 'test-inbox',
        })

        expect(result).toHaveLength(2)
        expect(result[0].credentialId).toBe('cred-1')
        expect(result[1].credentialId).toBe('cred-2')
      })

      it('should return empty array when inbox does not exist', async () => {
        mockDb.setQueryResult('select_nonexistent', [])

        const result = await plugin.methods.inboxCredentialList({
          inboxName: 'nonexistent',
        })

        expect(result).toHaveLength(0)
      })
    })

    describe('inboxCredentialDelete', () => {
      it('should return true when credential link is deleted', async () => {
        mockDb.setDeleteRowCount(1)

        const result = await plugin.methods.inboxCredentialDelete({
          id: 'link-123',
        })

        expect(result).toBe(true)
      })

      it('should return false when credential link does not exist', async () => {
        mockDb.setDeleteRowCount(0)

        const result = await plugin.methods.inboxCredentialDelete({
          id: 'nonexistent',
        })

        expect(result).toBe(false)
      })
    })

    describe('inboxCredentialGetByCorrelationId', () => {
      it('should return credential when found', async () => {
        mockDb.setQueryResult('select_corr-123', [
          {
            id: 'link-123',
            inbox_id: 'inbox-123',
            folder_id: 'folder-123',
            credential_id: 'cred-123',
            client_id: 'did:web:sender.com',
            client_id_prefix: 'decentralized_identifier',
            correlation_id: 'corr-123',
            received_at: new Date().toISOString(),
            parsed_data: null,
            evidence_fetched_at: null,
          },
        ])

        const result = await plugin.methods.inboxCredentialGetByCorrelationId({
          correlationId: 'corr-123',
        })

        expect(result).toBeDefined()
        expect(result?.correlationId).toBe('corr-123')
        expect(result?.credentialId).toBe('cred-123')
      })

      it('should return null when credential not found', async () => {
        mockDb.setQueryResult('select_nonexistent', [])

        const result = await plugin.methods.inboxCredentialGetByCorrelationId({
          correlationId: 'nonexistent',
        })

        expect(result).toBeNull()
      })
    })

    describe('inboxCredentialUpdateParsedData', () => {
      it('should update parsed data and return updated credential', async () => {
        const now = new Date()
        const parsedData = {
          invoiceId: 'INV-001',
          amount: 1000,
          currency: 'EUR',
        }

        // Mock the RETURNING query to return updated record
        mockDb.setQueryResult('select_link-123', [
          {
            id: 'link-123',
            inbox_id: 'inbox-123',
            folder_id: 'folder-123',
            credential_id: 'cred-123',
            client_id: 'did:web:sender.com',
            client_id_prefix: 'decentralized_identifier',
            correlation_id: 'corr-123',
            received_at: now.toISOString(),
            parsed_data: JSON.stringify(parsedData),
            evidence_fetched_at: now.toISOString(),
          },
        ])

        const result = await plugin.methods.inboxCredentialUpdateParsedData({
          correlationId: 'link-123', // Note: This is actually the inbox_credential.id
          parsedData,
        })

        expect(result).toBeDefined()
        expect(result.parsedData).toEqual(parsedData)
        expect(result.evidenceFetchedAt).toBeDefined()
      })

      it('should throw error when credential not found', async () => {
        mockDb.setQueryResult('select_nonexistent', [])

        await expect(
          plugin.methods.inboxCredentialUpdateParsedData({
            correlationId: 'nonexistent',
            parsedData: { test: 'data' },
          })
        ).rejects.toThrow('InboxCredential not found: nonexistent')
      })
    })
  })
})
