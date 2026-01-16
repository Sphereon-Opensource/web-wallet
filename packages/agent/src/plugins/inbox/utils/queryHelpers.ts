/**
 * SQL query helper functions for inbox operations.
 */

/**
 * Result of building an allowed sender WHERE clause.
 */
export interface AllowedSenderWhereClause {
  /** The WHERE clause fragment (without "WHERE" keyword) */
  clause: string
  /** The parameters for the clause */
  params: unknown[]
}

/**
 * Builds a WHERE clause for matching allowed senders.
 *
 * Generates the appropriate SQL condition based on whether a clientIdPrefix
 * is provided. When clientIdPrefix is present, matches exactly; when absent,
 * matches only records where client_id_prefix IS NULL.
 *
 * @param inboxId - The inbox ID to match
 * @param clientId - The client ID to match
 * @param clientIdPrefix - Optional client ID prefix
 * @param startParamIndex - The starting parameter index (default: 1)
 * @returns The WHERE clause fragment and parameters
 *
 * @example
 * // With clientIdPrefix
 * buildAllowedSenderWhereClause('inbox-1', 'did:web:example', 'decentralized_identifier')
 * // Returns: { clause: '"inbox_id" = $1 AND "client_id" = $2 AND "client_id_prefix" = $3', params: ['inbox-1', 'did:web:example', 'decentralized_identifier'] }
 *
 * @example
 * // Without clientIdPrefix
 * buildAllowedSenderWhereClause('inbox-1', 'did:web:example')
 * // Returns: { clause: '"inbox_id" = $1 AND "client_id" = $2 AND "client_id_prefix" IS NULL', params: ['inbox-1', 'did:web:example'] }
 */
export function buildAllowedSenderWhereClause(
  inboxId: string,
  clientId: string,
  clientIdPrefix?: string,
  startParamIndex = 1
): AllowedSenderWhereClause {
  const p1 = `$${startParamIndex}`
  const p2 = `$${startParamIndex + 1}`

  if (clientIdPrefix) {
    const p3 = `$${startParamIndex + 2}`
    return {
      clause: `"inbox_id" = ${p1} AND "client_id" = ${p2} AND "client_id_prefix" = ${p3}`,
      params: [inboxId, clientId, clientIdPrefix],
    }
  }

  return {
    clause: `"inbox_id" = ${p1} AND "client_id" = ${p2} AND "client_id_prefix" IS NULL`,
    params: [inboxId, clientId],
  }
}
