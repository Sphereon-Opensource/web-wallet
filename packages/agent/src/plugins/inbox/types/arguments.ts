/**
 * Argument interfaces for inbox plugin methods.
 */

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

export interface InboxCredentialGetByCorrelationIdArgs {
  /** The inbox credential correlation ID (from the credential) */
  correlationId: string
}

// ===== Update Arguments =====

export interface InboxCredentialUpdateParsedDataArgs {
  /** The inbox credential correlation ID (from the credential) */
  correlationId: string
  /** Parsed evidence data to store - generic JSON structure */
  parsedData: Record<string, unknown>
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

// ===== Send to Recipient Arguments =====

/**
 * Arguments for sending a credential to a recipient's inbox.
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
