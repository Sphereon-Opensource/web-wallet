import {getAgent} from '@agent'
import {EventEmitter} from 'events'
import {ICredentialBranding, IGetCredentialBrandingArgs} from '@sphereon/ssi-sdk.data-store-types'
import {useEffect, useState} from 'react'

/**
 * IndexedDB configuration
 */
const DB_NAME = 'credential_branding_db'
const DB_VERSION = 1
const STORE_NAME = 'brandings'
const METADATA_STORE = 'metadata'

/**
 * Metadata keys for IndexedDB
 */
const METADATA_KEYS = {
  STATE_MAP: 'state_map',
  LAST_SYNC: 'last_sync',
  VERSION: 'version',
} as const

/**
 * Configuration options for BrandingSync
 */
export interface IBrandingSyncConfig {
  /**
   * Enable persistence (default: true)
   * Uses IndexedDB for large data storage
   */
  enablePersistence?: boolean

  /**
   * Maximum age of cached data in milliseconds (default: 24 hours)
   * After this time, a full sync will be performed
   */
  maxCacheAge?: number

  /**
   * Logger instance (defaults to console)
   * In production, pass a custom logger instance
   */
  logger?: Console | {error: Function; warn: Function; info: Function; debug: Function}
}

/**
 * Result of a sync operation
 */
export interface ISyncResult {
  /**
   * All brandings currently in the cache
   */
  allBrandings: ICredentialBranding[]

  /**
   * Brandings that were changed or newly added in this sync
   */
  changedBrandings: ICredentialBranding[]

  /**
   * IDs of brandings that were deleted since last sync
   */
  deletedIds: string[]

  /**
   * Whether this was a full sync or incremental sync
   */
  fullSync: boolean

  /**
   * Timestamp of this sync
   */
  timestamp: Date
}

/**
 * IndexedDB helper class for managing credential branding storage
 *
 * Note: For production, consider using the 'idb' library (npm install idb)
 * which provides better Promise wrapping and handles edge cases more robustly.
 */
class BrandingIndexedDB {
  private dbPromise: Promise<IDBDatabase> | null = null

  private async getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)

        request.onupgradeneeded = event => {
          const db = (event.target as IDBOpenDBRequest).result

          // Create brandings store
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const brandingStore = db.createObjectStore(STORE_NAME, {keyPath: 'id'})
            brandingStore.createIndex('vcHash', 'vcHash', {unique: false})
            brandingStore.createIndex('issuerCorrelationId', 'issuerCorrelationId', {unique: false})
          }

          // Create metadata store
          if (!db.objectStoreNames.contains(METADATA_STORE)) {
            db.createObjectStore(METADATA_STORE, {keyPath: 'key'})
          }
        }
      })
    }
    return this.dbPromise
  }

  /**
   * Save all brandings to IndexedDB
   * Uses Promise.all for bulk operations which is faster than awaiting individually
   */
  async saveBrandings(brandings: ICredentialBranding[]): Promise<void> {
    const db = await this.getDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    // Clear and add all brandings in parallel
    await Promise.all([this.promisifyRequest(store.clear()), ...brandings.map(b => this.promisifyRequest(store.add(b)))])

    await this.waitForTx(tx)
  }

  /**
   * Load all brandings from IndexedDB
   */
  async loadBrandings(): Promise<ICredentialBranding[]> {
    const db = await this.getDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    return this.promisifyRequest<ICredentialBranding[]>(store.getAll())
  }

  /**
   * Save metadata (state map, last sync, version)
   */
  async saveMetadata(key: string, value: unknown): Promise<void> {
    const db = await this.getDB()
    const tx = db.transaction(METADATA_STORE, 'readwrite')
    const store = tx.objectStore(METADATA_STORE)
    await this.promisifyRequest(store.put({key, value}))
  }

  /**
   * Load metadata
   */
  async loadMetadata<T>(key: string): Promise<T | null> {
    const db = await this.getDB()
    const tx = db.transaction(METADATA_STORE, 'readonly')
    const store = tx.objectStore(METADATA_STORE)

    const result = await this.promisifyRequest<{key: string; value: T}>(store.get(key))
    return result?.value ?? null
  }

  /**
   * Clear all data from IndexedDB
   */
  async clearAll(): Promise<void> {
    const db = await this.getDB()
    const tx = db.transaction([STORE_NAME, METADATA_STORE], 'readwrite')

    await Promise.all([this.promisifyRequest(tx.objectStore(STORE_NAME).clear()), this.promisifyRequest(tx.objectStore(METADATA_STORE).clear())])

    await this.waitForTx(tx)
  }

  /**
   * Get database size estimate
   */
  async getStorageEstimate(): Promise<{usage: number; quota: number}> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      }
    }
    return {usage: 0, quota: 0}
  }

  /**
   * Helper to convert IDBRequest to Promise
   */
  private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  /**
   * Helper to wait for transaction to complete
   */
  private waitForTx(tx: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(new Error('Transaction aborted'))
    })
  }
}

