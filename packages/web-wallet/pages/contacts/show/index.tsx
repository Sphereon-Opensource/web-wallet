import React, {FC, ReactElement, useCallback, useEffect, useState} from 'react'
import {useParams, useNavigate} from 'react-router-dom'
import {HttpError, useOne, useTranslation} from '@refinedev/core'
import type {IBasicCredentialLocaleBranding, Party} from '@sphereon/ssi-sdk.data-store-types'
import {OpenID4VCIClient} from '@sphereon/oid4vci-client'
import {CredentialStatus} from '@sphereon/ui-components.core'
import {oid4vciCredentialLocaleBrandingFrom} from '@sphereon/ssi-sdk.oid4vci-holder'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import {RoleBadges} from '@components/badges'
import {staticPropsWithSST} from '@/src/i18n/server'
import {CredentialConfigurationSupported, CredentialConfigurationSupportedV1_0_15, CredentialsSupportedDisplay} from '@sphereon/oid4vci-common'
import {getAgent, getAgentBaseUrl} from '@agent'
import style from './index.module.css'
import {CredentialCatalogItem} from '@typings'
import CredentialCatalogView from '@components/views/CredentialCatalogView'
import {CredentialRole} from '@sphereon/ssi-types'

enum ContactDetailsTabRoute {
  INFO = 'info',
  ACTIVITY = 'activity',
  CREDENTIAL_CATALOG = 'credentialCatalog',
  RELATIONS = 'relations',
  IDENTIFIERS = 'identifiers',
}

type getCredentialBrandingArgs = {
  credentialsSupported: Record<string, CredentialConfigurationSupported>
}

type SelectCredentialLocaleBrandingArgs = {
  locale?: string
  localeBranding?: Array<IBasicCredentialLocaleBranding>
}

