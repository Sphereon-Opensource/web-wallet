/**
 * Asset Service
 *
 * Provides API functions for interacting with the asset (document store) backend.
 * Handles uploading, listing, publishing, and managing assets.
 */

import {getAgentBaseUrl} from '@agent/environment'

/**
 * Supported asset types
 */
export type AssetType =
  | 'Document'
  | 'UBLInvoice'
  | 'SupportingDocument'
  | 'Image'
  | 'XMLDocument'
  | 'JSONDocument'
  | 'PDF'
  | 'Binary'
  | 'Other'

/**
 * Asset entity structure
 */
export interface Asset {
  id: string
  tenantId?: string
  digestMultibase: string
  hashAlgorithm: 'sha256' | 'sha384' | 'sha512'
  filename: string
  originalFilename?: string
  contentType: string
  fileSize: number
  storagePath: string
  assetType: AssetType
  description?: string
  isPublic: boolean
  availableFrom?: string
  availableUntil?: string
  credentialId?: string
  metadata?: Record<string, unknown>
  deletedAt?: string
  createdAt: string
  updatedAt: string
  /** Public URL for accessing the asset (only if isPublic is true) */
  publicUrl?: string
}

/**
 * Response from listing assets
 */
export interface AssetListResponse {
  assets: Asset[]
  total: number
  limit?: number
  offset: number
}

/**
 * Options for listing assets
 */
export interface AssetListOptions {
  assetType?: AssetType
  isPublic?: boolean
  credentialId?: string
  includeDeleted?: boolean
  limit?: number
  offset?: number
}

/**
 * Options for uploading an asset
 */
export interface AssetUploadOptions {
  assetType?: AssetType
  description?: string
  isPublic?: boolean
  availableFrom?: Date
  availableUntil?: Date
  credentialId?: string
  metadata?: Record<string, unknown>
}

/**
 * Options for updating an asset
 */
export interface AssetUpdateOptions {
  description?: string
  isPublic?: boolean
  availableFrom?: Date | null
  availableUntil?: Date | null
  credentialId?: string | null
  metadata?: Record<string, unknown>
  assetType?: AssetType
}

/**
 * Options for publishing an asset
 */
export interface AssetPublishOptions {
  availableFrom?: Date
  availableUntil?: Date
}

/**
 * Get the base URL for the asset API
 */
function getAssetApiUrl(): string {
  return `${getAgentBaseUrl()}/assets`
}

/**
 * Get the public URL for accessing an asset by its digest
 */
export function getAssetPublicUrl(digestMultibase: string): string {
  return `${getAgentBaseUrl()}/api/assets/${digestMultibase}`
}

/**
 * Fetch all assets with optional filters
 */
