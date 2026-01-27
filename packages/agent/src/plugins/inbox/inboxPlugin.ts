/**
 * Inbox plugin implementation.
 *
 * Manages inbox operations for receiving credentials via OID4VP.
 * Inboxes are named containers that can receive credentials. Each inbox can have
 * multiple folders, each tied to a DCQL query. Credentials are linked to folders
 * via a junction table that tracks sender information.
 */

import { DataSource } from 'typeorm'
import { IAgentPlugin } from '@veramo/core'
import { v4 as uuidv4 } from 'uuid'

import type { IInboxPlugin } from './IInboxPlugin'
import type {
  Inbox,
  InboxFolder,
  InboxCredential,
  InboxAllowedSender,
  InboxSendToRecipientResult,
} from './types'
import type {
  InboxCreateArgs,
  InboxGetArgs,
  InboxDeleteArgs,
  InboxFolderCreateArgs,
  InboxFolderGetArgs,
  InboxFolderGetByInboxArgs,
  InboxFolderDeleteArgs,
  InboxAllowedSenderAddArgs,
  InboxAllowedSenderRemoveArgs,
  InboxAllowedSenderListArgs,
  InboxIsSenderAllowedArgs,
  InboxCredentialLinkArgs,
  InboxCredentialListArgs,
  InboxCredentialDeleteArgs,
  InboxCredentialGetByCorrelationIdArgs,
  InboxCredentialUpdateParsedDataArgs,
  InboxSendToRecipientArgs,
} from './types'
import {
  mapInboxRow,
  mapFolderRow,
  mapAllowedSenderRow,
  mapCredentialRow,
} from './utils/rowMappers'
import { resolveRecipientDid, findInboxServiceEndpoint } from './utils/didResolver'
import { buildAllowedSenderWhereClause } from './utils/queryHelpers'
import { inboxPluginSchema } from './schema'
import { NotFoundError } from '../shared/error'

/**
 * Plugin that manages inbox operations for receiving credentials via OID4VP.
 */
export class InboxPlugin implements IAgentPlugin {
  readonly methods: IInboxPlugin
  readonly schema = inboxPluginSchema

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

  /**
   * Creates a new inbox.
   *
   * @param args - The inbox creation arguments
   * @param args.name - Unique name for the inbox
   * @param args.did - DID associated with this inbox
   * @param args.description - Optional description of the inbox
   * @param args.tenantId - Optional tenant ID for multi-tenant setups
   * @returns The created inbox
   */
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

  /**
   * Gets an inbox by name.
   *
   * @param args - The get arguments
   * @param args.name - Name of the inbox to retrieve
   * @returns The inbox if found, null otherwise
   */
  private async inboxGet(args: InboxGetArgs): Promise<Inbox | null> {
    const db = await this.dbConnection
    const result = await db.query(`SELECT * FROM "inbox" WHERE "name" = $1`, [args.name])

    if (result.length === 0) {
      return null
    }

    return mapInboxRow(result[0])
  }

  /**
   * Gets all inboxes, ordered by creation date (newest first).
   *
   * @returns Array of all inboxes
   */
  private async inboxGetAll(): Promise<Inbox[]> {
    const db = await this.dbConnection
    const result = await db.query(`SELECT * FROM "inbox" ORDER BY "created_at" DESC`)
    return result.map((row: Record<string, unknown>) => mapInboxRow(row))
  }

  /**
   * Deletes an inbox by name.
   *
   * @param args - The delete arguments
   * @param args.name - Name of the inbox to delete
   * @returns True if the inbox was deleted, false if not found
   */
  private async inboxDelete(args: InboxDeleteArgs): Promise<boolean> {
    const db = await this.dbConnection
    const result = await db.query(`DELETE FROM "inbox" WHERE "name" = $1`, [args.name])
    return result.rowCount > 0
  }

  // ===== Folder CRUD =====

