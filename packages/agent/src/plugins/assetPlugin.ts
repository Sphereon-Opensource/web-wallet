import { DataSource } from 'typeorm'
import { IAgentPlugin, IPluginMethodMap } from '@veramo/core'
import { v4 as uuidv4 } from 'uuid'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { bytesToBase58 } from '@sphereon/ssi-sdk.core'
import { ASSET_BASE_URI } from '../environment-vars'

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
 * Asset entity structure
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
 * Result of checking asset availability
 */
export interface AssetAvailability {
  isAvailable: boolean
  reason?: 'not_found' | 'not_public' | 'not_yet_available' | 'expired' | 'file_missing' | 'deleted'
  availableFrom?: Date
  availableUntil?: Date
}

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

export interface AssetStoreResult extends Asset {
  /** Public URL for accessing the asset (only if isPublic is true) */
  publicUrl?: string
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

export interface AssetGetFileResult {
  asset: Asset
  filePath: string
  availability: AssetAvailability
}

/**
 * Plugin methods interface
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

/**
 * Plugin that manages content-addressable asset storage.
 *
 * Assets are files that can be:
 * 1. Stored with a content-addressable identifier (digestMultibase)
 * 2. Made publicly available via /api/assets/<digestMultibase>
 * 3. Time-limited via availableFrom and availableUntil timestamps
 * 4. Referenced in SD-JWT credentials as evidence items
 *
 * The digestMultibase is computed from the file content and serves as the
 * primary identifier for content-addressable access.
 */
export class AssetPlugin implements IAgentPlugin {
  readonly methods: IAssetPlugin
  readonly schema = {
    components: {
      schemas: {},
      methods: {
        assetStore: {
          description: 'Store a new asset',
          arguments: { $ref: '#/components/schemas/AssetStoreArgs' },
          returnType: { $ref: '#/components/schemas/AssetStoreResult' },
        },
        assetGetById: {
          description: 'Get asset by ID',
          arguments: { $ref: '#/components/schemas/AssetGetByIdArgs' },
          returnType: { $ref: '#/components/schemas/Asset' },
        },
        assetGetByDigest: {
          description: 'Get asset by multibase digest',
          arguments: { $ref: '#/components/schemas/AssetGetByDigestArgs' },
          returnType: { $ref: '#/components/schemas/Asset' },
        },
        assetList: {
          description: 'List assets',
          arguments: { $ref: '#/components/schemas/AssetListArgs' },
          returnType: { type: 'array', items: { $ref: '#/components/schemas/Asset' } },
        },
        assetCount: {
          description: 'Count assets',
          arguments: { $ref: '#/components/schemas/AssetListArgs' },
          returnType: { type: 'number' },
        },
        assetUpdate: {
          description: 'Update asset metadata',
          arguments: { $ref: '#/components/schemas/AssetUpdateArgs' },
          returnType: { $ref: '#/components/schemas/Asset' },
        },
        assetDelete: {
          description: 'Soft-delete asset (or hard-delete if hardDelete=true)',
          arguments: { $ref: '#/components/schemas/AssetDeleteArgs' },
          returnType: { type: 'boolean' },
        },
        assetRestore: {
          description: 'Restore a soft-deleted asset',
          arguments: { $ref: '#/components/schemas/AssetRestoreArgs' },
          returnType: { $ref: '#/components/schemas/Asset' },
        },
        assetPublish: {
          description: 'Make asset publicly available',
          arguments: { $ref: '#/components/schemas/AssetPublishArgs' },
          returnType: { $ref: '#/components/schemas/Asset' },
        },
        assetUnpublish: {
          description: 'Make asset private',
          arguments: { $ref: '#/components/schemas/AssetUnpublishArgs' },
          returnType: { $ref: '#/components/schemas/Asset' },
        },
        assetLinkCredential: {
          description: 'Link asset to credential',
          arguments: { $ref: '#/components/schemas/AssetLinkCredentialArgs' },
          returnType: { $ref: '#/components/schemas/Asset' },
        },
        assetCheckAvailability: {
          description: 'Check if asset is publicly available',
          arguments: { $ref: '#/components/schemas/AssetCheckAvailabilityArgs' },
          returnType: { $ref: '#/components/schemas/AssetAvailability' },
        },
        assetGetFile: {
          description: 'Get asset file for serving (checks availability)',
          arguments: { $ref: '#/components/schemas/AssetGetFileArgs' },
          returnType: { $ref: '#/components/schemas/AssetGetFileResult' },
        },
      },
    },
  }

