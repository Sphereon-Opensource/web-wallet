import React, {FC, ReactElement} from 'react'
import {useTranslate} from '@refinedev/core'
import {ButtonIcon} from '@sphereon/ui-components.core'
import {FormView, PrimaryButton} from '@sphereon/ui-components.ssi-react'
import {JsonSchema} from '@jsonforms/core'
import addServiceEndpointSchemaJson from '../../../../src/schemas/data/addServiceEndpointSchema.json' assert {type: 'json'}
import addServiceEndpointUISchema from '../../../../src/schemas/ui/addServiceEndpointUISchema.json' assert {type: 'json'}

// Cast JSON schema to JsonSchema type to satisfy TypeScript's strict type checking
const addServiceEndpointSchema = addServiceEndpointSchemaJson as unknown as JsonSchema
import SelectionField from '@components/fields/SelectionField'
import {useIdentifierCreateOutletContext} from '@typings/machine/identifiers/create'
import {useIdentifiersEditContext} from '@typings/machine/identifiers/edit'
import style from './index.module.css'
import {IdentifierServiceEndpoint} from '@typings'
import {
  EINV_SERVICE_TYPE,
  EINV_SUB_TYPES,
  isEInvoicingServiceType,
  EInvSubType,
} from '../../../constants/eInvoicingDefaults'
import {getAgentBaseUrl} from '@agent'
import {
  buildServiceEndpoint,
  ensureEInvoiceDcqlDefinition,
} from '@/src/services/identifierServiceManager'

type Props = {
  mode: 'create' | 'edit'
}

