/**
 * Inbox plugin interface definition.
 */

import { IPluginMethodMap } from '@veramo/core'
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

/**
 * Plugin methods interface for inbox operations.
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
