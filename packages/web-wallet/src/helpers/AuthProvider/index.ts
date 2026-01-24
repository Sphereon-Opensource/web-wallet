import {Session} from 'next-auth'
import {AuthBindings} from '@refinedev/core'
import {signIn, signOut} from 'next-auth/react'
import {mapOidcRolesToAppRoles, shouldAllowAllWhenNoRoles, getAllRoleTypes} from '@/src/config/oidcRoleMapping'

export const getAuthProvider = (data: Session | null, status: 'authenticated' | 'unauthenticated' | 'loading'): AuthBindings => {
  return {
    login: async ({redirectPath}) => {
      await signIn('keycloak', {
        // make sure we go back to the original URL
        callbackUrl: window?.location?.href ?? '/',
        redirect: true,
      })

      return {
        success: true,
      }
    },
    logout: async () => {
      await signOut({
        redirect: true,
        callbackUrl: '/',
      })

      return {
        success: true,
      }
    },
    onError: async error => {
      console.error(error)
      return {
        error,
      }
    },
    check: async () => {
      if (status === 'unauthenticated') {
        return {
          authenticated: false,
          redirectTo: '/',
        }
      }
      return {
        authenticated: true,
      }
    },
    getPermissions: async () => {
      // Extract OIDC roles from session and map to app roles
      const oidcRoles = data?.oidcRoles ?? []
      const appRoles = mapOidcRolesToAppRoles(oidcRoles)

      // If no OIDC roles found and we should allow all roles (backward compatibility)
      if (appRoles.length === 0 && shouldAllowAllWhenNoRoles()) {
        return {
          roles: getAllRoleTypes(),
          oidcRoles: [],
        }
      }

      return {
        roles: appRoles,
        oidcRoles,
      }
    },
    getIdentity: async () => {
      if (data?.user) {
        const {user} = data
        return {
          name: user?.name,
          avatar: user?.image,
        }
      }

      return null
    },
  }
}
