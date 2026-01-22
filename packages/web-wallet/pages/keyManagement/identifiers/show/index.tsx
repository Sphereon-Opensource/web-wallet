import React, {FC, ReactElement, useCallback, useEffect, useMemo, useState} from 'react'
import {useParams, useNavigate} from 'react-router-dom'
import {HttpError, useOne, useTranslation} from '@refinedev/core'
import {IIdentifier} from '@veramo/core'
import {DIDResolutionResult} from 'did-resolver'
import {FormView, PrimaryButton} from '@sphereon/ui-components.ssi-react'
import {ButtonIcon} from '@sphereon/ui-components.core'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import {staticPropsWithSST} from '@/src/i18n/server'
import {getAgent, resolver, getAgentBaseUrl} from '@agent'
import {getDidMethodFromDID} from '@helpers/DID/DIDService'
import {DataResource, EInvoiceServiceData} from '@typings'
import {isEInvoicingServiceType, getEInvoicingDefaults, generateInboxEndpoint, EInvServiceType, EINV_SERVICE_TYPES} from '@/src/constants/eInvoicingDefaults'
import addServiceEndpointSchema from '@/src/schemas/data/addServiceEndpointSchema.json' assert {type: 'json'}
import addServiceEndpointUISchema from '@/src/schemas/ui/addServiceEndpointUISchema.json' assert {type: 'json'}
import style from './index.module.css'

// eInvoice DCQL Query Definition - created on first eInvoicing endpoint if not already present
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

enum IdentifierDetailsTabRoute {
  OVERVIEW = 'overview',
  KEYS = 'keys',
  SERVICES = 'services',
  CONTACT = 'contact',
  JSON = 'json',
}

interface KeyDisplayItem {
  kid: string
  type: string
  alias?: string
  purposes: string[]
}

interface ServiceDisplayItem {
  id: string
  type: string
  serviceEndpoint: string
  description?: string
  einvoice?: any
}

