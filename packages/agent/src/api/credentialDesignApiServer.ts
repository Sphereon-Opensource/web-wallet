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

import { Request, Response, NextFunction } from 'express'
import { BaseApiServer, BaseApiServerOptions } from './BaseApiServer'

/**
 * API Server for credential design CRUD operations.
 * Extends BaseApiServer for standardized response handling.
 */
export class CredentialDesignApiServer extends BaseApiServer {
  constructor(options: BaseApiServerOptions) {
    super(options, '/api', 'CredentialDesign')
  }

  protected setupRoutes(): void {
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
      const parsedLimit = this.parseIntQuery(limit, 100)
      const parsedOffset = this.parseIntQuery(offset, 0)

      const designs = await this.agent.credentialDesignList({
        tenantId: tenantId as string | undefined,
        limit: parsedLimit,
        offset: parsedOffset,
      })

      const total = await this.agent.credentialDesignCount({
        tenantId: tenantId as string | undefined,
      })

      this.success(res, {
        data: designs,
        total,
        limit: parsedLimit,
        offset: parsedOffset,
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
        this.notFound(res, 'Credential design not found')
        return
      }

      this.success(res, { data: design })
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
        this.badRequest(res, 'Missing required fields: name, schema, uiSchema, options')
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

      this.created(res, { data: design })
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
        this.badRequest(res, 'Missing required fields: name, schema, uiSchema, options')
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

      this.success(res, { data: design })
    } catch (error: any) {
      if (this.isNotFoundError(error) || error.code === 'NOT_FOUND') {
        this.notFound(res, 'Credential design not found')
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
        this.notFound(res, 'Credential design not found')
        return
      }

      this.noContent(res)
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
        this.badRequest(res, 'Missing required field: formId')
        return
      }

      const stepId = await this.agent.formStepGetOrCreate({ formId })

      this.success(res, { data: { id: stepId } })
    } catch (error) {
      next(error)
    }
  }
}

// Re-export the options type for convenience
export type CredentialDesignApiServerOptions = BaseApiServerOptions
