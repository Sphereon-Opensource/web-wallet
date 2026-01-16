/**
 * Asset plugin interface definition.
 */

import { IPluginMethodMap } from '@veramo/core'
import type { Asset, AssetStoreResult, AssetAvailability, AssetGetFileResult } from './types'
import type {
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
} from './types'

/**
 * Plugin methods interface for asset operations.
 */
export interface IAssetPlugin extends IPluginMethodMap {
  // Store/Create
  assetStore(args: AssetStoreArgs): Promise<AssetStoreResult>

  // Get
  assetGetById(args: AssetGetByIdArgs): Promise<Asset | null>
  assetGetByDigest(args: AssetGetByDigestArgs): Promise<Asset | null>

  // List
  assetList(args: AssetListArgs): Promise<Asset[]>
  assetCount(args: AssetListArgs): Promise<number>

  // Update
  assetUpdate(args: AssetUpdateArgs): Promise<Asset>

  // Delete (soft-delete by default)
  assetDelete(args: AssetDeleteArgs): Promise<boolean>

  // Restore soft-deleted asset
  assetRestore(args: AssetRestoreArgs): Promise<Asset>

  // Publish/Unpublish
  assetPublish(args: AssetPublishArgs): Promise<Asset>
  assetUnpublish(args: AssetUnpublishArgs): Promise<Asset>

  // Link to credential
  assetLinkCredential(args: AssetLinkCredentialArgs): Promise<Asset>

  // Check availability (for public access)
  assetCheckAvailability(args: AssetCheckAvailabilityArgs): Promise<AssetAvailability>

  // Get file for serving (checks availability)
  assetGetFile(args: AssetGetFileArgs): Promise<AssetGetFileResult | null>
}
