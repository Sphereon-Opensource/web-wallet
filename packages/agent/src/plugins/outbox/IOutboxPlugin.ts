/**
 * Outbox plugin interface definition.
 */

import { IPluginMethodMap } from '@veramo/core'
import type { OutboxItem } from './types'
import type {
  OutboxItemCreateArgs,
  OutboxItemGetArgs,
  OutboxItemListArgs,
  OutboxItemUpdateArgs,
  OutboxItemUpdateStatusArgs,
  OutboxItemDeleteArgs,
  OutboxItemSendArgs,
} from './types'

/** Result of sending an outbox item */
export interface OutboxItemSendResult {
  success: boolean
  credentialId?: string
  correlationId?: string
  errorMessage?: string
}

/**
 * Plugin methods interface for outbox operations.
 */
export interface IOutboxPlugin extends IPluginMethodMap {
  // Outbox CRUD
  outboxItemCreate(args: OutboxItemCreateArgs): Promise<OutboxItem>
  outboxItemGet(args: OutboxItemGetArgs): Promise<OutboxItem | null>
  outboxItemList(args: OutboxItemListArgs): Promise<OutboxItem[]>
  outboxItemUpdate(args: OutboxItemUpdateArgs): Promise<OutboxItem>
  outboxItemUpdateStatus(args: OutboxItemUpdateStatusArgs): Promise<OutboxItem>
  outboxItemDelete(args: OutboxItemDeleteArgs): Promise<boolean>

  // Send operation
  outboxItemSend(args: OutboxItemSendArgs): Promise<OutboxItemSendResult>
}
