import React, {createContext, useContext, FC, ReactNode, useMemo, useEffect} from 'react'
import {useSession} from 'next-auth/react'

/**
 * Default tenant ID used when no tenant is found in OIDC claims.
 * This should be overridden in .env.local for production.
 */
const DEFAULT_TENANT_ID = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'

/**
 * Environment variable names that may contain the tenant ID in OIDC claims.
 * Checked in order of priority.
 */
const TENANT_ID_CLAIM_NAMES = [
  'tenant_id',
  'tenantId',
  'org_id',
  'organization_id',
  'orgId',
  'tenant',
]

/**
 * Environment variable names that may contain the user ID in OIDC claims.
 * Checked in order of priority.
 */
const USER_ID_CLAIM_NAMES = ['sub', 'user_id', 'userId', 'id']

interface TenantContextType {
  /** The current tenant ID from OIDC or default */
  tenantId: string
  /** The current user ID from OIDC, or undefined if not authenticated */
  userId: string | undefined
  /** Whether the tenant ID came from OIDC claims */
  hasTenantClaim: boolean
  /** Whether the user is authenticated */
  isAuthenticated: boolean
  /** The full OIDC claims object for advanced use cases */
  claims: Record<string, any> | undefined
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

interface TenantProviderProps {
  children: ReactNode
}

/**
 * Extracts a value from claims by trying multiple possible claim names.
 */
function extractClaimValue(claims: Record<string, any> | undefined, possibleNames: string[]): string | undefined {
  if (!claims) return undefined

  for (const name of possibleNames) {
    const value = claims[name]
    if (value !== undefined && value !== null) {
      return String(value)
    }
  }

  return undefined
}

/**
 * TenantProvider extracts tenant and user information from OIDC session.
 *
 * It provides:
 * - tenantId: Extracted from OIDC claims or falls back to default
 * - userId: Extracted from OIDC 'sub' claim
 * - hasTenantClaim: Whether tenant ID was found in OIDC claims
 * - isAuthenticated: Whether user has an active session
 * - claims: Raw OIDC claims for advanced use cases
 *
 * Usage:
 * ```tsx
 * // In _app.tsx
 * <TenantProvider>
 *   <App />
 * </TenantProvider>
 *
 * // In components
 * const { tenantId, userId } = useTenant()
 * ```
 */
export const TenantProvider: FC<TenantProviderProps> = ({children}) => {
  const {data: session, status} = useSession()

  const value = useMemo<TenantContextType>(() => {
    const isAuthenticated = status === 'authenticated' && !!session

    // Get claims from session - next-auth stores claims differently based on configuration
    // Try multiple locations where claims might be stored:
    // 1. session.user (default next-auth location for user info)
    // 2. (session as any).idToken for explicit ID token if configured
    // 3. (session as any).claims for custom claims configuration
    let claims: Record<string, any> | undefined

    // Check for idToken string that needs parsing
    const sessionAny = session as any
    if (sessionAny?.idToken && typeof sessionAny.idToken === 'string') {
      claims = parseIdToken(sessionAny.idToken)
    } else if (sessionAny?.claims) {
      // Direct claims object
      claims = sessionAny.claims
    } else if (session?.user) {
      // Use user object as claims source (common next-auth pattern)
      claims = session.user as Record<string, any>
    }

    // Extract tenant ID from claims
    const tenantIdFromClaims = extractClaimValue(claims, TENANT_ID_CLAIM_NAMES)

    // Extract user ID from claims (typically 'sub' for OIDC)
    // Also check session.user.id as fallback
    const userIdFromClaims = extractClaimValue(claims, USER_ID_CLAIM_NAMES) ||
      (session?.user as any)?.id

    return {
      tenantId: tenantIdFromClaims || DEFAULT_TENANT_ID,
      userId: userIdFromClaims,
      hasTenantClaim: !!tenantIdFromClaims,
      isAuthenticated,
      claims,
    }
  }, [session, status])

  // Store access token in sessionStorage for use by data providers
  // This allows the bookingDataProvider to include the Bearer token without React context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Store access token for API calls
      const accessToken = (session as any)?.accessToken
      if (accessToken) {
        sessionStorage.setItem('accessToken', accessToken)
      } else {
        sessionStorage.removeItem('accessToken')
      }
    }
  }, [session])

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

/**
 * Hook to access tenant context.
 *
 * @throws Error if used outside TenantProvider
 */
export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext)
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}

/**
 * Parses a JWT ID token to extract claims.
 * Note: This does NOT verify the token, only decodes it.
 * Token verification should be done on the server.
 */
function parseIdToken(idToken: string): Record<string, any> | undefined {
  try {
    const parts = idToken.split('.')
    if (parts.length !== 3) {
      return undefined
    }

    // Decode the payload (second part)
    const payload = parts[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch (error) {
    console.warn('Failed to parse ID token:', error)
    return undefined
  }
}

export default TenantContext
