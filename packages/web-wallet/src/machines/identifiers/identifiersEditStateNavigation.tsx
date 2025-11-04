import React, {useCallback, useEffect, useState} from 'react'
import {useNavigate, useParams} from 'react-router-dom'
import {useList, useOne, useUpdate} from '@refinedev/core'
import {JSONFormState} from '@sphereon/ui-components.ssi-react'
import {
  calculateUIKeyCapabilitiesInfo,
  DataResource,
  EditIdentifierRoute,
  IdentifierCapabilities,
  IdentifierServiceEndpoint,
  KeyManagementIdentifier,
  KeyManagementRoute,
  MainRoute,
  UIKeyCapabilitiesInfo,
} from '@typings'
import {IdentifiersEditContext} from '@typings/machine/identifiers/edit'
import {CoreActions, JsonFormsCore} from '@jsonforms/core'
import {IIdentifier, ManagedKeyInfo, TKeyType} from '@veramo/core'


// Supported key types for did:web
const DID_WEB_SUPPORTED_KEY_TYPES: TKeyType[] = ['Ed25519', 'Secp256k1', 'Secp256r1', 'X25519']

const editIdentifierNavigationListener = async (step: number, navigate: any): Promise<void> => {
  switch (step) {
    case 1:
      return navigate(EditIdentifierRoute.KEYS)
    case 2:
      return navigate(EditIdentifierRoute.SERVICE_ENDPOINTS)
    default:
      return Promise.reject(Error('edit identifier step exceeds maximum steps'))
  }
}

