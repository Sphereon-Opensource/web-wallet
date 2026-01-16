/**
 * Row mapping functions for inbox database results.
 */

import { parseDate, parseRequiredDate, parseJson } from '../../shared/rowMapper'
import type { Inbox, InboxFolder, InboxCredential, InboxAllowedSender } from '../types'

/**
 * Map a database row to an Inbox entity.
 */
export function mapInboxRow(row: Record<string, unknown>): Inbox {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string | undefined,
    name: row.name as string,
    did: row.did as string,
    description: row.description as string | undefined,
    createdAt: parseRequiredDate(row.created_at),
    updatedAt: parseRequiredDate(row.updated_at),
  }
}

/**
 * Map a database row to an InboxFolder entity.
 */
export function mapFolderRow(row: Record<string, unknown>): InboxFolder {
  return {
    id: row.id as string,
    inboxId: row.inbox_id as string,
    name: row.name as string,
    dcqlQueryId: row.dcql_query_id as string | undefined,
    description: row.description as string | undefined,
    createdAt: parseRequiredDate(row.created_at),
    updatedAt: parseRequiredDate(row.updated_at),
  }
}

/**
 * Map a database row to an InboxAllowedSender entity.
 */
export function mapAllowedSenderRow(row: Record<string, unknown>): InboxAllowedSender {
  return {
    id: row.id as string,
    inboxId: row.inbox_id as string,
    clientId: row.client_id as string,
    clientIdPrefix: row.client_id_prefix as string | undefined,
    description: row.description as string | undefined,
    createdAt: parseRequiredDate(row.created_at),
  }
}

/**
 * Map a database row to an InboxCredential entity.
 */
export function mapCredentialRow(row: Record<string, unknown>): InboxCredential {
  return {
    id: row.id as string,
    inboxId: row.inbox_id as string,
    folderId: row.folder_id as string,
    credentialId: row.credential_id as string,
    clientId: row.client_id as string,
    clientIdPrefix: row.client_id_prefix as string | undefined,
    correlationId: row.correlation_id as string,
    receivedAt: parseRequiredDate(row.received_at),
    parsedData: parseJson(row.parsed_data),
    evidenceFetchedAt: parseDate(row.evidence_fetched_at),
  }
}