  /**
   * Creates a new folder within an inbox.
   *
   * @param args - The folder creation arguments
   * @param args.inboxName - Name of the parent inbox
   * @param args.name - Name for the new folder
   * @param args.dcqlQueryId - Optional DCQL query ID for filtering credentials
   * @param args.description - Optional description
   * @returns The created folder
   * @throws NotFoundError if the inbox doesn't exist
   */
  private async inboxFolderCreate(args: InboxFolderCreateArgs): Promise<InboxFolder> {
    const inbox = await this.inboxGet({ name: args.inboxName })
    if (!inbox) {
      throw new NotFoundError('Inbox', args.inboxName)
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

  /**
   * Gets a folder by inbox name and folder name.
   *
   * @param args - The get arguments
   * @param args.inboxName - Name of the parent inbox
   * @param args.folderName - Name of the folder
   * @returns The folder if found, null otherwise
   */
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

    return mapFolderRow(result[0])
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

    return result.map((row: Record<string, unknown>) => mapFolderRow(row))
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
      throw new NotFoundError('Inbox', args.inboxName)
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

  /**
   * Removes an allowed sender from an inbox.
   *
   * @param args - The removal arguments
   * @param args.inboxName - Name of the inbox
   * @param args.clientId - Client ID of the sender to remove
   * @param args.clientIdPrefix - Optional client ID prefix to match
   * @returns True if a sender was removed, false if inbox or sender not found
   */
  private async inboxAllowedSenderRemove(args: InboxAllowedSenderRemoveArgs): Promise<boolean> {
    const inbox = await this.inboxGet({ name: args.inboxName })
    if (!inbox) {
      return false
    }

    const db = await this.dbConnection
    const { clause, params } = buildAllowedSenderWhereClause(inbox.id, args.clientId, args.clientIdPrefix)
    const result = await db.query(`DELETE FROM "inbox_allowed_sender" WHERE ${clause}`, params)

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

    return result.map((row: Record<string, unknown>) => mapAllowedSenderRow(row))
  }

  /**
   * Checks if a sender is allowed to send to an inbox.
   *
   * If no allowlist is configured for the inbox, all senders are allowed.
   * Otherwise, checks if the specific sender (clientId + optional prefix) is in the allowlist.
   *
   * @param args - The check arguments
   * @param args.inboxName - Name of the inbox
   * @param args.clientId - Client ID of the sender to check
   * @param args.clientIdPrefix - Optional client ID prefix to match
   * @returns True if the sender is allowed, false otherwise
   */
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
    const { clause, params } = buildAllowedSenderWhereClause(inbox.id, args.clientId, args.clientIdPrefix)
    const result = await db.query(`SELECT 1 FROM "inbox_allowed_sender" WHERE ${clause}`, params)

    return result.length > 0
  }

  // ===== Credential Linking =====

  /**
   * Links a credential to an inbox folder.
   *
   * This creates a record associating a received credential with a specific
   * inbox folder, tracking the sender's client ID and correlation ID.
   *
   * @param args - The linking arguments
   * @param args.inboxName - Name of the inbox
   * @param args.folderName - Name of the folder within the inbox
   * @param args.credentialId - ID of the credential being linked
   * @param args.clientId - DID or client ID of the sender
   * @param args.clientIdPrefix - Optional prefix for the client ID (e.g., 'decentralized_identifier')
   * @param args.correlationId - Correlation ID from the OID4VP session
   * @returns The created inbox credential record
   * @throws NotFoundError if the inbox or folder doesn't exist
   */
  private async inboxCredentialLink(args: InboxCredentialLinkArgs): Promise<InboxCredential> {
    const inbox = await this.inboxGet({ name: args.inboxName })
    if (!inbox) {
      throw new NotFoundError('Inbox', args.inboxName)
    }

    const folder = await this.inboxFolderGet({ inboxName: args.inboxName, folderName: args.folderName })
    if (!folder) {
      throw new NotFoundError('InboxFolder', `${args.folderName} in inbox ${args.inboxName}`)
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

    return result.map((row: Record<string, unknown>) => mapCredentialRow(row))
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

    return mapCredentialRow(result[0])
  }

  private async inboxCredentialUpdateParsedData(args: InboxCredentialUpdateParsedDataArgs): Promise<InboxCredential> {
    // Note: Frontend passes the inbox_credential.id (primary key) despite the parameter name
    const { correlationId: id, parsedData } = args

    const db = await this.dbConnection
    const now = new Date()

    const result = await db.query(
      `UPDATE "inbox_credential"
       SET "parsed_data" = $2, "evidence_fetched_at" = $3
       WHERE "id" = $1
       RETURNING *`,
      [id, JSON.stringify(parsedData), now]
    )

    if (result.length === 0) {
      throw new NotFoundError('InboxCredential', id)
    }

    return mapCredentialRow(result[0])
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
   */
  private async inboxSendToRecipient(args: InboxSendToRecipientArgs): Promise<InboxSendToRecipientResult> {
    const { recipientDid, senderDid, serviceType = 'EInvoiceInbox', endpoint, timeout = 30000 } = args
    console.log(`[Inbox] inboxSendToRecipient called with endpoint: ${endpoint}`)

    try {
      let inboxUrl: string

      // If endpoint is provided directly, use it; otherwise resolve from DID document
      if (endpoint) {
        inboxUrl = endpoint
        console.log(`[Inbox] Using provided endpoint: ${inboxUrl}`)
      } else {
        // Step 1: Resolve the recipient's DID
        const didDocument = await resolveRecipientDid(recipientDid)
        if (!didDocument) {
          return {
            success: false,
            error: `Could not resolve DID document for: ${recipientDid}`,
          }
        }

        // Step 2: Find the eInvoice inbox service endpoint
        const inboxEndpoint = findInboxServiceEndpoint(didDocument as Record<string, unknown>, serviceType)
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

      // Step 4: Parse response - handle both plain text (openid4vp://...) and JSON formats
      const responseText = await response.text()
      let requestUri: string
      let recipientClientId: string | undefined
      let correlationId: string | undefined

      // Check if response is a direct openid4vp:// URI (plain text format per Universal OID4VP spec)
      if (responseText.trim().startsWith('openid4vp://') || responseText.trim().startsWith('openid4vp:')) {
        requestUri = responseText.trim()
        console.log(`[Inbox] Received plain text OID4VP URI from inbox`)
      } else {
        // Try to parse as JSON (legacy format)
        try {
          const result = JSON.parse(responseText)
          requestUri = result.request_uri
          recipientClientId = result.client_id
          correlationId = result.correlation_id
          console.log(`[Inbox] Received JSON response from inbox`)
        } catch {
          return {
            success: false,
            error: `Invalid response from inbox endpoint: ${responseText.substring(0, 100)}`,
            inboxEndpoint: inboxUrl,
          }
        }
      }

      // Return the result for continuing the OID4VP flow
      return {
        success: true,
        requestUri,
        recipientClientId,
        correlationId,
        inboxEndpoint: inboxUrl,
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to send credential to recipient'
      return {
        success: false,
        error: message,
      }
    }
  }
}
