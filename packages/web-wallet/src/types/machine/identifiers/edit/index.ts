import {createContext, useContext} from 'react'
import {KeyManagementIdentifier} from '@typings'
import {JSONFormState} from '@sphereon/ui-components.ssi-react'

export type IdentifierEditData = {
  alias: string
  web?: {
    path?: string
  }
  selectedKeyId?: string
}

export type IdentifierEditOutletContextType = {
  identifierData?: JSONFormState
  onIdentifierDataChange: (state: JSONFormState) => Promise<void>
  identifierMiddleware?: any
  originalIdentifier?: KeyManagementIdentifier
}

export const IdentifierEditOutletContext = createContext<IdentifierEditOutletContextType | undefined>(undefined)

export const useIdentifierEditOutletContext = () => {
  const context = useContext(IdentifierEditOutletContext)
  if (!context) {
    throw new Error('useIdentifierEditOutletContext must be used within IdentifierEditOutletContext.Provider')
  }
  return context
}
