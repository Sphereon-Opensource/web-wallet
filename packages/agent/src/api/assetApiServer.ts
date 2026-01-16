import { Router, Request, Response, NextFunction } from 'express'
import { TAgent } from '@veramo/core'
import { ExpressSupport } from '@sphereon/ssi-express-support'
import multer from 'multer'
import * as fs from 'fs'
import * as path from 'path'
import { TAgentTypes } from '../types'
import { ASSET_API_BASE_PATH, ASSET_BASE_URI } from '../environment-vars'
import { AssetType } from '../plugins/asset'

export interface AssetApiServerOptions {
  agent: TAgent<TAgentTypes>
  expressSupport: ExpressSupport
  opts?: {
    basePath?: string
    publicBasePath?: string
  }
}

/**
 * API Server for asset/document store operations.
 *
 * Public Endpoints (no authentication):
 * - GET /api/assets/:digestMultibase - Download public asset by digest
 *
 * Management Endpoints (authenticated):
 * - GET /assets - List all assets
 * - POST /assets - Upload new asset (multipart/form-data)
 * - GET /assets/:id - Get asset metadata by ID
 * - PUT /assets/:id - Update asset metadata
 * - DELETE /assets/:id - Delete asset (soft-delete by default)
 * - POST /assets/:id/publish - Make asset public
 * - POST /assets/:id/unpublish - Make asset private
 * - POST /assets/:id/restore - Restore soft-deleted asset
 */
export class AssetApiServer {
  private readonly agent: TAgent<TAgentTypes>
  private readonly router: Router
  private readonly publicRouter: Router
  private readonly basePath: string
  private readonly publicBasePath: string
  private readonly upload: multer.Multer

