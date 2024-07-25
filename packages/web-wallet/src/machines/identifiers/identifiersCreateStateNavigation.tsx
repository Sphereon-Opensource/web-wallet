import React, {useCallback, useEffect, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {useCreate, useCreateMany} from '@refinedev/core'
import {JSONFormState} from '@sphereon/ui-components.ssi-react'
import {
  CreateIdentifierRoute,
  DataResource,
  generateReadOnlyUIKeysForAdd,
  calculateUIKeyCapabilitiesInfo,
  IdentifierCapabilities,
  IdentifierKey,
  IdentifierServiceEndpoint,
  KeyManagementIdentifier,
  KeyManagementRoute,
  MainRoute,
  UIKeyCapabilitiesInfo,
  IdentifierCapability,
} from '@typings'
import {IdentifiersCreateContext} from '@typings/machine/identifiers/create'
import {CoreActions, JsonFormsCore} from '@jsonforms/core'
import agent from '@agent'
import {NEXT_URL} from 'next/dist/client/components/app-router-headers'

const createIdentifierNavigationListener = async (step: number, navigate: any): Promise<void> => {
  switch (step) {
    case 1:
      return navigate(CreateIdentifierRoute.TYPE)
    case 2:
      return navigate(CreateIdentifierRoute.KEYS)
    case 3:
      return navigate(CreateIdentifierRoute.SERVICE_ENDPOINTS)
    case 4:
      return navigate(CreateIdentifierRoute.SUMMARY)
    default:
      return Promise.reject('create identifier step exceeds maximum steps')
  }
}

export const IdentifiersCreateContextProvider = (props: any): JSX.Element => {
  const {children = {}} = props
  const navigate = useNavigate()
  const {mutate: mutateMany} = useCreateMany()
  const {mutate: mutateOne} = useCreate()
  const [step, setStep] = useState<number>(1)
  const [disabled, setDisabled] = useState<boolean>(true)
  const [capabilitiesInfo, setCapabilitiesInfo] = useState<UIKeyCapabilitiesInfo>()
  const [identifierData, setIdentifierData] = useState<JSONFormState<KeyManagementIdentifier>>()
  const [keys, setKeys] = useState<Array<IdentifierKey>>([])
  const [keyData, setKeyData] = useState<JSONFormState | undefined>()
  const [serviceEndpoints, setServiceEndpoints] = useState<Array<IdentifierServiceEndpoint>>([])
  const [serviceEndpointData, setServiceEndpointData] = useState<JSONFormState | undefined>()
  const maxInteractiveSteps = 4
  const maxAutoSteps: number = 1

  const identifierKeyMiddleware = (
    state: Omit<JsonFormsCore, 'data'> & {data: IdentifierKey},
    action: CoreActions,
    defaultReducer: (
      state: JsonFormsCore,
      action: CoreActions,
    ) => Omit<JsonFormsCore, 'data'> & {
      data: IdentifierKey
    },
  ) => {
    const newState = defaultReducer(state, action)
    if (!state?.data) {
      state.data = {
        ...newState?.data,
        action: newState.schema?.properties?.['action']?.default ?? 'generate',
        purposes: ['assertionMethod', 'authentication'],
      }
    }
    console.log(`identifier key middleware`, newState)
    return newState
  }
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
    if (!state?.data) {
      agent.didManagerGetProviders().then(method => {
        const agentMethods = method.map(did => did.replace('did:', '').toLowerCase())
        const schemaMethods = state.schema?.properties?.['method']?.oneOf?.map(oneOf => oneOf.const.toLowerCase() as string) ?? []
        console.log(`TODO: filter against Agent methods: ${agentMethods.join(',')}, schema: ${schemaMethods.join(',')}`)
        // TODO: Filter out the schema method to the agent enabled methods
      })
      const props = newState?.schema?.properties
      // Unfortunately setting the default value in the schema does not work for the first entry. Could be because of the name: 'type'
      newState.data = {
        ...newState?.data,
        type: 'did',
        method: props?.method?.default,
        network: props?.['network']?.default,
        web: {
          hostName: process?.env?.NEXT_PUBLIC_CLIENT_ID ?? process?.env?.NEXTAUTH_URL ?? '',
          path: '/.well-known',
        },
        ebsi: {
          tao: {
            name: props?.['ebsi']?.properties?.['tao'].properties?.name?.default,
            url: props?.['ebsi']?.properties?.['tao'].properties?.url?.default,
          },
          executeLedgerOperation: true,
        },
      }
    }
    return newState
  }

  useEffect(() => {
    void createIdentifierNavigationListener(step, navigate)

    const handlePopstate = (): void => {
      let nextStep = step - maxAutoSteps
      if (step > 0) {
        if (step === 4 && capabilitiesInfo?.identifierCapability?.serviceEndpoints === false) {
          // No step 3 in case service endpoints are not allowed
          --nextStep
        }
        setStep(nextStep)
      }

      if (nextStep === 0) {
        navigate(`${MainRoute.KEY_MANAGEMENT}/${KeyManagementRoute.IDENTIFIERS}`)
      }
    }
    window.addEventListener('popstate', handlePopstate)
    return (): void => {
      window.removeEventListener('popstate', handlePopstate)
    }
  }, [step])

  useEffect((): void => {
    if (step === 1) {
      setDisabled((identifierData?.errors !== undefined && identifierData?.errors.length !== 0) || identifierData === undefined)
    } else if (step === 2) {
      setDisabled(!capabilitiesInfo || capabilitiesInfo.errors.length > 0)
    } else if (step === 3) {
      // You can always continue, as you need to explicitly add the services using a button, which has its own error handling. Services are optional
      setDisabled(false)
    } else if (step === 4) {
      setDisabled(false)
    }
  }, [step, identifierData, keyData, keys, serviceEndpointData, serviceEndpoints])

  const onNext = useCallback(async (): Promise<void> => {
    let nextStep: number = step + maxAutoSteps
    if (nextStep <= maxInteractiveSteps) {
      switch (step) {
        case 1:
          {
            if (!capabilitiesInfo) {
              return Promise.reject(Error(`Identifier capability should be set`))
            }
            const readOnlyKeys = generateReadOnlyUIKeysForAdd(capabilitiesInfo.identifierCapability)
            // const counts = calculateUIKeyCapabilitiesInfo({identifierCapability, mode: identifierCapability.create, keys})
            if (readOnlyKeys.length > 0 && (!keys || keys.length === 0 || capabilitiesInfo.errors.length > 0)) {
              onSetKeys(readOnlyKeys)
            }
          }
          break
        case 2: {
          if (capabilitiesInfo?.identifierCapability?.serviceEndpoints === false) {
            // No step 3 in case service endpoints are not allowed
            ++nextStep
          }
          break
        }
        case 3: {
          if (serviceEndpointData?.errors === undefined || serviceEndpointData?.errors.length === 0) {
            const newServiceEndpoint: IdentifierServiceEndpoint = {
              id: serviceEndpointData?.data?.id,
              type: serviceEndpointData?.data?.type,
              serviceEndpoint: serviceEndpointData?.data?.serviceEndpoint,
            }
            setServiceEndpoints(prevServiceEndpoints => [...prevServiceEndpoints, newServiceEndpoint])
          }
          break
        }
      }
      setStep(nextStep)
    } else {
      void onCreateIdentifier()
    }
  }, [
    step,
    serviceEndpointData?.errors,
    serviceEndpointData?.data?.id,
    serviceEndpointData?.data?.type,
    serviceEndpointData?.data?.serviceEndpoint,
    capabilitiesInfo,
    keys,
  ])

  const onBack = useCallback(async (): Promise<void> => {
    let nextStep: number = step - maxAutoSteps
    if (nextStep >= 1) {
      if (step === 4 && capabilitiesInfo?.identifierCapability?.serviceEndpoints === false) {
        // No step 3 in case service endpoints are not allowed
        --nextStep
      }
      return setStep(nextStep)
    }
    navigate(`${MainRoute.KEY_MANAGEMENT}/${KeyManagementRoute.IDENTIFIERS}`)
  }, [step, navigate, capabilitiesInfo?.identifierCapability?.serviceEndpoints])

  const onIdentifierDataChange = async (newState: JSONFormState<KeyManagementIdentifier>): Promise<void> => {
    const prevState = identifierData
    setIdentifierData(newState)
    if (prevState?.data?.method !== newState.data?.method) {
      updateCapabilityInfoFromIdentifierState({prevState, newState})
      if (keys && keys.length > 0) {
        // We update the keys, as capabilities could be vastly different
        setKeys([])
      }
    }
  }

  const updateCapabilityInfo = ({identifierCapability, keys}: {identifierCapability: IdentifierCapability; keys: IdentifierKey[]}) => {
    const calculatedCapabilitiesInfo = calculateUIKeyCapabilitiesInfo({
      identifierCapability,
      keys,
      mode: identifierCapability.create,
    })
    setCapabilitiesInfo(calculatedCapabilitiesInfo)
    console.log(`Identifier capability, keys: `, calculatedCapabilitiesInfo, keys)
    return calculatedCapabilitiesInfo
  }

  const updateCapabilityInfoFromIdentifierState = ({
    prevState,
    newState,
  }: {
    prevState?: JSONFormState<KeyManagementIdentifier>
    newState?: JSONFormState<KeyManagementIdentifier>
  }) => {
    if (!prevState?.data && capabilitiesInfo) {
      console.log(`Skipping capability update, as we just initialized the form and capability to`, capabilitiesInfo)
      return
    }
    const method = newState?.data?.method
    const identifierCapability = method ? IdentifierCapabilities[method] : undefined
    if (!identifierCapability || !method) {
      return Promise.reject(Error(`No identifier capability or no method found for ${method}`))
    }
    return updateCapabilityInfo({identifierCapability, keys})
  }

  const onKeyDataChange = async (data: JSONFormState): Promise<void> => {
    setKeyData(data)
    /*if (capabilitiesInfo) {
                // We need to update the keys in the capabilities count
                updateCapabilityInfo({
                    identifierCapability: capabilitiesInfo.identifierCapability,
                    keys: Array.isArray(data) ? data : keys
                })
            }*/
    // updateCapabilityInfoFromIdentifierState({prevState: identifierData, newState: identifierData})
  }

  const onServiceEndpointChange = async (data: JSONFormState): Promise<void> => {
    setServiceEndpointData(data)
  }

  const onSetKeys = (value: React.SetStateAction<IdentifierKey[]>) => {
    setKeys(value)
    if (capabilitiesInfo) {
      updateCapabilityInfo({
        identifierCapability: capabilitiesInfo.identifierCapability,
        keys: Array.isArray(value) ? value : keys,
      })
    }
  }

  const onCreateIdentifier = async (): Promise<void> => {
    const onErrorIdentifier = (error: any, variables: any, context: any): void => {
      throw new Error(`Unable to create identifier. Error: ${error}`)
    }

    const onSuccessIdentifier = (data: any, variables: any, context: any): void => {
      console.log(`IDENTIFIER: ${JSON.stringify(data)}`)
      navigate(`${MainRoute.KEY_MANAGEMENT}/${KeyManagementRoute.IDENTIFIERS}`)
    }

    mutateOne(
      {
        resource: DataResource.IDENTIFIERS,
        values: {
          keys: keys,
          services: serviceEndpoints,
          alias: identifierData?.data.alias,
          method: identifierData?.data.method,
          identifier: identifierData?.data,
        },
      },
      {onError: onErrorIdentifier, onSuccess: onSuccessIdentifier},
    )
  }

  return (
    <IdentifiersCreateContext.Provider
      value={{
        onBack,
        onNext,
        disabled,
        step,
        maxInteractiveSteps,
        capabilitiesInfo,
        identifierData,
        identifierMiddleware: identifierMiddleware,
        identifierKeyMiddleware: identifierKeyMiddleware,
        onIdentifierDataChange,
        keys,
        onSetKeys,
        keyData,
        onKeyDataChange,
        serviceEndpoints,
        onSetServiceEndpoints: setServiceEndpoints,
        serviceEndpointData,
        onServiceEndpointChange,
      }}>
      {children}
    </IdentifiersCreateContext.Provider>
  )
}
