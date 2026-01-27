/**
 * Utility API Server for miscellaneous operations.
 *
 * Handles simple operations that don't warrant full plugins:
 * - Configuration endpoints
 * - Party relationships (simple join table)
 * - Credential references (credentials associated with assets)
 *
 * Endpoints:
 * - GET /api/config - Get comprehensive agent configuration (public URL, paths, features)
 * - GET /api/config/service-endpoint-base-url - Get the base URL for service endpoints
 * - POST /api/party-relationships - Create party relationship
 * - GET /api/party-relationships - List relationships for a party
 * - DELETE /api/party-relationships/:leftId/:rightId - Delete relationship
 * - GET /api/credential-references - List credential references
 * - GET /api/credential-references/:assetId - Get by asset ID
 * - POST /api/credential-references - Create credential reference
 * - DELETE /api/credential-references/:id - Delete credential reference
 */

import { Router, Request, Response, NextFunction } from 'express'
import { TAgent } from '@veramo/core'
import { ExpressSupport } from '@sphereon/ssi-express-support'
import { DataSource } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'
import { TAgentTypes } from '../types'
import {
  COMPUTED_PUBLIC_BASE_URL,
  VC_API_BASE_PATH,
  DID_API_BASE_PATH,
  ASSET_PUBLIC_BASE_PATH,
  IS_INBOX_ENABLED,
  IS_OID4VCI_ENABLED,
  IS_OID4VP_ENABLED,
  IS_VC_API_ENABLED,
  EXTERNAL_HOSTNAME,
  EXTERNAL_PORT,
  AGENT_BASE_URI,
} from '../environment-vars'

export interface UtilityApiServerOptions {
  agent: TAgent<TAgentTypes>
  expressSupport: ExpressSupport
  dbConnection: Promise<DataSource>
  opts?: {
    basePath?: string
  }
}

/**
 * API Server for utility operations.
 */
export class UtilityApiServer {
  private readonly agent: TAgent<TAgentTypes>
  private readonly router: Router
  private readonly basePath: string
  private readonly dbConnection: Promise<DataSource>

  constructor(options: UtilityApiServerOptions) {
    this.agent = options.agent
    this.dbConnection = options.dbConnection
    this.basePath = options.opts?.basePath ?? '/api'
    this.router = Router()

    this.setupRoutes()

    // Register routes with express
    const app = options.expressSupport.express
    app.use(this.basePath, this.router)

    console.log(`[Utility] API server started at ${this.basePath}`)
  }

  private setupRoutes(): void {
    // Configuration
    this.router.get('/config', this.getConfig.bind(this))
    this.router.get('/config/service-endpoint-base-url', this.getServiceEndpointBaseUrl.bind(this))

    // Party Relationships
    this.router.post('/party-relationships', this.createPartyRelationship.bind(this))
    this.router.get('/party-relationships', this.listPartyRelationships.bind(this))
    this.router.delete('/party-relationships/:leftId/:rightId', this.deletePartyRelationship.bind(this))

    // Credential References
    this.router.get('/credential-references', this.listCredentialReferences.bind(this))
    this.router.get('/credential-references/by-asset/:assetId', this.getCredentialReferenceByAssetId.bind(this))
    this.router.post('/credential-references', this.createCredentialReference.bind(this))
    this.router.delete('/credential-references/:id', this.deleteCredentialReference.bind(this))
  }

  // ===== Configuration =====

