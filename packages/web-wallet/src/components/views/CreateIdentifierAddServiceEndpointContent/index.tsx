import React, {FC, ReactElement} from 'react'
import {useTranslate} from '@refinedev/core'
import {ButtonIcon} from '@sphereon/ui-components.core'
import {FormView, PrimaryButton} from '@sphereon/ui-components.ssi-react'
import addServiceEndpointSchema from '../../../../src/schemas/data/addServiceEndpointSchema.json' assert {type: 'json'}
import addServiceEndpointUISchema from '../../../../src/schemas/ui/addServiceEndpointUISchema.json' assert {type: 'json'}
import SelectionField from '@components/fields/SelectionField'
import {useIdentifierCreateOutletContext} from '@typings/machine/identifiers/create'
import {useIdentifiersEditContext} from '@typings/machine/identifiers/edit'
import style from './index.module.css'
import {IdentifierServiceEndpoint, EInvoiceServiceData} from '@typings'
import {
  EINV_SERVICE_TYPES,
  isEInvoicingServiceType,
  getEInvoicingDefaults,
  generateInboxEndpoint,
  EInvServiceType,
} from '../../../constants/eInvoicingDefaults'
import {getAgent} from '@agent'

// eInvoice DCQL Query Definition - created on first eInvoicing endpoint
const EINVOICE_DCQL_QUERY = {
  queryId: 'eInvoice',
  name: 'eInvoice Credential',
  defaultPurpose: 'We need to verify your eInvoice credential for processing electronic invoices.',
  query: {
    credentials: [
      {
        id: 'einvoice',
        format: 'dc+sd-jwt',
        require_cryptographic_holder_binding: true,
        multiple: false,
        meta: {
          vct_values: ['urn:org:fides:einvoice:1'],
        },
        claims: [
          {path: ['invoice_id']},
          {path: ['invoice_date']},
          {path: ['due_date']},
          {path: ['currency_code']},
          {path: ['tax_exclusive_amount']},
          {path: ['tax_amount']},
          {path: ['tax_inclusive_amount']},
          {path: ['evidence']},
        ],
      },
    ],
  },
}

type Props = {
  mode: 'create' | 'edit'
}

// Get the base URL for generating eInvoicing endpoints
const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'
}

