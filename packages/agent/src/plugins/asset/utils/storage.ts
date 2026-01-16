/**
 * File storage utilities for asset management.
 */

import * as fs from 'fs'
import * as path from 'path'
import { ValidationError } from '../../shared/error'

/**
 * Default storage directory for asset files.
 * Can be overridden via ASSET_STORAGE_PATH environment variable.
 */
export function getAssetStoragePath(): string {
  return process.env.ASSET_STORAGE_PATH || path.join(process.cwd(), 'asset-files')
}

/**
 * Ensure a directory exists, creating it if necessary.
 *
 * @param dirPath - The directory path to ensure exists
 */
export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

/**
 * Write a file to the storage directory.
 *
 * @param id - The asset ID (used for subdirectory)
 * @param filename - The filename
 * @param buffer - The file content
 * @returns The full storage path
 * @throws {ValidationError} When file write fails
 */
export function writeAssetFile(id: string, filename: string, buffer: Buffer): string {
  const storageDir = getAssetStoragePath()
  ensureDirectoryExists(storageDir)

  const storagePath = path.join(storageDir, id, filename)
  const fileDir = path.dirname(storagePath)
  ensureDirectoryExists(fileDir)

  try {
    fs.writeFileSync(storagePath, buffer)
    return storagePath
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw new ValidationError(`Failed to write asset file: ${message}`, 'storagePath')
  }
}

/**
 * Delete an asset file and its parent directory if empty.
 *
 * @param storagePath - The full path to the file
 * @param throwOnError - If true, throws ValidationError on failure; if false, returns false
 * @returns True if deletion was successful, false if file doesn't exist or deletion failed
 * @throws {ValidationError} When deletion fails and throwOnError is true
 */
export function deleteAssetFile(storagePath: string, throwOnError = false): boolean {
  try {
    if (fs.existsSync(storagePath)) {
      fs.unlinkSync(storagePath)

      // Try to remove the parent directory if it's empty
      const parentDir = path.dirname(storagePath)
      const files = fs.readdirSync(parentDir)
      if (files.length === 0) {
        fs.rmdirSync(parentDir)
      }
      return true
    }
    return false
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (throwOnError) {
      throw new ValidationError(`Failed to delete asset file: ${message}`, 'storagePath')
    }
    console.error(`[Asset] Failed to delete file ${storagePath}:`, message)
    return false
  }
}

/**
 * Check if a file exists.
 *
 * @param filePath - The file path to check
 * @returns True if the file exists
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath)
}
