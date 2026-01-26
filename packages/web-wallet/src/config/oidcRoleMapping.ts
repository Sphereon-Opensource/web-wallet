import {RoleType} from '@sphereon/ui-components.core'
import {ExtendedRoleType} from '@typings'

/**
 * OIDC Role Mapping Configuration
 *
 * Maps OIDC role strings (from Keycloak realm_access, resource_access, or generic roles/groups claims)
 * to application RoleType enum values.
 *
 * Environment variables can override default mappings:
 * - NEXT_PUBLIC_OIDC_ROLES_HOLDER: comma-separated role names that map to HOLDER
 * - NEXT_PUBLIC_OIDC_ROLES_ISSUER: comma-separated role names that map to ISSUER
 * - NEXT_PUBLIC_OIDC_ROLES_VERIFIER: comma-separated role names that map to RELYING_PARTY (Verifier)
 * - NEXT_PUBLIC_OIDC_ROLES_ADMIN: comma-separated role names that map to ADMIN
 * - NEXT_PUBLIC_OIDC_ROLES_BOOKER: comma-separated role names that map to BOOKER
 * - NEXT_PUBLIC_OIDC_ALLOW_ALL_WHEN_NO_ROLES: "true" to allow all roles when token has no roles (default: true)
 */

// Default OIDC role names that map to each app role
const DEFAULT_HOLDER_ROLES = ['holder', 'wallet_holder', 'wallet-holder']
const DEFAULT_ISSUER_ROLES = ['issuer', 'credential_issuer', 'credential-issuer']
const DEFAULT_VERIFIER_ROLES = ['verifier', 'relying_party', 'relying-party', 'rp']
const DEFAULT_ADMIN_ROLES = ['admin', 'wallet_admin', 'wallet-admin', 'administrator']
const DEFAULT_BOOKER_ROLES = ['booker', 'booking', 'resource_booker', 'resource-booker']

/**
 * Parses comma-separated environment variable into array
 */
const parseEnvRoles = (envValue: string | undefined, defaults: string[]): string[] => {
  if (!envValue) return defaults
  return envValue
    .split(',')
    .map(r => r.trim().toLowerCase())
    .filter(r => r.length > 0)
}

/**
 * Get OIDC role names that map to HOLDER
 */
export const getHolderRoleNames = (): string[] => {
  return parseEnvRoles(process.env.NEXT_PUBLIC_OIDC_ROLES_HOLDER, DEFAULT_HOLDER_ROLES)
}

/**
 * Get OIDC role names that map to ISSUER
 */
export const getIssuerRoleNames = (): string[] => {
  return parseEnvRoles(process.env.NEXT_PUBLIC_OIDC_ROLES_ISSUER, DEFAULT_ISSUER_ROLES)
}

/**
 * Get OIDC role names that map to VERIFIER (RELYING_PARTY)
 */
export const getVerifierRoleNames = (): string[] => {
  return parseEnvRoles(process.env.NEXT_PUBLIC_OIDC_ROLES_VERIFIER, DEFAULT_VERIFIER_ROLES)
}

/**
 * Get OIDC role names that map to ADMIN
 */
export const getAdminRoleNames = (): string[] => {
  return parseEnvRoles(process.env.NEXT_PUBLIC_OIDC_ROLES_ADMIN, DEFAULT_ADMIN_ROLES)
}

/**
 * Get OIDC role names that map to BOOKER
 */
export const getBookerRoleNames = (): string[] => {
  return parseEnvRoles(process.env.NEXT_PUBLIC_OIDC_ROLES_BOOKER, DEFAULT_BOOKER_ROLES)
}

/**
 * Check if all roles should be allowed when token has no roles (backward compatibility)
 */
export const shouldAllowAllWhenNoRoles = (): boolean => {
  const envValue = process.env.NEXT_PUBLIC_OIDC_ALLOW_ALL_WHEN_NO_ROLES
  // Default to true for backward compatibility
  if (envValue === undefined || envValue === '') return true
  return envValue.toLowerCase() === 'true'
}

/**
 * Maps an array of OIDC role strings to application RoleType values
 *
 * @param oidcRoles - Array of role strings from OIDC token
 * @returns Array of unique ExtendedRoleType values the user is authorized for
 */
export const mapOidcRolesToAppRoles = (oidcRoles: string[]): ExtendedRoleType[] => {
  const appRoles: Set<ExtendedRoleType> = new Set()
  const normalizedRoles = oidcRoles.map(r => r.toLowerCase())

  const holderRoles = getHolderRoleNames()
  const issuerRoles = getIssuerRoleNames()
  const verifierRoles = getVerifierRoleNames()
  const adminRoles = getAdminRoleNames()
  const bookerRoles = getBookerRoleNames()

  for (const role of normalizedRoles) {
    if (bookerRoles.includes(role)) {
      appRoles.add(ExtendedRoleType.BOOKER)
    }
    if (holderRoles.includes(role)) {
      appRoles.add(RoleType.HOLDER)
    }
    if (issuerRoles.includes(role)) {
      appRoles.add(RoleType.ISSUER)
    }
    if (verifierRoles.includes(role)) {
      appRoles.add(RoleType.RELYING_PARTY)
    }
    if (adminRoles.includes(role)) {
      appRoles.add(RoleType.ADMIN)
    }
  }

  return Array.from(appRoles)
}

/**
 * Get all ExtendedRoleType values (used when allowing all roles as fallback)
 */
export const getAllRoleTypes = (): ExtendedRoleType[] => {
  return [ExtendedRoleType.BOOKER, RoleType.HOLDER, RoleType.ISSUER, RoleType.RELYING_PARTY, RoleType.ADMIN]
}
