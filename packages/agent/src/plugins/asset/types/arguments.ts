/**
 * Argument interfaces for asset plugin methods.
 */

import type { AssetType, AssetHashAlgorithm } from './entities'

// ===== Store Arguments =====

export interface AssetStoreArgs {
  fileBuffer: Buffer
  filename: string
  contentType: string
  assetType?: AssetType
  description?: string
  isPublic?: boolean
  availableFrom?: Date
  availableUntil?: Date
  credentialId?: string
  metadata?: Record<string, unknown>
  hashAlgorithm?: AssetHashAlgorithm
  tenantId?: string
}

// ===== Get Arguments =====

export interface AssetGetByIdArgs {
  id: string
}

export interface AssetGetByDigestArgs {
  digestMultibase: string
}

// ===== List Arguments =====

export interface AssetListArgs {
  tenantId?: string
  assetType?: AssetType
  isPublic?: boolean
  credentialId?: string
  includeDeleted?: boolean
  limit?: number
  offset?: number
}

// ===== Update Arguments =====

export interface AssetUpdateArgs {
  id: string
  filename?: string
  contentType?: string
  description?: string
  isPublic?: boolean
  availableFrom?: Date | null
  availableUntil?: Date | null
  credentialId?: string | null
  metadata?: Record<string, unknown>
  assetType?: AssetType
}

// ===== Delete Arguments =====

export interface AssetDeleteArgs {
  id: string
  /** If true, permanently delete including file. If false (default), soft-delete only. */
  hardDelete?: boolean
}

// ===== Restore Arguments =====

export interface AssetRestoreArgs {
  id: string
}

// ===== Publish Arguments =====

export interface AssetPublishArgs {
  id: string
  availableFrom?: Date
  availableUntil?: Date
}

export interface AssetUnpublishArgs {
  id: string
}

// ===== Link Arguments =====

export interface AssetLinkCredentialArgs {
  id: string
  credentialId: string
}

// ===== Check Availability Arguments =====

export interface AssetCheckAvailabilityArgs {
  digestMultibase: string
}

// ===== Get File Arguments =====

export interface AssetGetFileArgs {
  digestMultibase: string
}
