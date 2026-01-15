import { DataSource } from 'typeorm'
import { IAgentPlugin, IPluginMethodMap } from '@veramo/core'
import { v4 as uuidv4 } from 'uuid'

/**
 * Inbox entity structure
 */
export interface Inbox {
  id: string
  tenantId?: string
  name: string
  did: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Inbox folder entity structure
 */
export interface InboxFolder {
  id: string
  inboxId: string
  name: string
  dcqlQueryId?: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Inbox credential entity structure (junction table)
 */
export interface InboxCredential {
  id: string
  inboxId: string
  folderId: string
  credentialId: string
  clientId: string
  clientIdPrefix?: string
  correlationId: string
  receivedAt: Date
  /** Parsed evidence data from UBL/evidence files - generic JSON storage */
  parsedData?: Record<string, unknown>
  /** Timestamp when evidence was fetched and parsed */
  evidenceFetchedAt?: Date
}

/**
 * Inbox allowed sender entity structure
 */
export interface InboxAllowedSender {
  id: string
  inboxId: string
  clientId: string
  clientIdPrefix?: string
  description?: string
  createdAt: Date
}

// ===== Create Arguments =====

export interface InboxCreateArgs {
  name: string
  did: string
  description?: string
  tenantId?: string
}

export interface InboxFolderCreateArgs {
  inboxName: string
  name: string
  dcqlQueryId?: string
  description?: string
}

export interface InboxAllowedSenderAddArgs {
  inboxName: string
  clientId: string
  clientIdPrefix?: string
  description?: string
}

export interface InboxCredentialLinkArgs {
  inboxName: string
  folderName: string
  credentialId: string
  clientId: string
  clientIdPrefix?: string
  correlationId: string
}

// ===== Get Arguments =====

export interface InboxGetArgs {
  name: string
}

export interface InboxFolderGetArgs {
  inboxName: string
  folderName: string
}

export interface InboxFolderGetByInboxArgs {
  inboxName: string
}

export interface InboxAllowedSenderListArgs {
  inboxName: string
}

export interface InboxIsSenderAllowedArgs {
  inboxName: string
  clientId: string
  clientIdPrefix?: string
}

export interface InboxAllowedSenderRemoveArgs {
  inboxName: string
  clientId: string
  clientIdPrefix?: string
}

export interface InboxCredentialListArgs {
  inboxName: string
  folderName?: string
}

// ===== Send to Recipient Arguments =====

/**
 * Arguments for sending a credential to a recipient's inbox
 */
export interface InboxSendToRecipientArgs {
  /** The recipient's DID to resolve and find inbox endpoint */
  recipientDid: string
  /** The credential to send (SD-JWT format) */
  credential: string
  /** The sender's DID */
  senderDid: string
  /** Service type to look for in the recipient's DID document */
  serviceType?: string
  /** Direct endpoint URL (bypasses DID document lookup if provided) */
  endpoint?: string
  /** Timeout in ms for the HTTP requests (default: 30000) */
  timeout?: number
}

/**
 * Result of initiating OID4VP flow with a recipient's inbox
 */
export interface InboxSendToRecipientResult {
  /** Whether the credential was successfully sent */
  success: boolean
  /** The request_uri returned from the recipient's inbox (for continuing OID4VP flow) */
  requestUri?: string
  /** The recipient's client_id from their inbox response */
  recipientClientId?: string
  /** The correlation ID for tracking the transaction */
  correlationId?: string
  /** Error message if the send failed */
  error?: string
  /** The inbox endpoint URL that was used */
  inboxEndpoint?: string
}

/**
 * eInvoice service endpoint structure from DID document
 */
export interface EInvoiceServiceEndpoint {
  /** The inbox endpoint URL */
  inboxUrl: string
  /** The folder/path for invoices */
  folder?: string
  /** Supported credential types (VCT) */
  vct?: string[]
}

// ===== Delete Arguments =====

export interface InboxDeleteArgs {
  name: string
}

export interface InboxFolderDeleteArgs {
  inboxName: string
  folderName: string
}

export interface InboxCredentialDeleteArgs {
  /** The inbox credential record ID (UUID) */
  id: string
}

export interface InboxCredentialUpdateParsedDataArgs {
  /** The inbox credential correlation ID (from the credential) */
  correlationId: string
  /** Parsed evidence data to store - generic JSON structure */
  parsedData: Record<string, unknown>
}

export interface InboxCredentialGetByCorrelationIdArgs {
  /** The inbox credential correlation ID (from the credential) */
  correlationId: string
}

/**
 * Plugin methods interface
 */
export interface IInboxPlugin extends IPluginMethodMap {
  // Inbox CRUD
  inboxCreate(args: InboxCreateArgs): Promise<Inbox>
  inboxGet(args: InboxGetArgs): Promise<Inbox | null>
  inboxGetAll(): Promise<Inbox[]>
  inboxDelete(args: InboxDeleteArgs): Promise<boolean>

