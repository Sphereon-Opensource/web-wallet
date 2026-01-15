import { TAgent } from '@veramo/core'
import { TAgentTypes } from '../types'
import { InboxApiServer } from '../api/inboxApiServer'

export interface InboxContext {
  inboxName: string
  folderName: string
  clientId?: string
  clientIdPrefix?: string
}

/**
 * Links a received credential to an inbox folder.
 *
 * This function should be called after successful VP verification in the OID4VP flow.
 * It retrieves the inbox context stored during the auth request creation and creates
 * the link between the received credential and the inbox/folder.
 *
 * @param agent - The agent instance
 * @param correlationId - The correlation ID from the OID4VP flow
 * @param credentialId - The ID of the stored credential
 * @returns true if the credential was successfully linked, false otherwise
 */
export async function linkCredentialToInbox(
  agent: TAgent<TAgentTypes>,
  correlationId: string,
  credentialId: string
): Promise<boolean> {
  // Retrieve the inbox context stored during auth request creation
  const context = InboxApiServer.getInboxContext(correlationId)

  if (!context) {
    console.warn(`[Inbox] No inbox context found for correlation ID: ${correlationId}`)
    return false
  }

  try {
    // Link the credential to the inbox/folder
    await agent.inboxCredentialLink({
      inboxName: context.inboxName,
      folderName: context.folderName,
      credentialId,
      clientId: context.clientId || 'unknown',
      clientIdPrefix: context.clientIdPrefix,
      correlationId,
    })

    console.log(
      `[Inbox] Linked credential ${credentialId} to inbox ${context.inboxName}/${context.folderName}`
    )

    // Clean up the stored context
    InboxApiServer.inboxContextStore.delete(correlationId)

    return true
  } catch (error) {
    console.error(`[Inbox] Failed to link credential to inbox:`, error)
    return false
  }
}

/**
 * Stores inbox context for a correlation ID.
 *
 * This is typically called during the OID4VP auth request creation to store
 * the context needed for linking credentials after verification.
 *
 * @param correlationId - The correlation ID for the OID4VP flow
 * @param context - The inbox context to store
 */
export function storeInboxContext(correlationId: string, context: InboxContext): void {
  InboxApiServer.inboxContextStore.set(correlationId, context)
}

/**
 * Retrieves stored inbox context for a correlation ID.
 *
 * @param correlationId - The correlation ID to look up
 * @returns The stored context, or undefined if not found
 */
export function getInboxContext(correlationId: string): InboxContext | undefined {
  return InboxApiServer.getInboxContext(correlationId)
}

/**
 * Checks if a correlation ID has inbox context stored.
 *
 * This can be used to determine if a credential presentation is associated
 * with an inbox flow.
 *
 * @param correlationId - The correlation ID to check
 * @returns true if inbox context exists for this correlation ID
 */
export function hasInboxContext(correlationId: string): boolean {
  return InboxApiServer.inboxContextStore.has(correlationId)
}

/**
 * Clears stored inbox context for a correlation ID.
 *
 * @param correlationId - The correlation ID to clear
 */
export function clearInboxContext(correlationId: string): void {
  InboxApiServer.inboxContextStore.delete(correlationId)
}
