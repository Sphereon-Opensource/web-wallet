import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { INBOX_API_BASE_PATH } from '../environment-vars'
import { BaseApiServer, BaseApiServerOptions } from './BaseApiServer'

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
export class InboxApiServer extends BaseApiServer {
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

  constructor(options: BaseApiServerOptions) {
    super(options, INBOX_API_BASE_PATH, 'Inbox')
  }

  protected setupRoutes(): void {
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

  /**
   * Get stored inbox context by correlation ID
   */
  static getInboxContext(correlationId: string) {
    return InboxApiServer.inboxContextStore.get(correlationId)
  }

  // ===== Inbox Endpoints =====

  private async listInboxes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const inboxes = await this.agent.inboxGetAll()
      this.success(res, inboxes)
    } catch (error) {
      next(error)
    }
  }

  private async createInbox(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, did, description, tenantId } = req.body

      if (!name || !did) {
        this.badRequest(res, 'name and did are required')
        return
      }

      const inbox = await this.agent.inboxCreate({ name, did, description, tenantId })
      this.created(res, inbox)
    } catch (error: any) {
      if (this.isConflictError(error)) {
        this.conflict(res, 'Inbox with this name already exists')
        return
      }
      next(error)
    }
  }

  private async getInbox(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { inboxName } = req.params
      const inbox = await this.getResourceOrNotFound(
        () => this.agent.inboxGet({ name: inboxName }),
        res,
        'Inbox'
      )
      if (!inbox) return
      this.success(res, inbox)
    } catch (error) {
      next(error)
    }
  }

  private async deleteInbox(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { inboxName } = req.params
      await this.deleteResourceOrNotFound(
        () => this.agent.inboxDelete({ name: inboxName }),
        res,
        'Inbox'
      )
    } catch (error) {
      next(error)
    }
  }

  // ===== Folder Endpoints =====

  private async listFolders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { inboxName } = req.params
      const folders = await this.agent.inboxFolderGetByInbox({ inboxName })
      this.success(res, folders)
    } catch (error) {
      next(error)
    }
  }

  private async createFolder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { inboxName } = req.params
      const { name, dcqlQueryId, description } = req.body

      if (!name) {
        this.badRequest(res, 'name is required')
        return
      }

      const folder = await this.agent.inboxFolderCreate({ inboxName, name, dcqlQueryId, description })
      this.created(res, folder)
    } catch (error: any) {
      if (this.isNotFoundError(error)) {
        this.notFound(res, 'Inbox not found')
        return
      }
      if (this.isConflictError(error)) {
        this.conflict(res, 'Folder with this name already exists in inbox')
        return
      }
      next(error)
    }
  }

  private async getFolder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { inboxName, folderName } = req.params
      const folder = await this.getResourceOrNotFound(
        () => this.agent.inboxFolderGet({ inboxName, folderName }),
        res,
        'Folder'
      )
      if (!folder) return
      this.success(res, folder)
    } catch (error) {
      next(error)
    }
  }

  private async deleteFolder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { inboxName, folderName } = req.params
      await this.deleteResourceOrNotFound(
        () => this.agent.inboxFolderDelete({ inboxName, folderName }),
        res,
        'Folder'
      )
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
        this.notFound(res, 'Inbox not found')
        return
      }

      // Validate folder exists and has DCQL query configured
      const folder = await this.agent.inboxFolderGet({ inboxName, folderName })
      if (!folder) {
        this.notFound(res, 'Folder not found')
        return
      }

      if (!folder.dcqlQueryId) {
        this.badRequest(res, 'Folder does not have a DCQL query configured')
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
          this.forbidden(res, 'Sender is not allowed')
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

      // Return the OID4VP URI directly as plain text (as per Universal OID4VP spec)
      // The requestUri already contains the full openid4vp:// URI
      res.status(201).type('text/plain').send(requestUri)
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

  // ===== Credentials Endpoints =====

  private async listCredentials(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { inboxName } = req.params
      const { folderName } = req.query as { folderName?: string }

      const credentials = await this.agent.inboxCredentialList({ inboxName, folderName })
      this.success(res, credentials)
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
      const credential = await this.getResourceOrNotFound(
        () => this.agent.inboxCredentialGetByCorrelationId({ correlationId }),
        res,
        'Credential'
      )
      if (!credential) return
      this.success(res, credential)
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
        this.badRequest(res, 'parsedData object is required')
        return
      }

      const credential = await this.agent.inboxCredentialUpdateParsedData({
        correlationId,
        parsedData,
      })

      this.success(res, credential)
    } catch (error: any) {
      if (this.isNotFoundError(error)) {
        this.notFound(res, 'Credential not found')
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
      this.success(res, senders)
    } catch (error) {
      next(error)
    }
  }

  private async addAllowedSender(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { inboxName } = req.params
      const { clientId, clientIdPrefix, description } = req.body

      if (!clientId) {
        this.badRequest(res, 'clientId is required')
        return
      }

      const sender = await this.agent.inboxAllowedSenderAdd({
        inboxName,
        clientId,
        clientIdPrefix,
        description,
      })

      this.created(res, sender)
    } catch (error: any) {
      if (this.isNotFoundError(error)) {
        this.notFound(res, 'Inbox not found')
        return
      }
      if (this.isConflictError(error)) {
        this.conflict(res, 'Sender already in allowlist')
        return
      }
      next(error)
    }
  }

  private async removeAllowedSender(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { inboxName, clientId } = req.params
      const { clientIdPrefix } = req.query as { clientIdPrefix?: string }
      await this.deleteResourceOrNotFound(
        () => this.agent.inboxAllowedSenderRemove({
          inboxName,
          clientId: decodeURIComponent(clientId),
          clientIdPrefix,
        }),
        res,
        'Sender'
      )
    } catch (error) {
      next(error)
    }
  }
}

// Re-export the options type for convenience
export type InboxApiServerOptions = BaseApiServerOptions