const ShowContactDetails: FC = (): ReactElement => {
  const {translate, getLocale} = useTranslation()
  const params = useParams()
  const navigate = useNavigate()
  const {id} = params
  const [credentialsSupported, setCredentialsSupported] = useState<Record<string, CredentialConfigurationSupportedV1_0_15> | undefined>(undefined)
  const [credentialCatalogItems, setCredentialCatalogItems] = useState<Array<CredentialCatalogItem>>([])
  const [openID4VCIClient, setOpenID4VCIClient] = useState<OpenID4VCIClient>()
  const [catalogAvailable, setCatalogAvailable] = useState(false)
  const [activeTab, setActiveTab] = useState<ContactDetailsTabRoute>(ContactDetailsTabRoute.INFO)

  // Editing state
  const [isEditing, setIsEditing] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editLegalName, setEditLegalName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const {
    isLoading,
    isError,
    data: partyData,
    refetch,
  } = useOne<Party, HttpError>({
    resource: 'parties',
    id,
  })

  // Initialize edit fields when party data loads
  useEffect(() => {
    if (partyData?.data) {
      const contact = partyData.data.contact
      setEditDisplayName(contact.displayName || '')
      setEditLegalName('legalName' in contact ? (contact.legalName as string) || '' : '')
    }
  }, [partyData])

  // Handle starting edit mode
  const handleStartEdit = useCallback(() => {
    if (partyData?.data) {
      const contact = partyData.data.contact
      setEditDisplayName(contact.displayName || '')
      setEditLegalName('legalName' in contact ? (contact.legalName as string) || '' : '')
      setIsEditing(true)
    }
  }, [partyData])

  // Handle canceling edit
  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    if (partyData?.data) {
      const contact = partyData.data.contact
      setEditDisplayName(contact.displayName || '')
      setEditLegalName('legalName' in contact ? (contact.legalName as string) || '' : '')
    }
  }, [partyData])

  // Handle saving edits
  const handleSaveEdit = useCallback(async () => {
    if (!partyData?.data || !id) return

    setIsSaving(true)
    try {
      const agent = getAgent()
      const currentParty = partyData.data

      // Update the contact using the agent's contact manager
      // cmUpdateContact expects the full Party object
      const updatedParty = {
        ...currentParty,
        contact: {
          ...currentParty.contact,
          displayName: editDisplayName,
          ...(editLegalName ? {legalName: editLegalName} : {}),
        },
      }

      await agent.cmUpdateContact({
        contact: updatedParty,
      })

      await refetch()
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save contact:', error)
      alert(translate('contact_details_save_error', 'Failed to save changes') as string)
    } finally {
      setIsSaving(false)
    }
  }, [partyData, id, editDisplayName, editLegalName, refetch, translate])

  const getSupportedCredentials = (): Record<string, CredentialConfigurationSupportedV1_0_15> | undefined => {
    try {
      if (!openID4VCIClient) {
        return undefined
      }

      const supportedCredentials = openID4VCIClient.getCredentialsSupported()
      if (Array.isArray(supportedCredentials)) {
        console.warn('OID4VCI: Only v13+ is supported for credential catalog')
        return undefined
      }

      return supportedCredentials
    } catch (error) {
      console.warn('OID4VCI: Error fetching supported credentials:', error)
      return undefined
    }
  }

  const getCredentialBranding = async (args: getCredentialBrandingArgs): Promise<Record<string, Array<IBasicCredentialLocaleBranding>>> => {
    const {credentialsSupported} = args
    const credentialBranding: Record<string, Array<IBasicCredentialLocaleBranding>> = {}
    await Promise.all(
      Object.entries(credentialsSupported).map(async ([configId, credentialsConfigSupported]) => {
        credentialBranding[configId] = await Promise.all(
          (credentialsConfigSupported.display ?? []).map(
            async (display: CredentialsSupportedDisplay): Promise<IBasicCredentialLocaleBranding> =>
              await getAgent().ibCredentialLocaleBrandingFrom({
                localeBranding: await oid4vciCredentialLocaleBrandingFrom({credentialDisplay: display}),
              }),
          ),
        )
      }),
    )

    return credentialBranding
  }

  const selectCredentialLocaleBranding = (args: SelectCredentialLocaleBrandingArgs): IBasicCredentialLocaleBranding | undefined => {
    const {locale, localeBranding} = args
    return localeBranding?.find((branding: IBasicCredentialLocaleBranding) =>
      locale ? branding.locale?.startsWith(locale) || branding.locale === undefined : branding.locale === undefined,
    )
  }

  useEffect(() => {
    if (isLoading || !partyData?.data) {
      return
    }

    const credentialIssuer = (() => {
      const identities = partyData.data.identities ?? []

      const httpsUrlIdentities = identities.filter(
        identity =>
          identity.roles.includes(CredentialRole.ISSUER) &&
          identity.identifier?.type === 'url' &&
          identity.identifier?.correlationId?.startsWith('https'),
      )

      // Pick the one with the longest url
      const httpsUrlIdentity =
        httpsUrlIdentities.length > 0
          ? httpsUrlIdentities.reduce((longest, current) =>
              (current.identifier?.correlationId?.length ?? 0) > (longest.identifier?.correlationId?.length ?? 0) ? current : longest,
            )
          : undefined

      const urlIdentity = identities.find(identity => identity.roles.includes(CredentialRole.ISSUER) && identity.identifier?.type === 'url')

      const anyIssuer = identities.find(identity => identity.roles.includes(CredentialRole.ISSUER))

      const chosen = httpsUrlIdentity ?? urlIdentity ?? anyIssuer

      const correlationId = chosen?.identifier?.correlationId?.replace('did:web:', 'https://')

      return correlationId ? (correlationId.startsWith('http') ? correlationId : `https://${correlationId}`) : undefined
    })()

    if (!credentialIssuer) {
      return
    }

    // Validate it's a proper URL before attempting to fetch
    try {
      new URL(credentialIssuer)
    } catch {
      console.warn('OID4VCI: Invalid issuer URL, skipping metadata retrieval:', credentialIssuer)
      return
    }

    OpenID4VCIClient.fromCredentialIssuer({
      credentialIssuer,
      createAuthorizationRequestURL: false,
    })
      .then(client => {
        setOpenID4VCIClient(client)
        setCatalogAvailable(true)
      })
      .catch(error => {
        // OID4VCI well-known metadata is optional - don't show errors for 404s or unavailable endpoints
        console.warn('OID4VCI: Could not retrieve issuer metadata (this is optional):', error.message || error)
        setCatalogAvailable(false)
      })
  }, [id, isLoading, partyData])

  useEffect(() => {
    if (openID4VCIClient === undefined) {
      return
    }

    const credentials = getSupportedCredentials()
    if (credentials) {
      setCredentialsSupported(credentials)
    }
  }, [openID4VCIClient])

  useEffect(() => {
    if (credentialsSupported === undefined || !partyData?.data) {
      return
    }

    getCredentialBranding({credentialsSupported}).then(credentialBranding => {
      const credentialCatalogItems: Array<CredentialCatalogItem> = Object.entries(credentialBranding).map(([configId, branding]) => {
        const localeBranding = selectCredentialLocaleBranding({locale: getLocale(), localeBranding: branding})
        return {
          configId,
          credential: {
            backgroundColor: localeBranding?.background?.color,
            backgroundImage: localeBranding?.background?.image,
            logo: localeBranding?.logo,
            credentialTitle: localeBranding?.alias,
            credentialSubtitle: localeBranding?.description,
            issuerName: partyData.data.contact.displayName,
            credentialStatus: CredentialStatus.VALID,
            textColor: localeBranding?.text?.color,
          },
          actions: 'actions',
        }
      })
      setCredentialCatalogItems(credentialCatalogItems)
    })
  }, [credentialsSupported, partyData])

  if (isLoading) {
    return <div>{translate('data_provider_loading_message')}</div>
  }

  if (isError) {
    return <div>{translate('data_provider_error_message')}</div>
  }

  const party = partyData?.data

  if (!party) {
    return <div>{translate('data_provider_error_message')}</div>
  }

  const onGetCredentialItem = async (item: CredentialCatalogItem): Promise<void> => {
    console.log(`Get credential clicked for type: ${item.configId}`)
  }

  // Role badges rendered using shared RoleBadges component
  const renderRoleBadges = (): ReactElement | null => {
    if (!party.roles || party.roles.length === 0) return null
    return <RoleBadges roles={party.roles} size="small" />
  }

  // Build tabs array
  const tabs: {id: ContactDetailsTabRoute; label: string}[] = [
    {id: ContactDetailsTabRoute.INFO, label: translate('contact_details_contact_info_tab_label') as string},
    {id: ContactDetailsTabRoute.ACTIVITY, label: translate('contact_details_activity_tab_label') as string},
    ...(catalogAvailable && credentialCatalogItems.length > 0
      ? [{id: ContactDetailsTabRoute.CREDENTIAL_CATALOG, label: translate('contact_details_credential_catalog_tab_label') as string}]
      : []),
    {id: ContactDetailsTabRoute.RELATIONS, label: translate('contact_details_relations_tab_label') as string},
    {id: ContactDetailsTabRoute.IDENTIFIERS, label: translate('contact_details_identifiers_tab_label') as string},
  ]

  const getContactInformationContent = (): ReactElement => {
    const contact = party.contact
    const electronicAddresses = 'electronicAddresses' in contact ? (contact.electronicAddresses as any[]) || [] : []
    const physicalAddresses = 'physicalAddresses' in contact ? (contact.physicalAddresses as any[]) || [] : []

    return (
      <div className={style.infoContent}>
        {/* Main Info Card */}
        <div className={style.infoCard}>
          <div className={style.infoCardHeader}>
            <div className={style.infoCardAvatar}>
              {(contact.displayName || 'C')[0].toUpperCase()}
            </div>
            <div className={style.infoCardTitle}>
              {isEditing ? (
                <>
                  <input
                    type="text"
                    className={style.editInput}
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    placeholder={translate('contact_details_display_name', 'Display Name') as string}
                  />
                  <input
                    type="text"
                    className={style.editInputSmall}
                    value={editLegalName}
                    onChange={(e) => setEditLegalName(e.target.value)}
                    placeholder={translate('contact_details_legal_name', 'Legal Name') as string}
                  />
                </>
              ) : (
                <>
                  <div className={style.infoCardName}>{contact.displayName}</div>
                  <div className={style.infoCardSubtitle}>
                    {'legalName' in contact && contact.legalName ? contact.legalName : translate('contact_details_organization')}
                  </div>
                </>
              )}
            </div>
            <div className={style.infoCardActions}>
              {isEditing ? (
                <>
                  <button className={style.cancelButton} onClick={handleCancelEdit} disabled={isSaving}>
                    {translate('action_cancel', 'Cancel')}
                  </button>
                  <button className={style.saveButton} onClick={handleSaveEdit} disabled={isSaving}>
                    {isSaving ? translate('action_saving', 'Saving...') : translate('action_save', 'Save')}
                  </button>
                </>
              ) : (
                <button className={style.editButton} onClick={handleStartEdit}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                  </svg>
                  {translate('action_edit', 'Edit')}
                </button>
              )}
            </div>
          </div>
          <div className={style.infoCardGrid}>
            {'legalName' in contact && contact.legalName && !isEditing && (
              <div className={style.field}>
                <span className={style.fieldLabel}>{translate('contact_details_legal_name')}</span>
                <span className={style.fieldValue}>{contact.legalName}</span>
              </div>
            )}
            {'firstName' in contact && contact.firstName && (
              <div className={style.field}>
                <span className={style.fieldLabel}>{translate('contact_details_first_name')}</span>
                <span className={style.fieldValue}>{contact.firstName}</span>
              </div>
            )}
            {'middleName' in contact && contact.middleName && (
              <div className={style.field}>
                <span className={style.fieldLabel}>{translate('contact_details_middle_name')}</span>
                <span className={style.fieldValue}>{contact.middleName}</span>
              </div>
            )}
            {'lastName' in contact && contact.lastName && (
              <div className={style.field}>
                <span className={style.fieldLabel}>{translate('contact_details_last_name')}</span>
                <span className={style.fieldValue}>{contact.lastName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Electronic Addresses */}
        {electronicAddresses.length > 0 && (
          <div className={style.infoSection}>
            <div className={style.infoSectionHeader}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span className={style.infoSectionTitle}>{translate('contact_details_electronic_addresses', 'Electronic Addresses')}</span>
            </div>
            <div className={style.addressList}>
              {electronicAddresses.map((addr: any, index: number) => (
                <div key={index} className={style.addressItem}>
                  <span className={style.addressType}>{addr.type || 'Other'}</span>
                  <span className={style.addressValue}>{addr.electronicAddress}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Physical Addresses */}
        {physicalAddresses.length > 0 && (
          <div className={style.infoSection}>
            <div className={style.infoSectionHeader}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className={style.infoSectionTitle}>{translate('contact_details_physical_addresses', 'Physical Addresses')}</span>
            </div>
            <div className={style.addressGrid}>
              {physicalAddresses.map((addr: any, index: number) => (
                <div key={index} className={style.physicalAddressCard}>
                  <div className={style.physicalAddressType}>{addr.type || 'Address'}</div>
                  <div className={style.physicalAddressContent}>
                    {addr.streetName && (
                      <div className={style.physicalAddressLine}>
                        {addr.streetName}{addr.streetNumber ? ` ${addr.streetNumber}` : ''}
                      </div>
                    )}
                    {addr.buildingName && (
                      <div className={style.physicalAddressLine}>{addr.buildingName}</div>
                    )}
                    {(addr.postalCode || addr.cityName) && (
                      <div className={style.physicalAddressLine}>
                        {addr.postalCode}{addr.postalCode && addr.cityName ? ' ' : ''}{addr.cityName}
                      </div>
                    )}
                    {addr.provinceName && (
                      <div className={style.physicalAddressLine}>{addr.provinceName}</div>
                    )}
                    {addr.countryCode && (
                      <div className={style.physicalAddressLine}>{addr.countryCode}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Party Info */}
        {(() => {
          const partyAny = party as any
          const vatNumber = partyAny.vatNumber
          const chamberOfCommerce = partyAny.chamberOfCommerce
          const hasBusinessInfo = party.uri || vatNumber || chamberOfCommerce

          if (!hasBusinessInfo) return null

          return (
            <div className={style.infoSection}>
              <div className={style.infoSectionHeader}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
                <span className={style.infoSectionTitle}>{translate('contact_details_business_info', 'Business Information')}</span>
              </div>
              <div className={style.infoCardGrid}>
                {party.uri && (
                  <div className={style.field}>
                    <span className={style.fieldLabel}>{translate('contact_details_uri', 'URI')}</span>
                    <span className={style.fieldValue}>{party.uri}</span>
                  </div>
                )}
                {vatNumber && (
                  <div className={style.field}>
                    <span className={style.fieldLabel}>{translate('contact_details_vat_number', 'VAT Number')}</span>
                    <span className={style.fieldValue}>{String(vatNumber)}</span>
                  </div>
                )}
                {chamberOfCommerce && (
                  <div className={style.field}>
                    <span className={style.fieldLabel}>{translate('contact_details_coc', 'Chamber of Commerce')}</span>
                    <span className={style.fieldValue}>{String(chamberOfCommerce)}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })()}
      </div>
    )
  }

  const getActivityContent = (): ReactElement => {
    return (
      <div className={style.emptyText}>{translate('contact_details_no_activity')}</div>
    )
  }

  const getCredentialCatalogContent = (): ReactElement => {
    return <CredentialCatalogView items={credentialCatalogItems} onClick={onGetCredentialItem} />
  }

  const getRelationsContent = (): ReactElement => {
    return (
      <div className={style.emptyText}>{translate('contact_details_no_relations')}</div>
    )
  }

  const getIdentifiersContent = (): ReactElement => {
    const identities = party.identities ?? []

    if (identities.length === 0) {
      return (
        <div className={style.emptyText}>{translate('contact_details_no_identifiers')}</div>
      )
    }

    // Check if a DID is managed locally (can be navigated to)
    const isDIDNavigable = (correlationId: string | undefined): boolean => {
      if (!correlationId) return false
      return correlationId.startsWith('did:')
    }

    // Navigate to DID details
    const handleNavigateToDID = (did: string) => {
      navigate(`/key-management/identifiers/show/${encodeURIComponent(did)}`)
    }

    return (
      <div className={style.identifiersGrid}>
        {identities.map((identity, index) => {
          const alias = identity.alias || `${translate('contact_details_identifier')} ${index + 1}`
          const isIssuer = identity.roles?.includes(CredentialRole.ISSUER)
          const isVerifier = identity.roles?.includes(CredentialRole.VERIFIER)
          const correlationId = identity.identifier?.correlationId
          const canNavigate = isDIDNavigable(correlationId)

          return (
            <div key={correlationId || index} className={style.identifierCard}>
              <div className={style.identifierCardHeader}>
                <div className={`${style.identifierCardAccent} ${isIssuer ? style.identifierCardAccentSuccess : isVerifier ? style.identifierCardAccentPrimary : style.identifierCardAccentWarning}`} />
                <div className={style.identifierCardInfo}>
                  <div className={style.identifierCardType}>{identity.identifier?.type || 'Identifier'}</div>
                  <div className={style.identifierCardAlias}>{alias}</div>
                </div>
                {canNavigate && (
                  <button
                    className={style.viewDidButton}
                    onClick={() => handleNavigateToDID(correlationId!)}
                    title={translate('action_view_did_details', 'View DID Details') as string}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </button>
                )}
              </div>
              <div className={style.identifierCardBody}>
                {correlationId && (
                  <div className={style.identifierCardField}>
                    <span className={style.identifierCardFieldLabel}>{translate('contact_details_identifier_value')}</span>
                    {canNavigate ? (
                      <button
                        className={style.identifierCardFieldLink}
                        onClick={() => handleNavigateToDID(correlationId)}
                      >
                        {correlationId}
                      </button>
                    ) : (
                      <span className={style.identifierCardFieldValue}>{correlationId}</span>
                    )}
                  </div>
                )}
                {identity.roles && identity.roles.length > 0 && (
                  <div className={style.identifierCardRoles}>
                    <RoleBadges roles={identity.roles} size="small" />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderTabContent = (): ReactElement => {
    switch (activeTab) {
      case ContactDetailsTabRoute.INFO:
        return getContactInformationContent()
      case ContactDetailsTabRoute.ACTIVITY:
        return getActivityContent()
      case ContactDetailsTabRoute.CREDENTIAL_CATALOG:
        return getCredentialCatalogContent()
      case ContactDetailsTabRoute.RELATIONS:
        return getRelationsContent()
      case ContactDetailsTabRoute.IDENTIFIERS:
        return getIdentifiersContent()
      default:
        return getContactInformationContent()
    }
  }

  return (
    <div className={style.pageContainer}>
      <PageHeaderBar path={translate('contact_details_path_label')} />
      <div className={style.container}>
        {/* Header */}
        <div className={style.header}>
          <div className={style.titleSection}>
            <div className={style.titleRow}>
              <div className={style.title}>{party.contact.displayName}</div>
              {renderRoleBadges()}
            </div>
            <div className={style.subtitle}>
              {party.uri || translate('contact_details_no_uri')}
            </div>
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
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className={style.body}>
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}

export const getStaticProps = async ({locale = 'en'}: {locale?: string}) => staticPropsWithSST({locale})

export default ShowContactDetails