  // Folder CRUD
  inboxFolderCreate(args: InboxFolderCreateArgs): Promise<InboxFolder>
  inboxFolderGet(args: InboxFolderGetArgs): Promise<InboxFolder | null>
  inboxFolderGetByInbox(args: InboxFolderGetByInboxArgs): Promise<InboxFolder[]>
  inboxFolderDelete(args: InboxFolderDeleteArgs): Promise<boolean>

  // Allowed Sender management
  inboxAllowedSenderAdd(args: InboxAllowedSenderAddArgs): Promise<InboxAllowedSender>
  inboxAllowedSenderRemove(args: InboxAllowedSenderRemoveArgs): Promise<boolean>
  inboxAllowedSenderList(args: InboxAllowedSenderListArgs): Promise<InboxAllowedSender[]>
  inboxIsSenderAllowed(args: InboxIsSenderAllowedArgs): Promise<boolean>

  // Credential linking
  inboxCredentialLink(args: InboxCredentialLinkArgs): Promise<InboxCredential>
  inboxCredentialList(args: InboxCredentialListArgs): Promise<InboxCredential[]>
  inboxCredentialDelete(args: InboxCredentialDeleteArgs): Promise<boolean>
  inboxCredentialGetByCorrelationId(args: InboxCredentialGetByCorrelationIdArgs): Promise<InboxCredential | null>
  inboxCredentialUpdateParsedData(args: InboxCredentialUpdateParsedDataArgs): Promise<InboxCredential>