export const IdentifiersEditContextProvider = (props: {children: React.ReactNode}): JSX.Element => {
  const {children} = props
  const navigate = useNavigate()
  const {id} = useParams()
  const {mutate: mutateUpdate} = useUpdate()
  const [step, setStep] = useState<number>(1)
  const [disabled, setDisabled] = useState<boolean>(true)
  const [identifierData, setIdentifierData] = useState<JSONFormState<KeyManagementIdentifier>>()
  const [schema, setSchema] = useState<any>(null)
  const [serviceEndpoints, setServiceEndpoints] = useState<Array<IdentifierServiceEndpoint>>([])
  const [serviceEndpointData, setServiceEndpointData] = useState<JSONFormState | undefined>()
  const [capabilitiesInfo, setCapabilitiesInfo] = useState<UIKeyCapabilitiesInfo>()
  const maxInteractiveSteps = 2
  const maxAutoSteps = 1

  const {data: identifierForEdit, isLoading} = useOne<IIdentifier>({
    resource: DataResource.IDENTIFIERS,
    id,
  })

  const {data: keysData, isLoading: isLoadingKeys} = useList<ManagedKeyInfo>({
    resource: DataResource.KEYS,
    pagination: {
      mode: 'off',
    },
  })

  // Update schema with filtered keys
  useEffect(() => {
    if (keysData?.data && identifierForEdit?.data) {
      const identifier = identifierForEdit.data
      const method = (identifier.provider || '').replace('did:', '') || identifier.did.split(':')[1]

      let filteredKeys = keysData.data

      // Filter out unsupported key types for did:web
      if (method === 'web') {
        filteredKeys = keysData.data.filter((key: ManagedKeyInfo) =>
          DID_WEB_SUPPORTED_KEY_TYPES.includes(key.type),
        )
      }

      // Create oneOf options for the dropdown
      const keyOptions = filteredKeys.map((key: ManagedKeyInfo) => ({
        const: key.kid,
        title: `${key.meta?.alias || key.kid} (${key.type})`,
      }))

      // Update schema with dynamic options
      const updatedSchema = {
        type: 'object',
        properties: {
          alias: {
            type: 'string',
            title: 'Alias name',
          },
          selectedKeyId: {
            type: 'string',
            title: 'Key',
            oneOf: keyOptions,
          },
        },
        required: ['alias'],
      }

      setSchema(updatedSchema)
    }
  }, [keysData, identifierForEdit])

  const identifierMiddleware = (
    state: Omit<JsonFormsCore, 'data'> & {data: KeyManagementIdentifier},
    action: CoreActions,
    defaultReducer: (
      state: JsonFormsCore,
      action: CoreActions,
    ) => Omit<JsonFormsCore, 'data'> & {
      data: KeyManagementIdentifier
    },
  ) => {
    const newState = defaultReducer(state, action)
    if (identifierForEdit?.data && (!newState.data || Object.keys(newState.data).length === 0)) {
      const identifier = identifierForEdit.data
      const provider = identifier.provider || ''
      const method = provider.replace('did:', '') || identifier.did.split(':')[1]

      newState.data = {
        ...newState.data,
        type: 'did',
        method,
        alias: identifier.alias,
        selectedKeyId: newState?.data?.selectedKeyId || undefined,
      }
    }
    return newState
  }

  useEffect(() => {
    if (identifierForEdit?.data && !identifierData) {
      const identifier = identifierForEdit.data
      const provider = identifier.provider || ''
      const method = provider.replace('did:', '') || identifier.did.split(':')[1]

      console.log('Setting up form with identifier:', identifier)
      console.log('Identifier keys:', identifier.keys)
      console.log('Identifier controllerKeyId:', identifier.controllerKeyId)

      // Find the key that matches controllerKeyId
      const selectedKey = identifier.keys?.find(key => key.kid === identifier.controllerKeyId)

      console.log('Selected key found:', selectedKey)
      console.log('Selected key kid:', selectedKey?.kid)

      const formData = {
        data: {
          type: 'did',
          method,
          alias: identifier.alias,
          selectedKeyId: selectedKey?.kid,
        } as KeyManagementIdentifier,
        errors: [],
      }

      console.log('Setting identifierData to:', formData)
      setIdentifierData(formData)
    }
  }, [identifierForEdit])

  useEffect(() => {
    void editIdentifierNavigationListener(step, navigate)
  }, [step, navigate])

  useEffect(() => {
    const handlePopstate = (): void => {
      const path = window.location.pathname

      if (path.includes(EditIdentifierRoute.SERVICE_ENDPOINTS)) {
        setStep(2)
      } else if (path.includes(EditIdentifierRoute.KEYS)) {
        setStep(1)
      } else {
        // Not on an edit step, navigate back to list
        navigate(`${MainRoute.KEY_MANAGEMENT}/${KeyManagementRoute.IDENTIFIERS}`)
      }
    }
    window.addEventListener('popstate', handlePopstate)
    return () => window.removeEventListener('popstate', handlePopstate)
  }, [navigate])

  useEffect(() => {
    if (step === 1) {
      setDisabled((identifierData?.errors !== undefined && identifierData?.errors.length !== 0) || identifierData === undefined)
    } else if (step === 2) {
      setDisabled(false)
    }
  }, [step, identifierData, serviceEndpointData, serviceEndpoints])

  useEffect(() => {
    if (identifierForEdit?.data) {
      const identifier = identifierForEdit.data
      const provider = identifier.provider || ''
      const method = provider.replace('did:', '') || identifier.did.split(':')[1]
      const identifierCapability = method ? IdentifierCapabilities[method] : undefined

      if (identifierCapability) {
        const calculatedCapabilitiesInfo = calculateUIKeyCapabilitiesInfo({
          identifierCapability,
          keys: [],
          mode: identifierCapability.add,
        })
        setCapabilitiesInfo(calculatedCapabilitiesInfo)
      }

      // Load existing service endpoints
      if (identifier.services && identifier.services.length > 0) {
        const loadedServiceEndpoints: IdentifierServiceEndpoint[] = identifier.services.map(service => {
          let endpointValue: string
          if (Array.isArray(service.serviceEndpoint)) {
            endpointValue = service.serviceEndpoint.join('\n')
          } else if (typeof service.serviceEndpoint === 'string') {
            endpointValue = service.serviceEndpoint
          } else if (typeof service.serviceEndpoint === 'object') {
            endpointValue = JSON.stringify(service.serviceEndpoint)
          } else {
            endpointValue = String(service.serviceEndpoint)
          }

          return {
            id: service.id,
            type: service.type,
            serviceEndpoint: endpointValue,
          }
        })
        setServiceEndpoints(loadedServiceEndpoints)
      }
    }
  }, [identifierForEdit])

  const onIdentifierDataChange = async (newState: JSONFormState<KeyManagementIdentifier>): Promise<void> => {
    setIdentifierData(newState)
  }

  const onNext = useCallback(async (): Promise<void> => {
    const nextStep: number = step + maxAutoSteps
    if (nextStep <= maxInteractiveSteps) {
      if (step === 1 && serviceEndpointData?.data && (!serviceEndpointData?.errors || serviceEndpointData.errors.length === 0)) {
        const newServiceEndpoint: IdentifierServiceEndpoint = {
          id: serviceEndpointData.data.id,
          type: serviceEndpointData.data.type,
          serviceEndpoint: serviceEndpointData.data.serviceEndpoint,
        }
        setServiceEndpoints(prevServiceEndpoints => [...prevServiceEndpoints, newServiceEndpoint])
      }
      setStep(nextStep)
    } else {
      void onSave()
    }
  }, [step, serviceEndpointData])

  const onBack = useCallback(async (): Promise<void> => {
    const nextStep: number = step - maxAutoSteps
    if (nextStep >= 1) {
      return setStep(nextStep)
    }
    navigate(`${MainRoute.KEY_MANAGEMENT}/${KeyManagementRoute.IDENTIFIERS}`)
  }, [step, navigate])

  const onSave = async (): Promise<void> => {
    if (!id) {
      return Promise.reject(Error('No identifier ID provided'))
    }

    const onError = (error: any): void => {
      throw new Error(`Unable to update identifier. Error: ${error}`)
    }

    const onSuccess = (): void => {
      navigate(`${MainRoute.KEY_MANAGEMENT}/${KeyManagementRoute.IDENTIFIERS}`)
    }

    mutateUpdate(
      {
        resource: DataResource.IDENTIFIERS,
        id,
        values: {
          alias: identifierData?.data.alias,
          selectedKeyId: identifierData?.data.selectedKeyId,
          web: identifierData?.data.web,
          services: serviceEndpoints,
        },
      },
      {onError, onSuccess},
    )
  }

  const onServiceEndpointChange = async (data: JSONFormState): Promise<void> => {
    setServiceEndpointData(data)
  }


  const onCancel = useCallback((): void => {
    navigate(`${MainRoute.KEY_MANAGEMENT}/${KeyManagementRoute.IDENTIFIERS}`)
  }, [navigate])

  return (
    <IdentifiersEditContext.Provider
      value={{
        step,
        maxInteractiveSteps,
        disabled,
        identifierData,
        identifierMiddleware,
        identifierSchema: schema,
        onIdentifierDataChange,
        onNext,
        onBack,
        onSave,
        onCancel,
        isLoading: isLoading || isLoadingKeys,
        identifier: identifierForEdit?.data,
        serviceEndpoints,
        onSetServiceEndpoints: setServiceEndpoints,
        serviceEndpointData,
        onServiceEndpointChange,
        capabilitiesInfo,
      }}>
      {children}
    </IdentifiersEditContext.Provider>
  )
}
