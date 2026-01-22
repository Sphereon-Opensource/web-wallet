import React, {createContext, useContext, useState, FC, ReactNode} from 'react'
import {RoleType} from '@sphereon/ui-components.core'
import {RoleData} from '@/src/types'
import roleConfig from '../config/roleConfig'

interface RoleContextType {
  currentRole: RoleData
  setCurrentRole: (role: RoleData) => void
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

interface RoleProviderProps {
  children: ReactNode
}

export const RoleProvider: FC<RoleProviderProps> = ({children}) => {
  const [currentRole, setCurrentRole] = useState<RoleData>(roleConfig[0])

  return <RoleContext.Provider value={{currentRole, setCurrentRole}}>{children}</RoleContext.Provider>
}

export const useRole = (): RoleContextType => {
  const context = useContext(RoleContext)
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider')
  }
  return context
}

export default RoleContext
