import { Router, Request, Response, NextFunction } from 'express'
import { TAgent } from '@veramo/core'
import { ExpressSupport } from '@sphereon/ssi-express-support'
import { v4 as uuidv4 } from 'uuid'
import { TAgentTypes } from '../types'
import { INBOX_API_BASE_PATH } from '../environment-vars'

export interface InboxApiServerOptions {
  agent: TAgent<TAgentTypes>
  expressSupport: ExpressSupport
  opts?: {
    basePath?: string
  }
}

/**
 * API Server for inbox operations.
 *
 * Endpoints:
 * - GET /inbox - List all inboxes
 * - POST /inbox - Create new inbox
 * - GET /inbox/:inboxName - Get inbox by name
 * - DELETE /inbox/:inboxName - Delete inbox
 * - GET /inbox/:inboxName/folders - List folders in inbox
 * - POST /inbox/:inboxName/folders - Create folder in inbox
 * - GET /inbox/:inboxName/folders/:folderName - Get folder
 * - DELETE /inbox/:inboxName/folders/:folderName - Delete folder
 * - POST /inbox/:inboxName/:folderName - Initiate OID4VP flow for receiving credentials
 * - GET /inbox/:inboxName/credentials - List received credentials
 * - GET /inbox/credentials/:correlationId - Get credential by correlation ID
 * - PUT /inbox/credentials/:correlationId/parsed-data - Update parsed evidence data
 * - GET /inbox/:inboxName/allowed-senders - List allowed senders
 * - POST /inbox/:inboxName/allowed-senders - Add allowed sender
 * - DELETE /inbox/:inboxName/allowed-senders/:clientId - Remove allowed sender
 */
export class InboxApiServer {
  private readonly agent: TAgent<TAgentTypes>
  private readonly router: Router
  private readonly basePath: string

  constructor(options: InboxApiServerOptions) {
    this.agent = options.agent
    this.basePath = options.opts?.basePath ?? INBOX_API_BASE_PATH
    this.router = Router()

    this.setupRoutes()

    // Register routes with express
    const app = options.expressSupport.express
    app.use(this.basePath, this.router)

    console.log(`[Inbox] API server started at ${this.basePath}`)
  }

  private setupRoutes(): void {
    // Inbox CRUD
    this.router.get('/inbox', this.listInboxes.bind(this))
    this.router.post('/inbox', this.createInbox.bind(this))
    this.router.get('/inbox/:inboxName', this.getInbox.bind(this))
    this.router.delete('/inbox/:inboxName', this.deleteInbox.bind(this))

    // Folder CRUD
    this.router.get('/inbox/:inboxName/folders', this.listFolders.bind(this))
    this.router.post('/inbox/:inboxName/folders', this.createFolder.bind(this))
    this.router.get('/inbox/:inboxName/folders/:folderName', this.getFolder.bind(this))
    this.router.delete('/inbox/:inboxName/folders/:folderName', this.deleteFolder.bind(this))

    // Credentials
    this.router.get('/inbox/:inboxName/credentials', this.listCredentials.bind(this))
    this.router.get('/inbox/credentials/:correlationId', this.getCredentialByCorrelationId.bind(this))
    this.router.put('/inbox/credentials/:correlationId/parsed-data', this.updateCredentialParsedData.bind(this))

    // Allowed senders
    this.router.get('/inbox/:inboxName/allowed-senders', this.listAllowedSenders.bind(this))
    this.router.post('/inbox/:inboxName/allowed-senders', this.addAllowedSender.bind(this))
    this.router.delete('/inbox/:inboxName/allowed-senders/:clientId', this.removeAllowedSender.bind(this))

    // OID4VP flow initiation - MUST be last as it has a catch-all :folderName parameter
    this.router.post('/inbox/:inboxName/:folderName', this.initiateOid4vpFlow.bind(this))
  }

  // ===== Inbox Endpoints =====

