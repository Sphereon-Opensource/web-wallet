/**
 * Inbox plugin module.
 *
 * Provides inbox management for receiving credentials via OID4VP.
 *
 * @example
 * import { InboxPlugin } from './plugins/inbox'
 * import type { Inbox, InboxFolder, IInboxPlugin } from './plugins/inbox'
 */

// Export types
export * from './types'

// Export plugin interface
export type { IInboxPlugin } from './IInboxPlugin'

// Export plugin implementation
export { InboxPlugin } from './inboxPlugin'

// Export utilities for direct use if needed
export * from './utils'
