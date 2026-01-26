import React, {FC, ReactElement, ReactNode} from 'react'
import {RoleType} from '@sphereon/ui-components.core'
import {ExtendedRoleType} from '@typings'
import {useRole} from '@/src/contexts/RoleContext'
import UnauthorizedPage from '@/src/pages/UnauthorizedPage'

interface CanAccessRouteProps {
  /** Roles that can access this route */
  allowedRoles: ExtendedRoleType[]
  /** Content to render if access is granted */
  children: ReactNode
  /** Optional fallback to render if access is denied (defaults to UnauthorizedPage) */
  fallback?: ReactNode
}

/**
 * Route guard component that checks if the user has any authorized role that can access the route.
 * Uses the RoleContext to get authorized roles and checks if any match the allowed roles.
 *
 * Note: This checks authorizedRoles (what the user CAN access), not currentRole (what they have selected).
 * This means if a user has ADMIN in their authorized roles, they can access admin routes even if
 * their currently selected role is BOOKER.
 *
 * @example
 * ```tsx
 * <CanAccessRoute allowedRoles={[RoleType.ADMIN]}>
 *   <AdminOnlyContent />
 * </CanAccessRoute>
 * ```
 */
const CanAccessRoute: FC<CanAccessRouteProps> = ({allowedRoles, children, fallback}): ReactElement => {
  const {authorizedRoles} = useRole()

  // Check if user has ANY authorized role that matches the allowed roles
  const hasAccess = allowedRoles.some(role => authorizedRoles.includes(role))

  if (!hasAccess) {
    return <>{fallback ?? <UnauthorizedPage />}</>
  }

  return <>{children}</>
}

export default CanAccessRoute

/**
 * Pre-configured route guards for common access patterns
 */

/** Only Admin can access */
export const AdminOnly: FC<{children: ReactNode; fallback?: ReactNode}> = ({children, fallback}) => (
  <CanAccessRoute allowedRoles={[RoleType.ADMIN]} fallback={fallback}>
    {children}
  </CanAccessRoute>
)

/** Issuer and Admin can access */
export const IssuerOrAdmin: FC<{children: ReactNode; fallback?: ReactNode}> = ({children, fallback}) => (
  <CanAccessRoute allowedRoles={[RoleType.ISSUER, RoleType.ADMIN]} fallback={fallback}>
    {children}
  </CanAccessRoute>
)

/** Verifier (Relying Party) and Admin can access */
export const VerifierOrAdmin: FC<{children: ReactNode; fallback?: ReactNode}> = ({children, fallback}) => (
  <CanAccessRoute allowedRoles={[RoleType.RELYING_PARTY, RoleType.ADMIN]} fallback={fallback}>
    {children}
  </CanAccessRoute>
)

/** Holder and Admin can access */
export const HolderOrAdmin: FC<{children: ReactNode; fallback?: ReactNode}> = ({children, fallback}) => (
  <CanAccessRoute allowedRoles={[RoleType.HOLDER, RoleType.ADMIN]} fallback={fallback}>
    {children}
  </CanAccessRoute>
)

/** Booker and Admin can access */
export const BookerOrAdmin: FC<{children: ReactNode; fallback?: ReactNode}> = ({children, fallback}) => (
  <CanAccessRoute allowedRoles={[ExtendedRoleType.BOOKER, RoleType.ADMIN]} fallback={fallback}>
    {children}
  </CanAccessRoute>
)