  // Send to recipient
  inboxSendToRecipient(args: InboxSendToRecipientArgs): Promise<InboxSendToRecipientResult>
}

/**
 * Plugin that manages inbox operations for receiving credentials via OID4VP.
 *
 * Inboxes are named containers that can receive credentials. Each inbox can have
 * multiple folders, each tied to a DCQL query. Credentials are linked to folders
 * via a junction table that tracks sender information.
 */
export class InboxPlugin implements IAgentPlugin {
  readonly methods: IInboxPlugin
  readonly schema = {
    components: {
      schemas: {},
      methods: {
        inboxCreate: {
          description: 'Create a new inbox',
          arguments: { $ref: '#/components/schemas/InboxCreateArgs' },
          returnType: { $ref: '#/components/schemas/Inbox' },
        },
        inboxGet: {
          description: 'Get inbox by name',
          arguments: { $ref: '#/components/schemas/InboxGetArgs' },
          returnType: { $ref: '#/components/schemas/Inbox' },
        },
        inboxGetAll: {
          description: 'List all inboxes',
          arguments: {},
          returnType: { type: 'array', items: { $ref: '#/components/schemas/Inbox' } },
        },
        inboxDelete: {
          description: 'Delete inbox by name',
          arguments: { $ref: '#/components/schemas/InboxDeleteArgs' },
          returnType: { type: 'boolean' },
        },
        inboxFolderCreate: {
          description: 'Create folder in inbox',
          arguments: { $ref: '#/components/schemas/InboxFolderCreateArgs' },
          returnType: { $ref: '#/components/schemas/InboxFolder' },
        },
        inboxFolderGet: {
          description: 'Get folder from inbox',
          arguments: { $ref: '#/components/schemas/InboxFolderGetArgs' },
          returnType: { $ref: '#/components/schemas/InboxFolder' },
        },
        inboxFolderGetByInbox: {
          description: 'List folders in inbox',
          arguments: { $ref: '#/components/schemas/InboxFolderGetByInboxArgs' },
          returnType: { type: 'array', items: { $ref: '#/components/schemas/InboxFolder' } },
        },
        inboxFolderDelete: {
          description: 'Delete folder from inbox',
          arguments: { $ref: '#/components/schemas/InboxFolderDeleteArgs' },
          returnType: { type: 'boolean' },
        },
        inboxAllowedSenderAdd: {
          description: 'Add sender to inbox allowlist',
          arguments: { $ref: '#/components/schemas/InboxAllowedSenderAddArgs' },
          returnType: { $ref: '#/components/schemas/InboxAllowedSender' },
        },
        inboxAllowedSenderRemove: {
          description: 'Remove sender from inbox allowlist',
          arguments: { $ref: '#/components/schemas/InboxAllowedSenderRemoveArgs' },
          returnType: { type: 'boolean' },
        },
        inboxAllowedSenderList: {
          description: 'List allowed senders for inbox',
          arguments: { $ref: '#/components/schemas/InboxAllowedSenderListArgs' },
          returnType: { type: 'array', items: { $ref: '#/components/schemas/InboxAllowedSender' } },
        },
        inboxIsSenderAllowed: {
          description: 'Check if sender is allowed for inbox',
          arguments: { $ref: '#/components/schemas/InboxIsSenderAllowedArgs' },
          returnType: { type: 'boolean' },
        },
        inboxCredentialLink: {
          description: 'Link credential to inbox folder',
          arguments: { $ref: '#/components/schemas/InboxCredentialLinkArgs' },
          returnType: { $ref: '#/components/schemas/InboxCredential' },
        },
        inboxCredentialList: {
          description: 'List credentials in inbox',
          arguments: { $ref: '#/components/schemas/InboxCredentialListArgs' },
          returnType: { type: 'array', items: { $ref: '#/components/schemas/InboxCredential' } },
        },
        inboxCredentialDelete: {
          description: 'Delete inbox credential record by ID',
          arguments: { $ref: '#/components/schemas/InboxCredentialDeleteArgs' },
          returnType: { type: 'boolean' },
        },
        inboxCredentialGetByCorrelationId: {
          description: 'Get inbox credential by correlation ID',
          arguments: { $ref: '#/components/schemas/InboxCredentialGetByCorrelationIdArgs' },
          returnType: { $ref: '#/components/schemas/InboxCredential' },
        },
        inboxCredentialUpdateParsedData: {
          description: 'Update parsed evidence data for inbox credential',
          arguments: { $ref: '#/components/schemas/InboxCredentialUpdateParsedDataArgs' },
          returnType: { $ref: '#/components/schemas/InboxCredential' },
        },
        inboxSendToRecipient: {
          description: 'Send credential to recipient inbox via OID4VP',
          arguments: { $ref: '#/components/schemas/InboxSendToRecipientArgs' },
          returnType: { $ref: '#/components/schemas/InboxSendToRecipientResult' },
        },
      },
    },
  }

  private dbConnection: Promise<DataSource>

