import React, {createContext, useContext, useState, FC, ReactNode, useMemo, useCallback, useEffect} from 'react'
import {useSession} from 'next-auth/react'
import {RoleType} from '@sphereon/ui-components.core'
import {CredentialRole} from '@sphereon/ssi-sdk.credential-store'
import {ExtendedRoleType, RoleData} from '@/src/types'
import roleConfig from '../config/roleConfig'
import {mapOidcRolesToAppRoles, shouldAllowAllWhenNoRoles, getAllRoleTypes} from '../config/oidcRoleMapping'

/**
 * Maps UI ExtendedRoleType to CredentialRole for filtering credentials
 */
export const roleTypeToCredentialRole = (roleType: ExtendedRoleType): CredentialRole => {
  switch (roleType) {
    case RoleType.HOLDER:
      return CredentialRole.HOLDER
    case RoleType.ISSUER:
      return CredentialRole.ISSUER
    case RoleType.RELYING_PARTY:
      return CredentialRole.VERIFIER
    case RoleType.ADMIN:
      // Admin doesn't have credentials, default to HOLDER
      return CredentialRole.HOLDER
    case ExtendedRoleType.BOOKER:
      // Booker doesn't have credentials, default to HOLDER
      return CredentialRole.HOLDER
    default:
      return CredentialRole.HOLDER
  }
}

interface RoleContextType {
  /** The currently selected role */
  currentRole: RoleData
  /** Set the current role (only works if role is in authorizedRoles) */
  setCurrentRole: (role: RoleData) => void
  /** The credential role derived from currentRole */
  credentialRole: CredentialRole
  /** Roles the user is authorized to use based on OIDC claims */
  authorizedRoles: ExtendedRoleType[]
  /** All role configurations available to the user */
  availableRoleConfigs: RoleData[]
  /** Check if user has a specific role */
  hasRole: (role: ExtendedRoleType) => boolean
  /** Whether OIDC roles were found in the token */
  hasOidcRoles: boolean
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

interface RoleProviderProps {
  children: ReactNode
}

export const RoleProvider: FC<RoleProviderProps> = ({children}) => {
  const {data: session} = useSession()

  // Compute authorized roles from OIDC token
  const {authorizedRoles, hasOidcRoles} = useMemo(() => {
    const oidcRoles = session?.oidcRoles ?? []
    const mappedRoles = mapOidcRolesToAppRoles(oidcRoles)

    // If no OIDC roles found and we should allow all roles (backward compatibility)
    if (mappedRoles.length === 0 && shouldAllowAllWhenNoRoles()) {
      return {
        authorizedRoles: getAllRoleTypes(),
        hasOidcRoles: false,
      }
    }

    // If no OIDC roles found and we should NOT allow all, default to HOLDER only
    if (mappedRoles.length === 0) {
      return {
        authorizedRoles: [RoleType.HOLDER],
        hasOidcRoles: false,
      }
    }

    return {
      authorizedRoles: mappedRoles,
      hasOidcRoles: true,
    }
  }, [session?.oidcRoles])

  // Filter roleConfig to only include authorized roles
  const availableRoleConfigs = useMemo(() => {
    return roleConfig.filter(config => authorizedRoles.includes(config.role))
  }, [authorizedRoles])

  // Initialize currentRole to first available role config
  const [currentRole, setCurrentRoleState] = useState<RoleData>(() => {
    // Default to first available role config, or first roleConfig if none available yet
    return availableRoleConfigs[0] ?? roleConfig[0]
  })

  // Update currentRole if it becomes unavailable (e.g., session changed)
  useEffect(() => {
    if (!authorizedRoles.includes(currentRole.role) && availableRoleConfigs.length > 0) {
      setCurrentRoleState(availableRoleConfigs[0])
    }
  }, [authorizedRoles, currentRole.role, availableRoleConfigs])

  // Safe role setter that only allows authorized roles
  const setCurrentRole = useCallback(
    (role: RoleData) => {
      if (authorizedRoles.includes(role.role)) {
        setCurrentRoleState(role)
      } else {
        console.warn(`Attempted to switch to unauthorized role: ${role.role}`)
      }
    },
    [authorizedRoles],
  )

  const credentialRole = roleTypeToCredentialRole(currentRole.role)

  const hasRole = useCallback(
    (role: ExtendedRoleType): boolean => {
      return authorizedRoles.includes(role)
    },
    [authorizedRoles],
  )

  const value = useMemo(
    () => ({
      currentRole,
      setCurrentRole,
      credentialRole,
      authorizedRoles,
      availableRoleConfigs,
      hasRole,
      hasOidcRoles,
    }),
    [currentRole, setCurrentRole, credentialRole, authorizedRoles, availableRoleConfigs, hasRole, hasOidcRoles],
  )

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export const useRole = (): RoleContextType => {
  const context = useContext(RoleContext)
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider')
  }
  return context
}

export default RoleContext
