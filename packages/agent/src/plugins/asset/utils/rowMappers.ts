/**
 * Row mapping functions for asset database results.
 */

import { parseDate, parseRequiredDate, parseJson, parseNumber, parseBoolean } from '../../shared/rowMapper'
import type { Asset, AssetHashAlgorithm, AssetType } from '../types'

/**
 * Maps a database row to an Asset entity.
 *
 * Handles type conversions for:
 * - Dates (available_from, available_until, deleted_at, created_at, updated_at)
 * - Numbers (file_size)
 * - Booleans (is_public)
 * - JSON (metadata)
 *
 * @param row - The raw database row with snake_case column names
 * @returns The mapped Asset entity with camelCase property names
 */
export function mapAssetRow(row: Record<string, unknown>): Asset {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string | undefined,
    digestMultibase: row.digest_multibase as string,
    hashAlgorithm: (row.hash_algorithm as AssetHashAlgorithm) || 'sha256',
    filename: row.filename as string,
    originalFilename: row.original_filename as string | undefined,
    contentType: row.content_type as string,
    fileSize: parseNumber(row.file_size),
    storagePath: row.storage_path as string,
    assetType: (row.asset_type as AssetType) || 'Document',
    description: row.description as string | undefined,
    isPublic: parseBoolean(row.is_public),
    availableFrom: parseDate(row.available_from),
    availableUntil: parseDate(row.available_until),
    credentialId: row.credential_id as string | undefined,
    metadata: parseJson(row.metadata),
    deletedAt: parseDate(row.deleted_at),
    createdAt: parseRequiredDate(row.created_at),
    updatedAt: parseRequiredDate(row.updated_at),
  }
}

/**
 * Infer asset type from content type and filename.
 *
 * @param contentType - The MIME content type
 * @param filename - The filename
 * @returns The inferred asset type
 */
export function inferAssetType(contentType: string, filename: string): AssetType {
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
