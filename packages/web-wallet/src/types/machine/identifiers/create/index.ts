import React, {createContext, Dispatch, useContext} from 'react'
import {useOutletContext} from 'react-router-dom'
import {JSONFormState} from '@sphereon/ui-components.ssi-react'
import {UIContextType} from '@types'

export type IdentifierServiceEndpoint = {
  id: string
  type: string
  serviceEndpoint: string
}

export type IdentifierKey = {
  id: string
  type: string
  alias?: string
  purposes: Array<string>
}

export type IdentifiersCreateContextType = UIContextType & {
  identifierData?: JSONFormState // TODO CWALL-245 would be nice if we can add a generic
  onIdentifierDataChange: (data: JSONFormState) => Promise<void>
  keys: Array<IdentifierKey>
  onSetKeys: Dispatch<React.SetStateAction<Array<IdentifierKey>>>
  keyData?: JSONFormState // TODO CWALL-245 would be nice if we can add a generic
  onKeyDataChange: (data: JSONFormState) => Promise<void>
  serviceEndpoints: Array<IdentifierServiceEndpoint>
  onSetServiceEndpoints: Dispatch<React.SetStateAction<Array<IdentifierServiceEndpoint>>>
  serviceEndpointData?: JSONFormState // TODO CWALL-245 would be nice if we can add a generic
  onServiceEndpointChange: (data: JSONFormState) => Promise<void>
}

export const useIdentifierCreateOutletContext = () => useOutletContext<IdentifiersCreateContextType>()

export const IdentifiersCreateContext = createContext({} as IdentifiersCreateContextType)

export const useIdentifiersCreateMachine = () => useContext(IdentifiersCreateContext)
