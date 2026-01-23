/**
 * API Server for Forms operations.
 *
 * Endpoints:
 * - GET /api/forms - List form definitions
 * - GET /api/forms/:id - Get form definition by ID
 * - GET /api/forms/by-name/:name - Get form definition by name
 * - GET /api/form-steps/:id - Get form step by ID
 * - GET /api/form-steps/:id/schemas - Get schema definitions for a form step
 */

import { Request, Response, NextFunction } from 'express'
import { BaseApiServer, BaseApiServerOptions } from './BaseApiServer'

/**
 * API Server for form definition read operations.
 * Extends BaseApiServer for standardized response handling.
 */
export class FormsApiServer extends BaseApiServer {
  constructor(options: BaseApiServerOptions) {
    super(options, '/api', 'Forms')
  }

  protected setupRoutes(): void {
    // List form definitions
    this.router.get('/forms', this.listFormDefinitions.bind(this))

    // Get form definition by name (must come before :id to avoid conflict)
    this.router.get('/forms/by-name/:name', this.getFormDefinitionByName.bind(this))

    // Get form definition by ID
    this.router.get('/forms/:id', this.getFormDefinitionById.bind(this))

    // Get form step by ID
    this.router.get('/form-steps/:id', this.getFormStepById.bind(this))

    // Get schema definitions for a form step
    this.router.get('/form-steps/:id/schemas', this.getSchemaDefinitionsForFormStep.bind(this))
  }

  /**
   * GET /api/forms
   *
   * List form definitions with pagination.
   *
   * Query parameters:
   * - tenantId: Filter by tenant
   * - limit: Maximum results
   * - offset: Pagination offset
   */
  private async listFormDefinitions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, limit, offset } = req.query

      const forms = await this.agent.formDefinitionList({
        tenantId: tenantId as string | undefined,
        limit: this.parseIntQuery(limit),
        offset: this.parseIntQuery(offset),
      })

      this.success(res, { data: forms })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/forms/:id
   *
   * Get a form definition by ID.
   */
  private async getFormDefinitionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params

      const form = await this.agent.formDefinitionGetById({ id })

      if (!form) {
        this.notFound(res, 'Form definition not found')
        return
      }

      this.success(res, { data: form })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/forms/by-name/:name
   *
   * Get a form definition by name.
   *
   * Query parameters:
   * - tenantId: Optional tenant ID
   */
  private async getFormDefinitionByName(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name } = req.params
      const { tenantId } = req.query

      const form = await this.agent.formDefinitionGetByName({
        name,
        tenantId: tenantId as string | undefined,
      })

      if (!form) {
        this.notFound(res, 'Form definition not found')
        return
      }

      this.success(res, { data: form })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/form-steps/:id
   *
   * Get a form step by ID.
   */
  private async getFormStepById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params

      const formStep = await this.agent.formStepGetById({ id })

      if (!formStep) {
        this.notFound(res, 'Form step not found')
        return
      }

      this.success(res, { data: formStep })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/form-steps/:id/schemas
   *
   * Get schema definitions for a form step.
   */
  private async getSchemaDefinitionsForFormStep(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params

      const schemas = await this.agent.schemaDefinitionGetByFormStep({ formStepId: id })

      this.success(res, { data: schemas })
    } catch (error) {
      next(error)
    }
  }
}

// Re-export the options type for convenience
export type FormsApiServerOptions = BaseApiServerOptions