  constructor(options: { dbConnection: Promise<DataSource> }) {
    this.dbConnection = options.dbConnection

    this.methods = {
      inboxCreate: this.inboxCreate.bind(this),
      inboxGet: this.inboxGet.bind(this),
      inboxGetAll: this.inboxGetAll.bind(this),
      inboxDelete: this.inboxDelete.bind(this),
      inboxFolderCreate: this.inboxFolderCreate.bind(this),
      inboxFolderGet: this.inboxFolderGet.bind(this),
      inboxFolderGetByInbox: this.inboxFolderGetByInbox.bind(this),
      inboxFolderDelete: this.inboxFolderDelete.bind(this),
      inboxAllowedSenderAdd: this.inboxAllowedSenderAdd.bind(this),
      inboxAllowedSenderRemove: this.inboxAllowedSenderRemove.bind(this),
      inboxAllowedSenderList: this.inboxAllowedSenderList.bind(this),
      inboxIsSenderAllowed: this.inboxIsSenderAllowed.bind(this),
      inboxCredentialLink: this.inboxCredentialLink.bind(this),
      inboxCredentialList: this.inboxCredentialList.bind(this),
      inboxCredentialDelete: this.inboxCredentialDelete.bind(this),
      inboxCredentialGetByCorrelationId: this.inboxCredentialGetByCorrelationId.bind(this),
      inboxCredentialUpdateParsedData: this.inboxCredentialUpdateParsedData.bind(this),
      inboxSendToRecipient: this.inboxSendToRecipient.bind(this),
    }
  }

  // ===== Inbox CRUD =====

  private async inboxCreate(args: InboxCreateArgs): Promise<Inbox> {
    const db = await this.dbConnection
    const id = uuidv4()
    const now = new Date()

    await db.query(
      `INSERT INTO "inbox" ("id", "tenant_id", "name", "did", "description", "created_at", "updated_at")
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, args.tenantId || null, args.name, args.did, args.description || null, now, now]
    )

    return {
      id,
      tenantId: args.tenantId,
      name: args.name,
      did: args.did,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    }
  }

  private async inboxGet(args: InboxGetArgs): Promise<Inbox | null> {
    const db = await this.dbConnection
    const result = await db.query(`SELECT * FROM "inbox" WHERE "name" = $1`, [args.name])

    if (result.length === 0) {
      return null
    }

    return this.mapInboxRow(result[0])
  }

  private async inboxGetAll(): Promise<Inbox[]> {
    const db = await this.dbConnection
    const result = await db.query(`SELECT * FROM "inbox" ORDER BY "created_at" DESC`)
    return result.map((row: any) => this.mapInboxRow(row))
  }

  private async inboxDelete(args: InboxDeleteArgs): Promise<boolean> {
    const db = await this.dbConnection
    const result = await db.query(`DELETE FROM "inbox" WHERE "name" = $1`, [args.name])
    return result.rowCount > 0
  }

  // ===== Folder CRUD =====

  private async inboxFolderCreate(args: InboxFolderCreateArgs): Promise<InboxFolder> {
    const inbox = await this.inboxGet({ name: args.inboxName })
    if (!inbox) {
      throw new Error(`Inbox not found: ${args.inboxName}`)
    }

    const db = await this.dbConnection
    const id = uuidv4()
    const now = new Date()

    await db.query(
      `INSERT INTO "inbox_folder" ("id", "inbox_id", "name", "dcql_query_id", "description", "created_at", "updated_at")
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, inbox.id, args.name, args.dcqlQueryId || null, args.description || null, now, now]
    )

    return {
      id,
      inboxId: inbox.id,
      name: args.name,
      dcqlQueryId: args.dcqlQueryId,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    }
  }

  private async inboxFolderGet(args: InboxFolderGetArgs): Promise<InboxFolder | null> {
    const inbox = await this.inboxGet({ name: args.inboxName })
    if (!inbox) {
      return null
    }

    const db = await this.dbConnection
    const result = await db.query(
      `SELECT * FROM "inbox_folder" WHERE "inbox_id" = $1 AND "name" = $2`,
      [inbox.id, args.folderName]
    )

    if (result.length === 0) {
      return null
    }

    return this.mapFolderRow(result[0])
  }

