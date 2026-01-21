/**
 * Inbox entity interfaces.
 * These define the data structures stored in the database.
 */

/**
 * Inbox entity structure.
 * An inbox is a named container that can receive credentials via OID4VP.
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
 * Inbox folder entity structure.
 * Folders organize credentials within an inbox and can be tied to DCQL queries.
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
 * Inbox credential entity structure (junction table).
 * Links received credentials to inbox folders with sender information.
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
 * Inbox allowed sender entity structure.
 * Defines which senders are permitted to submit credentials to an inbox.
 */
export interface InboxAllowedSender {
  id: string
  inboxId: string
  clientId: string
  clientIdPrefix?: string
  description?: string
  createdAt: Date
}

/**
 * Result of sending a credential to a recipient's inbox.
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
 * eInvoice service endpoint structure from DID document.
 * Note: Only contains externally-visible information from the DID document.
 * Internal metadata (inboxName, folderName) is stored separately in ServiceMetadata.
 */
export interface EInvoiceServiceEndpoint {
  /** The inbox endpoint URL (the serviceEndpoint from DID document) */
  inboxUrl: string
  /** Supported credential types (VCT) from einvoice metadata */
  vct?: string[]
}
