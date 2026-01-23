import React from 'react'
import {CredentialRole} from '@sphereon/ssi-types'
import styles from './index.module.css'

export type RoleBadgeVariant = 'issuer' | 'verifier' | 'holder'

export interface RoleBadgeProps {
  /** The role to display */
  role: CredentialRole
  /** Optional smaller size for compact displays */
  size?: 'default' | 'small'
  /** Optional additional className */
  className?: string
}

/**
 * RoleBadge - Displays a single credential role badge
 */
export const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  size = 'default',
  className,
}) => {
  const variant = getRoleBadgeVariant(role)
  const label = getRoleBadgeLabel(role)

  const badgeClasses = [
    styles.roleBadge,
    styles[variant],
    size === 'small' ? styles.small : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <span className={badgeClasses}>
      {label}
    </span>
  )
}

export interface RoleBadgesProps {
  /** Array of roles to display */
  roles: CredentialRole[]
  /** Optional smaller size for compact displays */
  size?: 'default' | 'small'
  /** Optional additional className for container */
  className?: string
}

/**
 * RoleBadges - Displays multiple role badges in a flex container
 */
export const RoleBadges: React.FC<RoleBadgesProps> = ({
  roles,
  size = 'default',
  className,
}) => {
  if (!roles || roles.length === 0) return null

  // Filter to only show known roles
  const displayRoles = roles.filter(role =>
    role === CredentialRole.ISSUER ||
    role === CredentialRole.VERIFIER ||
    role === CredentialRole.HOLDER
  )

  if (displayRoles.length === 0) return null

  return (
    <div className={`${styles.roleBadgesContainer} ${className || ''}`}>
      {displayRoles.map(role => (
        <RoleBadge key={role} role={role} size={size} />
      ))}
    </div>
  )
}

/**
 * Helper function to get badge variant from role
 */
export const getRoleBadgeVariant = (role: CredentialRole): RoleBadgeVariant => {
  switch (role) {
    case CredentialRole.ISSUER:
      return 'issuer'
    case CredentialRole.VERIFIER:
      return 'verifier'
    case CredentialRole.HOLDER:
      return 'holder'
    default:
      return 'holder'
  }
}

/**
 * Helper function to get display label for role
 */
export const getRoleBadgeLabel = (role: CredentialRole): string => {
  switch (role) {
    case CredentialRole.ISSUER:
      return 'Issuer'
    case CredentialRole.VERIFIER:
      return 'Verifier'
    case CredentialRole.HOLDER:
      return 'Holder'
    default:
      return role.toString()
  }
}

/**
 * Helper to check if a party has a specific role
 */
export const hasRole = (roles: CredentialRole[] | undefined, role: CredentialRole): boolean => {
  return roles?.includes(role) ?? false
}

export default RoleBadge
