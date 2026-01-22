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

import { Router, Request, Response, NextFunction } from 'express'
import { TAgent } from '@veramo/core'
import { ExpressSupport } from '@sphereon/ssi-express-support'
import { TAgentTypes } from '../types'

export interface FormsApiServerOptions {
  agent: TAgent<TAgentTypes>
  expressSupport: ExpressSupport
  opts?: {
    basePath?: string
  }
}

/**
 * API Server for form definition read operations.
 */
export class FormsApiServer {
  private readonly agent: TAgent<TAgentTypes>
  private readonly router: Router
  private readonly basePath: string

  constructor(options: FormsApiServerOptions) {
    this.agent = options.agent
    this.basePath = options.opts?.basePath ?? '/api'
    this.router = Router()

    this.setupRoutes()

    // Register routes with express
    const app = options.expressSupport.express
    app.use(this.basePath, this.router)

    console.log(`[Forms] API server started at ${this.basePath}/forms`)
  }

  private setupRoutes(): void {
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
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      })

      res.json({ data: forms })
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
        res.status(404).json({ error: 'Form definition not found' })
        return
      }

      res.json({ data: form })
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
        res.status(404).json({ error: 'Form definition not found' })
        return
      }

      res.json({ data: form })
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
        res.status(404).json({ error: 'Form step not found' })
        return
      }

      res.json({ data: formStep })
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

      res.json({ data: schemas })
    } catch (error) {
      next(error)
    }
  }
}