/**
 * Service for efficiently syncing credential branding data with state-based change detection
 *
 * Features:
 * - Incremental syncing using knownStates parameter
 * - IndexedDB persistence for large data storage (hundreds of MB)
 * - Event-driven reactivity for UI updates
 * - Automatic cleanup of deleted brandings
 * - Version management for storage schema changes
 * - Graceful fallback when API doesn't support knownStates
 *
 * @example
 * ```typescript
 * const brandingSync = BrandingSyncService.getInstance()
 *
 * // Subscribe to changes
 * brandingSync.on('updated', (brandings) => {
 *   console.log(`Cache updated: ${brandings.length} brandings`)
 * })
 *
 * // Initial sync - gets all brandings
 * const result = await brandingSync.sync()
 * console.log(`Loaded ${result.allBrandings.length} brandings`)
 *
 * // Later syncs - only get changes
 * const updates = await brandingSync.sync()
 * if (updates.changedBrandings.length > 0) {
 *   console.log(`${updates.changedBrandings.length} brandings updated`)
 * }
 * ```
 */
export class BrandingSyncService extends EventEmitter {
  private static instance: BrandingSyncService | null = null

  private knownStates: Record<string, string> = {}
  private brandings: Map<string, ICredentialBranding> = new Map()
  private lastSyncTimestamp: Date | null = null
  private config: Required<IBrandingSyncConfig>
  private db: BrandingIndexedDB
  private initPromise: Promise<void>
  private isSyncing = false

  private constructor(config?: IBrandingSyncConfig) {
    super() // Initialize EventEmitter

    this.config = {
      enablePersistence: config?.enablePersistence ?? true,
      maxCacheAge: config?.maxCacheAge ?? 24 * 60 * 60 * 1000, // 24 hours
      logger: config?.logger ?? console, // Default to console
    }

    this.db = new BrandingIndexedDB()
    this.initPromise = this.initialize()
  }

  /**
   * Initialize the service (load from IndexedDB)
   */
  private async initialize(): Promise<void> {
    if (!this.config.enablePersistence) {
      return
    }
    try {
      // Check version compatibility
      const storedVersion = await this.db.loadMetadata<number>(METADATA_KEYS.VERSION)
      if (storedVersion !== DB_VERSION) {
        this.config.logger.info?.(`[BrandingSyncService] Storage version mismatch (${storedVersion} vs ${DB_VERSION}), clearing cache`)
        await this.clearCache()
        await this.db.saveMetadata(METADATA_KEYS.VERSION, DB_VERSION)
        return
      }

      // Load data in parallel
      const [brandings, stateMap, lastSyncStr] = await Promise.all([
        this.db.loadBrandings(),
        this.db.loadMetadata<Record<string, string>>(METADATA_KEYS.STATE_MAP),
        this.db.loadMetadata<string>(METADATA_KEYS.LAST_SYNC),
      ])

      // Deserialize and populate cache
      if (brandings && brandings.length > 0) {
        this.brandings = new Map(brandings.map(b => [b.id, this.deserializeBranding(b)]))
      }

      if (stateMap) {
        this.knownStates = stateMap
      }

      if (lastSyncStr) {
        this.lastSyncTimestamp = new Date(lastSyncStr)
      }

      this.config.logger.debug?.(`[BrandingSyncService] Loaded ${this.brandings.size} brandings from IndexedDB`)

      // Log storage stats
      const estimate = await this.db.getStorageEstimate()
      if (estimate.usage > 0) {
        const usageMB = (estimate.usage / 1024 / 1024).toFixed(2)
        const quotaMB = (estimate.quota / 1024 / 1024).toFixed(2)
        const percent = estimate.quota > 0 ? ((estimate.usage / estimate.quota) * 100).toFixed(1) : '0'
        this.config.logger.debug?.(`[BrandingSyncService] Storage: ${usageMB}MB / ${quotaMB}MB (${percent}%)`)
      }

      // Notify listeners that initial data is loaded
      this.emitChange()
    } catch (error) {
      this.config.logger.error('[BrandingSyncService] Failed to initialize from IndexedDB:', error)
      // Fallback: start with empty cache
      await this.clearCache()
    }
  }