const CreateIdentifierAddServiceEndpointContent: FC<Props> = ({mode}): ReactElement => {
  const translate = useTranslate()
  const isEditMode = mode === 'edit'
  const [formKey, setFormKey] = React.useState(0)
  const [agentServiceEndpointBaseUrl, setAgentServiceEndpointBaseUrl] = React.useState<string | null>(null)

  const context = isEditMode ? useIdentifiersEditContext() : useIdentifierCreateOutletContext()

  const {serviceEndpoints, onSetServiceEndpoints, serviceEndpointData, onServiceEndpointChange, capabilitiesInfo, identifierData} = context

  const serviceEndpointsPossible = capabilitiesInfo?.identifierCapability?.serviceEndpoints

  console.log(`Service endpoints possible: ${serviceEndpointsPossible}`)

  // Fetch the service endpoint base URL from the agent on mount
  React.useEffect(() => {
    const fetchBaseUrl = async () => {
      try {
        const agentBaseUrl = getAgentBaseUrl()
        const response = await fetch(`${agentBaseUrl}/api/config/service-endpoint-base-url`)
        if (response.ok) {
          const data = await response.json()
          if (data.baseUrl) {
            console.log(`Fetched service endpoint base URL from agent: ${data.baseUrl}`)
            setAgentServiceEndpointBaseUrl(data.baseUrl)
          }
        }
      } catch (error) {
        console.warn('Failed to fetch service endpoint base URL from agent:', error)
      }
    }
    fetchBaseUrl()
  }, [])

  /**
   * Get the base URL for service endpoints.
   * Priority:
   * 1. Use EXTERNAL_HOSTNAME from agent (fetched via API)
   * 2. Fall back to deriving from the did:web hostname
   * 3. Final fallback to agent base URL
   */
  const getServiceEndpointBaseUrl = (): string => {
    // First, try the URL fetched from the agent (based on EXTERNAL_HOSTNAME)
    if (agentServiceEndpointBaseUrl && !agentServiceEndpointBaseUrl.includes('localhost')) {
      console.log(`Using agent's external hostname for service endpoint: ${agentServiceEndpointBaseUrl}`)
      return agentServiceEndpointBaseUrl
    }

    // Second, fall back to deriving from did:web hostname
    const webData = identifierData?.data?.web
    if (webData?.hostName) {
      // Use https for non-localhost, http for localhost
      const protocol = webData.hostName.includes('localhost') ? 'http' : 'https'
      const path = webData.path ? `/${webData.path}` : ''
      const derivedUrl = `${protocol}://${webData.hostName}${path}`
      console.log(`Using did:web derived URL for service endpoint: ${derivedUrl}`)
      return derivedUrl
    }

    // Final fallback - use agent base URL
    const agentBaseUrl = getAgentBaseUrl()
    console.warn('No external URL configured, using agent base URL fallback')
    return agentBaseUrl
  }

  const onRemoveServiceEndpoint = async (id: string): Promise<void> => {
    onSetServiceEndpoints(prevServiceEndpoints => prevServiceEndpoints.filter(serviceEndpoint => serviceEndpoint.id !== id))
  }

  const onAddServiceEndpoint = async (): Promise<void> => {
    if (!serviceEndpointData?.data) {
      return
    }

    const data = serviceEndpointData.data
    const serviceType = data.type as string

    try {
      // For eInvoicing services, ensure DCQL definition exists
      if (isEInvoicingServiceType(serviceType)) {
        await ensureEInvoiceDcqlDefinition()
      }

      // Use unified service manager to build the service endpoint
      const newServiceEndpoint = buildServiceEndpoint(data, getServiceEndpointBaseUrl())

      console.log('[CreateIdentifierAddServiceEndpointContent] Created service endpoint:', {
        id: newServiceEndpoint.id,
        type: newServiceEndpoint.type,
        subType: newServiceEndpoint.subType,
        hasEInvoice: !!newServiceEndpoint.eInvoice,
        hasInternal: !!newServiceEndpoint._internal,
      })

      onSetServiceEndpoints(prevServiceEndpoints => [...prevServiceEndpoints, newServiceEndpoint])

      // Reset form by triggering change with empty data
      await onServiceEndpointChange({data: undefined, errors: []})
      setFormKey(prev => prev + 1)
    } catch (error) {
      console.error('[CreateIdentifierAddServiceEndpointContent] Failed to create service endpoint:', error)
    }
  }

  const formatServiceEndpointValue = (serviceEndpoint: IdentifierServiceEndpoint) => {
    // For eInvoicing, show the endpoint URL
    if (serviceEndpoint.eInvoice) {
      return serviceEndpoint.serviceEndpoint
    }

    // For standard endpoints, format the value
    return `[${serviceEndpoint.serviceEndpoint
      .split('\n')
      .map(value => `"${value}"`)
      .join(', ')}]`
  }

  const getServiceEndpointTypeLabel = (serviceEndpoint: IdentifierServiceEndpoint): string => {
    // For eInvoicing services, show type with subType
    if (serviceEndpoint.type === EINV_SERVICE_TYPE && serviceEndpoint.subType) {
      switch (serviceEndpoint.subType) {
        case EINV_SUB_TYPES.DIRECT:
          return 'eInvoice - Direct'
        case EINV_SUB_TYPES.PEPPOL:
          return 'eInvoice - Peppol'
        case EINV_SUB_TYPES.PPF_FR:
          return 'eInvoice - France PPF'
        default:
          return `eInvoice - ${serviceEndpoint.subType}`
      }
    }
    return serviceEndpoint.type
  }

  const getServiceEndpointsElements = (): Array<ReactElement> => {
    return serviceEndpoints.map((serviceEndpoint, index) => {
      const onRemove = async (): Promise<void> => {
        await onRemoveServiceEndpoint(serviceEndpoint.id)
      }

      const details = [
        {
          title: translate('create_identifier_service_endpoints_card_service_endpoint_type_label'),
          value: getServiceEndpointTypeLabel(serviceEndpoint),
        },
        {
          title: translate('create_identifier_service_endpoints_card_service_endpoint_label'),
          value: formatServiceEndpointValue(serviceEndpoint),
        },
      ]

      // Add description if available
      if (serviceEndpoint.description) {
        details.push({
          title: translate('create_identifier_service_endpoints_description_label') || 'Description',
          value: serviceEndpoint.description,
        })
      }

      // Add eInvoicing-specific details if applicable (from eInvoice array)
      if (serviceEndpoint.eInvoice && serviceEndpoint.eInvoice.length > 0) {
        const eInvoiceData = serviceEndpoint.eInvoice[0]
        details.push({
          title: translate('create_identifier_service_endpoints_entity_name_label') || 'Entity Name',
          value: eInvoiceData.entityName,
        })
        details.push({
          title: translate('create_identifier_service_endpoints_country_label') || 'Country',
          value: eInvoiceData.country,
        })
        if (serviceEndpoint.subType) {
          details.push({
            title: translate('create_identifier_service_endpoints_subtype_label') || 'SubType',
            value: serviceEndpoint.subType,
          })
        }
      }

      return <SelectionField key={`${serviceEndpoint.id}-${index}`} value={serviceEndpoint.id} details={details} onRemove={onRemove} />
    })
  }

  return (
    <div className={style.container}>
      <div className={style.contentContainer}>
        {serviceEndpoints.length === 0 && (
          <div className={style.formContainer}>
            <div>
              <div className={style.titleContainer}>
                <div className={style.titleCaption}>{translate('create_identifier_service_endpoints_title')}</div>
                <div className={style.titleOptionalContainer}>{translate('text_input_field_optional_caption')}</div>
              </div>
              <div className={style.descriptionCaption}>{translate('create_identifier_service_endpoints_description')}</div>
            </div>
            <FormView
              key={formKey}
              schema={addServiceEndpointSchema}
              uiSchema={addServiceEndpointUISchema}
              onFormStateChange={onServiceEndpointChange}
              readonly={!serviceEndpointsPossible}
              data={serviceEndpointData?.data}
            />
            <PrimaryButton
              caption={translate('create_identifier_service_endpoints_add_service_endpoint_label')}
              onClick={onAddServiceEndpoint}
              icon={ButtonIcon.ADD}
              disabled={
                !serviceEndpointsPossible ||
                !serviceEndpointData?.data ||
                (serviceEndpointData?.errors !== undefined && serviceEndpointData?.errors.length > 0)
              }
            />
          </div>
        )}
        {serviceEndpoints.length > 0 && (
          <div className={style.contentContainer}>
            <div className={style.formContainer}>
              <div>
                <div className={style.titleCaption}>{translate('create_identifier_service_endpoints_title')}</div>
                <div className={style.descriptionCaption}>{translate('create_identifier_service_endpoints_description')}</div>
              </div>
              {getServiceEndpointsElements()}
            </div>
            <div className={style.formContainer}>
              <div className={style.addTitleCaption}>{translate('create_identifier_service_endpoints_title')}</div>
              <FormView
                key={serviceEndpoints.length}
                schema={addServiceEndpointSchema}
                uiSchema={addServiceEndpointUISchema}
                onFormStateChange={onServiceEndpointChange}
                readonly={!serviceEndpointsPossible}
                data={serviceEndpointData?.data}
              />
              <PrimaryButton
                caption={translate('create_identifier_service_endpoints_add_service_endpoint_label')}
                onClick={onAddServiceEndpoint}
                icon={ButtonIcon.ADD}
                disabled={
                  !serviceEndpointsPossible ||
                  !serviceEndpointData?.data ||
                  (serviceEndpointData?.errors !== undefined && serviceEndpointData?.errors.length > 0)
                }
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CreateIdentifierAddServiceEndpointContent
