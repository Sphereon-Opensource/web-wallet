/**
 * Asset plugin module.
 *
 * Provides content-addressable asset storage for files.
 *
 * @example
 * import { AssetPlugin } from './plugins/asset'
 * import type { Asset, IAssetPlugin } from './plugins/asset'
 */

// Export types
export * from './types'

// Export plugin interface
export type { IAssetPlugin } from './IAssetPlugin'

// Export plugin implementation
export { AssetPlugin } from './assetPlugin'

// Export utilities for direct use if needed
export * from './utils'
