import React, {useCallback, useEffect, useMemo, useState} from 'react'
import {useNavigate, useParams} from 'react-router-dom'
import {useList, useOne, useUpdate} from '@refinedev/core'
import {JSONFormState} from '@sphereon/ui-components.ssi-react'
import {
  calculateUIKeyCapabilitiesInfo,
  DataResource,
  EditIdentifierRoute,
  IdentifierCapabilities,
  IdentifierKey,
  IdentifierServiceEndpoint,
  KeyManagementIdentifier,
  KeyManagementRoute,
  MainRoute,
  UIKeyCapabilitiesInfo,
  EInvoiceServiceData,
} from '@typings'
import {IdentifiersEditContext} from '@typings/machine/identifiers/edit'
import {CoreActions, JsonFormsCore} from '@jsonforms/core'
import {IIdentifier, ManagedKeyInfo, TKeyType} from '@veramo/core'
import addKeySchema from '../../../src/schemas/data/addKeySchema.json' assert {type: 'json'}
import {isEInvoicingServiceType, isEInvoicingSubType, getEInvoicingDefaults, EInvSubType, EINV_SUB_TYPES, EINV_SERVICE_TYPE, EInvoiceDataItem} from '../../constants/eInvoicingDefaults'

// Supported key types - adjust based on your requirements
const SUPPORTED_KEY_TYPES: TKeyType[] = ['Ed25519', 'Secp256k1', 'Secp256r1', 'X25519', 'RSA']

