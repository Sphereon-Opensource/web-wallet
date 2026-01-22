/**
 * API Server for Credential Design operations.
 *
 * Endpoints:
 * - GET /api/credential-designs - List with pagination
 * - GET /api/credential-designs/:id - Get by ID
 * - POST /api/credential-designs - Create
 * - PUT /api/credential-designs/:id - Update
 * - DELETE /api/credential-designs/:id - Delete
 * - POST /api/form-steps - Get or create form step
 */

import { Router, Request, Response, NextFunction } from 'express'
import { TAgent } from '@veramo/core'
import { ExpressSupport } from '@sphereon/ssi-express-support'
import { TAgentTypes } from '../types'

export interface CredentialDesignApiServerOptions {
  agent: TAgent<TAgentTypes>
  expressSupport: ExpressSupport
  opts?: {
    basePath?: string
  }
}

/**
 * API Server for credential design CRUD operations.
 */
export class CredentialDesignApiServer {
  private readonly agent: TAgent<TAgentTypes>
  private readonly router: Router
  private readonly basePath: string

  constructor(options: CredentialDesignApiServerOptions) {
    this.agent = options.agent
    this.basePath = options.opts?.basePath ?? '/api'
    this.router = Router()

    this.setupRoutes()

    // Register routes with express
    const app = options.expressSupport.express
    app.use(this.basePath, this.router)

    console.log(`[CredentialDesign] API server started at ${this.basePath}/credential-designs`)
  }

  private setupRoutes(): void {
    // List credential designs
    this.router.get('/credential-designs', this.listCredentialDesigns.bind(this))

    // Get credential design by ID
    this.router.get('/credential-designs/:id', this.getCredentialDesign.bind(this))

    // Create credential design
    this.router.post('/credential-designs', this.createCredentialDesign.bind(this))

    // Update credential design
    this.router.put('/credential-designs/:id', this.updateCredentialDesign.bind(this))

    // Delete credential design
    this.router.delete('/credential-designs/:id', this.deleteCredentialDesign.bind(this))

    // Get or create form step
    this.router.post('/form-steps', this.getOrCreateFormStep.bind(this))
  }

  /**
   * GET /api/credential-designs
   *
   * List credential designs with pagination.
   *
   * Query parameters:
   * - tenantId: Filter by tenant
   * - limit: Maximum results (default: 100)
   * - offset: Pagination offset (default: 0)
   */
  private async listCredentialDesigns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, limit, offset } = req.query

      const designs = await this.agent.credentialDesignList({
        tenantId: tenantId as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : 100,
        offset: offset ? parseInt(offset as string, 10) : 0,
      })

      const total = await this.agent.credentialDesignCount({
        tenantId: tenantId as string | undefined,
      })

      res.json({
        data: designs,
        total,
        limit: limit ? parseInt(limit as string, 10) : 100,
        offset: offset ? parseInt(offset as string, 10) : 0,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/credential-designs/:id
   *
   * Get a credential design by ID.
   */
  private async getCredentialDesign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params

      const design = await this.agent.credentialDesignGetById({ id })

      if (!design) {
        res.status(404).json({ error: 'Credential design not found' })
        return
      }

      res.json({ data: design })
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /api/credential-designs
   *
   * Create a new credential design.
   *
   * Request body:
   * - name: Display name (required)
   * - schema: JSON Schema (required)
   * - uiSchema: UI Schema (required)
   * - options: Credential format options (required)
   * - isAdvancedSchema: Boolean (optional)
   * - branding: Branding config (optional)
   * - statusListUri: Status list URI (optional)
   */
  private async createCredentialDesign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, schema, uiSchema, options, isAdvancedSchema, branding, statusListUri } = req.body

      if (!name || !schema || !uiSchema || !options) {
        res.status(400).json({ error: 'Missing required fields: name, schema, uiSchema, options' })
        return
      }

      const design = await this.agent.credentialDesignCreate({
        name,
        schema,
        uiSchema,
        options,
        isAdvancedSchema,
        branding,
        statusListUri,
      })

      res.status(201).json({ data: design })
    } catch (error: any) {
      console.error('[CredentialDesign] Create error:', error)
      next(error)
    }
  }

  /**
   * PUT /api/credential-designs/:id
   *
   * Update an existing credential design.
   *
   * Request body:
   * - name: Display name (required)
   * - schema: JSON Schema (required)
   * - uiSchema: UI Schema (required)
   * - options: Credential format options (required)
   * - isAdvancedSchema: Boolean (optional)
   * - branding: Branding config (optional)
   */
  private async updateCredentialDesign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params
      const { name, schema, uiSchema, options, isAdvancedSchema, branding } = req.body

      if (!name || !schema || !uiSchema || !options) {
        res.status(400).json({ error: 'Missing required fields: name, schema, uiSchema, options' })
        return
      }

      const design = await this.agent.credentialDesignUpdate({
        id,
        name,
        schema,
        uiSchema,
        options,
        isAdvancedSchema,
        branding,
      })

      res.json({ data: design })
    } catch (error: any) {
      if (error.code === 'NOT_FOUND' || error.message?.includes('not found')) {
        res.status(404).json({ error: 'Credential design not found' })
        return
      }
      console.error('[CredentialDesign] Update error:', error)
      next(error)
    }
  }

  /**
   * DELETE /api/credential-designs/:id
   *
   * Delete a credential design.
   */
  private async deleteCredentialDesign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params

      const deleted = await this.agent.credentialDesignDelete({ id })

      if (!deleted) {
        res.status(404).json({ error: 'Credential design not found' })
        return
      }

      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /api/form-steps
   *
   * Get or create a form step.
   *
   * Request body:
   * - formId: Form identifier (required)
   */
  private async getOrCreateFormStep(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { formId } = req.body

      if (!formId) {
        res.status(400).json({ error: 'Missing required field: formId' })
        return
      }

      const stepId = await this.agent.formStepGetOrCreate({ formId })

      res.json({ data: { id: stepId } })
    } catch (error) {
      next(error)
    }
  }
}
