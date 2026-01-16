/**
 * Centralized plugin exports.
 *
 * This module provides a clean interface for importing plugins and their types.
 *
 * @example
 * // Import plugins
 * import { InboxPlugin, AssetPlugin } from './plugins'
 *
 * // Import types
 * import type { Inbox, Asset, IInboxPlugin, IAssetPlugin } from './plugins'
 */

// Inbox plugin
export { InboxPlugin } from './inbox'
export type {
  IInboxPlugin,
  Inbox,
  InboxFolder,
  InboxCredential,
  InboxAllowedSender,
  InboxSendToRecipientResult,
  EInvoiceServiceEndpoint,
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
} from './inbox'

// Asset plugin
export { AssetPlugin } from './asset'
export type {
  IAssetPlugin,
  Asset,
  AssetType,
  AssetHashAlgorithm,
  AssetAvailability,
  AssetStoreResult,
  AssetGetFileResult,
  AssetStoreArgs,
  AssetGetByIdArgs,
  AssetGetByDigestArgs,
  AssetListArgs,
  AssetUpdateArgs,
  AssetDeleteArgs,
  AssetRestoreArgs,
  AssetPublishArgs,
  AssetUnpublishArgs,
  AssetLinkCredentialArgs,
  AssetCheckAvailabilityArgs,
  AssetGetFileArgs,
} from './asset'

// Shared utilities (for advanced use cases)
export * from './shared'