  private async inboxFolderGetByInbox(args: InboxFolderGetByInboxArgs): Promise<InboxFolder[]> {
    const inbox = await this.inboxGet({ name: args.inboxName })
    if (!inbox) {
      return []
    }

    const db = await this.dbConnection
    const result = await db.query(
      `SELECT * FROM "inbox_folder" WHERE "inbox_id" = $1 ORDER BY "created_at" DESC`,
      [inbox.id]
    )

    return result.map((row: any) => this.mapFolderRow(row))
  }

  private async inboxFolderDelete(args: InboxFolderDeleteArgs): Promise<boolean> {
    const inbox = await this.inboxGet({ name: args.inboxName })
    if (!inbox) {
      return false
    }

    const db = await this.dbConnection
    const result = await db.query(
      `DELETE FROM "inbox_folder" WHERE "inbox_id" = $1 AND "name" = $2`,
      [inbox.id, args.folderName]
    )

    return result.rowCount > 0
  }

  // ===== Allowed Sender Management =====

  private async inboxAllowedSenderAdd(args: InboxAllowedSenderAddArgs): Promise<InboxAllowedSender> {
    const inbox = await this.inboxGet({ name: args.inboxName })
    if (!inbox) {
      throw new Error(`Inbox not found: ${args.inboxName}`)
    }

    const db = await this.dbConnection
    const id = uuidv4()
    const now = new Date()

    await db.query(
      `INSERT INTO "inbox_allowed_sender" ("id", "inbox_id", "client_id", "client_id_prefix", "description", "created_at")
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, inbox.id, args.clientId, args.clientIdPrefix || null, args.description || null, now]
    )

    return {
      id,
      inboxId: inbox.id,
      clientId: args.clientId,
      clientIdPrefix: args.clientIdPrefix,
      description: args.description,
      createdAt: now,
    }
  }

  private async inboxAllowedSenderRemove(args: InboxAllowedSenderRemoveArgs): Promise<boolean> {
    const inbox = await this.inboxGet({ name: args.inboxName })
    if (!inbox) {
      return false
    }

    const db = await this.dbConnection
    let result

    if (args.clientIdPrefix) {
      result = await db.query(
        `DELETE FROM "inbox_allowed_sender" WHERE "inbox_id" = $1 AND "client_id" = $2 AND "client_id_prefix" = $3`,
        [inbox.id, args.clientId, args.clientIdPrefix]
      )
    } else {
      result = await db.query(
        `DELETE FROM "inbox_allowed_sender" WHERE "inbox_id" = $1 AND "client_id" = $2 AND "client_id_prefix" IS NULL`,
        [inbox.id, args.clientId]
      )
    }

    return result.rowCount > 0
  }

  private async inboxAllowedSenderList(args: InboxAllowedSenderListArgs): Promise<InboxAllowedSender[]> {
    const inbox = await this.inboxGet({ name: args.inboxName })
    if (!inbox) {
      return []
    }

    const db = await this.dbConnection
    const result = await db.query(
      `SELECT * FROM "inbox_allowed_sender" WHERE "inbox_id" = $1 ORDER BY "created_at" DESC`,
      [inbox.id]
    )

    return result.map((row: any) => this.mapAllowedSenderRow(row))
  }

  private async inboxIsSenderAllowed(args: InboxIsSenderAllowedArgs): Promise<boolean> {
    const inbox = await this.inboxGet({ name: args.inboxName })
    if (!inbox) {
      return false
    }

    const db = await this.dbConnection

    // Check if there are any allowed senders configured
    const countResult = await db.query(
      `SELECT COUNT(*) as count FROM "inbox_allowed_sender" WHERE "inbox_id" = $1`,
      [inbox.id]
    )

    // If no allowlist is configured, all senders are allowed
    if (parseInt(countResult[0].count) === 0) {
      return true
    }

    // Check if this specific sender is in the allowlist
    let result
    if (args.clientIdPrefix) {
      result = await db.query(
        `SELECT 1 FROM "inbox_allowed_sender" WHERE "inbox_id" = $1 AND "client_id" = $2 AND "client_id_prefix" = $3`,
        [inbox.id, args.clientId, args.clientIdPrefix]
      )
    } else {
      result = await db.query(
        `SELECT 1 FROM "inbox_allowed_sender" WHERE "inbox_id" = $1 AND "client_id" = $2 AND "client_id_prefix" IS NULL`,
        [inbox.id, args.clientId]
      )
    }

    return result.length > 0
  }

  // ===== Credential Linking =====

  private async inboxCredentialLink(args: InboxCredentialLinkArgs): Promise<InboxCredential> {
    const inbox = await this.inboxGet({ name: args.inboxName })
    if (!inbox) {
      throw new Error(`Inbox not found: ${args.inboxName}`)
    }

    const folder = await this.inboxFolderGet({ inboxName: args.inboxName, folderName: args.folderName })
    if (!folder) {
      throw new Error(`Folder not found: ${args.folderName} in inbox ${args.inboxName}`)
    }

    const db = await this.dbConnection
    const id = uuidv4()
    const now = new Date()

    await db.query(
      `INSERT INTO "inbox_credential" ("id", "inbox_id", "folder_id", "credential_id", "client_id", "client_id_prefix", "correlation_id", "received_at")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, inbox.id, folder.id, args.credentialId, args.clientId, args.clientIdPrefix || null, args.correlationId, now]
    )

