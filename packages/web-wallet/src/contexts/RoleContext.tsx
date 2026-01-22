import React, {createContext, useContext, useState, FC, ReactNode} from 'react'
import {RoleType} from '@sphereon/ui-components.core'
import {CredentialRole} from '@sphereon/ssi-sdk.credential-store'
import {RoleData} from '@/src/types'
import roleConfig from '../config/roleConfig'

/**
 * Maps UI RoleType to CredentialRole for filtering credentials
 */
export const roleTypeToCredentialRole = (roleType: RoleType): CredentialRole => {
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
    default:
      return CredentialRole.HOLDER
  }
}

interface RoleContextType {
  currentRole: RoleData
  setCurrentRole: (role: RoleData) => void
  credentialRole: CredentialRole
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

interface RoleProviderProps {
  children: ReactNode
}

export const RoleProvider: FC<RoleProviderProps> = ({children}) => {
  const [currentRole, setCurrentRole] = useState<RoleData>(roleConfig[0])
  const credentialRole = roleTypeToCredentialRole(currentRole.role)

  return <RoleContext.Provider value={{currentRole, setCurrentRole, credentialRole}}>{children}</RoleContext.Provider>
}

export const useRole = (): RoleContextType => {
  const context = useContext(RoleContext)
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider')
  }
  return context
}

export default RoleContext
