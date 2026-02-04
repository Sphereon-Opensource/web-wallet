import NextAuth, {NextAuthConfig} from 'next-auth'
import 'next-auth/jwt'

import Keycloak from 'next-auth/providers/keycloak'

const nextAuthUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

const isIP = (url: string) => {
  const hostname = new URL(url).hostname
  return /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/.test(hostname)
}
const determineDomain = (url: string) => {
  const hostname = new URL(url).hostname
  const domain = hostname.split('.')
  if (domain.length === 4 && isIP(url)) {
    return hostname
  }
  return domain
    .slice(0)
    .slice(-(domain.length === 4 ? 3 : 2))
    .join('.')
}

const useSecureCookies = nextAuthUrl?.startsWith('https://')
const cookiePrefix = useSecureCookies ? '__Secure-' : ''
const hostName = determineDomain(nextAuthUrl!)
const isIp = isIP(nextAuthUrl!)
const isIpOrLocalhost = isIp || hostName.toLowerCase() === 'localhost'

/**
 * Extracts roles from an OIDC access token payload.
 * Supports multiple OIDC role claim locations:
 * - Keycloak: realm_access.roles, resource_access.{client}.roles
 * - Generic OIDC: roles, groups claims
 *
 * @param tokenPayload - Decoded JWT payload from access token
 * @returns Array of role strings
 */
function extractRolesFromToken(tokenPayload: Record<string, unknown> | undefined): string[] {
  if (!tokenPayload) return []

  const roles: string[] = []

  // Keycloak realm roles
  const realmAccess = tokenPayload?.realm_access as {roles?: string[]} | undefined
  if (realmAccess?.roles && Array.isArray(realmAccess.roles)) {
    roles.push(...realmAccess.roles)
  }

  // Keycloak client roles (using OIDC_CLIENT_ID)
  const clientId = process.env.OIDC_CLIENT_ID
  if (clientId) {
    const resourceAccess = tokenPayload?.resource_access as Record<string, {roles?: string[]}> | undefined
    if (resourceAccess?.[clientId]?.roles && Array.isArray(resourceAccess[clientId].roles)) {
      roles.push(...resourceAccess[clientId].roles)
    }
  }

  // Generic OIDC: roles claim
  if (tokenPayload?.roles) {
    const tokenRoles = tokenPayload.roles
    if (Array.isArray(tokenRoles)) {
      roles.push(...tokenRoles)
    }
  }

  // Generic OIDC: groups claim
  if (tokenPayload?.groups) {
    const groups = tokenPayload.groups
    if (Array.isArray(groups)) {
      roles.push(...groups)
    }
  }

  // Return unique roles
  return [...new Set(roles)]
}

/**
 * Decodes a JWT token payload (without verification - verification is done by the OIDC provider)
 */
function decodeJwtPayload(token: string): Record<string, unknown> | undefined {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return undefined
    const payload = parts[1]
    const decoded = Buffer.from(payload, 'base64').toString('utf-8')
    return JSON.parse(decoded)
  } catch {
    return undefined
  }
}

/**
 * Refreshes an access token using the refresh token
 */
async function refreshAccessToken(token: {
  accessToken?: string
  refreshToken?: string
  accessTokenExpires?: number
  oidcRoles?: string[]
  error?: string
  [key: string]: unknown
}): Promise<typeof token> {
  try {
    const issuer = process.env.OIDC_ISSUER as string
    const tokenEndpoint = `${issuer}/protocol/openid-connect/token`

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.OIDC_CLIENT_ID as string,
        client_secret: process.env.OIDC_CLIENT_SECRET as string,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken as string,
      }),
    })

    const refreshedTokens = await response.json()

    if (!response.ok) {
      console.error('[auth] Token refresh failed:', refreshedTokens)
      throw refreshedTokens
    }

    const newAccessToken = refreshedTokens.access_token
    const tokenPayload = decodeJwtPayload(newAccessToken)

    return {
      ...token,
      accessToken: newAccessToken,
      accessTokenExpires: Date.now() + (refreshedTokens.expires_in ?? 300) * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      oidcRoles: extractRolesFromToken(tokenPayload),
      error: undefined,
    }
  } catch (error) {
    console.error('[auth] Error refreshing access token:', error)
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    }
  }
}

export const authOptions: NextAuthConfig = {
  // Configure one or more authentication providers
  providers: [
    Keycloak({
      clientId: process.env.OIDC_CLIENT_ID as string,
      clientSecret: process.env.OIDC_CLIENT_SECRET as string,
      issuer: process.env.OIDC_ISSUER as string,
      wellKnown: `${process.env.OIDC_ISSUER}/.well-known/openid-configuration`,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name ?? profile.preferred_username,
          email: profile.email,
          image: process.env.OIDC_PROFILE_IMAGE as string,
        }
      },
      style: {logo: '/keycloak.svg', bg: '#fff', text: '#000'},
    }),
  ],
  debug: true,
  secret: `UItTuD1HcGXIj8ZfHUswhYdNd40Lc325R8VlxQPUoR0=`,
  useSecureCookies: useSecureCookies,
  callbacks: {
    async jwt({token, trigger, session, account}) {
      if (trigger === 'update') {
        token.name = session.user.name
      }

      // Initial sign in
      if (account?.provider === 'keycloak') {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        // expires_at is in seconds, convert to milliseconds
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : Date.now() + 300 * 1000

        // Extract roles from the access token
        if (account.access_token) {
          const tokenPayload = decodeJwtPayload(account.access_token)
          token.oidcRoles = extractRolesFromToken(tokenPayload)
        }
        return token
      }

      // Return previous token if the access token has not expired yet
      // Refresh 60 seconds before expiry to avoid edge cases
      const expiresAt = token.accessTokenExpires as number | undefined
      if (expiresAt && Date.now() < expiresAt - 60 * 1000) {
        return token
      }

      // Access token has expired, try to refresh it
      if (token.refreshToken) {
        return await refreshAccessToken(token as Parameters<typeof refreshAccessToken>[0])
      }

      return token
    },
    async session({session, token}) {
      if (token?.accessToken) {
        session.accessToken = token.accessToken as string
      }
      if (token?.oidcRoles) {
        session.oidcRoles = token.oidcRoles as string[]
      }
      if (token?.error) {
        session.error = token.error as string
      }
      return session
    },
  },

  /*
    cookies: {
      sessionToken: {
        name: `${cookiePrefix}next-auth.session-token`,
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: useSecureCookies,
          domain: isIpOrLocalhost ? hostName : "." + hostName, // add a . in front so that subdomains are included
        },
      },

      callbackUrl: {
        name: `${cookiePrefix}next-auth.callback-url`,
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: useSecureCookies,
          domain: isIpOrLocalhost ? hostName : "." + hostName, // add a . in front so that subdomains are included
        },
      },

      csrfToken: {
        name: `${cookiePrefix}next-auth.csrf-token`,
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: false,
          domain: isIpOrLocalhost ? hostName : "." + hostName, // add a . in front so that subdomains are included
        },
      },
    }*/
}
export const {auth, handlers, signIn, signOut} = NextAuth(authOptions)

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    /** OIDC roles extracted from the access token */
    oidcRoles?: string[]
    /** Error from token refresh */
    error?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    /** Refresh token for obtaining new access tokens */
    refreshToken?: string
    /** Timestamp when the access token expires */
    accessTokenExpires?: number
    /** OIDC roles extracted from the access token */
    oidcRoles?: string[]
    /** Error from token refresh */
    error?: string
  }
}