  /**
   * GET /api/config
   *
   * Returns comprehensive configuration for the agent, including public base URL,
   * API paths, and feature flags. This is the single source of truth for clients
   * to determine how to communicate with the agent.
   *
   * Response:
   * - publicBaseUrl: The public-facing base URL for this agent
   * - paths: Object with API path prefixes (vcApi, didApi, oid4vci, oid4vp, assets)
   * - features: Object with feature flags (inbox, oid4vci, oid4vp, vcApi)
   */
  private async getConfig(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({
        publicBaseUrl: COMPUTED_PUBLIC_BASE_URL,
        paths: {
          vcApi: VC_API_BASE_PATH,
          didApi: DID_API_BASE_PATH,
          oid4vci: '/oid4vci',
          oid4vp: '/oid4vp',
          assets: ASSET_PUBLIC_BASE_PATH,
        },
        features: {
          inbox: IS_INBOX_ENABLED,
          oid4vci: IS_OID4VCI_ENABLED,
          oid4vp: IS_OID4VP_ENABLED,
          vcApi: IS_VC_API_ENABLED,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/config/service-endpoint-base-url
   *
   * Returns the base URL to use for service endpoints in DID documents.
   *
   * Priority:
   * 1. If EXTERNAL_HOSTNAME is set and not 'localhost', construct URL from EXTERNAL_HOSTNAME/EXTERNAL_PORT
   * 2. Otherwise return AGENT_BASE_URI
   *
   * Response:
   * - baseUrl: The base URL to use for service endpoints
   */
  private async getServiceEndpointBaseUrl(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let baseUrl: string

      // If EXTERNAL_HOSTNAME is set to something other than localhost, use it
      if (EXTERNAL_HOSTNAME && EXTERNAL_HOSTNAME !== 'localhost' && !EXTERNAL_HOSTNAME.includes('localhost')) {
        // Determine protocol: https for 443, http for other ports
        const protocol = EXTERNAL_PORT === 443 ? 'https' : 'http'
        // Include port only if not the default for the protocol
        const portSuffix = (protocol === 'https' && EXTERNAL_PORT === 443) ||
                          (protocol === 'http' && EXTERNAL_PORT === 80)
          ? ''
          : `:${EXTERNAL_PORT}`
        baseUrl = `${protocol}://${EXTERNAL_HOSTNAME}${portSuffix}`
        console.log(`[Utility] Service endpoint base URL from EXTERNAL_HOSTNAME: ${baseUrl}`)
      } else {
        // Fall back to AGENT_BASE_URI
        baseUrl = AGENT_BASE_URI
        console.log(`[Utility] Service endpoint base URL from AGENT_BASE_URI: ${baseUrl}`)
      }

      res.json({ baseUrl })
    } catch (error) {
      next(error)
    }
  }

  // ===== Party Relationships =====

  /**
   * POST /api/party-relationships
   *
   * Create a relationship between two parties.
   *
   * Request body:
   * - leftId: Party ID (required)
   * - rightId: Party ID (required)
   */
  private async createPartyRelationship(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { leftId, rightId } = req.body

      if (!leftId || !rightId) {
        res.status(400).json({ error: 'Missing required fields: leftId, rightId' })
        return
      }

      const db = await this.dbConnection

      // Check if relationship already exists
      const existing = await db.query(
        `SELECT * FROM "PartyRelationship" WHERE "left_id" = $1 AND "right_id" = $2`,
        [leftId, rightId]
      )

      if (existing && existing.length > 0) {
        res.status(409).json({ error: 'Party relationship already exists' })
        return
      }

      await db.query(
        `INSERT INTO "PartyRelationship" ("left_id", "right_id") VALUES ($1, $2)`,
        [leftId, rightId]
      )

      console.log(`[Utility] Created party relationship: ${leftId} -> ${rightId}`)
      res.status(201).json({ data: { leftId, rightId } })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/party-relationships
   *
   * List relationships for a party.
   *
   * Query parameters:
   * - partyId: Party ID to find relationships for (required)
   */
  private async listPartyRelationships(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { partyId } = req.query

      if (!partyId) {
        res.status(400).json({ error: 'Missing required query parameter: partyId' })
        return
      }

      const db = await this.dbConnection

      const result = await db.query(
        `SELECT * FROM "PartyRelationship" WHERE "left_id" = $1 OR "right_id" = $1`,
        [partyId]
      )

      res.json({ data: result })
    } catch (error) {
      next(error)
    }
  }

  /**
   * DELETE /api/party-relationships/:leftId/:rightId
   *
   * Delete a party relationship.
   */
  private async deletePartyRelationship(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { leftId, rightId } = req.params

      const db = await this.dbConnection

      const result = await db.query(
        `DELETE FROM "PartyRelationship" WHERE "left_id" = $1 AND "right_id" = $2`,
        [leftId, rightId]
      )

      if (result.rowCount === 0) {
        res.status(404).json({ error: 'Party relationship not found' })
        return
      }

      console.log(`[Utility] Deleted party relationship: ${leftId} -> ${rightId}`)
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }

  // ===== Credential References =====

  /**
   * GET /api/credential-references
   *
   * List credential references.
   *
   * Query parameters:
   * - limit: Maximum results
   * - offset: Pagination offset
   */
  private async listCredentialReferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit, offset } = req.query

      const db = await this.dbConnection

      let query = `SELECT * FROM "credential_reference" ORDER BY "id"`
      const params: unknown[] = []
      let paramIndex = 1

      if (limit) {
        query += ` LIMIT $${paramIndex++}`
        params.push(parseInt(limit as string, 10))
      }

      if (offset) {
        query += ` OFFSET $${paramIndex++}`
        params.push(parseInt(offset as string, 10))
      }

      const result = await db.query(query, params)

      res.json({ data: result })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/credential-references/by-asset/:assetId
   *
   * Get credential reference by asset ID.
   */
  private async getCredentialReferenceByAssetId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { assetId } = req.params

      const db = await this.dbConnection

      const result = await db.query(
        `SELECT * FROM "credential_reference" WHERE "asset_id" = $1`,
        [assetId]
      )

      if (!result || result.length === 0) {
        res.status(404).json({ error: 'Credential reference not found' })
        return
      }

      res.json({ data: result[0] })
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /api/credential-references
   *
   * Create a credential reference.
   *
   * Request body:
   * - credentialString: The credential JSON as string (required)
   * - assetId: Associated asset ID (optional)
   * - credentialId: Credential identifier (optional)
   */
  private async createCredentialReference(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { credentialString, assetId, credentialId } = req.body

      if (!credentialString) {
        res.status(400).json({ error: 'Missing required field: credentialString' })
        return
      }

      const db = await this.dbConnection
      const id = uuidv4()

      await db.query(
        `INSERT INTO "credential_reference" ("id", "credential_string", "asset_id", "credential_id")
         VALUES ($1, $2, $3, $4)`,
        [id, credentialString, assetId || null, credentialId || null]
      )

      console.log(`[Utility] Created credential reference: ${id}`)
      res.status(201).json({
        data: {
          id,
          credential_string: credentialString,
          asset_id: assetId || null,
          credential_id: credentialId || null,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * DELETE /api/credential-references/:id
   *
   * Delete a credential reference.
   */
  private async deleteCredentialReference(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params

      const db = await this.dbConnection

      const result = await db.query(
        `DELETE FROM "credential_reference" WHERE "id" = $1`,
        [id]
      )

      if (result.rowCount === 0) {
        res.status(404).json({ error: 'Credential reference not found' })
        return
      }

      console.log(`[Utility] Deleted credential reference: ${id}`)
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }
}
