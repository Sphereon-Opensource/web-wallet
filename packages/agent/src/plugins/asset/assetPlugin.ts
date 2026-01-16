/**
 * Asset plugin implementation.
 *
 * Manages content-addressable asset storage for files that can be:
 * 1. Stored with a content-addressable identifier (digestMultibase)
 * 2. Made publicly available via /api/assets/<digestMultibase>
 * 3. Time-limited via availableFrom and availableUntil timestamps
 * 4. Referenced in SD-JWT credentials as evidence items
 */

import { DataSource } from 'typeorm'
import { IAgentPlugin } from '@veramo/core'
import { v4 as uuidv4 } from 'uuid'

import { ASSET_BASE_URI } from '../../environment-vars'
import type { IAssetPlugin } from './IAssetPlugin'
import type {
  Asset,
  AssetStoreResult,
  AssetAvailability,
  AssetGetFileResult,
  AssetHashAlgorithm,
} from './types'
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
import { computeDigestMultibase } from './utils/hash'
import { writeAssetFile, deleteAssetFile, fileExists } from './utils/storage'
import { mapAssetRow, inferAssetType } from './utils/rowMappers'
import { assetPluginSchema } from './schema'
import { NotFoundError } from '../shared/error'

/**
 * Plugin that manages content-addressable asset storage.
 */
export class AssetPlugin implements IAgentPlugin {
  readonly methods: IAssetPlugin
  readonly schema = assetPluginSchema

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

  // ===== Store =====