const CreateIdentifierAddServiceEndpointContent: FC<Props> = ({mode}): ReactElement => {
  const translate = useTranslate()
  const isEditMode = mode === 'edit'
  const [formKey, setFormKey] = React.useState(0)

  const context = isEditMode ? useIdentifiersEditContext() : useIdentifierCreateOutletContext()

  const {serviceEndpoints, onSetServiceEndpoints, serviceEndpointData, onServiceEndpointChange, capabilitiesInfo} = context

  const serviceEndpointsPossible = capabilitiesInfo?.identifierCapability?.serviceEndpoints

  console.log(`Service endpoints possible: ${serviceEndpointsPossible}`)

  const onRemoveServiceEndpoint = async (id: string): Promise<void> => {
    onSetServiceEndpoints(prevServiceEndpoints => prevServiceEndpoints.filter(serviceEndpoint => serviceEndpoint.id !== id))
  }

  /**
   * Build the eInvoice data object for eInvoicing services
   */
  const buildEInvoiceData = (data: Record<string, unknown>, serviceType: EInvServiceType): EInvoiceServiceData | null => {
    const defaults = getEInvoicingDefaults(serviceType)
    if (!defaults) {
      return null
    }

    const baseUrl = getBaseUrl()
    const serviceId = data.id as string
    const endpoint = generateInboxEndpoint(baseUrl, serviceId, serviceType)

    // Get inbox and folder names with defaults
    // inboxName defaults to "einvoices"
    // folderName defaults to serviceId (strip # prefix if present)
    const inboxName = (data.inboxName as string) || 'einvoices'
    const folderName = (data.folderName as string) || serviceId.replace(/^#/, '')

    const baseData: EInvoiceServiceData = {
      vct: defaults.vct,
      entityName: data.entityName as string,
      country: data.country as string,
      documentIdentifiers: [...defaults.documentIdentifiers],
      processIdentifiers: [...defaults.processIdentifiers],
      transportType: defaults.transportType,
      // Internal inbox configuration (not exposed in DID document)
      inboxName,
      folderName,
    }

    switch (serviceType) {
      case EINV_SERVICE_TYPES.DIRECT:
        return {
          ...baseData,
          endpoint,
        }

      case EINV_SERVICE_TYPES.PEPPOL:
        return {
          ...baseData,
          peppolParticipantId: data.peppolParticipantId as string,
          ...(data.peppolSmpUrl ? {peppolSmpUrl: data.peppolSmpUrl as string} : {}),
          ...(data.peppolAs4Endpoint ? {peppolAs4Endpoint: data.peppolAs4Endpoint as string} : {}),
        }

      case EINV_SERVICE_TYPES.PPF_FR:
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
   * Get the service endpoint URL for eInvoicing services
   */
  const getEInvoicingEndpointUrl = (data: Record<string, unknown>, serviceType: EInvServiceType): string => {
    const baseUrl = getBaseUrl()
    const serviceId = data.id as string
    return generateInboxEndpoint(baseUrl, serviceId, serviceType)
  }

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

    // If this is an eInvoicing service type, ensure the DCQL definition exists
    if (isEInvoicingServiceType(serviceType)) {
      await ensureEInvoiceDcqlDefinition()
    }

    let newServiceEndpoint: IdentifierServiceEndpoint

    // Check if this is an eInvoicing service type
    if (isEInvoicingServiceType(serviceType)) {
      const defaults = getEInvoicingDefaults(serviceType)
      const einvoiceData = buildEInvoiceData(data, serviceType)
      const endpointUrl = getEInvoicingEndpointUrl(data, serviceType)

      newServiceEndpoint = {
        id: data.id as string,
        type: serviceType,
        serviceEndpoint: endpointUrl,
        description: defaults?.description,
        einvoice: einvoiceData || undefined,
      }
    } else {
      // Use the standard serviceEndpoint value
      newServiceEndpoint = {
        id: data.id as string,
        type: serviceType,
        serviceEndpoint: data.serviceEndpoint as string,
      }
    }

    onSetServiceEndpoints(prevServiceEndpoints => [...prevServiceEndpoints, newServiceEndpoint])
    // TODO WALL-245 fix

    // Reset form by triggering change with empty data
    await onServiceEndpointChange({data: undefined, errors: []})
    setFormKey(prev => prev + 1)
  }

  const formatServiceEndpointValue = (serviceEndpoint: IdentifierServiceEndpoint) => {
    // For eInvoicing, show the endpoint URL
    if (serviceEndpoint.einvoice) {
      return serviceEndpoint.serviceEndpoint
    }

    // For standard endpoints, format the value
    return `[${serviceEndpoint.serviceEndpoint
      .split('\n')
      .map(value => `"${value}"`)
      .join(', ')}]`
  }

  const getServiceEndpointTypeLabel = (type: string): string => {
    // Provide user-friendly labels for eInvoicing types
    switch (type) {
      case EINV_SERVICE_TYPES.DIRECT:
        return 'eInvoicing - Direct'
      case EINV_SERVICE_TYPES.PEPPOL:
        return 'eInvoicing - PEPPOL'
      case EINV_SERVICE_TYPES.PPF_FR:
        return 'eInvoicing - France PPF'
      default:
        return type
    }
  }

  const getServiceEndpointsElements = (): Array<ReactElement> => {
    return serviceEndpoints.map((serviceEndpoint, index) => {
      const onRemove = async (): Promise<void> => {
        await onRemoveServiceEndpoint(serviceEndpoint.id)
      }

      const details = [
        {
          title: translate('create_identifier_service_endpoints_card_service_endpoint_type_label'),
          value: getServiceEndpointTypeLabel(serviceEndpoint.type),
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

      // Add eInvoicing-specific details if applicable
      if (serviceEndpoint.einvoice) {
        details.push({
          title: translate('create_identifier_service_endpoints_entity_name_label') || 'Entity Name',
          value: serviceEndpoint.einvoice.entityName,
        })
        details.push({
          title: translate('create_identifier_service_endpoints_country_label') || 'Country',
          value: serviceEndpoint.einvoice.country,
        })
        details.push({
          title: translate('create_identifier_service_endpoints_vct_label') || 'VCT',
          value: serviceEndpoint.einvoice.vct,
        })
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