  constructor(options: AssetApiServerOptions) {
    this.agent = options.agent
    this.basePath = options.opts?.basePath ?? ASSET_API_BASE_PATH
    this.publicBasePath = options.opts?.publicBasePath ?? '/api/assets'
    this.router = Router()
    this.publicRouter = Router()

    // Configure multer for file uploads (store in memory for hash computation)
    this.upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
      },
    })

    this.setupRoutes()
    this.setupPublicRoutes()

    // Register routes with express
    const app = options.expressSupport.express

    // Public routes first (no authentication needed)
    app.use(this.publicBasePath, this.publicRouter)

    // Management routes (authentication handled by existing middleware)
    // Always register the router, using '/' as the mount point when basePath is empty
    app.use(this.basePath || '/', this.router)

    console.log(`[Asset] API server started at ${this.basePath || '/'} (management) and ${this.publicBasePath} (public)`)
  }

  private setupRoutes(): void {
    // List assets
    this.router.get('/assets', this.listAssets.bind(this))

    // Upload new asset
    this.router.post('/assets', this.upload.single('file'), this.uploadAsset.bind(this))

    // Get asset by ID
    this.router.get('/assets/:id', this.getAssetById.bind(this))

    // Update asset
    this.router.put('/assets/:id', this.updateAsset.bind(this))

    // Delete asset
    this.router.delete('/assets/:id', this.deleteAsset.bind(this))

    // Publish asset
    this.router.post('/assets/:id/publish', this.publishAsset.bind(this))

    // Unpublish asset
    this.router.post('/assets/:id/unpublish', this.unpublishAsset.bind(this))

    // Restore soft-deleted asset
    this.router.post('/assets/:id/restore', this.restoreAsset.bind(this))
  }

  private setupPublicRoutes(): void {
    // Public asset download by digest
    this.publicRouter.get('/:digestMultibase', this.downloadPublicAsset.bind(this))
  }

  // ===== Public Endpoints =====

  /**
   * GET /api/assets/:digestMultibase
   *
   * Download a public asset by its multibase digest.
   * Returns the file with appropriate Content-Type and Content-Disposition headers.
   *
   * Response codes:
   * - 200: Success, file is returned
   * - 404: Asset not found
   * - 410: Asset was deleted (Gone)
   * - 403: Asset is not public
   * - 425: Asset is not yet available (Too Early)
   * - 410: Asset has expired (Gone)
   */
  private async downloadPublicAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { digestMultibase } = req.params

      // Get asset file info and check availability
      const fileResult = await this.agent.assetGetFile({ digestMultibase })

      if (!fileResult) {
        res.status(404).json({ error: 'Asset not found' })
        return
      }

      const { asset, filePath, availability } = fileResult

      if (!availability.isAvailable) {
        switch (availability.reason) {
          case 'deleted':
            res.status(410).json({ error: 'Asset has been deleted' })
            return
          case 'not_public':
            res.status(403).json({ error: 'Asset is not public' })
            return
          case 'not_yet_available':
            res.status(425).json({
              error: 'Asset is not yet available',
              availableFrom: availability.availableFrom,
            })
            return
          case 'expired':
            res.status(410).json({
              error: 'Asset has expired',
              expiredAt: availability.availableUntil,
            })
            return
          case 'file_missing':
            res.status(404).json({ error: 'Asset file not found' })
            return
          default:
            res.status(404).json({ error: 'Asset not available' })
            return
        }
      }

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'Asset file not found' })
        return
      }

      // Set response headers
      res.setHeader('Content-Type', asset.contentType)
      res.setHeader('Content-Disposition', `attachment; filename="${asset.originalFilename || asset.filename}"`)
      res.setHeader('Content-Length', asset.fileSize.toString())
      res.setHeader('X-Asset-Digest', asset.digestMultibase)
      res.setHeader('X-Asset-Type', asset.assetType)

      // Stream the file
      const fileStream = fs.createReadStream(filePath)
      fileStream.pipe(res)
    } catch (error) {
      next(error)
    }
  }

  // ===== Management Endpoints =====

  /**
   * GET /assets
   *
   * List all assets with optional filters.
   *
   * Query parameters:
   * - assetType: Filter by asset type
   * - isPublic: Filter by public status (true/false)
   * - credentialId: Filter by linked credential ID
   * - includeDeleted: Include soft-deleted assets (true/false)
   * - limit: Maximum number of results
   * - offset: Pagination offset
   */
  private async listAssets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { assetType, isPublic, credentialId, includeDeleted, limit, offset } = req.query

      const assets = await this.agent.assetList({
        assetType: assetType as AssetType | undefined,
        isPublic: isPublic === 'true' ? true : isPublic === 'false' ? false : undefined,
        credentialId: credentialId as string | undefined,
        includeDeleted: includeDeleted === 'true',
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      })

      // Get total count for pagination
      const total = await this.agent.assetCount({
        assetType: assetType as AssetType | undefined,
        isPublic: isPublic === 'true' ? true : isPublic === 'false' ? false : undefined,
        credentialId: credentialId as string | undefined,
        includeDeleted: includeDeleted === 'true',
      })

      // Add publicUrl to each public asset
      const assetsWithUrls = assets.map(asset => ({
        ...asset,
        publicUrl: asset.isPublic ? this.getPublicUrl(asset.digestMultibase) : undefined,
      }))

      res.json({
        assets: assetsWithUrls,
        total,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : 0,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /assets
   *
   * Upload a new asset.
   *
   * Request: multipart/form-data
   * - file: The file to upload (required)
   * - assetType: Asset type (optional, inferred from content type)
   * - description: Description (optional)
   * - isPublic: Make public immediately (optional, default false)
   * - availableFrom: Start of availability window (optional, ISO date)
   * - availableUntil: End of availability window (optional, ISO date)
   * - credentialId: Link to credential (optional)
   * - metadata: JSON metadata (optional)
   */
  private async uploadAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file provided' })
        return
      }

      const {
        assetType,
        description,
        isPublic,
        availableFrom,
        availableUntil,
        credentialId,
        metadata,
      } = req.body

      const result = await this.agent.assetStore({
        fileBuffer: req.file.buffer,
        filename: req.file.originalname,
        contentType: req.file.mimetype,
        assetType: assetType as AssetType | undefined,
        description,
        isPublic: isPublic === 'true' || isPublic === true,
        availableFrom: availableFrom ? new Date(availableFrom) : undefined,
        availableUntil: availableUntil ? new Date(availableUntil) : undefined,
        credentialId,
        metadata: metadata ? (typeof metadata === 'string' ? JSON.parse(metadata) : metadata) : undefined,
      })

      res.status(201).json(result)
    } catch (error: any) {
      console.error('[Asset] Upload error:', error)
      next(error)
    }
  }

  /**
   * GET /assets/:id
   *
   * Get asset metadata by ID.
   */
  private async getAssetById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params

      const asset = await this.agent.assetGetById({ id })

      if (!asset) {
        res.status(404).json({ error: 'Asset not found' })
        return
      }

      // Include public URL if asset is public
      const publicUrl = asset.isPublic ? this.getPublicUrl(asset.digestMultibase) : undefined

      res.json({
        ...asset,
        publicUrl,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * PUT /assets/:id
   *
   * Update asset metadata.
   *
   * Request body:
   * - description: New description (optional)
   * - isPublic: Change public status (optional)
   * - availableFrom: Start of availability window (optional, null to clear)
   * - availableUntil: End of availability window (optional, null to clear)
   * - credentialId: Link to credential (optional, null to clear)
   * - metadata: JSON metadata (optional)
   * - assetType: Asset type (optional)
   */
  private async updateAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params
      const {
        description,
        isPublic,
        availableFrom,
        availableUntil,
        credentialId,
        metadata,
        assetType,
      } = req.body

      const asset = await this.agent.assetUpdate({
        id,
        description,
        isPublic,
        availableFrom: availableFrom === null ? null : availableFrom ? new Date(availableFrom) : undefined,
        availableUntil: availableUntil === null ? null : availableUntil ? new Date(availableUntil) : undefined,
        credentialId: credentialId === null ? null : credentialId,
        metadata,
        assetType: assetType as AssetType | undefined,
      })

      // Include public URL if asset is public
      const publicUrl = asset.isPublic ? this.getPublicUrl(asset.digestMultibase) : undefined

      res.json({
        ...asset,
        publicUrl,
      })
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        res.status(404).json({ error: 'Asset not found' })
        return
      }
      next(error)
    }
  }

  /**
   * DELETE /assets/:id
   *
   * Delete an asset.
   *
   * Query parameters:
   * - hardDelete: If true, permanently delete including file (default: false, soft-delete)
   */
  private async deleteAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params
      const { hardDelete } = req.query

      const deleted = await this.agent.assetDelete({
        id,
        hardDelete: hardDelete === 'true',
      })

      if (!deleted) {
        res.status(404).json({ error: 'Asset not found' })
        return
      }

      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /assets/:id/publish
   *
   * Make an asset publicly available.
   *
   * Request body:
   * - availableFrom: Start of availability window (optional, ISO date)
   * - availableUntil: End of availability window (optional, ISO date)
   */
  private async publishAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params
      const { availableFrom, availableUntil } = req.body

      const asset = await this.agent.assetPublish({
        id,
        availableFrom: availableFrom ? new Date(availableFrom) : undefined,
        availableUntil: availableUntil ? new Date(availableUntil) : undefined,
      })

      const publicUrl = this.getPublicUrl(asset.digestMultibase)

      res.json({
        ...asset,
        publicUrl,
      })
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        res.status(404).json({ error: 'Asset not found' })
        return
      }
      next(error)
    }
  }

  /**
   * POST /assets/:id/unpublish
   *
   * Make an asset private.
   */
  private async unpublishAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params

      const asset = await this.agent.assetUnpublish({ id })

      res.json(asset)
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        res.status(404).json({ error: 'Asset not found' })
        return
      }
      next(error)
    }
  }

  /**
   * POST /assets/:id/restore
   *
   * Restore a soft-deleted asset.
   */
  private async restoreAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params

      const asset = await this.agent.assetRestore({ id })

      // Include public URL if asset is public
      const publicUrl = asset.isPublic ? this.getPublicUrl(asset.digestMultibase) : undefined

      res.json({
        ...asset,
        publicUrl,
      })
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        res.status(404).json({ error: 'Asset not found' })
        return
      }
      next(error)
    }
  }

  // ===== Helper Methods =====

  /**
   * Get the public URL for an asset.
   * Uses ASSET_BASE_URI (which defaults to AGENT_BASE_URI in environment-vars).
   */
  private getPublicUrl(digestMultibase: string): string {
    return `${ASSET_BASE_URI}${this.publicBasePath}/${digestMultibase}`
  }
}
