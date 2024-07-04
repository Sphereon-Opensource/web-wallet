import React, {useCallback, useEffect, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {v4 as uuidv4} from 'uuid'
import {useCreate, useCreateMany} from '@refinedev/core'
import {JSONFormState} from '@sphereon/ui-components.ssi-react'
import {CreateIdentifierRoute, DataResource, KeyManagementRoute, MainRoute} from '@types'
// @ts-ignore // FIXME WALL-245 path complaining
import {IdentifierKey, IdentifiersCreateContext, IdentifierServiceEndpoint} from '@types/machine/identifiers/create'

const createIdentifierNavigationListener = async (step: number, navigate: any): Promise<void> => {
  switch (step) {
    case 1:
      return navigate(CreateIdentifierRoute.TYPE)
    case 2:
      return navigate(CreateIdentifierRoute.KEYS)
    // case 3:
    //   return navigate(CreateIdentifierRoute.SERVICE_ENDPOINTS)
    case 3:
      return navigate(CreateIdentifierRoute.SUMMARY)
    default:
      return Promise.reject('create identifier step exceeds maximum steps')
  }
}

export const IdentifiersCreateContextProvider = (props: any): JSX.Element => {
  const {children} = props
  const navigate = useNavigate()
  const {mutate: mutateMany} = useCreateMany()
  const {mutate} = useCreate()
  const [step, setStep] = useState<number>(1)
  const [disabled, setDisabled] = useState<boolean>(true)
  const [identifierData, setIdentifierData] = useState<JSONFormState | undefined>()
  const [keys, setKeys] = useState<Array<IdentifierKey>>([])
  const [keyData, setKeyData] = useState<JSONFormState | undefined>()
  const [serviceEndpoints, setServiceEndpoints] = useState<Array<IdentifierServiceEndpoint>>([])
  const [serviceEndpointData, setServiceEndpointData] = useState<JSONFormState | undefined>()
  const maxInteractiveSteps = 3
  const maxAutoSteps: number = 1

  useEffect(() => {
    void createIdentifierNavigationListener(step, navigate)

    const handlePopstate = (): void => {
      if (step > 0) {
        setStep(step - maxAutoSteps)
      }

      if (step - maxAutoSteps === 0) {
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
      setDisabled((keyData?.errors !== undefined && keyData?.errors.length !== 0 && keys.length === 0) || keyData === undefined)
    } else if (step === 3) {
      setDisabled(false)
    }
  }, [step, identifierData, keyData, keys, serviceEndpointData, serviceEndpoints])

  const onNext = useCallback(async (): Promise<void> => {
    const nextStep: number = step + maxAutoSteps
    if (nextStep <= maxInteractiveSteps) {
      switch (step) {
        case 2: {
          if (keyData?.errors === undefined || keyData?.errors.length === 0) {
            const newKey: IdentifierKey = {
              id: uuidv4(),
              type: keyData?.data?.type,
              alias: keyData?.data?.alias,
              purposes: keyData?.data?.purposes,
            }
            setKeys(prevKeys => [newKey]) // TODO enable ...prevKeys, later
          }
          break
        }
        // case 3: {
        //   if (serviceEndpointData?.errors === undefined || serviceEndpointData?.errors.length === 0) {
        //     const newServiceEndpoint: IdentifierServiceEndpoint = {
        //       id: serviceEndpointData?.data?.id,
        //       type: serviceEndpointData?.data?.type,
        //       serviceEndpoint: serviceEndpointData?.data?.serviceEndpoint
        //     }
        //     setServiceEndpoints(prevServiceEndpoints => [...prevServiceEndpoints, newServiceEndpoint]);
        //   }
        //   break;
        // }
      }
      setStep(nextStep)
    } else {
      void onCreateIdentifier()
    }
  }, [step, keyData, serviceEndpointData])

  const onBack = useCallback(async (): Promise<void> => {
    const nextStep: number = step - maxAutoSteps
    if (nextStep >= 1) {
      return setStep(nextStep)
    }
    navigate(`${MainRoute.KEY_MANAGEMENT}/${KeyManagementRoute.IDENTIFIERS}`)
  }, [step])

  const onIdentifierDataChange = async (data: JSONFormState): Promise<void> => {
    setIdentifierData(data)
  }

  const onKeyDataChange = async (data: JSONFormState): Promise<void> => {
    setKeyData(data)
  }

  const onServiceEndpointChange = async (data: JSONFormState): Promise<void> => {
    setServiceEndpointData(data)
  }

  const onCreateIdentifier = async (): Promise<void> => {
    const onErrorIdentifier = (error: any, variables: any, context: any): void => {
      throw new Error(`Unable to create identifier. Error: ${error}`)
    }

    const onSuccessIdentifier = (data: any, variables: any, context: any): void => {
      console.log(`IDENTIFIER: ${JSON.stringify(data)}`)
      navigate(`${MainRoute.KEY_MANAGEMENT}/${KeyManagementRoute.IDENTIFIERS}`)
    }

    mutate(
      {
        resource: DataResource.IDENTIFIERS,
        values: {
          keyType: keys[0].type, // TODO support multiple keys
          alias: identifierData?.data.alias,
          method: identifierData?.data.method,
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
        identifierData,
        onIdentifierDataChange,
        keys,
        onSetKeys: setKeys,
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