  /**
   * Stores a new asset with content-addressable hashing.
   *
   * The file is hashed using SHA-256 and encoded as a multibase string (z-prefixed base58btc).
   * If an asset with the same hash already exists, it is returned instead of creating a duplicate.
   * If the existing asset was soft-deleted, it is restored and updated with the new metadata.
   *
   * @param args - The store arguments
   * @param args.fileBuffer - The file content as a Buffer
   * @param args.filename - The filename to store
   * @param args.contentType - MIME type of the file
   * @param args.assetType - Optional type classification (UBLInvoice, SupportingDocument, etc.)
   * @param args.description - Optional description
   * @param args.isPublic - Whether the asset should be publicly accessible (default: false)
   * @param args.availableFrom - Optional start date for public availability
   * @param args.availableUntil - Optional end date for public availability
   * @param args.credentialId - Optional associated credential ID
   * @param args.metadata - Optional JSON metadata
   * @param args.tenantId - Optional tenant ID for multi-tenant setups
   * @param args.hashAlgorithm - Hash algorithm to use (default: sha256)
   * @returns The stored asset with optional public URL
   */
  private async assetStore(args: AssetStoreArgs): Promise<AssetStoreResult> {
    const db = await this.dbConnection
    const id = uuidv4()
    const now = new Date()

    const hashAlgorithm: AssetHashAlgorithm = args.hashAlgorithm || 'sha256'
    const digestMultibase = computeDigestMultibase(args.fileBuffer, hashAlgorithm)

    // Check if asset with same digest already exists (including soft-deleted)
    const existing = await this.assetGetByDigest({ digestMultibase })
    if (existing) {
      // If the existing asset was soft-deleted, restore and update it
      if (existing.deletedAt) {
        console.log(`[Asset] Asset with digest ${digestMultibase} was soft-deleted, restoring and updating it`)

        await this.assetRestore({ id: existing.id })

        const assetType = args.assetType || inferAssetType(args.contentType, args.filename)
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

    // Write file to storage
    const storagePath = writeAssetFile(id, args.filename, args.fileBuffer)

    const assetType = args.assetType || inferAssetType(args.contentType, args.filename)
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
        args.filename,
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

  /**
   * Gets an asset by its UUID.
   *
   * @param args - The get arguments
   * @param args.id - UUID of the asset
   * @returns The asset if found, null otherwise
   */
  private async assetGetById(args: AssetGetByIdArgs): Promise<Asset | null> {
    const db = await this.dbConnection
    const result = await db.query(`SELECT * FROM "asset" WHERE "id" = $1`, [args.id])

    if (result.length === 0) {
      return null
    }

    return mapAssetRow(result[0])
  }

  /**
   * Gets an asset by its multibase digest (content-addressable lookup).
   *
   * @param args - The get arguments
   * @param args.digestMultibase - The z-prefixed base58btc multibase digest
   * @returns The asset if found, null otherwise
   */
  private async assetGetByDigest(args: AssetGetByDigestArgs): Promise<Asset | null> {
    const db = await this.dbConnection
    const result = await db.query(`SELECT * FROM "asset" WHERE "digest_multibase" = $1`, [args.digestMultibase])

    if (result.length === 0) {
      return null
    }

    return mapAssetRow(result[0])
  }

  // ===== List =====

  private async assetList(args: AssetListArgs): Promise<Asset[]> {
    const db = await this.dbConnection

    let query = `SELECT * FROM "asset" WHERE 1=1`
    const params: unknown[] = []
    let paramIndex = 1

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
    return result.map((row: Record<string, unknown>) => mapAssetRow(row))
  }

  private async assetCount(args: AssetListArgs): Promise<number> {
    const db = await this.dbConnection

    let query = `SELECT COUNT(*) as count FROM "asset" WHERE 1=1`
    const params: unknown[] = []
    let paramIndex = 1

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

  /**
   * Updates an existing asset's metadata.
   *
   * Only non-undefined fields in the args are updated. The file content and digest
   * cannot be changed - to replace a file, delete and re-upload.
   *
   * @param args - The update arguments
   * @param args.id - UUID of the asset to update
   * @param args.filename - New display filename
   * @param args.contentType - New MIME type
   * @param args.assetType - New type classification
   * @param args.description - New description
   * @param args.isPublic - New public visibility flag
   * @param args.availableFrom - New availability start date
   * @param args.availableUntil - New availability end date
   * @param args.credentialId - New associated credential ID
   * @param args.metadata - New JSON metadata (replaces existing)
   * @returns The updated asset
   * @throws {NotFoundError} When the asset does not exist
   */
  private async assetUpdate(args: AssetUpdateArgs): Promise<Asset> {
    const db = await this.dbConnection
    const now = new Date()

    const existing = await this.assetGetById({ id: args.id })
    if (!existing) {
      throw new NotFoundError('Asset', args.id)
    }

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

    updates.push(`"updated_at" = $${paramIndex++}`)
    params.push(now)

    params.push(args.id)

    if (updates.length === 1) {
      return existing
    }

    await db.query(`UPDATE "asset" SET ${updates.join(', ')} WHERE "id" = $${paramIndex}`, params)

    const updated = await this.assetGetById({ id: args.id })
    return updated!
  }

  // ===== Delete =====

  /**
   * Deletes an asset (soft or hard delete).
   *
   * Soft delete (default): Sets the deleted_at timestamp, making the asset inactive
   * but recoverable via assetRestore. The file remains on disk.
   *
   * Hard delete: Permanently removes the database record and deletes the file from disk.
   * This cannot be undone.
   *
   * @param args - The delete arguments
   * @param args.id - UUID of the asset to delete
   * @param args.hardDelete - If true, permanently delete; if false, soft delete (default)
   * @returns True if the asset was deleted, false if not found
   */
  private async assetDelete(args: AssetDeleteArgs): Promise<boolean> {
    const db = await this.dbConnection
    const now = new Date()

    const asset = await this.assetGetById({ id: args.id })
    if (!asset) {
      return false
    }

    if (args.hardDelete) {
      const result = await db.query(`DELETE FROM "asset" WHERE "id" = $1`, [args.id])

      if (asset.storagePath) {
        deleteAssetFile(asset.storagePath)
      }

      console.log(`[Asset] Hard deleted asset: ${args.id}`)
      return result.rowCount > 0
    } else {
      await db.query(`UPDATE "asset" SET "deleted_at" = $1, "updated_at" = $1 WHERE "id" = $2`, [now, args.id])
      console.log(`[Asset] Soft deleted asset: ${args.id}`)
      return true
    }
  }

  // ===== Restore =====

  private async assetRestore(args: AssetRestoreArgs): Promise<Asset> {
    const db = await this.dbConnection
    const now = new Date()

    const result = await db.query(`SELECT * FROM "asset" WHERE "id" = $1`, [args.id])
    if (result.length === 0) {
      throw new NotFoundError('Asset', args.id)
    }

    const asset = mapAssetRow(result[0])
    if (!asset.deletedAt) {
      return asset
    }

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
    const db = await this.dbConnection
    const result = await db.query(`SELECT * FROM "asset" WHERE "digest_multibase" = $1`, [args.digestMultibase])

    if (result.length === 0) {
      return { isAvailable: false, reason: 'not_found' }
    }

    const asset = mapAssetRow(result[0])

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

    if (!fileExists(asset.storagePath)) {
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
    const db = await this.dbConnection
    const result = await db.query(`SELECT * FROM "asset" WHERE "digest_multibase" = $1`, [args.digestMultibase])

    if (result.length === 0) {
      return null
    }

    const asset = mapAssetRow(result[0])
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
   */
  private getPublicUrl(digestMultibase: string): string {
    return `${ASSET_BASE_URI}/api/assets/${digestMultibase}`
  }
}