  private dbConnection: Promise<DataSource>

  constructor(options: { dbConnection: Promise<DataSource> }) {
    this.dbConnection = options.dbConnection

    this.methods = {
      assetStore: this.assetStore.bind(this),
      assetGetById: this.assetGetById.bind(this),
      assetGetByDigest: this.assetGetByDigest.bind(this),
      assetList: this.assetList.bind(this),
      assetCount: this.assetCount.bind(this),
      assetUpdate: this.assetUpdate.bind(this),
      assetDelete: this.assetDelete.bind(this),
      assetRestore: this.assetRestore.bind(this),
      assetPublish: this.assetPublish.bind(this),
      assetUnpublish: this.assetUnpublish.bind(this),
      assetLinkCredential: this.assetLinkCredential.bind(this),
      assetCheckAvailability: this.assetCheckAvailability.bind(this),
      assetGetFile: this.assetGetFile.bind(this),
    }
  }

  // ===== Storage Path =====

  /**
   * Default storage directory for asset files.
   * Can be overridden via ASSET_STORAGE_PATH environment variable.
   */
  private getAssetStoragePath(): string {
    return process.env.ASSET_STORAGE_PATH || path.join(process.cwd(), 'asset-files')
  }

  // ===== Hash Computation =====

  /**
   * Compute hash of a buffer and return as multibase (base58btc) encoded string.
   *
   * Per W3C VC Data Integrity specification, digestMultibase uses multibase encoding.
   * We use base58btc encoding with 'z' prefix for compact representation.
   *
   * @see https://www.w3.org/TR/vc-data-integrity/
   * @see https://github.com/multiformats/multibase
   */
  private computeDigestMultibase(buffer: Buffer, algorithm: AssetHashAlgorithm = 'sha256'): string {
    const hash = crypto.createHash(algorithm).update(buffer).digest()
    // Multibase: 'z' prefix indicates base58btc encoding
    return 'z' + bytesToBase58(new Uint8Array(hash))
  }

  // ===== Store =====