    return {
      id,
      inboxId: inbox.id,
      folderId: folder.id,
      credentialId: args.credentialId,
      clientId: args.clientId,
      clientIdPrefix: args.clientIdPrefix,
      correlationId: args.correlationId,
      receivedAt: now,
    }
  }

  private async inboxCredentialList(args: InboxCredentialListArgs): Promise<InboxCredential[]> {
    const inbox = await this.inboxGet({ name: args.inboxName })
    if (!inbox) {
      return []
    }

    const db = await this.dbConnection
    let result

    if (args.folderName) {
      const folder = await this.inboxFolderGet({ inboxName: args.inboxName, folderName: args.folderName })
      if (!folder) {
        return []
      }
      result = await db.query(
        `SELECT * FROM "inbox_credential" WHERE "inbox_id" = $1 AND "folder_id" = $2 ORDER BY "received_at" DESC`,
        [inbox.id, folder.id]
      )
    } else {
      result = await db.query(
        `SELECT * FROM "inbox_credential" WHERE "inbox_id" = $1 ORDER BY "received_at" DESC`,
        [inbox.id]
      )
    }

    return result.map((row: any) => this.mapCredentialRow(row))
  }

  private async inboxCredentialDelete(args: InboxCredentialDeleteArgs): Promise<boolean> {
    const db = await this.dbConnection
    const result = await db.query(`DELETE FROM "inbox_credential" WHERE "id" = $1`, [args.id])
    return result.rowCount > 0
  }

  private async inboxCredentialGetByCorrelationId(args: InboxCredentialGetByCorrelationIdArgs): Promise<InboxCredential | null> {
    const db = await this.dbConnection
    const result = await db.query(
      `SELECT * FROM "inbox_credential" WHERE "correlation_id" = $1`,
      [args.correlationId]
    )

    if (result.length === 0) {
      return null
    }

    return this.mapCredentialRow(result[0])
  }

  private async inboxCredentialUpdateParsedData(args: InboxCredentialUpdateParsedDataArgs): Promise<InboxCredential> {
    // Note: Frontend passes the inbox_credential.id (primary key) despite the parameter name
    // This is because correlation_id from OID4VP is not guaranteed unique
    const { correlationId: id, parsedData } = args

    const db = await this.dbConnection
    const now = new Date()

    // Update the parsed_data and evidence_fetched_at fields
    // Using "id" column (primary key) for lookup, not "correlation_id"
    const result = await db.query(
      `UPDATE "inbox_credential"
       SET "parsed_data" = $2, "evidence_fetched_at" = $3
       WHERE "id" = $1
       RETURNING *`,
      [id, JSON.stringify(parsedData), now]
    )

    if (result.length === 0) {
      throw new Error(`Inbox credential not found for ID: ${id}`)
    }

    return this.mapCredentialRow(result[0])
  }

