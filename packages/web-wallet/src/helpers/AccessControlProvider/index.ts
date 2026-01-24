import {AccessControlProvider} from '@refinedev/core'
import {RoleType} from '@sphereon/ui-components.core'

/**
 * Route-based permission configuration
 * Maps route patterns to the roles that can access them
 */
const routePermissions: Record<string, RoleType[]> = {
  // Key management - Admin only
  '/key-management': [RoleType.ADMIN],
  '/key-management/identifiers': [RoleType.ADMIN],
  '/key-management/keys': [RoleType.ADMIN],

  // Credential issuance - Issuer and Admin
  '/credentials/create': [RoleType.ISSUER, RoleType.ADMIN],
  '/credentials/designs': [RoleType.ISSUER, RoleType.ADMIN],

  // Query management - Verifier (Relying Party) and Admin
  '/query-management': [RoleType.RELYING_PARTY, RoleType.ADMIN],

  // Inbox and eInvoice - Holder and Admin
  '/inbox': [RoleType.HOLDER, RoleType.ADMIN],
  '/einvoice': [RoleType.HOLDER, RoleType.ADMIN],

  // Assets - Holder and Admin
  '/assets': [RoleType.HOLDER, RoleType.ADMIN],

  // Credentials list - All roles can view their own credentials
  '/credentials': [RoleType.HOLDER, RoleType.ISSUER, RoleType.RELYING_PARTY, RoleType.ADMIN],

  // Contacts - All roles
  '/contacts': [RoleType.HOLDER, RoleType.ISSUER, RoleType.RELYING_PARTY, RoleType.ADMIN],

  // Documents - Holder
  '/documents': [RoleType.HOLDER, RoleType.ADMIN],

  // OID4VCI/OID4VP flows - Holder
  '/oid4vci': [RoleType.HOLDER, RoleType.ADMIN],
  '/siopv2': [RoleType.HOLDER, RoleType.ADMIN],
}

/**
 * Resource-action based permission configuration
 * Maps resource:action pairs to the roles that can perform them
 */
const resourceActionPermissions: Record<string, Record<string, RoleType[]>> = {
  identifiers: {
    list: [RoleType.ADMIN],
    create: [RoleType.ADMIN],
    edit: [RoleType.ADMIN],
    delete: [RoleType.ADMIN],
    show: [RoleType.ADMIN],
  },
  keys: {
    list: [RoleType.ADMIN],
    show: [RoleType.ADMIN],
  },
  credentials: {
    list: [RoleType.HOLDER, RoleType.ISSUER, RoleType.RELYING_PARTY, RoleType.ADMIN],
    create: [RoleType.ISSUER, RoleType.ADMIN],
    show: [RoleType.HOLDER, RoleType.ISSUER, RoleType.RELYING_PARTY, RoleType.ADMIN],
  },
  credential_designs: {
    list: [RoleType.ISSUER, RoleType.ADMIN],
    create: [RoleType.ISSUER, RoleType.ADMIN],
    edit: [RoleType.ISSUER, RoleType.ADMIN],
    show: [RoleType.ISSUER, RoleType.ADMIN],
  },
  queries: {
    list: [RoleType.RELYING_PARTY, RoleType.ADMIN],
    create: [RoleType.RELYING_PARTY, RoleType.ADMIN],
    edit: [RoleType.RELYING_PARTY, RoleType.ADMIN],
    show: [RoleType.RELYING_PARTY, RoleType.ADMIN],
  },
  contacts: {
    list: [RoleType.HOLDER, RoleType.ISSUER, RoleType.RELYING_PARTY, RoleType.ADMIN],
    create: [RoleType.HOLDER, RoleType.ISSUER, RoleType.RELYING_PARTY, RoleType.ADMIN],
    show: [RoleType.HOLDER, RoleType.ISSUER, RoleType.RELYING_PARTY, RoleType.ADMIN],
  },
  assets: {
    list: [RoleType.HOLDER, RoleType.ADMIN],
    create: [RoleType.HOLDER, RoleType.ADMIN],
    show: [RoleType.HOLDER, RoleType.ADMIN],
  },
  inbox: {
    list: [RoleType.HOLDER, RoleType.ADMIN],
    show: [RoleType.HOLDER, RoleType.ADMIN],
  },
  einvoice: {
    list: [RoleType.HOLDER, RoleType.ADMIN],
    create: [RoleType.HOLDER, RoleType.ADMIN],
    show: [RoleType.HOLDER, RoleType.ADMIN],
  },
}

/**
 * Checks if the user's current role has permission to access a route
 */
export const canAccessRoute = (path: string, currentRole: RoleType): boolean => {
  // Find the most specific matching route permission
  const normalizedPath = path.split('?')[0] // Remove query params

  // Try exact match first
  if (routePermissions[normalizedPath]) {
    return routePermissions[normalizedPath].includes(currentRole)
  }

  // Try prefix matching (for nested routes)
  const matchingRoutes = Object.keys(routePermissions)
    .filter(route => normalizedPath.startsWith(route))
    .sort((a, b) => b.length - a.length) // Most specific first

  if (matchingRoutes.length > 0) {
    return routePermissions[matchingRoutes[0]].includes(currentRole)
  }

  // Default: allow access if no permission is specified
  return true
}

/**
 * Checks if the user's current role has permission to perform an action on a resource
 */
export const canPerformAction = (resource: string, action: string, currentRole: RoleType): boolean => {
  const resourcePermissions = resourceActionPermissions[resource.toLowerCase()]
  if (!resourcePermissions) {
    // No permissions defined for this resource - allow by default
    return true
  }

  const allowedRoles = resourcePermissions[action.toLowerCase()]
  if (!allowedRoles) {
    // No permissions defined for this action - allow by default
    return true
  }

  return allowedRoles.includes(currentRole)
}

/**
 * Creates a Refine AccessControlProvider that uses the current role from context
 *
 * @param getCurrentRole - Function to get the current user's role
 * @returns AccessControlProvider instance
 */
export const createAccessControlProvider = (getCurrentRole: () => RoleType): AccessControlProvider => {
  return {
    can: async ({resource, action, params}) => {
      const currentRole = getCurrentRole()

      // Check route-based permissions if params include a path
      if (params?.pathname) {
        const canAccess = canAccessRoute(params.pathname, currentRole)
        if (!canAccess) {
          return {
            can: false,
            reason: `Role '${currentRole}' does not have permission to access this route`,
          }
        }
      }

      // Check resource-action permissions if resource is provided
      if (resource && action) {
        const canPerform = canPerformAction(resource, action, currentRole)
        if (!canPerform) {
          return {
            can: false,
            reason: `Role '${currentRole}' does not have permission to ${action} ${resource}`,
          }
        }
      }

      return {can: true}
    },
    options: {
      buttons: {
        enableAccessControl: true,
        hideIfUnauthorized: true,
      },
    },
  }
}

export default createAccessControlProvider