const ShowIdentifierDetails: FC = (): ReactElement => {
  const {translate} = useTranslation()
  const params = useParams()
  const navigate = useNavigate()
  const {id} = params
  const decodedId = id ? decodeURIComponent(id) : ''

  const [activeTab, setActiveTab] = useState<IdentifierDetailsTabRoute>(IdentifierDetailsTabRoute.OVERVIEW)
  const [resolvedDocument, setResolvedDocument] = useState<DIDResolutionResult | null>(null)
  const [isResolving, setIsResolving] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [resolveVersion, setResolveVersion] = useState(0) // Incremented to trigger re-resolution

  // Keys state
  const [isAddingKey, setIsAddingKey] = useState(false)
  const [newKeyType, setNewKeyType] = useState<string>('Secp256k1')
  const [newKeyAlias, setNewKeyAlias] = useState<string>('')
  const [newKeyPurposes, setNewKeyPurposes] = useState<string[]>(['assertionMethod', 'authentication'])

  // Services state
  const [isAddingService, setIsAddingService] = useState(false)
  const [serviceFormData, setServiceFormData] = useState<{data?: Record<string, unknown>; errors: any[]}>({errors: []})
  const [serviceFormKey, setServiceFormKey] = useState(0)
  const [agentServiceEndpointBaseUrl, setAgentServiceEndpointBaseUrl] = useState<string | null>(null)
  const [selectedServiceDetail, setSelectedServiceDetail] = useState<ServiceDisplayItem | null>(null)

  // Contact state
  const [associatedContact, setAssociatedContact] = useState<{
    id: string
    displayName: string
    legalName?: string
    email?: string
    phone?: string
    partyType?: string
  } | null>(null)
  const [isLoadingContact, setIsLoadingContact] = useState(false)

  // Fetch the service endpoint base URL from the agent on mount
  useEffect(() => {
    const fetchBaseUrl = async () => {
      try {
        const agentBaseUrl = getAgentBaseUrl()
        const response = await fetch(`${agentBaseUrl}/api/config/service-endpoint-base-url`)
        if (response.ok) {
          const data = await response.json()
          if (data.baseUrl) {
            setAgentServiceEndpointBaseUrl(data.baseUrl)
          }
        }
      } catch (error) {
        console.warn('Failed to fetch service endpoint base URL from agent:', error)
      }
    }
    fetchBaseUrl()
  }, [])

  const {
    isLoading,
    isError,
    data: identifierData,
    refetch,
  } = useOne<IIdentifier, HttpError>({
    resource: DataResource.IDENTIFIERS,
    id: decodedId,
  })

  const identifier = identifierData?.data

  // Fetch associated contact when identifier is loaded
  useEffect(() => {
    if (!identifier?.did) return

    const fetchContact = async () => {
      setIsLoadingContact(true)
      try {
        const agentBaseUrl = getAgentBaseUrl()
        const response = await fetch(`${agentBaseUrl}/parties`)
        if (response.ok) {
          const parties = await response.json()
          // Find a party that has an identity matching this DID
          for (const party of parties) {
            const identities = party.identities || []
            const matchingIdentity = identities.find((identity: any) => {
              const identityDid = identity?.identifier?.correlationId || identity?.identifier?.id
              return identityDid === identifier.did
            })
            if (matchingIdentity) {
              const contact = party.contact
              const electronicAddresses = contact?.electronicAddresses || []
              const email = electronicAddresses.find((ea: any) => ea.type === 'email')?.electronicAddress
              const phone = electronicAddresses.find((ea: any) => ea.type === 'phone')?.electronicAddress
              setAssociatedContact({
                id: party.id,
                displayName: contact?.displayName || party.legalName || party.displayName || 'Unknown',
                legalName: party.legalName,
                email,
                phone,
                partyType: party.partyType?.name,
              })
              break
            }
          }
        }
      } catch (error) {
        console.warn('Failed to fetch associated contact:', error)
      } finally {
        setIsLoadingContact(false)
      }
    }

    fetchContact()
  }, [identifier?.did])

  // Resolve DID document (re-resolves when resolveVersion changes)
  useEffect(() => {
    if (!identifier?.did) return

    const resolveDid = async () => {
      setIsResolving(true)
      setResolveError(null)
      try {
        const result = await resolver.resolve(identifier.did)
        setResolvedDocument(result)
      } catch (error) {
        console.error('Failed to resolve DID:', error)
        setResolveError(error instanceof Error ? error.message : 'Failed to resolve DID')
      } finally {
        setIsResolving(false)
      }
    }

    resolveDid()
  }, [identifier?.did, resolveVersion])

  const didMethod = useMemo(() => {
    if (!identifier?.did) return ''
    return getDidMethodFromDID(identifier.did)
  }, [identifier?.did])

  const isEditable = useMemo(() => {
    return identifier?.did?.startsWith('did:web') ?? false
  }, [identifier?.did])

  const keys: KeyDisplayItem[] = useMemo(() => {
    if (!identifier?.keys) return []
    return identifier.keys.map(key => ({
      kid: key.kid,
      type: key.type,
      alias: key.meta?.alias,
      purposes: key.meta?.purposes || [],
    }))
  }, [identifier?.keys])

  const services: ServiceDisplayItem[] = useMemo(() => {
    if (!identifier?.services) return []
    return identifier.services.map(service => ({
      id: service.id,
      type: service.type,
      serviceEndpoint: typeof service.serviceEndpoint === 'string'
        ? service.serviceEndpoint
        : Array.isArray(service.serviceEndpoint)
          ? service.serviceEndpoint.join(', ')
          : JSON.stringify(service.serviceEndpoint),
      description: (service as any).description,
      einvoice: (service as any).einvoice,
    }))
  }, [identifier?.services])

  /**
   * Get the base URL for service endpoints.
   * Priority:
   * 1. Use EXTERNAL_HOSTNAME from agent (fetched via API)
   * 2. Fall back to deriving from the did:web hostname
   * 3. Final fallback to agent base URL
   */
  const getServiceEndpointBaseUrl = useCallback((): string => {
    // First, try the URL fetched from the agent (based on EXTERNAL_HOSTNAME)
    if (agentServiceEndpointBaseUrl && !agentServiceEndpointBaseUrl.includes('localhost')) {
      return agentServiceEndpointBaseUrl
    }

    // Extract hostname from did:web
    if (identifier?.did?.startsWith('did:web:')) {
      const didWithoutPrefix = identifier.did.substring('did:web:'.length)
      const hostName = decodeURIComponent(didWithoutPrefix.split(':')[0])
      const protocol = hostName.includes('localhost') ? 'http' : 'https'
      const pathParts = didWithoutPrefix.split(':').slice(1)
      const path = pathParts.length > 0 ? `/${pathParts.join('/')}` : ''
      return `${protocol}://${hostName}${path}`
    }

    // Final fallback - use agent base URL
    return getAgentBaseUrl()
  }, [agentServiceEndpointBaseUrl, identifier?.did])

  /**
   * Build the eInvoice data object for eInvoicing services
   */
  const buildEInvoiceData = useCallback((data: Record<string, unknown>, serviceType: EInvServiceType): EInvoiceServiceData | null => {
    const defaults = getEInvoicingDefaults(serviceType)
    if (!defaults) {
      return null
    }

    const serviceId = data.id as string
    const inboxName = (data.inboxName as string) || 'einvoices'
    const folderName = (data.folderName as string) || serviceId.replace(/^#/, '')

    const baseUrl = getServiceEndpointBaseUrl()
    const endpoint = generateInboxEndpoint(baseUrl, inboxName, folderName)

    const baseData: EInvoiceServiceData = {
      vct: defaults.vct,
      entityName: data.entityName as string,
      country: data.country as string,
      documentIdentifiers: [...defaults.documentIdentifiers],
      processIdentifiers: [...defaults.processIdentifiers],
      transportType: defaults.transportType,
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
  }, [getServiceEndpointBaseUrl])

  /**
   * Get the service endpoint URL for eInvoicing services.
   */
  const getEInvoicingEndpointUrl = useCallback((data: Record<string, unknown>): string => {
    const baseUrl = getServiceEndpointBaseUrl()
    const serviceId = data.id as string
    const inboxName = (data.inboxName as string) || 'einvoices'
    const folderName = (data.folderName as string) || serviceId.replace(/^#/, '')
    return generateInboxEndpoint(baseUrl, inboxName, folderName)
  }, [getServiceEndpointBaseUrl])

  /**
   * Ensure the eInvoice DCQL definition exists in the RP manager persistence.
   */
  const ensureEInvoiceDcqlDefinition = useCallback(async (): Promise<void> => {
    try {
      const agent = getAgent()
      const existingDefinitions = await agent.pdmGetDefinitions({
        filter: [{queryId: EINVOICE_DCQL_QUERY.queryId}],
      })

      if (existingDefinitions.length === 0) {
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
      }
    } catch (error) {
      console.error('Failed to ensure eInvoice DCQL definition:', error)
    }
  }, [])

  // Handle service form state change
  const handleServiceFormChange = useCallback((formState: {data?: Record<string, unknown>; errors: any[]}) => {
    setServiceFormData(formState)
  }, [])

  // Handle key removal
  const handleRemoveKey = useCallback(async (kidToRemove: string) => {
    if (!identifier || !isEditable) return
    if (!confirm(translate('identifier_details_confirm_remove_key', 'Are you sure you want to remove this key?') as string)) return

    try {
      await getAgent().didManagerRemoveKey({
        did: identifier.did,
        kid: kidToRemove,
        options: {},
      })
      await refetch()
      setResolveVersion(v => v + 1) // Trigger DID document re-resolution
    } catch (error) {
      console.error('Failed to remove key:', error)
      alert(translate('identifier_details_remove_key_error', 'Failed to remove key') as string)
    }
  }, [identifier, isEditable, refetch, translate])

  // Handle add key
  const handleAddKey = useCallback(async () => {
    if (!identifier || !isEditable || !newKeyType || newKeyPurposes.length === 0) return

    try {
      // Create a new key
      const newKey = await getAgent().keyManagerCreate({
        kms: 'local',
        type: newKeyType,
        meta: {
          alias: newKeyAlias || undefined,
          purposes: newKeyPurposes,
        },
      })

      // Add it to the identifier
      await getAgent().didManagerAddKey({
        did: identifier.did,
        key: newKey,
        options: {},
      })

      setIsAddingKey(false)
      setNewKeyType('Secp256k1')
      setNewKeyAlias('')
      setNewKeyPurposes(['assertionMethod', 'authentication'])
      await refetch()
      setResolveVersion(v => v + 1) // Trigger DID document re-resolution
    } catch (error) {
      console.error('Failed to add key:', error)
      alert(translate('identifier_details_add_key_error', 'Failed to add key') as string)
    }
  }, [identifier, isEditable, newKeyType, newKeyAlias, newKeyPurposes, refetch, translate])

  // Handle service removal
  const handleRemoveService = useCallback(async (serviceIdToRemove: string) => {
    if (!identifier || !isEditable) return
    if (!confirm(translate('identifier_details_confirm_remove_service', 'Are you sure you want to remove this service endpoint?') as string)) return

    try {
      await getAgent().didManagerRemoveService({
        did: identifier.did,
        id: serviceIdToRemove,
      })
      await refetch()
      setResolveVersion(v => v + 1) // Trigger DID document re-resolution
    } catch (error) {
      console.error('Failed to remove service:', error)
      alert(translate('identifier_details_remove_service_error', 'Failed to remove service endpoint') as string)
    }
  }, [identifier, isEditable, refetch, translate])

  // Handle add service
  const handleAddService = useCallback(async () => {
    if (!identifier || !isEditable || !serviceFormData?.data) return

    const data = serviceFormData.data
    const serviceType = data.type as string
    const serviceId = data.id as string

    if (!serviceId || !serviceType) return

    try {
      // If this is an eInvoicing service type, ensure the DCQL definition exists
      if (isEInvoicingServiceType(serviceType)) {
        await ensureEInvoiceDcqlDefinition()
      }

      let service: any

      if (isEInvoicingServiceType(serviceType)) {
        const defaults = getEInvoicingDefaults(serviceType)
        const einvoiceData = buildEInvoiceData(data, serviceType)
        const endpointUrl = getEInvoicingEndpointUrl(data)

        service = {
          id: serviceId.startsWith('#') ? serviceId : `#${serviceId}`,
          type: serviceType,
          serviceEndpoint: endpointUrl,
          description: defaults?.description,
          einvoice: einvoiceData || undefined,
        }
      } else {
        service = {
          id: serviceId.startsWith('#') ? serviceId : `#${serviceId}`,
          type: serviceType,
          serviceEndpoint: data.serviceEndpoint as string,
        }
      }

      await getAgent().didManagerAddService({
        did: identifier.did,
        service: {
          id: service.id,
          type: service.type,
          serviceEndpoint: service.serviceEndpoint,
          description: service.description,
        },
      })

      // Store eInvoice metadata separately (Veramo doesn't persist custom properties)
      if (service.einvoice) {
        try {
          await getAgent().updateServiceMetadata({
            serviceId: service.id,
            did: identifier.did,
            metadata: {einvoice: service.einvoice},
          })
          console.log(`Updated metadata for service ${service.id}`)
        } catch (metadataError) {
          console.warn(`Failed to update metadata for service ${service.id}:`, metadataError)
        }

        // Ensure inbox and folder exist for eInvoicing services
        const agentBaseUrl = getAgentBaseUrl()
        const inboxName = service.einvoice.inboxName || 'einvoices'
        const folderName = service.einvoice.folderName || service.id.replace(/^#/, '')

        try {
          // Create inbox (will get 409 if it already exists)
          await fetch(`${agentBaseUrl}/inbox`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name: inboxName, did: identifier.did, description: `eInvoicing inbox for ${identifier.did}`}),
          })

          // Create folder
          await fetch(`${agentBaseUrl}/inbox/${inboxName}/folders`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              name: folderName,
              dcqlQueryId: 'einvoice',
              description: `eInvoicing folder for service ${service.id}`,
            }),
          })
        } catch (inboxError) {
          console.warn(`Failed to create inbox/folder:`, inboxError)
        }
      }

      setIsAddingService(false)
      setServiceFormData({errors: []})
      setServiceFormKey(prev => prev + 1)
      await refetch()
      setResolveVersion(v => v + 1) // Trigger DID document re-resolution
    } catch (error) {
      console.error('Failed to add service:', error)
      alert(translate('identifier_details_add_service_error', 'Failed to add service endpoint') as string)
    }
  }, [identifier, isEditable, serviceFormData, refetch, translate, ensureEInvoiceDcqlDefinition, buildEInvoiceData, getEInvoicingEndpointUrl])

  // Navigate to edit page
  const handleEdit = useCallback(() => {
    if (!identifier?.did) return
    navigate(`/key-management/identifiers/edit/${encodeURIComponent(identifier.did)}`)
  }, [identifier?.did, navigate])

  // Copy DID to clipboard
  const handleCopyDid = useCallback(() => {
    if (!identifier?.did) return
    navigator.clipboard.writeText(identifier.did)
  }, [identifier?.did])

  if (isLoading) {
    return (
      <div className={style.pageContainer}>
        <PageHeaderBar path={translate('identifier_details_path_label', 'Key Management / Identifiers')} />
        <div className={style.loadingState}>
          <div className={style.spinner} />
          <span>{translate('data_provider_loading_message', 'Loading...')}</span>
        </div>
      </div>
    )
  }

  if (isError || !identifier) {
    return (
      <div className={style.pageContainer}>
        <PageHeaderBar path={translate('identifier_details_path_label', 'Key Management / Identifiers')} />
        <div className={style.errorBanner}>{translate('data_provider_error_message', 'Failed to load data')}</div>
      </div>
    )
  }

  // Get service type label
  const getServiceTypeLabel = (type: string): string => {
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

  // Build tabs array
  const tabs: {id: IdentifierDetailsTabRoute; label: string; count?: number}[] = [
    {id: IdentifierDetailsTabRoute.OVERVIEW, label: translate('identifier_details_overview_tab', 'Overview') as string},
    {id: IdentifierDetailsTabRoute.KEYS, label: translate('identifier_details_keys_tab', 'Keys') as string, count: keys.length},
    {id: IdentifierDetailsTabRoute.SERVICES, label: translate('identifier_details_services_tab', 'Services') as string, count: services.length},
    {id: IdentifierDetailsTabRoute.CONTACT, label: translate('identifier_details_contact_tab', 'Contact') as string, count: associatedContact ? 1 : 0},
    {id: IdentifierDetailsTabRoute.JSON, label: translate('identifier_details_json_tab', 'DID Document') as string},
  ]

  const getOverviewContent = (): ReactElement => {
    return (
      <div className={style.overviewContent}>
        {/* Identifier Card */}
        <div className={style.identifierCard}>
          <div className={style.identifierCardHeader}>
            <div className={style.identifierIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <div className={style.identifierInfo}>
              <span className={style.identifierAlias}>{identifier.alias || didMethod}</span>
              <span className={style.identifierMethod}>{didMethod}</span>
            </div>
            <span className={style.typeBadge}>DID</span>
          </div>
        </div>

        {/* Metadata Section */}
        <div className={style.metadataSection}>
          <div className={style.metadataBorder} />
          <div className={style.metadataContent}>
            <div className={style.metadataTitle}>{translate('identifier_details_information', 'Information')}</div>
            <div className={style.metadataRow}>
              <span className={style.metadataLabel}>{translate('identifier_details_method', 'Method')}</span>
              <span className={style.metadataValue}>{didMethod}</span>
            </div>
            {identifier.alias && (
              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>{translate('identifier_details_alias', 'Alias')}</span>
                <span className={style.metadataValue}>{identifier.alias}</span>
              </div>
            )}
            <div className={style.metadataRow}>
              <span className={style.metadataLabel}>{translate('identifier_details_provider', 'Provider')}</span>
              <span className={style.metadataValue}>{identifier.provider || 'Unknown'}</span>
            </div>
            <div className={style.metadataRow}>
              <span className={style.metadataLabel}>{translate('identifier_details_keys_count', 'Keys')}</span>
              <span className={style.metadataValue}>{keys.length}</span>
            </div>
            <div className={style.metadataRow}>
              <span className={style.metadataLabel}>{translate('identifier_details_services_count', 'Services')}</span>
              <span className={style.metadataValue}>{services.length}</span>
            </div>
          </div>
        </div>

        {/* DID Value Section */}
        <div className={style.didSection}>
          <div className={style.didTitle}>{translate('identifier_details_did_value', 'DID Value')}</div>
          <div className={style.didFullValue}>{identifier.did}</div>
          <button className={style.copyButton} onClick={handleCopyDid}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            {translate('action_copy', 'Copy DID')}
          </button>
        </div>
      </div>
    )
  }

  const getKeysContent = (): ReactElement => {
    return (
      <div className={style.tabContent}>
        <div className={style.sectionHeader}>
          <h3 className={style.sectionTitle}>{translate('identifier_details_keys_title', 'Keys')}</h3>
          {isEditable && (
            <button className={style.addButton} onClick={() => setIsAddingKey(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {translate('identifier_details_add_key', 'Add Key')}
            </button>
          )}
        </div>

        {/* Add Key Form */}
        {isAddingKey && (
          <div className={style.addForm}>
            <div className={style.addFormTitle}>{translate('identifier_details_add_new_key', 'Add New Key')}</div>
            <div className={style.formField}>
              <label className={style.formLabel}>{translate('identifier_details_key_type', 'Key Type')}</label>
              <select
                className={style.formSelect}
                value={newKeyType}
                onChange={(e) => setNewKeyType(e.target.value)}
              >
                <option value="Secp256k1">Secp256k1</option>
                <option value="Secp256r1">Secp256r1</option>
                <option value="Ed25519">Ed25519</option>
                <option value="X25519">X25519</option>
                <option value="RSA">RSA</option>
              </select>
            </div>
            <div className={style.formField}>
              <label className={style.formLabel}>{translate('identifier_details_key_alias', 'Alias (optional)')}</label>
              <input
                type="text"
                className={style.formInput}
                value={newKeyAlias}
                onChange={(e) => setNewKeyAlias(e.target.value)}
                placeholder="Enter alias..."
              />
            </div>
            <div className={style.formField}>
              <label className={style.formLabel}>{translate('identifier_details_key_purposes', 'Verification Method Relationships')}</label>
              <div className={style.checkboxGroup}>
                {[
                  {value: 'authentication', label: 'Authentication'},
                  {value: 'assertionMethod', label: 'Assertion Method'},
                  {value: 'capabilityInvocation', label: 'Capability Invocation'},
                  {value: 'capabilityDelegation', label: 'Capability Delegation'},
                  {value: 'keyAgreement', label: 'Key Agreement'},
                ].map((purpose) => (
                  <label key={purpose.value} className={style.checkboxLabel}>
                    <input
                      type="checkbox"
                      className={style.checkbox}
                      checked={newKeyPurposes.includes(purpose.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewKeyPurposes([...newKeyPurposes, purpose.value])
                        } else {
                          setNewKeyPurposes(newKeyPurposes.filter(p => p !== purpose.value))
                        }
                      }}
                    />
                    {purpose.label}
                  </label>
                ))}
              </div>
            </div>
            <div className={style.formActions}>
              <button className={style.cancelButton} onClick={() => {
                setIsAddingKey(false)
                setNewKeyPurposes(['assertionMethod', 'authentication'])
              }}>
                {translate('action_cancel', 'Cancel')}
              </button>
              <button className={style.submitButton} onClick={handleAddKey} disabled={newKeyPurposes.length === 0}>
                {translate('action_add', 'Add')}
              </button>
            </div>
          </div>
        )}

        {/* Keys List */}
        {keys.length === 0 ? (
          <div className={style.emptyText}>{translate('identifier_details_no_keys', 'No keys configured')}</div>
        ) : (
          <div className={style.itemsGrid}>
            {keys.map((key) => (
              <div key={key.kid} className={style.itemCard}>
                <div className={style.itemCardHeader}>
                  <div className={style.itemCardAccent} />
                  <div className={style.itemCardInfo}>
                    <div className={style.itemCardType}>{key.type}</div>
                    <div className={style.itemCardTitle}>{key.alias || key.kid.substring(0, 20) + '...'}</div>
                  </div>
                  {isEditable && (
                    <button
                      className={style.removeButton}
                      onClick={() => handleRemoveKey(key.kid)}
                      title={translate('action_remove', 'Remove') as string}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className={style.itemCardBody}>
                  <div className={style.itemCardField}>
                    <span className={style.itemCardFieldLabel}>{translate('identifier_details_key_id', 'Key ID')}</span>
                    <span className={style.itemCardFieldValue}>{key.kid}</span>
                  </div>
                  {key.purposes && key.purposes.length > 0 && (
                    <div className={style.itemCardField}>
                      <span className={style.itemCardFieldLabel}>{translate('identifier_details_key_purposes', 'Purposes')}</span>
                      <span className={style.itemCardFieldValue}>{key.purposes.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const getServicesContent = (): ReactElement => {
    return (
      <div className={style.tabContent}>
        <div className={style.sectionHeader}>
          <h3 className={style.sectionTitle}>{translate('identifier_details_services_title', 'Service Endpoints')}</h3>
          {isEditable && (
            <button className={style.addButton} onClick={() => setIsAddingService(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {translate('identifier_details_add_service', 'Add Service')}
            </button>
          )}
        </div>

        {/* Add Service Form */}
        {isAddingService && (
          <div className={style.addForm}>
            <div className={style.addFormTitle}>{translate('identifier_details_add_new_service', 'Add New Service Endpoint')}</div>
            <div className={style.formViewContainer}>
              <FormView
                key={serviceFormKey}
                schema={addServiceEndpointSchema}
                uiSchema={addServiceEndpointUISchema}
                onFormStateChange={handleServiceFormChange}
                data={serviceFormData?.data}
              />
            </div>
            <div className={style.formActions}>
              <button
                className={style.cancelButton}
                onClick={() => {
                  setIsAddingService(false)
                  setServiceFormData({errors: []})
                  setServiceFormKey(prev => prev + 1)
                }}
              >
                {translate('action_cancel', 'Cancel')}
              </button>
              <PrimaryButton
                caption={translate('action_add', 'Add') as string}
                onClick={handleAddService}
                icon={ButtonIcon.ADD}
                disabled={
                  !serviceFormData?.data ||
                  !serviceFormData.data.id ||
                  !serviceFormData.data.type ||
                  (serviceFormData?.errors !== undefined && serviceFormData?.errors.length > 0)
                }
              />
            </div>
          </div>
        )}

        {/* Services List */}
        {services.length === 0 ? (
          <div className={style.emptyText}>{translate('identifier_details_no_services', 'No service endpoints configured')}</div>
        ) : (
          <div className={style.itemsGrid}>
            {services.map((service) => (
              <div key={service.id} className={style.itemCard}>
                <div className={style.itemCardHeader}>
                  <div className={`${style.itemCardAccent} ${isEInvoicingServiceType(service.type) ? style.itemCardAccentSuccess : ''}`} />
                  <div className={style.itemCardInfo}>
                    <div className={style.itemCardType}>{getServiceTypeLabel(service.type)}</div>
                    <div className={style.itemCardTitle}>{service.id}</div>
                  </div>
                  <div className={style.itemCardActions}>
                    <button
                      className={style.viewButton}
                      onClick={() => setSelectedServiceDetail(service)}
                      title={translate('action_view_details', 'View Details') as string}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                    {isEditable && (
                      <button
                        className={style.removeButton}
                        onClick={() => handleRemoveService(service.id)}
                        title={translate('action_remove', 'Remove') as string}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                <div className={style.itemCardBody}>
                  <div className={style.itemCardField}>
                    <span className={style.itemCardFieldLabel}>{translate('identifier_details_endpoint', 'Endpoint')}</span>
                    <span className={style.itemCardFieldValue}>{service.serviceEndpoint}</span>
                  </div>
                  {service.einvoice && (
                    <div className={style.itemCardField}>
                      <span className={style.itemCardFieldLabel}>{translate('identifier_details_entity_name', 'Entity Name')}</span>
                      <span className={style.itemCardFieldValue}>{service.einvoice.entityName || '-'}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const getContactContent = (): ReactElement => {
    return (
      <div className={style.tabContent}>
        <div className={style.sectionHeader}>
          <h3 className={style.sectionTitle}>{translate('identifier_details_associated_contact', 'Associated Contact')}</h3>
        </div>

        {isLoadingContact ? (
          <div className={style.loadingState}>
            <div className={style.spinner} />
            <span>{translate('identifier_details_loading_contact', 'Loading contact...')}</span>
          </div>
        ) : associatedContact ? (
          <div className={style.contactCard}>
            <div className={style.contactCardHeader}>
              <div className={style.contactAvatar}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className={style.contactInfo}>
                <div className={style.contactName}>{associatedContact.displayName}</div>
                {associatedContact.partyType && (
                  <div className={style.contactType}>{associatedContact.partyType}</div>
                )}
              </div>
              <button
                className={style.viewContactButton}
                onClick={() => navigate(`/contacts/${associatedContact.id}`)}
                title={translate('action_view_contact', 'View Contact') as string}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                {translate('action_view', 'View')}
              </button>
            </div>
            <div className={style.contactDetails}>
              {associatedContact.legalName && (
                <div className={style.contactDetailRow}>
                  <span className={style.contactDetailLabel}>{translate('contact_legal_name', 'Legal Name')}</span>
                  <span className={style.contactDetailValue}>{associatedContact.legalName}</span>
                </div>
              )}
              {associatedContact.email && (
                <div className={style.contactDetailRow}>
                  <span className={style.contactDetailLabel}>{translate('contact_email', 'Email')}</span>
                  <span className={style.contactDetailValue}>{associatedContact.email}</span>
                </div>
              )}
              {associatedContact.phone && (
                <div className={style.contactDetailRow}>
                  <span className={style.contactDetailLabel}>{translate('contact_phone', 'Phone')}</span>
                  <span className={style.contactDetailValue}>{associatedContact.phone}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={style.noContactContainer}>
            <div className={style.noContactIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
                <line x1="3" y1="3" x2="21" y2="21" />
              </svg>
            </div>
            <div className={style.noContactText}>
              {translate('identifier_details_no_associated_contact', 'No contact is associated with this identifier')}
            </div>
            <div className={style.noContactHint}>
              {translate('identifier_details_contact_hint', 'To associate a contact, add this DID as an identity to an existing contact or create a new contact with this DID.')}
            </div>
          </div>
        )}
      </div>
    )
  }

  const getJsonContent = (): ReactElement => {
    return (
      <div className={style.tabContent}>
        <div className={style.sectionHeader}>
          <h3 className={style.sectionTitle}>{translate('identifier_details_did_document', 'DID Document')}</h3>
          {resolvedDocument && (
            <button
              className={style.copyButton}
              onClick={() => navigator.clipboard.writeText(JSON.stringify(resolvedDocument, null, 2))}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              {translate('action_copy_json', 'Copy JSON')}
            </button>
          )}
        </div>

        {isResolving ? (
          <div className={style.loadingState}>
            <div className={style.spinner} />
            <span>{translate('identifier_details_resolving', 'Resolving DID document...')}</span>
          </div>
        ) : resolveError ? (
          <div className={style.errorBox}>
            <div className={style.errorTitle}>{translate('identifier_details_resolve_error', 'Failed to resolve DID document')}</div>
            <div className={style.errorMessage}>{resolveError}</div>
          </div>
        ) : resolvedDocument ? (
          <div className={style.jsonContainer}>
            <pre className={style.jsonContent}>
              {JSON.stringify(resolvedDocument, null, 2)}
            </pre>
          </div>
        ) : (
          <div className={style.emptyText}>{translate('identifier_details_no_document', 'No DID document available')}</div>
        )}
      </div>
    )
  }

  const renderTabContent = (): ReactElement => {
    switch (activeTab) {
      case IdentifierDetailsTabRoute.OVERVIEW:
        return getOverviewContent()
      case IdentifierDetailsTabRoute.KEYS:
        return getKeysContent()
      case IdentifierDetailsTabRoute.SERVICES:
        return getServicesContent()
      case IdentifierDetailsTabRoute.CONTACT:
        return getContactContent()
      case IdentifierDetailsTabRoute.JSON:
        return getJsonContent()
      default:
        return getOverviewContent()
    }
  }

  return (
    <div className={style.pageContainer}>
      <PageHeaderBar path={translate('identifier_details_path_label', 'Key Management / Identifiers')} />
      <div className={style.container}>
        {/* Header */}
        <div className={style.header}>
          <div className={style.titleSection}>
            <div className={style.titleRow}>
              <div className={style.title}>{identifier.alias || didMethod}</div>
              <span className={style.methodBadge}>{didMethod}</span>
            </div>
            <div className={style.subtitle}>{identifier.did}</div>
          </div>
          <div className={style.headerActions}>
            {isEditable && (
              <button className={style.editButton} onClick={handleEdit}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
                {translate('action_edit', 'Edit')}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className={style.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`${style.tab} ${activeTab === tab.id ? style.tabActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className={style.tabLabel}>{tab.label}</span>
              {tab.count !== undefined && tab.count >= 0 && (
                <span className={style.tabBadge}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className={style.body}>
          {renderTabContent()}
        </div>
      </div>

      {/* Service Detail Modal */}
      {selectedServiceDetail && (
        <div className={style.modalOverlay} onClick={() => setSelectedServiceDetail(null)}>
          <div className={style.modal} onClick={(e) => e.stopPropagation()}>
            <div className={style.modalHeader}>
              <div className={style.modalHeaderInfo}>
                <div className={`${style.modalAccent} ${isEInvoicingServiceType(selectedServiceDetail.type) ? style.modalAccentSuccess : ''}`} />
                <div>
                  <div className={style.modalTitle}>{selectedServiceDetail.id}</div>
                  <div className={style.modalSubtitle}>{getServiceTypeLabel(selectedServiceDetail.type)}</div>
                </div>
              </div>
              <button className={style.modalClose} onClick={() => setSelectedServiceDetail(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className={style.modalBody}>
              <div className={style.modalSection}>
                <div className={style.modalSectionTitle}>{translate('identifier_details_basic_info', 'Basic Information')}</div>
                <div className={style.modalField}>
                  <span className={style.modalFieldLabel}>{translate('identifier_details_service_id', 'Service ID')}</span>
                  <span className={style.modalFieldValue}>{selectedServiceDetail.id}</span>
                </div>
                <div className={style.modalField}>
                  <span className={style.modalFieldLabel}>{translate('identifier_details_service_type', 'Type')}</span>
                  <span className={style.modalFieldValue}>{selectedServiceDetail.type}</span>
                </div>
                <div className={style.modalField}>
                  <span className={style.modalFieldLabel}>{translate('identifier_details_endpoint', 'Endpoint')}</span>
                  <span className={style.modalFieldValue}>{selectedServiceDetail.serviceEndpoint}</span>
                </div>
                {selectedServiceDetail.description && (
                  <div className={style.modalField}>
                    <span className={style.modalFieldLabel}>{translate('identifier_details_description', 'Description')}</span>
                    <span className={style.modalFieldValue}>{selectedServiceDetail.description}</span>
                  </div>
                )}
              </div>

              {selectedServiceDetail.einvoice && (
                <div className={style.modalSection}>
                  <div className={style.modalSectionTitle}>{translate('identifier_details_einvoice_config', 'eInvoicing Configuration')}</div>
                  {selectedServiceDetail.einvoice.entityName && (
                    <div className={style.modalField}>
                      <span className={style.modalFieldLabel}>{translate('identifier_details_entity_name', 'Entity Name')}</span>
                      <span className={style.modalFieldValue}>{selectedServiceDetail.einvoice.entityName}</span>
                    </div>
                  )}
                  {selectedServiceDetail.einvoice.country && (
                    <div className={style.modalField}>
                      <span className={style.modalFieldLabel}>{translate('identifier_details_country', 'Country')}</span>
                      <span className={style.modalFieldValue}>{selectedServiceDetail.einvoice.country}</span>
                    </div>
                  )}
                  {selectedServiceDetail.einvoice.vct && (
                    <div className={style.modalField}>
                      <span className={style.modalFieldLabel}>{translate('identifier_details_vct', 'Verifiable Credential Type')}</span>
                      <span className={style.modalFieldValue}>{selectedServiceDetail.einvoice.vct}</span>
                    </div>
                  )}
                  {selectedServiceDetail.einvoice.inboxName && (
                    <div className={style.modalField}>
                      <span className={style.modalFieldLabel}>{translate('identifier_details_inbox_name', 'Inbox Name')}</span>
                      <span className={style.modalFieldValue}>{selectedServiceDetail.einvoice.inboxName}</span>
                    </div>
                  )}
                  {selectedServiceDetail.einvoice.folderName && (
                    <div className={style.modalField}>
                      <span className={style.modalFieldLabel}>{translate('identifier_details_folder_name', 'Folder Name')}</span>
                      <span className={style.modalFieldValue}>{selectedServiceDetail.einvoice.folderName}</span>
                    </div>
                  )}
                  {selectedServiceDetail.einvoice.transportType && (
                    <div className={style.modalField}>
                      <span className={style.modalFieldLabel}>{translate('identifier_details_transport_type', 'Transport Type')}</span>
                      <span className={style.modalFieldValue}>{selectedServiceDetail.einvoice.transportType}</span>
                    </div>
                  )}
                  {selectedServiceDetail.einvoice.documentIdentifiers && selectedServiceDetail.einvoice.documentIdentifiers.length > 0 && (
                    <div className={style.modalField}>
                      <span className={style.modalFieldLabel}>{translate('identifier_details_document_identifiers', 'Document Identifiers')}</span>
                      <span className={style.modalFieldValue}>{selectedServiceDetail.einvoice.documentIdentifiers.join(', ')}</span>
                    </div>
                  )}
                  {selectedServiceDetail.einvoice.processIdentifiers && selectedServiceDetail.einvoice.processIdentifiers.length > 0 && (
                    <div className={style.modalField}>
                      <span className={style.modalFieldLabel}>{translate('identifier_details_process_identifiers', 'Process Identifiers')}</span>
                      <span className={style.modalFieldValue}>{selectedServiceDetail.einvoice.processIdentifiers.join(', ')}</span>
                    </div>
                  )}
                  {/* PEPPOL-specific fields */}
                  {selectedServiceDetail.einvoice.peppolParticipantId && (
                    <div className={style.modalField}>
                      <span className={style.modalFieldLabel}>{translate('identifier_details_peppol_participant_id', 'PEPPOL Participant ID')}</span>
                      <span className={style.modalFieldValue}>{selectedServiceDetail.einvoice.peppolParticipantId}</span>
                    </div>
                  )}
                  {selectedServiceDetail.einvoice.peppolSmpUrl && (
                    <div className={style.modalField}>
                      <span className={style.modalFieldLabel}>{translate('identifier_details_peppol_smp_url', 'PEPPOL SMP URL')}</span>
                      <span className={style.modalFieldValue}>{selectedServiceDetail.einvoice.peppolSmpUrl}</span>
                    </div>
                  )}
                  {selectedServiceDetail.einvoice.peppolAs4Endpoint && (
                    <div className={style.modalField}>
                      <span className={style.modalFieldLabel}>{translate('identifier_details_peppol_as4_endpoint', 'PEPPOL AS4 Endpoint')}</span>
                      <span className={style.modalFieldValue}>{selectedServiceDetail.einvoice.peppolAs4Endpoint}</span>
                    </div>
                  )}
                  {/* PPF France-specific fields */}
                  {selectedServiceDetail.einvoice.ppfPlatformId && (
                    <div className={style.modalField}>
                      <span className={style.modalFieldLabel}>{translate('identifier_details_ppf_platform_id', 'PPF Platform ID')}</span>
                      <span className={style.modalFieldValue}>{selectedServiceDetail.einvoice.ppfPlatformId}</span>
                    </div>
                  )}
                  {selectedServiceDetail.einvoice.ppfRecipientIds && selectedServiceDetail.einvoice.ppfRecipientIds.length > 0 && (
                    <div className={style.modalField}>
                      <span className={style.modalFieldLabel}>{translate('identifier_details_ppf_recipient_ids', 'PPF Recipient IDs')}</span>
                      <span className={style.modalFieldValue}>{selectedServiceDetail.einvoice.ppfRecipientIds.join(', ')}</span>
                    </div>
                  )}
                  {selectedServiceDetail.einvoice.ppfMode && (
                    <div className={style.modalField}>
                      <span className={style.modalFieldLabel}>{translate('identifier_details_ppf_mode', 'PPF Mode')}</span>
                      <span className={style.modalFieldValue}>{selectedServiceDetail.einvoice.ppfMode}</span>
                    </div>
                  )}
                  {selectedServiceDetail.einvoice.ppfApiEndpoint && (
                    <div className={style.modalField}>
                      <span className={style.modalFieldLabel}>{translate('identifier_details_ppf_api_endpoint', 'PPF API Endpoint')}</span>
                      <span className={style.modalFieldValue}>{selectedServiceDetail.einvoice.ppfApiEndpoint}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className={style.modalFooter}>
              <button className={style.modalCloseButton} onClick={() => setSelectedServiceDetail(null)}>
                {translate('action_close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export const getStaticProps = async ({locale = 'en'}: {locale?: string}) => staticPropsWithSST({locale})
export const getStaticPaths = async () => ({paths: [], fallback: 'blocking'})

export default ShowIdentifierDetails
