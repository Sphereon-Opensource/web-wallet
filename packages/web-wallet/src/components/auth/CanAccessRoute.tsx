import React, {FC, ReactElement, ReactNode} from 'react'
import {RoleType} from '@sphereon/ui-components.core'
import {useRole} from '@/src/contexts/RoleContext'
import UnauthorizedPage from '@/src/pages/UnauthorizedPage'

interface CanAccessRouteProps {
  /** Roles that can access this route */
  allowedRoles: RoleType[]
  /** Content to render if access is granted */
  children: ReactNode
  /** Optional fallback to render if access is denied (defaults to UnauthorizedPage) */
  fallback?: ReactNode
}

/**
 * Route guard component that checks if the current role has access to the route.
 * Uses the RoleContext to get the current role and checks against allowed roles.
 *
 * @example
 * ```tsx
 * <CanAccessRoute allowedRoles={[RoleType.ADMIN]}>
 *   <AdminOnlyContent />
 * </CanAccessRoute>
 * ```
 */
const CanAccessRoute: FC<CanAccessRouteProps> = ({allowedRoles, children, fallback}): ReactElement => {
  const {currentRole} = useRole()

  const hasAccess = allowedRoles.includes(currentRole.role)

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
