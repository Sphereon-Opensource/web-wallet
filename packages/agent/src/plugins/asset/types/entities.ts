/**
 * Asset entity interfaces.
 * These define the data structures stored in the database.
 */

/**
 * Supported hash algorithms for asset digest computation.
 * These are the algorithms supported by W3C VC Data Integrity specification.
 */
export type AssetHashAlgorithm = 'sha256' | 'sha384' | 'sha512'

/**
 * Asset types for categorization.
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
 * Asset entity structure.
 * Represents a file stored in the content-addressable asset store.
 */
export interface Asset {
  id: string
  tenantId?: string
  digestMultibase: string
  hashAlgorithm: AssetHashAlgorithm
  filename: string
  originalFilename?: string
  contentType: string
  fileSize: number
  storagePath: string
  assetType: AssetType
  description?: string
  isPublic: boolean
  availableFrom?: Date
  availableUntil?: Date
  credentialId?: string
  metadata?: Record<string, unknown>
  deletedAt?: Date
  createdAt: Date
  updatedAt: Date
}

/**
 * Result of checking asset availability.
 */
export interface AssetAvailability {
  isAvailable: boolean
  reason?: 'not_found' | 'not_public' | 'not_yet_available' | 'expired' | 'file_missing' | 'deleted'
  availableFrom?: Date
  availableUntil?: Date
}

/**
 * Result of storing an asset, includes public URL if applicable.
 */
export interface AssetStoreResult extends Asset {
  /** Public URL for accessing the asset (only if isPublic is true) */
  publicUrl?: string
}

/**
 * Result of getting an asset file for serving.
 */
export interface AssetGetFileResult {
  asset: Asset
  filePath: string
  availability: AssetAvailability
}