  // ===== Send to Recipient =====

  /**
   * Send a credential to a recipient's inbox via OID4VP.
   *
   * This method:
   * 1. Resolves the recipient's DID to get their DID document
   * 2. Finds the eInvoice/inbox service endpoint in the DID document
   * 3. POSTs to the inbox endpoint with the sender's client_id
   * 4. Returns the request_uri and correlation_id for the OID4VP flow
   *
   * The caller should then use the request_uri to complete the OID4VP
   * credential presentation flow using the existing SIOP/OID4VP SDK methods.
   */
  private async inboxSendToRecipient(args: InboxSendToRecipientArgs): Promise<InboxSendToRecipientResult> {
    const { recipientDid, credential, senderDid, serviceType = 'EInvoiceInbox', endpoint, timeout = 30000 } = args
    console.log(`[Inbox] inboxSendToRecipient called with endpoint: ${endpoint}, args keys: ${Object.keys(args).join(', ')}`)

    try {
      let inboxUrl: string

      // If endpoint is provided directly, use it; otherwise resolve from DID document
      if (endpoint) {
        inboxUrl = endpoint
        console.log(`[Inbox] Using provided endpoint: ${inboxUrl}`)
      } else {
        // Step 1: Resolve the recipient's DID to get the DID document
        const didDocument = await this.resolveRecipientDid(recipientDid)
        if (!didDocument) {
          return {
            success: false,
            error: `Could not resolve DID document for: ${recipientDid}`,
          }
        }

        // Step 2: Find the eInvoice inbox service endpoint
        const inboxEndpoint = this.findInboxServiceEndpoint(didDocument, serviceType)
        if (!inboxEndpoint) {
          return {
            success: false,
            error: `No ${serviceType} service endpoint found in DID document for: ${recipientDid}`,
          }
        }
        inboxUrl = inboxEndpoint.inboxUrl
      }

      // Step 3: POST to the inbox endpoint to initiate OID4VP flow
      const clientId = `decentralized_identifier:${senderDid}`

      const response = await fetch(inboxUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
        }),
        signal: AbortSignal.timeout(timeout),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        return {
          success: false,
          error: `Inbox endpoint returned error ${response.status}: ${errorText}`,
          inboxEndpoint: inboxUrl,
        }
      }

      const result = await response.json()

