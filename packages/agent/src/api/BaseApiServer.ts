/**
 * Base API Server
 *
 * Provides common utilities and response helpers for API servers.
 * All API servers can extend this class to inherit standardized response methods.
 */

import { Router, Request, Response, NextFunction, Express } from 'express'
import { TAgent } from '@veramo/core'
import { ExpressSupport } from '@sphereon/ssi-express-support'
import { TAgentTypes } from '../types'

/**
 * Standard options interface for API server constructors.
 */
export interface BaseApiServerOptions {
  agent: TAgent<TAgentTypes>
  expressSupport: ExpressSupport
  opts?: {
    basePath?: string
  }
}

/**
 * Standard error response structure.
 */
export interface ApiErrorResponse {
  error: string
  details?: unknown
}

/**
 * Standard paginated list response structure.
 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit?: number
  offset?: number
}

/**
 * Abstract base class for API servers.
 *
 * Provides:
 * - Standardized response helper methods (notFound, badRequest, conflict, etc.)
 * - Common constructor pattern for setting up routes
 * - Agent and router access for subclasses
 *
 * @example
 * ```typescript
 * export class MyApiServer extends BaseApiServer {
 *   constructor(options: BaseApiServerOptions) {
 *     super(options, '/api', 'MyApi')
 *   }
 *
 *   protected setupRoutes(): void {
 *     this.router.get('/items', this.listItems.bind(this))
 *   }
 *
 *   private async listItems(req: Request, res: Response, next: NextFunction) {
 *     try {
 *       const items = await this.agent.getItems()
 *       this.success(res, items)
 *     } catch (error) {
 *       next(error)
 *     }
 *   }
 * }
 * ```
 */
export abstract class BaseApiServer {
  protected readonly agent: TAgent<TAgentTypes>
  protected readonly router: Router
  protected readonly basePath: string
  protected readonly serverName: string

  /**
   * Create a new API server.
   *
   * @param options - Server configuration options
   * @param defaultBasePath - Default base path if not specified in options
   * @param serverName - Name for logging purposes
   */
  constructor(
    options: BaseApiServerOptions,
    defaultBasePath: string,
    serverName: string
  ) {
    this.agent = options.agent
    this.basePath = options.opts?.basePath ?? defaultBasePath
    this.serverName = serverName
    this.router = Router()

    this.setupRoutes()

    // Register routes with express
    const app = options.expressSupport.express
    this.registerRoutes(app)

    console.log(`[${this.serverName}] API server started at ${this.basePath}`)
  }

  /**
   * Set up route handlers. Override this in subclasses.
   */
  protected abstract setupRoutes(): void

  /**
   * Register routes with Express app. Override for custom registration logic.
   */
  protected registerRoutes(app: Express): void {
    // Use '/' as mount point when basePath is empty to avoid errors
    app.use(this.basePath || '/', this.router)
  }

  // ===== Success Response Helpers =====

  /**
   * Send a successful JSON response.
   * @param res - Express response object
   * @param data - Data to send
   * @param status - HTTP status code (default: 200)
   */
  protected success<T>(res: Response, data: T, status = 200): void {
    res.status(status).json(data)
  }

  /**
   * Send a 201 Created response with the created resource.
   * @param res - Express response object
   * @param data - Created resource data
   */
  protected created<T>(res: Response, data: T): void {
    res.status(201).json(data)
  }

  /**
   * Send a 204 No Content response (typically for successful DELETE).
   * @param res - Express response object
   */
  protected noContent(res: Response): void {
    res.status(204).send()
  }

  // ===== Error Response Helpers =====

  /**
   * Send a 404 Not Found response.
   * @param res - Express response object
   * @param message - Error message (default: 'Not found')
   */
  protected notFound(res: Response, message = 'Not found'): void {
    res.status(404).json({ error: message })
  }

  /**
   * Send a 400 Bad Request response.
   * @param res - Express response object
   * @param message - Error message describing what's wrong with the request
   */
  protected badRequest(res: Response, message: string): void {
    res.status(400).json({ error: message })
  }

  /**
   * Send a 409 Conflict response (typically for duplicate resources).
   * @param res - Express response object
   * @param message - Error message (default: 'Resource already exists')
   */
  protected conflict(res: Response, message = 'Resource already exists'): void {
    res.status(409).json({ error: message })
  }

  /**
   * Send a 403 Forbidden response.
   * @param res - Express response object
   * @param message - Error message (default: 'Forbidden')
   */
  protected forbidden(res: Response, message = 'Forbidden'): void {
    res.status(403).json({ error: message })
  }

  /**
   * Send a 410 Gone response (resource was deleted or expired).
   * @param res - Express response object
   * @param message - Error message
   * @param details - Optional additional details
   */
  protected gone(res: Response, message: string, details?: unknown): void {
    const response: ApiErrorResponse = { error: message }
    if (details !== undefined) {
      response.details = details
    }
    res.status(410).json(response)
  }

  /**
   * Send a 425 Too Early response (resource not yet available).
   * @param res - Express response object
   * @param message - Error message
   * @param availableFrom - When the resource will be available
   */
  protected tooEarly(res: Response, message: string, availableFrom?: Date | string): void {
    res.status(425).json({
      error: message,
      ...(availableFrom && { availableFrom }),
    })
  }