  private async listInboxes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const inboxes = await this.agent.inboxGetAll()
      res.json(inboxes)
    } catch (error) {
      next(error)
    }
  }

  private async createInbox(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, did, description, tenantId } = req.body

      if (!name || !did) {
        res.status(400).json({ error: 'name and did are required' })
        return
      }

      const inbox = await this.agent.inboxCreate({ name, did, description, tenantId })
      res.status(201).json(inbox)
    } catch (error: any) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        res.status(409).json({ error: 'Inbox with this name already exists' })
        return
      }
      next(error)
    }
  }

  private async getInbox(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { inboxName } = req.params
      const inbox = await this.agent.inboxGet({ name: inboxName })

      if (!inbox) {
        res.status(404).json({ error: 'Inbox not found' })
        return
      }

      res.json(inbox)
    } catch (error) {
      next(error)
    }
  }

  private async deleteInbox(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { inboxName } = req.params
      const deleted = await this.agent.inboxDelete({ name: inboxName })

      if (!deleted) {
        res.status(404).json({ error: 'Inbox not found' })
        return
      }

      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }

  // ===== Folder Endpoints =====

  private async listFolders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { inboxName } = req.params
      const folders = await this.agent.inboxFolderGetByInbox({ inboxName })
      res.json(folders)
    } catch (error) {
      next(error)
    }
  }

  private async createFolder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { inboxName } = req.params
      const { name, dcqlQueryId, description } = req.body

      if (!name) {
        res.status(400).json({ error: 'name is required' })
        return
      }

      const folder = await this.agent.inboxFolderCreate({ inboxName, name, dcqlQueryId, description })
      res.status(201).json(folder)
    } catch (error: any) {
      if (error.message?.includes('Inbox not found')) {
        res.status(404).json({ error: 'Inbox not found' })
        return
      }
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        res.status(409).json({ error: 'Folder with this name already exists in inbox' })
        return
      }
      next(error)
    }
  }

  private async getFolder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { inboxName, folderName } = req.params
      const folder = await this.agent.inboxFolderGet({ inboxName, folderName })

      if (!folder) {
        res.status(404).json({ error: 'Folder not found' })
        return
      }

      res.json(folder)
    } catch (error) {
      next(error)
    }
  }

  private async deleteFolder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { inboxName, folderName } = req.params
      const deleted = await this.agent.inboxFolderDelete({ inboxName, folderName })

      if (!deleted) {
        res.status(404).json({ error: 'Folder not found' })
        return
      }

      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }

  // ===== OID4VP Flow Initiation =====

  /**
   * POST /inbox/:inboxName/:folderName
   *
   * Initiates an OID4VP flow for receiving credentials.
   *
   * Request body:
   * {
   *   "client_id": "decentralized_identifier:did:web:sender.example.com"
   * }
   *
   * Response:
   * {
   *   "request_uri": "...",
   *   "client_id": "decentralized_identifier:did:web:receiver.example.com"
   * }
   */
  private async initiateOid4vpFlow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { inboxName, folderName } = req.params
      const { client_id: senderClientId } = req.body

      // Validate inbox exists
      const inbox = await this.agent.inboxGet({ name: inboxName })
      if (!inbox) {
        res.status(404).json({ error: 'Inbox not found' })
        return
      }

      // Validate folder exists and has DCQL query configured
      const folder = await this.agent.inboxFolderGet({ inboxName, folderName })
      if (!folder) {
        res.status(404).json({ error: 'Folder not found' })
        return
      }

      if (!folder.dcqlQueryId) {
        res.status(400).json({ error: 'Folder does not have a DCQL query configured' })
        return
      }

      // Parse sender client_id if provided
      let parsedClientId: string | undefined
      let parsedClientIdPrefix: string | undefined

      if (senderClientId) {
        const parsed = this.parseClientId(senderClientId)
        parsedClientId = parsed.clientId
        parsedClientIdPrefix = parsed.clientIdPrefix

        // Check if sender is allowed
        const isAllowed = await this.agent.inboxIsSenderAllowed({
          inboxName,
          clientId: parsedClientId,
          clientIdPrefix: parsedClientIdPrefix,
        })

        if (!isAllowed) {
          res.status(403).json({ error: 'Sender is not allowed' })
          return
        }
      }

      // Generate correlation ID for this request
      const correlationId = uuidv4()

      // Determine base URI for OID4VP endpoints
      const baseUri = process.env.OID4VP_AGENT_BASE_URI ?? `http://localhost:${process.env.PORT ?? 5000}`

      // Create the auth request URI using the existing SIOP infrastructure
      const requestUri = await this.agent.siopCreateAuthRequestURI({
        correlationId,
        queryId: folder.dcqlQueryId,
        requestByReferenceURI: `${baseUri}/siop/queries/${folder.dcqlQueryId}/auth-requests/${correlationId}`,
        responseURIType: 'response_uri',
        responseURI: `${baseUri}/siop/queries/${folder.dcqlQueryId}/auth-responses/${correlationId}`,
      })

      // Store inbox context for credential tagging (will be retrieved after VP verification)
      // Using KeyValueStore to persist context across the async OID4VP flow
      await this.storeInboxContext(correlationId, {
        inboxName,
        folderName,
        clientId: parsedClientId,
        clientIdPrefix: parsedClientIdPrefix,
      })

      // Format receiver's client_id with prefix
      const receiverClientId = `decentralized_identifier:${inbox.did}`

      res.status(201).json({
        request_uri: requestUri,
        client_id: receiverClientId,
      })
    } catch (error: any) {
      console.error('[Inbox] Error initiating OID4VP flow:', error)
      next(error)
    }
  }

  /**
   * Parse a client_id string that may include a prefix.
   * Examples:
   * - "decentralized_identifier:did:web:example.com" -> { clientIdPrefix: "decentralized_identifier", clientId: "did:web:example.com" }
   * - "x509_san_dns:example.com" -> { clientIdPrefix: "x509_san_dns", clientId: "example.com" }
   * - "did:web:example.com" -> { clientId: "did:web:example.com" } (no prefix)
   */
  private parseClientId(fullClientId: string): { clientId: string; clientIdPrefix?: string } {
    const knownPrefixes = [
      'decentralized_identifier',
      'x509_san_dns',
      'x509_san_uri',
      'verifier_attestation',
    ]

    for (const prefix of knownPrefixes) {
      if (fullClientId.startsWith(`${prefix}:`)) {
        return {
          clientIdPrefix: prefix,
          clientId: fullClientId.substring(prefix.length + 1),
        }
      }
    }

    // No known prefix, treat entire string as client_id
    return { clientId: fullClientId }
  }

  /**
   * Store inbox context for later retrieval during credential storage.
   * This context is needed to link received credentials to the correct inbox/folder.
   */
  private async storeInboxContext(
    correlationId: string,
    context: {
      inboxName: string
      folderName: string
      clientId?: string
      clientIdPrefix?: string
    }
  ): Promise<void> {
    // TODO: Use KeyValueStore to persist this context
    // For now, we'll use a simple in-memory store that should be replaced
    // with proper persistence in production
    InboxApiServer.inboxContextStore.set(correlationId, context)
  }

  /**
   * Static store for inbox context (temporary - should use KeyValueStore)
   */
  static inboxContextStore = new Map<
    string,
    {
      inboxName: string
      folderName: string
      clientId?: string
      clientIdPrefix?: string
    }
  >()

  /**
   * Get stored inbox context by correlation ID
   */
  static getInboxContext(correlationId: string) {
    return InboxApiServer.inboxContextStore.get(correlationId)
  }

  // ===== Credentials Endpoints =====

  private async listCredentials(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { inboxName } = req.params
      const { folderName } = req.query as { folderName?: string }

      const credentials = await this.agent.inboxCredentialList({ inboxName, folderName })
      res.json(credentials)
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /inbox/credentials/:correlationId
   * Get a credential by its correlation ID
   */
  private async getCredentialByCorrelationId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { correlationId } = req.params

      const credential = await this.agent.inboxCredentialGetByCorrelationId({ correlationId })

      if (!credential) {
        res.status(404).json({ error: 'Credential not found' })
        return
      }

      res.json(credential)
    } catch (error) {
      next(error)
    }
  }

  /**
   * PUT /inbox/credentials/:correlationId/parsed-data
   * Update the parsed evidence data for a credential
   *
   * Request body: { parsedData: Record<string, unknown> }
   */
  private async updateCredentialParsedData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { correlationId } = req.params
      const { parsedData } = req.body

      if (!parsedData || typeof parsedData !== 'object') {
        res.status(400).json({ error: 'parsedData object is required' })
        return
      }

      const credential = await this.agent.inboxCredentialUpdateParsedData({
        correlationId,
        parsedData,
      })

      res.json(credential)
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        res.status(404).json({ error: 'Credential not found' })
        return
      }
      next(error)
    }
  }

  // ===== Allowed Senders Endpoints =====

  private async listAllowedSenders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { inboxName } = req.params
      const senders = await this.agent.inboxAllowedSenderList({ inboxName })
      res.json(senders)
    } catch (error) {
      next(error)
    }
  }

  private async addAllowedSender(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { inboxName } = req.params
      const { clientId, clientIdPrefix, description } = req.body

      if (!clientId) {
        res.status(400).json({ error: 'clientId is required' })
        return
      }

      const sender = await this.agent.inboxAllowedSenderAdd({
        inboxName,
        clientId,
        clientIdPrefix,
        description,
      })

      res.status(201).json(sender)
    } catch (error: any) {
      if (error.message?.includes('Inbox not found')) {
        res.status(404).json({ error: 'Inbox not found' })
        return
      }
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        res.status(409).json({ error: 'Sender already in allowlist' })
        return
      }
      next(error)
    }
  }

  private async removeAllowedSender(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { inboxName, clientId } = req.params
      const { clientIdPrefix } = req.query as { clientIdPrefix?: string }

      const removed = await this.agent.inboxAllowedSenderRemove({
        inboxName,
        clientId: decodeURIComponent(clientId),
        clientIdPrefix,
      })

      if (!removed) {
        res.status(404).json({ error: 'Sender not found in allowlist' })
        return
      }

      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }
}
