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
    jwt({token, trigger, session, account}) {
      if (trigger === 'update') token.name = session.user.name
      if (account?.provider === 'keycloak') {
        token.accessToken = account.access_token

        // Extract roles from the access token
        if (account.access_token) {
          const tokenPayload = decodeJwtPayload(account.access_token)
          token.oidcRoles = extractRolesFromToken(tokenPayload)
        }
      }
      return token
    },
    async session({session, token}) {
      if (token?.accessToken) {
        session.accessToken = token.accessToken
      }
      if (token?.oidcRoles) {
        session.oidcRoles = token.oidcRoles
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
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    /** OIDC roles extracted from the access token */
    oidcRoles?: string[]
  }
}
