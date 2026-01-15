import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import express, { Express } from 'express'
import request from 'supertest'
import { InboxApiServer } from '../../api/inboxApiServer'
import { TAgent } from '@veramo/core'
import { TAgentTypes } from '../../types'

// Mock the environment variables
jest.mock('../../environment-vars', () => ({
  INBOX_API_BASE_PATH: '',
}))

// Create a mock agent with inbox methods
const createMockAgent = () => {
  const inboxes = new Map<string, any>()
  const folders = new Map<string, any>()
  const allowedSenders = new Map<string, any[]>()
  const credentials = new Map<string, any[]>()

  return {
    inboxCreate: jest.fn<(args: any) => Promise<any>>().mockImplementation(async (args: any) => {
      const inbox = {
        id: `inbox-${Date.now()}`,
        name: args.name,
        did: args.did,
        description: args.description,
        tenantId: args.tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      inboxes.set(args.name, inbox)
      return inbox
    }),
    inboxGet: jest.fn<(args: any) => Promise<any>>().mockImplementation(async (args: any) => {
      return inboxes.get(args.name) || null
    }),
    inboxGetAll: jest.fn<() => Promise<any[]>>().mockImplementation(async () => {
      return Array.from(inboxes.values())
    }),
    inboxDelete: jest.fn<(args: any) => Promise<boolean>>().mockImplementation(async (args: any) => {
      const exists = inboxes.has(args.name)
      inboxes.delete(args.name)
      return exists
    }),
    inboxFolderCreate: jest.fn<(args: any) => Promise<any>>().mockImplementation(async (args: any) => {
      const inbox = inboxes.get(args.inboxName)
      if (!inbox) throw new Error('Inbox not found')
      const folder = {
        id: `folder-${Date.now()}`,
        inboxId: inbox.id,
        name: args.name,
        dcqlQueryId: args.dcqlQueryId,
        description: args.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      folders.set(`${args.inboxName}:${args.name}`, folder)
      return folder
    }),
    inboxFolderGet: jest.fn<(args: any) => Promise<any>>().mockImplementation(async (args: any) => {
      return folders.get(`${args.inboxName}:${args.folderName}`) || null
    }),
    inboxFolderGetByInbox: jest.fn<(args: any) => Promise<any[]>>().mockImplementation(async (args: any) => {
      return Array.from(folders.values()).filter((f) => {
        const inbox = inboxes.get(args.inboxName)
        return inbox && f.inboxId === inbox.id
      })
    }),
    inboxFolderDelete: jest.fn<(args: any) => Promise<boolean>>().mockImplementation(async (args: any) => {
      const key = `${args.inboxName}:${args.folderName}`
      const exists = folders.has(key)
      folders.delete(key)
      return exists
    }),
    inboxAllowedSenderAdd: jest.fn<(args: any) => Promise<any>>().mockImplementation(async (args: any) => {
      const inbox = inboxes.get(args.inboxName)
      if (!inbox) throw new Error('Inbox not found')
      const sender = {
        id: `sender-${Date.now()}`,
        inboxId: inbox.id,
        clientId: args.clientId,
        clientIdPrefix: args.clientIdPrefix,
        description: args.description,
        createdAt: new Date(),
      }
      const senders = allowedSenders.get(args.inboxName) || []
      senders.push(sender)
      allowedSenders.set(args.inboxName, senders)
      return sender
    }),
    inboxAllowedSenderRemove: jest.fn<(args: any) => Promise<boolean>>().mockImplementation(async (args: any) => {
      const senders = allowedSenders.get(args.inboxName) || []
      const index = senders.findIndex(
        (s) => s.clientId === args.clientId && s.clientIdPrefix === args.clientIdPrefix
      )
      if (index >= 0) {
        senders.splice(index, 1)
        allowedSenders.set(args.inboxName, senders)
        return true
      }
      return false
    }),
    inboxAllowedSenderList: jest.fn<(args: any) => Promise<any[]>>().mockImplementation(async (args: any) => {
      return allowedSenders.get(args.inboxName) || []
    }),
    inboxIsSenderAllowed: jest.fn<(args: any) => Promise<boolean>>().mockImplementation(async (args: any) => {
      const senders = allowedSenders.get(args.inboxName) || []
      if (senders.length === 0) return true // No allowlist means all allowed
      return senders.some(
        (s) => s.clientId === args.clientId && s.clientIdPrefix === args.clientIdPrefix
      )
    }),
    inboxCredentialLink: jest.fn<(args: any) => Promise<any>>().mockImplementation(async (args: any) => {
      const inbox = inboxes.get(args.inboxName)
      if (!inbox) throw new Error('Inbox not found')
      const folder = folders.get(`${args.inboxName}:${args.folderName}`)
      if (!folder) throw new Error('Folder not found')
      const cred = {
        id: `cred-link-${Date.now()}`,
        inboxId: inbox.id,
        folderId: folder.id,
        credentialId: args.credentialId,
        clientId: args.clientId,
        clientIdPrefix: args.clientIdPrefix,
        correlationId: args.correlationId,
        receivedAt: new Date(),
      }
      const creds = credentials.get(args.inboxName) || []
      creds.push(cred)
      credentials.set(args.inboxName, creds)
      return cred
    }),
    inboxCredentialList: jest.fn<(args: any) => Promise<any[]>>().mockImplementation(async (args: any) => {
      return credentials.get(args.inboxName) || []
    }),
    siopCreateAuthRequestURI: jest.fn<(args: any) => Promise<string>>().mockImplementation(async (args: any) => {
      return `openid4vp://authorize?request_uri=${args.requestByReferenceURI}`
    }),
    // Clear all data for test isolation
    _clearData: () => {
      inboxes.clear()
      folders.clear()
      allowedSenders.clear()
      credentials.clear()
    },
  } as unknown as TAgent<TAgentTypes> & { _clearData: () => void }
}

// Create mock ExpressSupport
const createMockExpressSupport = (app: Express) => ({
  express: app,
})

describe('InboxApiServer', () => {
  let app: Express
  let mockAgent: ReturnType<typeof createMockAgent>
  let server: InboxApiServer

  beforeEach(() => {
    app = express()
    app.use(express.json())
    mockAgent = createMockAgent()
    server = new InboxApiServer({
      agent: mockAgent,
      expressSupport: createMockExpressSupport(app) as any,
    })
  })

  afterEach(() => {
    mockAgent._clearData()
    jest.clearAllMocks()
  })

  describe('Inbox Endpoints', () => {
    describe('GET /inbox', () => {
      it('should return empty array when no inboxes exist', async () => {
        const response = await request(app).get('/inbox')

        expect(response.status).toBe(200)
        expect(response.body).toEqual([])
      })

      it('should return all inboxes', async () => {
        await mockAgent.inboxCreate({ name: 'inbox-1', did: 'did:web:example1.com' })
        await mockAgent.inboxCreate({ name: 'inbox-2', did: 'did:web:example2.com' })

        const response = await request(app).get('/inbox')

        expect(response.status).toBe(200)
        expect(response.body).toHaveLength(2)
      })
    })

    describe('POST /inbox', () => {
      it('should create an inbox', async () => {
        const response = await request(app)
          .post('/inbox')
          .send({
            name: 'test-inbox',
            did: 'did:web:example.com',
            description: 'Test inbox',
          })

        expect(response.status).toBe(201)
        expect(response.body.name).toBe('test-inbox')
        expect(response.body.did).toBe('did:web:example.com')
      })

      it('should return 400 when name is missing', async () => {
        const response = await request(app)
          .post('/inbox')
          .send({ did: 'did:web:example.com' })

        expect(response.status).toBe(400)
        expect(response.body.error).toBe('name and did are required')
      })

      it('should return 400 when did is missing', async () => {
        const response = await request(app)
          .post('/inbox')
          .send({ name: 'test-inbox' })

        expect(response.status).toBe(400)
        expect(response.body.error).toBe('name and did are required')
      })
    })

    describe('GET /inbox/:inboxName', () => {
      it('should return inbox when found', async () => {
        await mockAgent.inboxCreate({ name: 'test-inbox', did: 'did:web:example.com' })

        const response = await request(app).get('/inbox/test-inbox')

        expect(response.status).toBe(200)
        expect(response.body.name).toBe('test-inbox')
      })

      it('should return 404 when inbox not found', async () => {
        const response = await request(app).get('/inbox/nonexistent')

        expect(response.status).toBe(404)
        expect(response.body.error).toBe('Inbox not found')
      })
    })

    describe('DELETE /inbox/:inboxName', () => {
      it('should delete an inbox', async () => {
        await mockAgent.inboxCreate({ name: 'test-inbox', did: 'did:web:example.com' })

        const response = await request(app).delete('/inbox/test-inbox')

        expect(response.status).toBe(204)
      })

      it('should return 404 when inbox not found', async () => {
        const response = await request(app).delete('/inbox/nonexistent')

        expect(response.status).toBe(404)
      })
    })
  })

  describe('Folder Endpoints', () => {
    beforeEach(async () => {
      await mockAgent.inboxCreate({ name: 'test-inbox', did: 'did:web:example.com' })
    })

    describe('GET /inbox/:inboxName/folders', () => {
      it('should return folders in inbox', async () => {
        await mockAgent.inboxFolderCreate({
          inboxName: 'test-inbox',
          name: 'invoices',
          dcqlQueryId: 'einvoice-query',
        })

        const response = await request(app).get('/inbox/test-inbox/folders')

        expect(response.status).toBe(200)
        expect(response.body).toHaveLength(1)
        expect(response.body[0].name).toBe('invoices')
      })
    })

    describe('POST /inbox/:inboxName/folders', () => {
      it('should create a folder', async () => {
        const response = await request(app)
          .post('/inbox/test-inbox/folders')
          .send({
            name: 'invoices',
            dcqlQueryId: 'einvoice-query',
          })

        expect(response.status).toBe(201)
        expect(response.body.name).toBe('invoices')
        expect(response.body.dcqlQueryId).toBe('einvoice-query')
      })

      it('should return 400 when name is missing', async () => {
        const response = await request(app)
          .post('/inbox/test-inbox/folders')
          .send({ dcqlQueryId: 'einvoice-query' })

        expect(response.status).toBe(400)
        expect(response.body.error).toBe('name is required')
      })

      it('should return 404 when inbox not found', async () => {
        const response = await request(app)
          .post('/inbox/nonexistent/folders')
          .send({ name: 'invoices' })

        expect(response.status).toBe(404)
        expect(response.body.error).toBe('Inbox not found')
      })
    })

    describe('DELETE /inbox/:inboxName/folders/:folderName', () => {
      it('should delete a folder', async () => {
        await mockAgent.inboxFolderCreate({
          inboxName: 'test-inbox',
          name: 'invoices',
        })

        const response = await request(app).delete('/inbox/test-inbox/folders/invoices')

        expect(response.status).toBe(204)
      })

      it('should return 404 when folder not found', async () => {
        const response = await request(app).delete('/inbox/test-inbox/folders/nonexistent')

        expect(response.status).toBe(404)
      })
    })
  })

  describe('OID4VP Flow Initiation', () => {
    beforeEach(async () => {
      await mockAgent.inboxCreate({ name: 'test-inbox', did: 'did:web:receiver.com' })
      await mockAgent.inboxFolderCreate({
        inboxName: 'test-inbox',
        name: 'invoices',
        dcqlQueryId: 'einvoice-query',
      })
    })

    describe('POST /inbox/:inboxName/:folderName', () => {
      it('should initiate OID4VP flow', async () => {
        const response = await request(app)
          .post('/inbox/test-inbox/invoices')
          .send({
            client_id: 'decentralized_identifier:did:web:sender.com',
          })

        expect(response.status).toBe(201)
        expect(response.body.request_uri).toBeDefined()
        expect(response.body.client_id).toBe('decentralized_identifier:did:web:receiver.com')
      })

      it('should work without client_id', async () => {
        const response = await request(app)
          .post('/inbox/test-inbox/invoices')
          .send({})

        expect(response.status).toBe(201)
        expect(response.body.request_uri).toBeDefined()
      })

      it('should return 404 when inbox not found', async () => {
        const response = await request(app)
          .post('/inbox/nonexistent/invoices')
          .send({})

        expect(response.status).toBe(404)
        expect(response.body.error).toBe('Inbox not found')
      })

      it('should return 404 when folder not found', async () => {
        const response = await request(app)
          .post('/inbox/test-inbox/nonexistent')
          .send({})

        expect(response.status).toBe(404)
        expect(response.body.error).toBe('Folder not found')
      })

      it('should return 400 when folder has no DCQL query', async () => {
        await mockAgent.inboxFolderCreate({
          inboxName: 'test-inbox',
          name: 'no-query-folder',
          // No dcqlQueryId
        })

        const response = await request(app)
          .post('/inbox/test-inbox/no-query-folder')
          .send({})

        expect(response.status).toBe(400)
        expect(response.body.error).toBe('Folder does not have a DCQL query configured')
      })

      it('should return 403 when sender is not allowed', async () => {
        // Add an allowed sender (which activates the allowlist)
        await mockAgent.inboxAllowedSenderAdd({
          inboxName: 'test-inbox',
          clientId: 'did:web:trusted.com',
          clientIdPrefix: 'decentralized_identifier',
        })

        const response = await request(app)
          .post('/inbox/test-inbox/invoices')
          .send({
            client_id: 'decentralized_identifier:did:web:untrusted.com',
          })

        expect(response.status).toBe(403)
        expect(response.body.error).toBe('Sender is not allowed')
      })
    })
  })

  describe('Allowed Senders Endpoints', () => {
    beforeEach(async () => {
      await mockAgent.inboxCreate({ name: 'test-inbox', did: 'did:web:example.com' })
    })

    describe('GET /inbox/:inboxName/allowed-senders', () => {
      it('should return allowed senders', async () => {
        await mockAgent.inboxAllowedSenderAdd({
          inboxName: 'test-inbox',
          clientId: 'did:web:sender.com',
          clientIdPrefix: 'decentralized_identifier',
        })

        const response = await request(app).get('/inbox/test-inbox/allowed-senders')

        expect(response.status).toBe(200)
        expect(response.body).toHaveLength(1)
        expect(response.body[0].clientId).toBe('did:web:sender.com')
      })
    })

    describe('POST /inbox/:inboxName/allowed-senders', () => {
      it('should add an allowed sender', async () => {
        const response = await request(app)
          .post('/inbox/test-inbox/allowed-senders')
          .send({
            clientId: 'did:web:sender.com',
            clientIdPrefix: 'decentralized_identifier',
            description: 'Trusted partner',
          })

        expect(response.status).toBe(201)
        expect(response.body.clientId).toBe('did:web:sender.com')
      })

      it('should return 400 when clientId is missing', async () => {
        const response = await request(app)
          .post('/inbox/test-inbox/allowed-senders')
          .send({ clientIdPrefix: 'decentralized_identifier' })

        expect(response.status).toBe(400)
        expect(response.body.error).toBe('clientId is required')
      })
    })

    describe('DELETE /inbox/:inboxName/allowed-senders/:clientId', () => {
      it('should remove an allowed sender', async () => {
        await mockAgent.inboxAllowedSenderAdd({
          inboxName: 'test-inbox',
          clientId: 'did:web:sender.com',
        })

        const response = await request(app).delete(
          '/inbox/test-inbox/allowed-senders/' + encodeURIComponent('did:web:sender.com')
        )

        expect(response.status).toBe(204)
      })

      it('should return 404 when sender not found', async () => {
        const response = await request(app).delete(
          '/inbox/test-inbox/allowed-senders/' + encodeURIComponent('did:web:unknown.com')
        )

        expect(response.status).toBe(404)
      })
    })
  })

  describe('Credentials Endpoints', () => {
    beforeEach(async () => {
      await mockAgent.inboxCreate({ name: 'test-inbox', did: 'did:web:example.com' })
      await mockAgent.inboxFolderCreate({
        inboxName: 'test-inbox',
        name: 'invoices',
        dcqlQueryId: 'einvoice-query',
      })
    })

    describe('GET /inbox/:inboxName/credentials', () => {
      it('should return credentials in inbox', async () => {
        await mockAgent.inboxCredentialLink({
          inboxName: 'test-inbox',
          folderName: 'invoices',
          credentialId: 'cred-123',
          clientId: 'did:web:sender.com',
          correlationId: 'corr-123',
        })

        const response = await request(app).get('/inbox/test-inbox/credentials')

        expect(response.status).toBe(200)
        expect(response.body).toHaveLength(1)
        expect(response.body[0].credentialId).toBe('cred-123')
      })

      it('should filter by folder when folderName query param is provided', async () => {
        const response = await request(app)
          .get('/inbox/test-inbox/credentials')
          .query({ folderName: 'invoices' })

        expect(response.status).toBe(200)
        expect(mockAgent.inboxCredentialList).toHaveBeenCalledWith({
          inboxName: 'test-inbox',
          folderName: 'invoices',
        })
      })
    })
  })
})
