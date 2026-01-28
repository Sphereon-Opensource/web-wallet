import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { BaseApiServer, BaseApiServerOptions } from './BaseApiServer'

const BOOKING_VERIFICATION_API_BASE_PATH = process.env.BOOKING_VERIFICATION_API_BASE_PATH || '/api/booking'

/**
 * Context stored during verification flow
 */
export interface BookingVerificationContext {
  resourceId: string
  bookingId?: string
  requirementIds?: string[]
  dcqlQuery?: string
  startedAt: string
}

/**
 * API Server for booking verification using OID4VP.
 *
 * This server provides endpoints for verifying user credentials before allowing
 * resource bookings. It integrates with the existing SIOP/OID4VP infrastructure.
 *
 * Endpoints:
 * - POST /api/booking/verification/start - Start verification for a resource
 * - GET /api/booking/verification/:correlationId/status - Get verification status
 */
export class BookingVerificationApiServer extends BaseApiServer {
  /**
   * In-memory store for booking verification contexts
   * Maps correlationId -> BookingVerificationContext
   */
  private static verificationContextStore = new Map<string, BookingVerificationContext>()

  /**
   * Store for completed verifications (correlationId -> result)
   */
  private static completedVerifications = new Map<string, {
    status: 'VERIFIED' | 'FAILED' | 'EXPIRED'
    verifiedAt?: string
    error?: string
  }>()

  constructor(options: BaseApiServerOptions) {
    super(options, BOOKING_VERIFICATION_API_BASE_PATH, 'BookingVerification')
  }

  protected setupRoutes(): void {
    // Verification flow
    this.router.post('/verification/start', this.startVerification.bind(this))
    this.router.get('/verification/:correlationId/status', this.getVerificationStatus.bind(this))
  }

  /**
   * Get stored booking verification context by correlation ID
   */
  static getVerificationContext(correlationId: string): BookingVerificationContext | undefined {
    return BookingVerificationApiServer.verificationContextStore.get(correlationId)
  }

  /**
   * Mark a verification as complete
   */
  static completeVerification(
    correlationId: string,
    status: 'VERIFIED' | 'FAILED' | 'EXPIRED',
    error?: string
  ): void {
    const context = BookingVerificationApiServer.verificationContextStore.get(correlationId)
    if (!context) return

    BookingVerificationApiServer.completedVerifications.set(correlationId, {
      status,
      verifiedAt: status === 'VERIFIED' ? new Date().toISOString() : undefined,
      error,
    })

    console.log(`[BookingVerification] Verification ${correlationId} completed with status: ${status}`)
  }

  /**
   * Check if a correlation ID is a booking verification
   */
  static isBookingVerification(correlationId: string): boolean {
    return BookingVerificationApiServer.verificationContextStore.has(correlationId)
  }

  // ===== Verification Endpoints =====

  /**
   * POST /api/booking/verification/start
   *
   * Starts an OID4VP verification flow for a resource booking.
   *
   * Request body:
   * {
   *   "resourceId": "uuid",
   *   "bookingId": "uuid" (optional - if verifying for existing booking)
   * }
   *
   * Response:
   * {
   *   "correlationId": "uuid",
   *   "verificationId": "uuid" (alias for correlationId),
   *   "requestUri": "openid4vp://...",
   *   "qrUri": "openid4vp://...",
   *   "deeplink": "sphereon-wallet://...",
   *   "clientId": "did:web:..."
   * }
   */
  private async startVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { resourceId, bookingId, dcqlQuery } = req.body

      if (!resourceId) {
        this.badRequest(res, 'resourceId is required')
        return
      }

      // Use provided dcqlQuery or default to 'booking'
      // The dcqlQuery should match a definition imported in agent.ts
      const queryId = dcqlQuery || 'default'

      // Check if the query exists
      let queryExists = false
      try {
        // Try to get the definition to verify it exists
        const definitions = await this.agent.pdmGetDefinitions({})
        queryExists = definitions.some(
          (def: any) => def.queryId === queryId || def.definitionId === queryId
        )
      } catch (e) {
        // If we can't check, proceed anyway and let siopCreateAuthRequestURI fail if invalid
        queryExists = true
      }

      if (!queryExists) {
        console.warn(`[BookingVerification] DCQL query '${queryId}' not found, will try anyway`)
      }

      // Generate correlation ID for this verification request
      const correlationId = uuidv4()

      // Determine base URI for OID4VP endpoints
      // Note: OID4VP_AGENT_BASE_URI should already include the path prefix (e.g., /oid4vp)
      const baseUri = process.env.OID4VP_AGENT_BASE_URI ?? `http://localhost:${process.env.PORT ?? 5010}`

