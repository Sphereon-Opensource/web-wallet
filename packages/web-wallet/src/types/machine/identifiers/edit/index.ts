import React, {createContext, useContext} from 'react'
import {IdentifierKey, IdentifierServiceEndpoint, KeyManagementIdentifier, UIKeyCapabilitiesInfo} from '@typings'
import {JSONFormState} from '@sphereon/ui-components.ssi-react'
import {Middleware} from '@jsonforms/core'
import {IIdentifier} from '@veramo/core'

export type IdentifierEditData = {
  alias: string
  web?: {
    path?: string
  }
  selectedKeyId?: string
}

export type IdentifiersEditContextType = {
  disabled: boolean
  identifierData?: JSONFormState<KeyManagementIdentifier>
  identifierMiddleware?: Middleware
  identifierSchema?: any
  onIdentifierDataChange: (state: JSONFormState<KeyManagementIdentifier>) => Promise<void>
  onSave: () => Promise<void>
  onCancel: () => void
  isLoading: boolean
  identifier?: IIdentifier
  step: number
  maxInteractiveSteps: number
  onNext: () => Promise<void>
  onBack: () => Promise<void>
  serviceEndpoints: Array<IdentifierServiceEndpoint>
  onSetServiceEndpoints: React.Dispatch<React.SetStateAction<Array<IdentifierServiceEndpoint>>>
  serviceEndpointData?: JSONFormState
  onServiceEndpointChange: (data: JSONFormState) => Promise<void>
  capabilitiesInfo?: UIKeyCapabilitiesInfo
  keys: Array<IdentifierKey>
  onSetKeys: React.Dispatch<React.SetStateAction<Array<IdentifierKey>>>
  keyData?: JSONFormState
  onKeyDataChange: (data: JSONFormState) => Promise<void>
  identifierKeyMiddleware?: Middleware
  keySchema?: any
}

export const useIdentifiersEditContext = () => {
  const context = useContext(IdentifiersEditContext)
  if (!context) {
    throw new Error('useIdentifiersEditContext must be used within IdentifiersEditContext.Provider')
  }
  return context
}

// Keep the old one for backward compatibility if needed
export type IdentifierEditOutletContextType = {
  identifierData?: JSONFormState
  onIdentifierDataChange: (state: JSONFormState) => Promise<void>
  identifierMiddleware?: any
  originalIdentifier?: KeyManagementIdentifier
}

export const IdentifierEditOutletContext = createContext<IdentifierEditOutletContextType | undefined>(undefined)

export const IdentifiersEditContext = createContext<IdentifiersEditContextType | undefined>(undefined)

export const useIdentifierEditOutletContext = () => {
  const context = useContext(IdentifierEditOutletContext)
  if (!context) {
    throw new Error('useIdentifierEditOutletContext must be used within IdentifierEditOutletContext.Provider')
  }
  return context
}