export async function fetchAssets(options: AssetListOptions = {}): Promise<AssetListResponse> {
  try {
    const url = new URL(getAssetApiUrl())

    if (options.assetType) {
      url.searchParams.set('assetType', options.assetType)
    }
    if (options.isPublic !== undefined) {
      url.searchParams.set('isPublic', String(options.isPublic))
    }
    if (options.credentialId) {
      url.searchParams.set('credentialId', options.credentialId)
    }
    if (options.includeDeleted) {
      url.searchParams.set('includeDeleted', 'true')
    }
    if (options.limit !== undefined) {
      url.searchParams.set('limit', String(options.limit))
    }
    if (options.offset !== undefined) {
      url.searchParams.set('offset', String(options.offset))
    }

    const response = await fetch(url.toString())

    if (!response.ok) {
      const error = await response.json().catch(() => ({error: 'Unknown error'}))
      throw new Error(error.error || `Failed to fetch assets: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('[AssetService] Error fetching assets:', error)
    throw error
  }
}

/**
 * Fetch a single asset by ID
 */
export async function fetchAssetById(id: string): Promise<Asset | null> {
  try {
    const response = await fetch(`${getAssetApiUrl()}/${id}`)

    if (response.status === 404) {
      return null
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({error: 'Unknown error'}))
      throw new Error(error.error || `Failed to fetch asset: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('[AssetService] Error fetching asset:', error)
    throw error
  }
}

/**
 * Upload a new asset
 */
export async function uploadAsset(file: File, options: AssetUploadOptions = {}): Promise<Asset> {
  try {
    const formData = new FormData()
    formData.append('file', file)

    if (options.assetType) {
      formData.append('assetType', options.assetType)
    }
    if (options.description) {
      formData.append('description', options.description)
    }
    if (options.isPublic !== undefined) {
      formData.append('isPublic', String(options.isPublic))
    }
    if (options.availableFrom) {
      formData.append('availableFrom', options.availableFrom.toISOString())
    }
    if (options.availableUntil) {
      formData.append('availableUntil', options.availableUntil.toISOString())
    }
    if (options.credentialId) {
      formData.append('credentialId', options.credentialId)
    }
    if (options.metadata) {
      formData.append('metadata', JSON.stringify(options.metadata))
    }

    const response = await fetch(getAssetApiUrl(), {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({error: 'Unknown error'}))
      throw new Error(error.error || `Failed to upload asset: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('[AssetService] Error uploading asset:', error)
    throw error
  }
}

/**
 * Update asset metadata
 */
export async function updateAsset(id: string, options: AssetUpdateOptions): Promise<Asset> {
  try {
    const body: Record<string, unknown> = {}

    if (options.description !== undefined) {
      body.description = options.description
    }
    if (options.isPublic !== undefined) {
      body.isPublic = options.isPublic
    }
    if (options.availableFrom !== undefined) {
      body.availableFrom = options.availableFrom ? options.availableFrom.toISOString() : null
    }
    if (options.availableUntil !== undefined) {
      body.availableUntil = options.availableUntil ? options.availableUntil.toISOString() : null
    }
    if (options.credentialId !== undefined) {
      body.credentialId = options.credentialId
    }
    if (options.metadata !== undefined) {
      body.metadata = options.metadata
    }
    if (options.assetType !== undefined) {
      body.assetType = options.assetType
    }

    const response = await fetch(`${getAssetApiUrl()}/${id}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({error: 'Unknown error'}))
      throw new Error(error.error || `Failed to update asset: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('[AssetService] Error updating asset:', error)
    throw error
  }
}

/**
 * Delete an asset (soft-delete by default)
 */
export async function deleteAsset(id: string, hardDelete = false): Promise<boolean> {
  try {
    const url = new URL(`${getAssetApiUrl()}/${id}`)
    if (hardDelete) {
      url.searchParams.set('hardDelete', 'true')
    }

    const response = await fetch(url.toString(), {
      method: 'DELETE',
    })

    if (response.status === 404) {
      return false
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({error: 'Unknown error'}))
      throw new Error(error.error || `Failed to delete asset: ${response.status}`)
    }

    return true
  } catch (error) {
    console.error('[AssetService] Error deleting asset:', error)
    throw error
  }
}

/**
 * Publish an asset (make it publicly accessible)
 */
export async function publishAsset(id: string, options: AssetPublishOptions = {}): Promise<Asset> {
  try {
    const body: Record<string, unknown> = {}

    if (options.availableFrom) {
      body.availableFrom = options.availableFrom.toISOString()
    }
    if (options.availableUntil) {
      body.availableUntil = options.availableUntil.toISOString()
    }

    const response = await fetch(`${getAssetApiUrl()}/${id}/publish`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({error: 'Unknown error'}))
      throw new Error(error.error || `Failed to publish asset: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('[AssetService] Error publishing asset:', error)
    throw error
  }
}

/**
 * Unpublish an asset (make it private)
 */
export async function unpublishAsset(id: string): Promise<Asset> {
  try {
    const response = await fetch(`${getAssetApiUrl()}/${id}/unpublish`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({error: 'Unknown error'}))
      throw new Error(error.error || `Failed to unpublish asset: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('[AssetService] Error unpublishing asset:', error)
    throw error
  }
}

/**
 * Restore a soft-deleted asset
 */
export async function restoreAsset(id: string): Promise<Asset> {
  try {
    const response = await fetch(`${getAssetApiUrl()}/${id}/restore`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({error: 'Unknown error'}))
      throw new Error(error.error || `Failed to restore asset: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('[AssetService] Error restoring asset:', error)
    throw error
  }
}

/**
 * Publish asset with default 7-year availability (for eInvoice evidence)
 */
export async function publishAssetForEvidence(id: string): Promise<Asset> {
  const now = new Date()
  const sevenYearsLater = new Date(now.getFullYear() + 7, now.getMonth(), now.getDate())

  return publishAsset(id, {
    availableFrom: now,
    availableUntil: sevenYearsLater,
  })
}

// Re-export formatFileSize from shared helper for backward compatibility
export {formatFileSize} from '@helpers/formatUtils'

/**
 * Get a human-readable name for an asset type
 */
export function getAssetTypeName(assetType: AssetType): string {
  const names: Record<AssetType, string> = {
    Document: 'Document',
    UBLInvoice: 'UBL Invoice',
    SupportingDocument: 'Supporting Document',
    Image: 'Image',
    XMLDocument: 'XML Document',
    JSONDocument: 'JSON Document',
    PDF: 'PDF',
    Binary: 'Binary',
    Other: 'Other',
  }
  return names[assetType] || assetType
}