      // Create the auth request URI using the existing SIOP infrastructure
      let requestUri: string
      try {
        requestUri = await this.agent.siopCreateAuthRequestURI({
          correlationId,
          queryId,
          requestByReferenceURI: `${baseUri}/siop/queries/${queryId}/auth-requests/${correlationId}`,
          responseURIType: 'response_uri',
          responseURI: `${baseUri}/siop/queries/${queryId}/auth-responses/${correlationId}`,
        })
      } catch (error: any) {
        console.error('[BookingVerification] Failed to create auth request:', error)
        this.badRequest(res, `Failed to create verification request: ${error.message}`)
        return
      }

      // Store verification context for later retrieval
      const context: BookingVerificationContext = {
        resourceId,
        bookingId,
        dcqlQuery: queryId,
        startedAt: new Date().toISOString(),
      }
      BookingVerificationApiServer.verificationContextStore.set(correlationId, context)

      // Set expiration timeout (5 minutes)
      setTimeout(() => {
        const ctx = BookingVerificationApiServer.verificationContextStore.get(correlationId)
        if (ctx && !BookingVerificationApiServer.completedVerifications.has(correlationId)) {
          BookingVerificationApiServer.completeVerification(correlationId, 'EXPIRED')
          BookingVerificationApiServer.verificationContextStore.delete(correlationId)
        }
      }, 5 * 60 * 1000)

      // Get client ID (the verifier's DID)
      // Try to extract from agent configuration
      let clientId = process.env.DEFAULT_DID || 'did:web:localhost'
      try {
        const identifiers = await this.agent.didManagerFind()
        if (identifiers.length > 0) {
          clientId = identifiers[0].did
        }
      } catch (e) {
        console.warn('[BookingVerification] Could not get DID, using default')
      }

      // Build deeplink for mobile wallet apps
      const walletScheme = process.env.WALLET_DEEPLINK_SCHEME || 'sphereon-wallet'
      const deeplink = `${walletScheme}://openid4vp?request_uri=${encodeURIComponent(
        `${baseUri}/siop/queries/${queryId}/auth-requests/${correlationId}`
      )}`

      this.created(res, {
        correlationId,
        verificationId: correlationId, // Alias for frontend compatibility
        requestUri,
        qrUri: requestUri, // Alias for frontend compatibility
        deeplink,
        clientId,
      })
    } catch (error: any) {
      console.error('[BookingVerification] Error starting verification:', error)
      next(error)
    }
  }

  /**
   * GET /api/booking/verification/:correlationId/status
   *
   * Gets the current status of a verification request.
   *
   * Response:
   * {
   *   "verificationId": "uuid",
   *   "status": "PENDING" | "VERIFIED" | "FAILED" | "EXPIRED",
   *   "verifiedAt": "ISO date" (only if verified)
   * }
   */
  private async getVerificationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { correlationId } = req.params

      // Check if this is a known verification
      const context = BookingVerificationApiServer.verificationContextStore.get(correlationId)
      if (!context) {
        this.notFound(res, 'Verification not found')
        return
      }

      // Check if verification is complete
      const completedResult = BookingVerificationApiServer.completedVerifications.get(correlationId)
      if (completedResult) {
        this.success(res, {
          verificationId: correlationId,
          status: completedResult.status,
          verifiedAt: completedResult.verifiedAt,
          error: completedResult.error,
        })
        return
      }

      // Check SIOP auth status for pending verifications
      try {
        const authStatus = await this.agent.siopGetAuthRequestState({
          correlationId,
        })

        // Map SIOP auth state to our status
        // AuthorizationRequestStateStatus values:
        // - 'authorization_request_created' - request created, waiting for wallet
        // - 'authorization_request_retrieved' - wallet picked up request
        // - 'error' - error occurred
        // Note: VERIFIED status comes from completedVerifications store (checked above),
        // which gets updated when completeBookingVerification is called from VP response handler
        let status: 'PENDING' | 'VERIFIED' | 'FAILED' = 'PENDING'

        const authState = authStatus?.status
        if (authState === 'error') {
          status = 'FAILED'
          const errorMessage = authStatus?.error?.message || 'Verification failed'
          BookingVerificationApiServer.completeVerification(correlationId, 'FAILED', errorMessage)
        }
        // For 'authorization_request_created' and 'authorization_request_retrieved', stay PENDING

        this.success(res, {
          verificationId: correlationId,
          status,
        })
      } catch (e: any) {
        // If we can't get auth status, return pending
        this.success(res, {
          verificationId: correlationId,
          status: 'PENDING',
        })
      }
    } catch (error) {
      next(error)
    }
  }
}

// Re-export the options type for convenience
export type BookingVerificationApiServerOptions = BaseApiServerOptions
