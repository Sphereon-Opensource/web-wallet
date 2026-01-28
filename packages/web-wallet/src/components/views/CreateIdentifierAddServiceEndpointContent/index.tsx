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
import {IdentifierServiceEndpoint, EInvoiceServiceData, EInvoiceDataItem} from '@typings'
import {
  EINV_SERVICE_TYPE,
  EINV_SUB_TYPES,
  isEInvoicingServiceType,
  isEInvoicingSubType,
  getEInvoicingDefaults,
  generateInboxEndpoint,
  EInvSubType,
} from '../../../constants/eInvoicingDefaults'
import {getAgent, getAgentBaseUrl} from '@agent'

// eInvoice DCQL Query Definition - created on first eInvoicing endpoint if not already present
// Uses 'einvoice' (lowercase) to match the config file definition
// Claims match the actual credential format from einvoiceCredentialIssuer.ts
const EINVOICE_DCQL_QUERY = {
  queryId: 'einvoice',
  name: 'eInvoice Credential',
  defaultPurpose: 'We need to verify your eInvoice credential for processing electronic invoices.',
  query: {
    credentials: [
      {
        id: 'einvoice-credential',
        format: 'dc+sd-jwt',
        require_cryptographic_holder_binding: false,
        multiple: false,
        meta: {
          vct_values: ['urn:org:fides:einvoice:1'],
        },
        claims: [
          {path: ['invoice_id']},
          {path: ['invoice_date']},
          {path: ['currency_code']},
          {path: ['payable_amount']},
          {path: ['seller_name']},
          {path: ['buyer_name']},
        ],
      },
    ],
  },
}

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

  /**
   * Build the eInvoice data item for the eInvoice array in the service endpoint
   */
  const buildEInvoiceDataItem = (data: Record<string, unknown>, subType: EInvSubType): EInvoiceDataItem | null => {
    const defaults = getEInvoicingDefaults(subType)
    if (!defaults) {
      return null
    }

    const baseData: EInvoiceDataItem = {
      entityName: data.entityName as string,
      country: data.country as string,
      documentIdentifiers: [...defaults.documentIdentifiers],
      processIdentifiers: [...defaults.processIdentifiers],
      transportType: defaults.transportType,
    }

    switch (subType) {
      case EINV_SUB_TYPES.DIRECT:
        return baseData

      case EINV_SUB_TYPES.PEPPOL:
        return {
          ...baseData,
          peppolParticipantId: data.peppolParticipantId as string,
          ...(data.peppolSmpUrl ? {peppolSmpUrl: data.peppolSmpUrl as string} : {}),
          ...(data.peppolAs4Endpoint ? {peppolAs4Endpoint: data.peppolAs4Endpoint as string} : {}),
        }

      case EINV_SUB_TYPES.PPF_FR:
        // Parse comma-separated recipient IDs into an array
        const recipientIdsStr = data.ppfRecipientIds as string
        const ppfRecipientIds = recipientIdsStr
          ? recipientIdsStr
              .split(',')
              .map(id => id.trim())
              .filter(id => id.length > 0)
          : []

        return {
          ...baseData,
          ppfPlatformId: data.ppfPlatformId as string,
          ppfRecipientIds,
          ppfMode: data.ppfMode as 'pdp' | 'direct' | 'via-pdp',
          ...(data.ppfApiEndpoint ? {ppfApiEndpoint: data.ppfApiEndpoint as string} : {}),
        }

      default:
        return null
    }
  }

  /**
   * Build the internal eInvoice service data (includes inbox configuration)
   */
  const buildInternalServiceData = (data: Record<string, unknown>, subType: EInvSubType): EInvoiceServiceData | null => {
    const dataItem = buildEInvoiceDataItem(data, subType)
    if (!dataItem) {
      return null
    }

    // Get inbox and folder names with defaults
    const serviceId = data.id as string
    const inboxName = (data.inboxName as string) || 'einvoices'
    const folderName = (data.folderName as string) || serviceId.replace(/^#/, '')

    return {
      ...dataItem,
      inboxName,
      folderName,
    }
  }

  /**
   * Get the service endpoint URL for eInvoicing services.
   * Uses the DID's web hostname to construct the public URL.
   */
  const getEInvoicingEndpointUrl = (data: Record<string, unknown>): string => {
    const baseUrl = getServiceEndpointBaseUrl()
    const serviceId = data.id as string
    const inboxName = (data.inboxName as string) || 'einvoices'
    const folderName = (data.folderName as string) || serviceId.replace(/^#/, '')
    return generateInboxEndpoint(baseUrl, inboxName, folderName)
  }

  /**
   * Ensure the eInvoice DCQL definition exists in the RP manager persistence.
   * Only creates it if it doesn't already exist.
   */
  /**
   * Ensure the eInvoice DCQL definition exists in the RP manager persistence.
   * Only creates it if it doesn't already exist.
   */
  const ensureEInvoiceDcqlDefinition = async (): Promise<void> => {
    try {
      const agent = getAgent()
      // Check if the eInvoice definition already exists
      const existingDefinitions = await agent.pdmGetDefinitions({
        filter: [{queryId: EINVOICE_DCQL_QUERY.queryId}],
      })

      if (existingDefinitions.length === 0) {
        // Create the eInvoice DCQL definition
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await agent.pdmPersistDefinition({
          definitionItem: {
            queryId: EINVOICE_DCQL_QUERY.queryId,
            version: '1',
            name: EINVOICE_DCQL_QUERY.name,
            purpose: EINVOICE_DCQL_QUERY.defaultPurpose,
            query: EINVOICE_DCQL_QUERY.query as any,
          },
        })
        console.log('Created eInvoice DCQL definition')
      } else {
        console.log('eInvoice DCQL definition already exists')
      }
    } catch (error) {
      console.error('Failed to ensure eInvoice DCQL definition:', error)
      // Don't block service endpoint creation if DCQL setup fails
    }
  }

  const onAddServiceEndpoint = async (): Promise<void> => {
    if (!serviceEndpointData?.data) {
      return
    }

    const data = serviceEndpointData.data
    const serviceType = data.type as string

    let newServiceEndpoint: IdentifierServiceEndpoint

    // Check if this is an eInvoicing service type (type === "eInvoice")
    if (isEInvoicingServiceType(serviceType)) {
      const subType = data.subType as EInvSubType
      if (!isEInvoicingSubType(subType)) {
        console.error('Invalid eInvoicing subType:', subType)
        return
      }

      // Ensure the DCQL definition exists
      await ensureEInvoiceDcqlDefinition()

      const defaults = getEInvoicingDefaults(subType)
      const eInvoiceDataItem = buildEInvoiceDataItem(data, subType)
      const internalData = buildInternalServiceData(data, subType)
      const endpointUrl = getEInvoicingEndpointUrl(data)

      newServiceEndpoint = {
        id: data.id as string,
        type: EINV_SERVICE_TYPE, // Always "eInvoice"
        serviceEndpoint: endpointUrl,
        description: defaults?.description,
        subType: subType, // "Direct", "Peppol", "PPF-FR"
        eInvoice: eInvoiceDataItem ? [eInvoiceDataItem] : undefined, // Capital I, array
        _internal: internalData || undefined, // For inbox creation
      }
      console.log('[CreateIdentifierAddServiceEndpointContent] Created service endpoint:', {
        id: newServiceEndpoint.id,
        type: newServiceEndpoint.type,
        subType: newServiceEndpoint.subType,
        hasEInvoice: !!newServiceEndpoint.eInvoice,
        hasInternal: !!newServiceEndpoint._internal,
      })
    } else {
      // Use the standard serviceEndpoint value
      newServiceEndpoint = {
        id: data.id as string,
        type: serviceType,
        serviceEndpoint: data.serviceEndpoint as string,
      }
    }

    onSetServiceEndpoints(prevServiceEndpoints => [...prevServiceEndpoints, newServiceEndpoint])

    // Reset form by triggering change with empty data
    await onServiceEndpointChange({data: undefined, errors: []})
    setFormKey(prev => prev + 1)
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
