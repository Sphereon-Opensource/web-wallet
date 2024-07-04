import NextAuth, {NextAuthConfig} from 'next-auth'
import 'next-auth/jwt'

import Keycloak from 'next-auth/providers/keycloak'

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

const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith('https://')
const cookiePrefix = useSecureCookies ? '__Secure-' : ''
const hostName = determineDomain(process.env.NEXTAUTH_URL!)
const isIp = isIP(process.env.NEXTAUTH_URL!)
const isIpOrLocalhost = isIp || hostName.toLowerCase() === 'localhost'

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
        return {...token, accessToken: account.access_token}
      }
      return token
    },
    async session({session, token}) {
      if (token?.accessToken) {
        session.accessToken = token.accessToken
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
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
  }
}