  /**
   * Get or create singleton instance
   */
  public static getInstance(config?: IBrandingSyncConfig): BrandingSyncService {
    if (!BrandingSyncService.instance) {
      BrandingSyncService.instance = new BrandingSyncService(config)
    }
    return BrandingSyncService.instance
  }

  /**
   * Reset singleton instance (useful for testing or configuration changes)
   */
  public static resetInstance(): void {
    if (BrandingSyncService.instance) {
      BrandingSyncService.instance.removeAllListeners()
      BrandingSyncService.instance = null
    }
  }

  /**
   * Perform a sync operation to fetch credential brandings
   *
   * @param force - Force a full sync even if cache is valid
   * @returns Sync result with all, changed, and deleted brandings
   */
  public async sync(force: boolean = false): Promise<ISyncResult> {
    // Prevent concurrent syncs
    if (this.isSyncing) {
      throw new Error('Sync already in progress')
    }

    // Wait for initialization to complete
    await this.initPromise

    this.isSyncing = true

    try {
      const shouldForceFullSync = force || this.shouldPerformFullSync()

      if (shouldForceFullSync || this.brandings.size === 0) {
        console.log('== performFullSync')

        return await this.performFullSync()
      } else {
        console.log('== performIncrementalSync')

        return await this.performIncrementalSync()
      }
    } catch (error) {
      this.config.logger.error('[BrandingSyncService] Sync failed:', error)
      throw error
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * Get a specific branding by ID from the cache
   */
  public getBrandingById(id: string): ICredentialBranding | undefined {
    return this.brandings.get(id)
  }

  /**
   * Get all brandings from the cache
   */
  public getAllBrandings(): ICredentialBranding[] {
    return Array.from(this.brandings.values())
  }

  /**
   * Get brandings filtered by vcHash
   */
  public getBrandingsByVcHash(vcHash: string): ICredentialBranding[] {
    return this.getAllBrandings().filter(b => b.vcHash === vcHash)
  }

  /**
   * Get brandings filtered by issuerCorrelationId
   */
  public getBrandingsByIssuer(issuerCorrelationId: string): ICredentialBranding[] {
    return this.getAllBrandings().filter(b => b.issuerCorrelationId === issuerCorrelationId)
  }

  /**
   * Clear all cached data and reset state
   */
  public async clearCache(): Promise<void> {
    this.brandings.clear()
    this.knownStates = {}
    this.lastSyncTimestamp = null

    if (this.config.enablePersistence) {
      await this.db.clearAll()
    }

    this.emitChange()
    this.config.logger.info?.('[BrandingSyncService] Cache cleared')
  }

  /**
   * Get current cache statistics including storage usage
   */
  public async getCacheStats(): Promise<{
    brandingCount: number
    lastSync: Date | null
    cacheAge: number | null
    storageUsage?: number
    storageQuota?: number
    storageUsagePercent?: number
  }> {
    const cacheAge = this.lastSyncTimestamp ? Date.now() - this.lastSyncTimestamp.getTime() : null

    const stats: any = {
      brandingCount: this.brandings.size,
      lastSync: this.lastSyncTimestamp,
      cacheAge,
    }

    // Get storage estimate
    try {
      const estimate = await this.db.getStorageEstimate()
      stats.storageUsage = estimate.usage
      stats.storageQuota = estimate.quota
      stats.storageUsagePercent = estimate.quota > 0 ? (estimate.usage / estimate.quota) * 100 : 0
    } catch (error) {
      this.config.logger.warn?.('[BrandingSyncService] Failed to get storage estimate:', error)
    }

    return stats
  }

  /**
   * Perform a full sync - fetch all brandings without knownStates
   */
  private async performFullSync(): Promise<ISyncResult> {
    this.config.logger.debug?.('[BrandingSyncService] Performing full sync...')

    const startTime = Date.now()
    const allBrandings = await this.fetchAllBrandings()
    const duration = Date.now() - startTime

    // Build new state map
    const newStateMap: Record<string, string> = {}
    const newBrandingsMap = new Map<string, ICredentialBranding>()

    allBrandings.forEach(branding => {
      newBrandingsMap.set(branding.id, branding)
      newStateMap[branding.id] = branding.state
    })

    // Detect deletions by comparing old and new IDs
    const oldIds = new Set(this.brandings.keys())
    const newIds = new Set(allBrandings.map(b => b.id))
    const deletedIds = Array.from(oldIds).filter(id => !newIds.has(id))

    // Update internal state
    this.brandings = newBrandingsMap
    this.knownStates = newStateMap
    this.lastSyncTimestamp = new Date()

    await this.persist()
    this.emitChange()

    this.config.logger.debug?.(`[BrandingSyncService] Full sync completed: ${allBrandings.length} brandings in ${duration}ms`)
    if (deletedIds.length > 0) {
      this.config.logger.debug?.(`[BrandingSyncService] Detected ${deletedIds.length} deleted brandings`)
    }

    // Log storage stats
    const stats = await this.getCacheStats()
    if (stats.storageUsage !== undefined) {
      const usageMB = (stats.storageUsage / 1024 / 1024).toFixed(2)
      const quotaMB = ((stats.storageQuota || 0) / 1024 / 1024).toFixed(2)
      this.config.logger.debug?.(`[BrandingSyncService] Storage: ${usageMB}MB / ${quotaMB}MB (${stats.storageUsagePercent?.toFixed(1)}%)`)
    }

    return {
      allBrandings,
      changedBrandings: allBrandings, // In full sync, everything is "new" to this operation
      deletedIds,
      fullSync: true,
      timestamp: this.lastSyncTimestamp,
    }
  }

  /**
   * Perform an incremental sync - only fetch changed brandings
   */
  private async performIncrementalSync(): Promise<ISyncResult> {
    this.config.logger.debug?.('[BrandingSyncService] Performing incremental sync with', Object.keys(this.knownStates).length, 'known states...')
    console.log('== performIncrementalSync')

    const startTime = Date.now()

    // Call API with knownStates
    const args: IGetCredentialBrandingArgs = {
      knownStates: this.knownStates,
    }

    const fetchedBrandings = await getAgent().ibGetCredentialBranding(args)
    const brandingsWithState = this.ensureState(fetchedBrandings)
    const duration = Date.now() - startTime

    // Filter to only actually changed brandings
    // (API might not support knownStates and return everything)
    const actuallyChanged: ICredentialBranding[] = []

    for (const b of brandingsWithState) {
      const knownState = this.knownStates[b.id]
      if (knownState !== b.state) {
        actuallyChanged.push(b)
        this.brandings.set(b.id, b)
        this.knownStates[b.id] = b.state
      }
    }

    if (actuallyChanged.length === 0) {
      this.config.logger.debug?.(`[BrandingSyncService] Incremental sync completed: No changes in ${duration}ms`)
      return {
        allBrandings: this.getAllBrandings(),
        changedBrandings: [],
        deletedIds: [],
        fullSync: false,
        timestamp: this.lastSyncTimestamp || new Date(),
      }
    }

    // Update timestamp and persist
    this.lastSyncTimestamp = new Date()
    await this.persist()
    this.emitChange()

    this.config.logger.debug?.(`[BrandingSyncService] Incremental sync completed: ${actuallyChanged.length} changed brandings in ${duration}ms`)

    return {
      allBrandings: this.getAllBrandings(),
      changedBrandings: actuallyChanged,
      deletedIds: [], // Incremental sync doesn't detect deletions unless API supports it explicitly
      fullSync: false,
      timestamp: this.lastSyncTimestamp,
    }
  }

  /**
   * Fetch all brandings from the agent (without knownStates)
   */
  private async fetchAllBrandings(): Promise<ICredentialBranding[]> {
    try {
      const brandings = await getAgent().ibGetCredentialBranding({})
      return this.ensureState(brandings)
    } catch (error) {
      this.config.logger.error('[BrandingSyncService] Failed to fetch all brandings:', error)
      throw error
    }
  }

  /**
   * Ensure all brandings have a state field
   * Computes state from lastUpdatedAt if not present (fallback)
   */
  private ensureState(brandings: ICredentialBranding[]): ICredentialBranding[] {
    return brandings.map(b => {
      if (b.state && typeof b.state === 'string') {
        return b
      }

      // Fallback: compute state from lastUpdatedAt timestamp
      const timestamp = b.lastUpdatedAt instanceof Date ? b.lastUpdatedAt.getTime() : new Date(b.lastUpdatedAt).getTime()

      return {
        ...b,
        state: timestamp.toString(36),
      }
    })
  }

  /**
   * Check if a full sync should be performed
   */
  private shouldPerformFullSync(): boolean {
    if (!this.lastSyncTimestamp) {
      return true
    }

    const cacheAge = Date.now() - this.lastSyncTimestamp.getTime()
    return cacheAge > this.config.maxCacheAge
  }

  /**
   * Persist current state to IndexedDB
   */
  private async persist(): Promise<void> {
    if (!this.config.enablePersistence) return

    const startTime = Date.now()

    try {
      // Save metadata and brandings in parallel
      await Promise.all([
        this.db.saveBrandings(this.getAllBrandings()),
        this.db.saveMetadata(METADATA_KEYS.STATE_MAP, this.knownStates),
        this.db.saveMetadata(METADATA_KEYS.LAST_SYNC, this.lastSyncTimestamp?.toISOString()),
        this.db.saveMetadata(METADATA_KEYS.VERSION, DB_VERSION),
      ])

      const duration = Date.now() - startTime
      this.config.logger.debug?.(`[BrandingSyncService] Persisted ${this.brandings.size} brandings in ${duration}ms`)
    } catch (error) {
      this.config.logger.error('[BrandingSyncService] Failed to persist to IndexedDB:', error)
      throw error
    }
  }

  /**
   * Emit change event to notify listeners
   */
  private emitChange(): void {
    this.emit('updated', this.getAllBrandings())
  }

  /**
   * Deserialize a branding object from storage (convert date strings back to Date objects)
   */
  private deserializeBranding(branding: any): ICredentialBranding {
    // Helper to safely convert string/Date to Date
    const toDate = (d: string | Date) => (d instanceof Date ? d : new Date(d))

    return {
      ...branding,
      createdAt: toDate(branding.createdAt),
      lastUpdatedAt: toDate(branding.lastUpdatedAt),
      localeBranding: Array.isArray(branding.localeBranding)
        ? branding.localeBranding.map((l: any) => ({
            ...l,
            createdAt: toDate(l.createdAt),
            lastUpdatedAt: toDate(l.lastUpdatedAt),
          }))
        : [],
    }
  }
}

/**
 * Production-ready React hook for using BrandingSync in components
 *
 * This hook subscribes to the service's 'updated' event and triggers re-renders
 * when the branding cache changes.
 *
 * @example
 * ```typescript
 * function CredentialsList() {
 *   const { brandings, sync, service } = useBrandingSync()
 *
 *   useEffect(() => {
 *     sync() // Initial sync
 *   }, [sync])
 *
 *   // Get brandings for specific credential
 *   const credentialBrandings = service.getBrandingsByVcHash('credential-hash')
 *
 *   return <div>{brandings.length} brandings loaded</div>
 * }
 * ```
 */
export function useBrandingSync(config?: IBrandingSyncConfig) {
  const service = BrandingSyncService.getInstance(config)
  const [brandings, setBrandings] = useState<ICredentialBranding[]>(service.getAllBrandings())

  useEffect(() => {
    // Handler for updates
    const handleUpdate = (data: ICredentialBranding[]) => {
      setBrandings([...data]) // Create new array reference to force React render
    }

    // Subscribe to updates
    service.on('updated', handleUpdate)

    // Get initial state (in case it loaded while component was mounting)
    setBrandings(service.getAllBrandings())

    // Cleanup
    return () => {
      service.off('updated', handleUpdate)
    }
  }, [service])

  return {
    brandings, // Current brandings (reactive)
    service, // Expose service for manual calls
    sync: (force?: boolean) => service.sync(force), // Convenience method
    clear: () => service.clearCache(), // Convenience method
  }
}