  private async assetStore(args: AssetStoreArgs): Promise<AssetStoreResult> {
    const db = await this.dbConnection
    const id = uuidv4()
    const now = new Date()

    // Use specified hash algorithm or default to sha256
    const hashAlgorithm: AssetHashAlgorithm = args.hashAlgorithm || 'sha256'

    // Compute content-addressable hash
    const digestMultibase = this.computeDigestMultibase(args.fileBuffer, hashAlgorithm)

    // Check if asset with same digest already exists (including soft-deleted)
    const existing = await this.assetGetByDigest({ digestMultibase })
    if (existing) {
      // If the existing asset was soft-deleted, restore it and update properties
      if (existing.deletedAt) {
        console.log(`[Asset] Asset with digest ${digestMultibase} was soft-deleted, restoring and updating it`)

        // Restore first (clears deleted_at)
        await this.assetRestore({ id: existing.id })

        // Update all properties except hash/digest (which are the same by definition)
        const assetType = args.assetType || this.inferAssetType(args.contentType, args.filename)
        const isPublic = args.isPublic ?? false

        const updated = await this.assetUpdate({
          id: existing.id,
          filename: args.filename,
          contentType: args.contentType,
          assetType,
          description: args.description,
          isPublic,
          availableFrom: args.availableFrom,
          availableUntil: args.availableUntil,
          credentialId: args.credentialId,
          metadata: args.metadata,
        })

        return {
          ...updated,
          publicUrl: updated.isPublic ? this.getPublicUrl(updated.digestMultibase) : undefined,
        }
      }
      // Return existing asset
      console.log(`[Asset] Asset with digest ${digestMultibase} already exists, returning existing asset`)
      return {
        ...existing,
        publicUrl: existing.isPublic ? this.getPublicUrl(existing.digestMultibase) : undefined,
      }
    }

    // Ensure storage directory exists
    const storageDir = this.getAssetStoragePath()
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true })
    }

    // Store file with UUID-based subdirectory to avoid collisions
    // The actual filename is preserved for Content-Disposition headers
    const storagePath = path.join(storageDir, id, args.filename)
    const fileDir = path.dirname(storagePath)
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true })
    }
    fs.writeFileSync(storagePath, args.fileBuffer)

    const assetType = args.assetType || this.inferAssetType(args.contentType, args.filename)
    const fileSize = args.fileBuffer.length
    const isPublic = args.isPublic ?? false

    await db.query(
      `INSERT INTO "asset" (
        "id", "tenant_id", "digest_multibase", "hash_algorithm", "filename", "original_filename",
        "content_type", "file_size", "storage_path", "asset_type", "description",
        "is_public", "available_from", "available_until", "credential_id", "metadata",
        "created_at", "updated_at"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        id,
        args.tenantId || null,
        digestMultibase,
        hashAlgorithm,
        args.filename,
        args.filename, // originalFilename
        args.contentType,
        fileSize,
        storagePath,
        assetType,
        args.description || null,
        isPublic,
        args.availableFrom || null,
        args.availableUntil || null,
        args.credentialId || null,
        args.metadata ? JSON.stringify(args.metadata) : null,
        now,
        now,
      ]
    )

    const asset: Asset = {
      id,
      tenantId: args.tenantId,
      digestMultibase,
      hashAlgorithm,
      filename: args.filename,
      originalFilename: args.filename,
      contentType: args.contentType,
      fileSize,
      storagePath,
      assetType,
      description: args.description,
      isPublic,
      availableFrom: args.availableFrom,
      availableUntil: args.availableUntil,
      credentialId: args.credentialId,
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now,
    }

    console.log(`[Asset] Stored asset: ${id} with digest: ${digestMultibase}`)

    return {
      ...asset,
      publicUrl: isPublic ? this.getPublicUrl(digestMultibase) : undefined,
    }
  }

  // ===== Get =====

  private async assetGetById(args: AssetGetByIdArgs): Promise<Asset | null> {
    const db = await this.dbConnection
    const result = await db.query(`SELECT * FROM "asset" WHERE "id" = $1`, [args.id])

    if (result.length === 0) {
      return null
    }

    return this.mapAssetRow(result[0])
  }

  private async assetGetByDigest(args: AssetGetByDigestArgs): Promise<Asset | null> {
    const db = await this.dbConnection
    const result = await db.query(`SELECT * FROM "asset" WHERE "digest_multibase" = $1`, [args.digestMultibase])

    if (result.length === 0) {
      return null
    }

    return this.mapAssetRow(result[0])
  }

  // ===== List =====

  private async assetList(args: AssetListArgs): Promise<Asset[]> {
    const db = await this.dbConnection

    let query = `SELECT * FROM "asset" WHERE 1=1`
    const params: unknown[] = []
    let paramIndex = 1

    // Exclude soft-deleted items by default
    if (!args.includeDeleted) {
      query += ` AND "deleted_at" IS NULL`
    }

    if (args.tenantId !== undefined) {
      query += ` AND "tenant_id" = $${paramIndex++}`
      params.push(args.tenantId)
    }

    if (args.assetType !== undefined) {
      query += ` AND "asset_type" = $${paramIndex++}`
      params.push(args.assetType)
    }

    if (args.isPublic !== undefined) {
      query += ` AND "is_public" = $${paramIndex++}`
      params.push(args.isPublic)
    }

    if (args.credentialId !== undefined) {
      query += ` AND "credential_id" = $${paramIndex++}`
      params.push(args.credentialId)
    }

    query += ` ORDER BY "created_at" DESC`

    if (args.limit !== undefined) {
      query += ` LIMIT $${paramIndex++}`
      params.push(args.limit)
    }

    if (args.offset !== undefined) {
      query += ` OFFSET $${paramIndex++}`
      params.push(args.offset)
    }

    const result = await db.query(query, params)
    return result.map((row: unknown) => this.mapAssetRow(row))
  }

  private async assetCount(args: AssetListArgs): Promise<number> {
    const db = await this.dbConnection

    let query = `SELECT COUNT(*) as count FROM "asset" WHERE 1=1`
    const params: unknown[] = []
    let paramIndex = 1

    // Exclude soft-deleted items by default
    if (!args.includeDeleted) {
      query += ` AND "deleted_at" IS NULL`
    }

    if (args.tenantId !== undefined) {
      query += ` AND "tenant_id" = $${paramIndex++}`
      params.push(args.tenantId)
    }

    if (args.assetType !== undefined) {
      query += ` AND "asset_type" = $${paramIndex++}`
      params.push(args.assetType)
    }

    if (args.isPublic !== undefined) {
      query += ` AND "is_public" = $${paramIndex++}`
      params.push(args.isPublic)
    }

    if (args.credentialId !== undefined) {
      query += ` AND "credential_id" = $${paramIndex++}`
      params.push(args.credentialId)
    }

    const result = await db.query(query, params)
    return parseInt(result[0].count, 10)
  }

  // ===== Update =====

  private async assetUpdate(args: AssetUpdateArgs): Promise<Asset> {
    const db = await this.dbConnection
    const now = new Date()

    // First check if asset exists
    const existing = await this.assetGetById({ id: args.id })
    if (!existing) {
      throw new Error(`Asset not found: ${args.id}`)
    }

    // Build update query dynamically
    const updates: string[] = []
    const params: unknown[] = []
    let paramIndex = 1

    if (args.filename !== undefined) {
      updates.push(`"filename" = $${paramIndex++}`)
      params.push(args.filename)
    }

    if (args.contentType !== undefined) {
      updates.push(`"content_type" = $${paramIndex++}`)
      params.push(args.contentType)
    }

    if (args.description !== undefined) {
      updates.push(`"description" = $${paramIndex++}`)
      params.push(args.description)
    }

    if (args.isPublic !== undefined) {
      updates.push(`"is_public" = $${paramIndex++}`)
      params.push(args.isPublic)
    }

    if (args.availableFrom !== undefined) {
      updates.push(`"available_from" = $${paramIndex++}`)
      params.push(args.availableFrom)
    }

    if (args.availableUntil !== undefined) {
      updates.push(`"available_until" = $${paramIndex++}`)
      params.push(args.availableUntil)
    }

    if (args.credentialId !== undefined) {
      updates.push(`"credential_id" = $${paramIndex++}`)
      params.push(args.credentialId)
    }

    if (args.metadata !== undefined) {
      updates.push(`"metadata" = $${paramIndex++}`)
      params.push(JSON.stringify(args.metadata))
    }

    if (args.assetType !== undefined) {
      updates.push(`"asset_type" = $${paramIndex++}`)
      params.push(args.assetType)
    }

    // Always update the updated_at timestamp
    updates.push(`"updated_at" = $${paramIndex++}`)
    params.push(now)

    // Add the ID for the WHERE clause
    params.push(args.id)

    if (updates.length === 1) {
      // Only updated_at was set, nothing meaningful to update
      return existing
    }

    await db.query(`UPDATE "asset" SET ${updates.join(', ')} WHERE "id" = $${paramIndex}`, params)

    const updated = await this.assetGetById({ id: args.id })
    return updated!
  }

  // ===== Delete =====

  private async assetDelete(args: AssetDeleteArgs): Promise<boolean> {
    const db = await this.dbConnection
    const now = new Date()

    // Get asset first to check it exists and get storage path (for hard delete)
    const asset = await this.assetGetById({ id: args.id })
    if (!asset) {
      return false
    }

    if (args.hardDelete) {
      // Hard delete: remove from database and optionally delete file
      const result = await db.query(`DELETE FROM "asset" WHERE "id" = $1`, [args.id])

      // Delete the file from storage
      if (asset.storagePath) {
        try {
          if (fs.existsSync(asset.storagePath)) {
            fs.unlinkSync(asset.storagePath)
            // Also try to remove the parent directory if it's empty
            const parentDir = path.dirname(asset.storagePath)
            const files = fs.readdirSync(parentDir)
            if (files.length === 0) {
              fs.rmdirSync(parentDir)
            }
          }
        } catch (err) {
          console.error(`[Asset] Failed to delete file ${asset.storagePath}:`, err)
        }
      }

      console.log(`[Asset] Hard deleted asset: ${args.id}`)
      return result.rowCount > 0
    } else {
      // Soft delete: set deleted_at timestamp
      await db.query(`UPDATE "asset" SET "deleted_at" = $1, "updated_at" = $1 WHERE "id" = $2`, [now, args.id])
      console.log(`[Asset] Soft deleted asset: ${args.id}`)
      return true
    }
  }

  // ===== Restore =====

  private async assetRestore(args: AssetRestoreArgs): Promise<Asset> {
    const db = await this.dbConnection
    const now = new Date()

    // Check if asset exists (including soft-deleted)
    const result = await db.query(`SELECT * FROM "asset" WHERE "id" = $1`, [args.id])
    if (result.length === 0) {
      throw new Error(`Asset not found: ${args.id}`)
    }

    const asset = this.mapAssetRow(result[0])
    if (!asset.deletedAt) {
      // Asset is not deleted, just return it
      return asset
    }

    // Restore by clearing deleted_at
    await db.query(`UPDATE "asset" SET "deleted_at" = NULL, "updated_at" = $1 WHERE "id" = $2`, [now, args.id])

    console.log(`[Asset] Restored asset: ${args.id}`)

    const restored = await this.assetGetById({ id: args.id })
    return restored!
  }

  // ===== Publish/Unpublish =====

  private async assetPublish(args: AssetPublishArgs): Promise<Asset> {
    return this.assetUpdate({
      id: args.id,
      isPublic: true,
      availableFrom: args.availableFrom,
      availableUntil: args.availableUntil,
    })
  }

  private async assetUnpublish(args: AssetUnpublishArgs): Promise<Asset> {
    return this.assetUpdate({
      id: args.id,
      isPublic: false,
      availableFrom: null,
      availableUntil: null,
    })
  }

  // ===== Link Credential =====

  private async assetLinkCredential(args: AssetLinkCredentialArgs): Promise<Asset> {
    return this.assetUpdate({
      id: args.id,
      credentialId: args.credentialId,
    })
  }

  // ===== Availability Check =====

  private async assetCheckAvailability(args: AssetCheckAvailabilityArgs): Promise<AssetAvailability> {
    // Query directly to include soft-deleted records (we need to check for deleted status)
    const db = await this.dbConnection
    const result = await db.query(`SELECT * FROM "asset" WHERE "digest_multibase" = $1`, [args.digestMultibase])

    if (result.length === 0) {
      return { isAvailable: false, reason: 'not_found' }
    }

    const asset = this.mapAssetRow(result[0])

    // Check if asset is soft-deleted
    if (asset.deletedAt) {
      return { isAvailable: false, reason: 'deleted' }
    }

    if (!asset.isPublic) {
      return { isAvailable: false, reason: 'not_public' }
    }

    const now = new Date()

    if (asset.availableFrom && now < asset.availableFrom) {
      return {
        isAvailable: false,
        reason: 'not_yet_available',
        availableFrom: asset.availableFrom,
        availableUntil: asset.availableUntil,
      }
    }

    if (asset.availableUntil && now > asset.availableUntil) {
      return {
        isAvailable: false,
        reason: 'expired',
        availableFrom: asset.availableFrom,
        availableUntil: asset.availableUntil,
      }
    }

    // Check if file exists on disk
    if (!fs.existsSync(asset.storagePath)) {
      return { isAvailable: false, reason: 'file_missing' }
    }

    return {
      isAvailable: true,
      availableFrom: asset.availableFrom,
      availableUntil: asset.availableUntil,
    }
  }

  // ===== Get File for Serving =====

  private async assetGetFile(args: AssetGetFileArgs): Promise<AssetGetFileResult | null> {
    // Query directly to include soft-deleted records (we need to return 410 Gone for deleted assets)
    const db = await this.dbConnection
    const result = await db.query(`SELECT * FROM "asset" WHERE "digest_multibase" = $1`, [args.digestMultibase])

    if (result.length === 0) {
      return null
    }

    const asset = this.mapAssetRow(result[0])
    const availability = await this.assetCheckAvailability({ digestMultibase: args.digestMultibase })

    return {
      asset,
      filePath: asset.storagePath,
      availability,
    }
  }

  // ===== Helper Methods =====

  /**
   * Get the public URL for an asset.
   * Uses ASSET_BASE_URI from environment which defaults to AGENT_BASE_URI.
   */
  private getPublicUrl(digestMultibase: string): string {
    return `${ASSET_BASE_URI}/api/assets/${digestMultibase}`
  }

  /**
   * Infer asset type from content type and filename.
   */
  private inferAssetType(contentType: string, filename: string): AssetType {
    const lowerFilename = filename.toLowerCase()

    // Check for UBL invoice
    if (lowerFilename.endsWith('.xml') && (lowerFilename.includes('invoice') || lowerFilename.includes('ubl'))) {
      return 'UBLInvoice'
    }

    // Check for common document types
    if (contentType === 'application/pdf') {
      return 'PDF'
    }

    if (contentType.startsWith('image/')) {
      return 'Image'
    }

    if (contentType === 'application/xml' || contentType === 'text/xml') {
      return 'XMLDocument'
    }

    if (contentType === 'application/json') {
      return 'JSONDocument'
    }

    if (contentType.startsWith('text/')) {
      return 'Document'
    }

    if (contentType === 'application/octet-stream') {
      return 'Binary'
    }

    return 'Document'
  }

  // ===== Row Mapper =====

  private mapAssetRow(row: unknown): Asset {
    const r = row as Record<string, unknown>
    return {
      id: r.id as string,
      tenantId: r.tenant_id as string | undefined,
      digestMultibase: r.digest_multibase as string,
      hashAlgorithm: (r.hash_algorithm as AssetHashAlgorithm) || 'sha256',
      filename: r.filename as string,
      originalFilename: r.original_filename as string | undefined,
      contentType: r.content_type as string,
      fileSize: parseInt(r.file_size as string, 10),
      storagePath: r.storage_path as string,
      assetType: (r.asset_type as AssetType) || 'Document',
      description: r.description as string | undefined,
      isPublic: r.is_public as boolean,
      availableFrom: r.available_from ? new Date(r.available_from as string) : undefined,
      availableUntil: r.available_until ? new Date(r.available_until as string) : undefined,
      credentialId: r.credential_id as string | undefined,
      metadata: r.metadata ? (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) as Record<string, unknown> : undefined,
      deletedAt: r.deleted_at ? new Date(r.deleted_at as string) : undefined,
      createdAt: new Date(r.created_at as string),
      updatedAt: new Date(r.updated_at as string),
    }
  }
}