  /**
   * Send a 500 Internal Server Error response.
   * @param res - Express response object
   * @param message - Error message (default: 'Internal server error')
   */
  protected serverError(res: Response, message = 'Internal server error'): void {
    res.status(500).json({ error: message })
  }

  /**
   * Send a 502 Bad Gateway response (upstream service failure).
   * @param res - Express response object
   * @param message - Error message
   * @param details - Optional additional details (like endpoint, hash, etc.)
   */
  protected badGateway(res: Response, message: string, details?: Record<string, unknown>): void {
    res.status(502).json({ error: message, ...details })
  }

  // ===== Error Handling Helpers =====

  /**
   * Check if an error message indicates a "not found" condition.
   * @param error - Error to check
   * @returns true if the error indicates not found
   */
  protected isNotFoundError(error: unknown): boolean {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase()
      return msg.includes('not found') || msg.includes('notfound')
    }
    return false
  }

  /**
   * Check if an error message indicates a duplicate/conflict condition.
   * @param error - Error to check
   * @returns true if the error indicates a conflict
   */
  protected isConflictError(error: unknown): boolean {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase()
      return msg.includes('duplicate') || msg.includes('unique') || msg.includes('already exists')
    }
    return false
  }

  /**
   * Handle common error patterns and send appropriate responses.
   * Returns true if error was handled, false if it should be passed to next().
   *
   * @param error - The error to handle
   * @param res - Express response object
   * @param resourceName - Name of the resource for error messages (e.g., 'Asset', 'Inbox')
   * @returns true if error was handled
   */
  protected handleCommonError(
    error: unknown,
    res: Response,
    resourceName: string
  ): boolean {
    if (this.isNotFoundError(error)) {
      this.notFound(res, `${resourceName} not found`)
      return true
    }
    if (this.isConflictError(error)) {
      this.conflict(res, `${resourceName} already exists`)
      return true
    }
    return false
  }

  // ===== Resource Operation Helpers =====

  /**
   * Fetch a resource and automatically send 404 if not found.
   * Returns the resource if found, or null if 404 was sent.
   *
   * @param fetcher - Async function that fetches the resource
   * @param res - Express response object
   * @param resourceName - Name of the resource for error messages (e.g., 'Asset', 'Inbox')
   * @returns The resource if found, null if 404 was sent
   *
   * @example
   * ```typescript
   * const asset = await this.getResourceOrNotFound(
   *   () => this.agent.assetGetById({ id }),
   *   res,
   *   'Asset'
   * )
   * if (!asset) return // 404 already sent
   * this.success(res, asset)
   * ```
   */
  protected async getResourceOrNotFound<T>(
    fetcher: () => Promise<T | null | undefined>,
    res: Response,
    resourceName: string
  ): Promise<T | null> {
    const resource = await fetcher()
    if (!resource) {
      this.notFound(res, `${resourceName} not found`)
      return null
    }
    return resource
  }

  /**
   * Delete a resource and automatically send 404 if not found, or 204 on success.
   * Returns true if deleted, false if 404 was sent.
   *
   * @param deleter - Async function that deletes the resource (should return boolean)
   * @param res - Express response object
   * @param resourceName - Name of the resource for error messages
   * @returns true if deleted and 204 sent, false if 404 was sent
   *
   * @example
   * ```typescript
   * const deleted = await this.deleteResourceOrNotFound(
   *   () => this.agent.assetDelete({ id }),
   *   res,
   *   'Asset'
   * )
   * // Response already sent (204 or 404)
   * ```
   */
  protected async deleteResourceOrNotFound(
    deleter: () => Promise<boolean>,
    res: Response,
    resourceName: string
  ): Promise<boolean> {
    const deleted = await deleter()
    if (!deleted) {
      this.notFound(res, `${resourceName} not found`)
      return false
    }
    this.noContent(res)
    return true
  }

  /**
   * Standard pagination parameters parsed from query string.
   */
  protected getPaginationParams(query: { limit?: unknown; offset?: unknown }): {
    limit: number | undefined
    offset: number | undefined
  } {
    return {
      limit: this.parseIntQuery(query.limit),
      offset: this.parseIntQuery(query.offset, 0),
    }
  }

  // ===== Query Parameter Helpers =====

  /**
   * Parse a boolean query parameter.
   * @param value - Query parameter value
   * @returns boolean or undefined
   */
  protected parseBooleanQuery(value: unknown): boolean | undefined {
    if (value === 'true') return true
    if (value === 'false') return false
    return undefined
  }

  /**
   * Parse an integer query parameter.
   * @param value - Query parameter value
   * @param defaultValue - Default value if not provided
   * @returns parsed integer or default
   */
  protected parseIntQuery(value: unknown, defaultValue?: number): number | undefined {
    if (typeof value === 'string' && value.length > 0) {
      const parsed = parseInt(value, 10)
      return isNaN(parsed) ? defaultValue : parsed
    }
    return defaultValue
  }

  /**
   * Parse a comma-separated string query parameter into an array.
   * @param value - Query parameter value
   * @returns array of strings or undefined
   */
  protected parseArrayQuery(value: unknown): string[] | undefined {
    if (typeof value === 'string' && value.length > 0) {
      return value.split(',').map(s => s.trim()).filter(s => s.length > 0)
    }
    return undefined
  }
}