      // Step 4: Return the result for continuing the OID4VP flow
      return {
        success: true,
        requestUri: result.request_uri,
        recipientClientId: result.client_id,
        correlationId: result.correlation_id,
        inboxEndpoint: inboxUrl,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send credential to recipient',
      }
    }
  }

  /**
   * Resolve a DID to get the DID document.
   */
  private async resolveRecipientDid(did: string): Promise<any | null> {
    try {
      // Use the did-resolver library to resolve the DID
      const { Resolver } = await import('did-resolver')
      const { getResolver: getDidWebResolver } = await import('web-did-resolver')
      const { getDidJwkResolver } = await import('@sphereon/ssi-sdk-ext.did-resolver-jwk')
      const { getResolver: getDidKeyResolver } = await import('@sphereon/ssi-sdk-ext.did-resolver-key')

      const resolver = new Resolver({
        ...getDidJwkResolver(),
        ...getDidKeyResolver(),
        ...getDidWebResolver(),
      })

      const result = await resolver.resolve(did)
      if (result.didResolutionMetadata?.error) {
        console.error(`DID resolution error for ${did}: ${result.didResolutionMetadata.error}`)
        return null
      }

      return result.didDocument
    } catch (error: any) {
      console.error(`Failed to resolve DID ${did}: ${error.message}`)
      return null
    }
  }

  /**
   * Find the inbox service endpoint in a DID document.
   *
   * Looks for services with type matching:
   * - The serviceType parameter (default: 'EInvoiceInbox')
   * - FIDES eInvoicing capability types:
   *   - urn:org:fides:einv-direct:1 (Direct eInvoicing)
   *   - urn:org:fides:einv-peppol:1 (PEPPOL eInvoicing)
   *   - urn:org:fides:einv-ppf-fr:1 (France PPF eInvoicing)
   * - Types containing 'inbox' or 'einvoice'
   */
  private findInboxServiceEndpoint(didDocument: any, serviceType: string): EInvoiceServiceEndpoint | null {
    if (!didDocument.service || !Array.isArray(didDocument.service)) {
      return null
    }

    // FIDES eInvoicing capability service types
    const fidesServiceTypes = [
      'urn:org:fides:einv-direct:1',
      'urn:org:fides:einv-peppol:1',
      'urn:org:fides:einv-ppf-fr:1',
    ]

    // Map the serviceType to FIDES type if applicable
    const serviceTypeMapping: Record<string, string> = {
      'einv-direct': 'urn:org:fides:einv-direct:1',
      'einv-peppol': 'urn:org:fides:einv-peppol:1',
      'einv-ppf-fr': 'urn:org:fides:einv-ppf-fr:1',
    }

    const mappedServiceType = serviceTypeMapping[serviceType] || serviceType

    // Look for a service matching the type
    const service = didDocument.service.find((s: any) => {
      const types = Array.isArray(s.type) ? s.type : [s.type]
      return types.some(
        (t: string) =>
          t === serviceType ||
          t === mappedServiceType ||
          fidesServiceTypes.includes(t) ||
          t.toLowerCase().includes('inbox') ||
          t.toLowerCase().includes('einvoice')
      )
    })

    if (!service) {
      return null
    }

    // Extract the endpoint URL
    let inboxUrl: string | undefined

    if (typeof service.serviceEndpoint === 'string') {
      inboxUrl = service.serviceEndpoint
    } else if (typeof service.serviceEndpoint === 'object') {
      // Handle structured serviceEndpoint
      inboxUrl = service.serviceEndpoint.uri || service.serviceEndpoint.url || service.serviceEndpoint.inboxUrl
    }

    if (!inboxUrl) {
      return null
    }

    return {
      inboxUrl,
      folder: service.serviceEndpoint?.folder,
      vct: service.serviceEndpoint?.vct,
    }
  }

  // ===== Row Mappers =====

  private mapInboxRow(row: any): Inbox {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      did: row.did,
      description: row.description,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }

  private mapFolderRow(row: any): InboxFolder {
    return {
      id: row.id,
      inboxId: row.inbox_id,
      name: row.name,
      dcqlQueryId: row.dcql_query_id,
      description: row.description,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }

  private mapAllowedSenderRow(row: any): InboxAllowedSender {
    return {
      id: row.id,
      inboxId: row.inbox_id,
      clientId: row.client_id,
      clientIdPrefix: row.client_id_prefix,
      description: row.description,
      createdAt: new Date(row.created_at),
    }
  }

  private mapCredentialRow(row: any): InboxCredential {
    return {
      id: row.id,
      inboxId: row.inbox_id,
      folderId: row.folder_id,
      credentialId: row.credential_id,
      clientId: row.client_id,
      clientIdPrefix: row.client_id_prefix,
      correlationId: row.correlation_id,
      receivedAt: new Date(row.received_at),
      parsedData: row.parsed_data ? (typeof row.parsed_data === 'string' ? JSON.parse(row.parsed_data) : row.parsed_data) : undefined,
      evidenceFetchedAt: row.evidence_fetched_at ? new Date(row.evidence_fetched_at) : undefined,
    }
  }
}