const editIdentifierNavigationListener = async (step: number, navigate: any): Promise<void> => {
  switch (step) {
    case 1:
      return navigate(EditIdentifierRoute.ALIAS)
    case 2:
      return navigate(EditIdentifierRoute.KEYS)
    case 3:
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
  const [keys, setKeys] = useState<Array<IdentifierKey>>([])
  const [keyData, setKeyData] = useState<JSONFormState | undefined>()
  const [keySchema, setKeySchema] = useState<any>(addKeySchema)
  const maxInteractiveSteps = 3
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

  // Update schema with dynamic alias field
  useEffect(() => {
    if (identifierForEdit?.data) {
      // Update schema with dynamic options
      const updatedSchema = {
        type: 'object',
        properties: {
          alias: {
            type: 'string',
            title: 'Alias name',
          },
        },
        required: ['alias'],
      }

      setSchema(updatedSchema)
    }
  }, [identifierForEdit])

  // Update key schema with filtered keys
  useEffect(() => {
    if (keysData?.data) {
      let filteredKeys = keysData.data

      // Filter based on identifier method if needed
      if (identifierForEdit?.data) {
        const method = identifierForEdit.data.did.split(':')[1]
        // Add method-specific filtering logic here if needed
        if (method === 'web') {
          filteredKeys = keysData.data.filter((key: ManagedKeyInfo) => SUPPORTED_KEY_TYPES.includes(key.type))
        }
      }

      // Create oneOf options for the dropdown
      const keyOptions = filteredKeys.map((key: ManagedKeyInfo) => ({
        const: key.kid,
        title: `${key.meta?.alias || key.kid} (${key.type})`,
      }))

      // Update schema with dynamic options
      const updatedSchema = {
        ...addKeySchema,
        properties: {
          ...addKeySchema.properties,
          selectedKeyId: {
            type: 'string',
            title: 'Key',
            oneOf: keyOptions,
          },
        },
      }

      setKeySchema(updatedSchema)
    }
  }, [keysData, identifierForEdit])

  const identifierKeyMiddleware = useCallback(
    (
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
      // Only initialize defaults if the data object doesn't have the required fields yet
      // This prevents infinite re-render loops by not modifying data that's already initialized
      if (newState?.data && !newState.data.hasOwnProperty('action')) {
        newState.data = {
          ...newState.data,
          action: newState.schema?.properties?.['action']?.default ?? 'generate',
          purposes: newState.data.purposes || ['assertionMethod', 'authentication'],
        }
      }
      return newState
    },
    [],
  )

  const identifierMiddleware = useCallback(
    (
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
        }
      }
      return newState
    },
    [identifierForEdit?.data],
  )

  useEffect(() => {
    if (identifierForEdit?.data && !identifierData) {
      const identifier = identifierForEdit.data
      const provider = identifier.provider || ''
      const method = provider.replace('did:', '') || identifier.did.split(':')[1]

      // For did:web, extract the hostname and path from the DID
      // did:web:example.com -> hostName: "example.com"
      // did:web:example.com:path:to:resource -> hostName: "example.com", path: "path/to/resource"
      let web: { hostName: string; path?: string } | undefined
      if (method === 'web' && identifier.did.startsWith('did:web:')) {
        const didWithoutPrefix = identifier.did.substring('did:web:'.length)
        const parts = didWithoutPrefix.split(':')
        const hostName = parts[0]
        const path = parts.length > 1 ? parts.slice(1).join('/') : undefined
        web = { hostName, path }
      }

      const formData = {
        data: {
          type: 'did',
          method,
          alias: identifier.alias,
          ...(web && { web }),
        } as KeyManagementIdentifier,
        errors: [],
      }

      setIdentifierData(formData)

      // Initialize keys from the identifier
      if (identifier.keys && identifier.keys.length > 0) {
        const method = provider.replace('did:', '') || identifier.did.split(':')[1]
        const identifierCapability = method ? IdentifierCapabilities[method] : undefined

        const identifierKeys: IdentifierKey[] = identifier.keys.map((key, index) => ({
          id: key.kid || `key-${index}`,
          type: key.type,
          alias: key.meta?.alias || key.kid,
          kid: key.kid,
          purposes: key.meta?.purposes || ['assertionMethod', 'authentication'],
          readonly: true, // Mark existing keys as readonly initially
          capability: identifierCapability?.add.keyTypes?.find(keyCap => keyCap.keyType === key.type),
        }))
        setKeys(identifierKeys)
      }
    }
  }, [identifierForEdit])

  useEffect(() => {
    void editIdentifierNavigationListener(step, navigate)
  }, [step, navigate])

  useEffect(() => {
    const handlePopstate = (): void => {
      const path = window.location.pathname

      if (path.includes(EditIdentifierRoute.SERVICE_ENDPOINTS)) {
        setStep(3)
      } else if (path.includes(EditIdentifierRoute.KEYS)) {
        setStep(2)
      } else if (path.includes(EditIdentifierRoute.ALIAS)) {
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
      setDisabled(!capabilitiesInfo || capabilitiesInfo.errors.length > 0)
    } else if (step === 3) {
      setDisabled(false)
    }
  }, [step, identifierData, serviceEndpointData, serviceEndpoints, capabilitiesInfo])

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

          // Check if this is an eInvoicing service type (type === "eInvoice")
          const serviceType = service.type
          if (isEInvoicingServiceType(serviceType)) {
            // Get subType from service
            const subType = (service as any).subType as EInvSubType | undefined
            // Get eInvoice data from the service (capital I, array format)
            const eInvoiceArray = (service as any).eInvoice as EInvoiceDataItem[] | undefined
            const eInvoiceData = eInvoiceArray && eInvoiceArray.length > 0 ? eInvoiceArray[0] : undefined

            if (subType && isEInvoicingSubType(subType)) {
              const defaults = getEInvoicingDefaults(subType)
              const folderName = service.id.split('#').pop() || service.id

              // Build internal data for editing
              const internalData: EInvoiceServiceData = {
                entityName: eInvoiceData?.entityName || 'Unknown',
                country: eInvoiceData?.country || 'Unknown',
                documentIdentifiers: eInvoiceData?.documentIdentifiers || (defaults ? [...defaults.documentIdentifiers] : []),
                processIdentifiers: eInvoiceData?.processIdentifiers || (defaults ? [...defaults.processIdentifiers] : []),
                transportType: eInvoiceData?.transportType || defaults?.transportType || 'HTTP',
                inboxName: 'einvoices',
                folderName,
                // Copy network-specific fields if present
                ...(eInvoiceData?.peppolParticipantId ? {peppolParticipantId: eInvoiceData.peppolParticipantId} : {}),
                ...(eInvoiceData?.peppolSmpUrl ? {peppolSmpUrl: eInvoiceData.peppolSmpUrl} : {}),
                ...(eInvoiceData?.peppolAs4Endpoint ? {peppolAs4Endpoint: eInvoiceData.peppolAs4Endpoint} : {}),
                ...(eInvoiceData?.ppfPlatformId ? {ppfPlatformId: eInvoiceData.ppfPlatformId} : {}),
                ...(eInvoiceData?.ppfRecipientIds ? {ppfRecipientIds: eInvoiceData.ppfRecipientIds} : {}),
                ...(eInvoiceData?.ppfMode ? {ppfMode: eInvoiceData.ppfMode} : {}),
                ...(eInvoiceData?.ppfApiEndpoint ? {ppfApiEndpoint: eInvoiceData.ppfApiEndpoint} : {}),
              }

              return {
                id: service.id,
                type: EINV_SERVICE_TYPE,
                serviceEndpoint: endpointValue,
                description: defaults?.description,
                subType: subType,
                eInvoice: eInvoiceData ? [eInvoiceData] : undefined,
                _internal: internalData,
              }
            }
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

  const onKeyDataChange = async (data: JSONFormState): Promise<void> => {
    setKeyData(data)
  }

  const onSetKeys = (value: React.SetStateAction<IdentifierKey[]>) => {
    setKeys(value)
    if (capabilitiesInfo) {
      const calculatedCapabilitiesInfo = calculateUIKeyCapabilitiesInfo({
        identifierCapability: capabilitiesInfo.identifierCapability,
        keys: Array.isArray(value) ? value : keys,
        mode: capabilitiesInfo.identifierCapability.add,
      })
      setCapabilitiesInfo(calculatedCapabilitiesInfo)
    }
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
          web: identifierData?.data.web,
          services: serviceEndpoints,
          keys,
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
        keys,
        onSetKeys,
        keyData,
        onKeyDataChange,
        identifierKeyMiddleware,
        keySchema,
      }}>
      {children}
    </IdentifiersEditContext.Provider>
  )
}
