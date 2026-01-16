import React, {FC, ReactElement, useEffect, useState} from 'react'
import {useParams} from 'react-router-dom'
import {HttpError, useOne, useTranslation} from '@refinedev/core'
import type {IBasicCredentialLocaleBranding, Party} from '@sphereon/ssi-sdk.data-store-types'
import {OpenID4VCIClient} from '@sphereon/oid4vci-client'
import {CredentialStatus} from '@sphereon/ui-components.core'
import {oid4vciCredentialLocaleBrandingFrom} from '@sphereon/ssi-sdk.oid4vci-holder'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import {staticPropsWithSST} from '@/src/i18n/server'
import {CredentialConfigurationSupported, CredentialConfigurationSupportedV1_0_15, CredentialsSupportedDisplay} from '@sphereon/oid4vci-common'
import {getAgent} from '@agent'
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
  const {id} = params
  const [credentialsSupported, setCredentialsSupported] = useState<Record<string, CredentialConfigurationSupportedV1_0_15> | undefined>(undefined)
  const [credentialCatalogItems, setCredentialCatalogItems] = useState<Array<CredentialCatalogItem>>([])
  const [openID4VCIClient, setOpenID4VCIClient] = useState<OpenID4VCIClient>()
  const [catalogAvailable, setCatalogAvailable] = useState(false)
  const [activeTab, setActiveTab] = useState<ContactDetailsTabRoute>(ContactDetailsTabRoute.INFO)

  const {
    isLoading,
    isError,
    data: partyData,
  } = useOne<Party, HttpError>({
    resource: 'parties',
    id,
  })

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

  // Get role badges for header
  const getRoleBadges = (): ReactElement[] => {
    const badges: ReactElement[] = []
    if (party.roles?.includes(CredentialRole.ISSUER)) {
      badges.push(
        <span key="issuer" className={`${style.roleBadge} ${style.roleBadgeIssuer}`}>
          {translate('contact_role_issuer')}
        </span>
      )
    }
    if (party.roles?.includes(CredentialRole.VERIFIER)) {
      badges.push(
        <span key="verifier" className={`${style.roleBadge} ${style.roleBadgeVerifier}`}>
          {translate('contact_role_verifier')}
        </span>
      )
    }
    if (party.roles?.includes(CredentialRole.HOLDER)) {
      badges.push(
        <span key="holder" className={`${style.roleBadge} ${style.roleBadgeHolder}`}>
          {translate('contact_role_holder')}
        </span>
      )
    }
    return badges
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

    return (
      <>
        <div className={style.infoCard}>
          <div className={style.infoCardHeader}>
            <div className={style.infoCardAvatar}>
              {(contact.displayName || 'C')[0].toUpperCase()}
            </div>
            <div className={style.infoCardTitle}>
              <div className={style.infoCardName}>{contact.displayName}</div>
              <div className={style.infoCardSubtitle}>
                {'legalName' in contact && contact.legalName ? contact.legalName : translate('contact_details_organization')}
              </div>
            </div>
          </div>
          <div className={style.infoCardGrid}>
            {'legalName' in contact && contact.legalName && (
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
            {'email' in contact && Boolean(contact.email) && (
              <div className={style.field}>
                <span className={style.fieldLabel}>{translate('contact_details_email')}</span>
                <span className={style.fieldValue}>{String(contact.email)}</span>
              </div>
            )}
            {'phoneNumber' in contact && Boolean(contact.phoneNumber) && (
              <div className={style.field}>
                <span className={style.fieldLabel}>{translate('contact_details_phone')}</span>
                <span className={style.fieldValue}>{String(contact.phoneNumber)}</span>
              </div>
            )}
          </div>
        </div>
      </>
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

    return (
      <div className={style.identifiersGrid}>
        {identities.map((identity, index) => {
          const alias = identity.alias || `${translate('contact_details_identifier')} ${index + 1}`
          const isIssuer = identity.roles?.includes(CredentialRole.ISSUER)
          const isVerifier = identity.roles?.includes(CredentialRole.VERIFIER)

          return (
            <div key={identity.identifier?.correlationId || index} className={style.identifierCard}>
              <div className={style.identifierCardHeader}>
                <div className={`${style.identifierCardAccent} ${isIssuer ? style.identifierCardAccentSuccess : isVerifier ? style.identifierCardAccentPrimary : style.identifierCardAccentWarning}`} />
                <div className={style.identifierCardInfo}>
                  <div className={style.identifierCardType}>{identity.identifier?.type || 'Identifier'}</div>
                  <div className={style.identifierCardAlias}>{alias}</div>
                </div>
              </div>
              <div className={style.identifierCardBody}>
                {identity.identifier?.correlationId && (
                  <div className={style.identifierCardField}>
                    <span className={style.identifierCardFieldLabel}>{translate('contact_details_identifier_value')}</span>
                    <span className={style.identifierCardFieldValue}>{identity.identifier.correlationId}</span>
                  </div>
                )}
                {identity.roles && identity.roles.length > 0 && (
                  <div className={style.identifierCardRoles}>
                    {identity.roles.map(role => (
                      <span
                        key={role}
                        className={`${style.roleBadge} ${
                          role === CredentialRole.ISSUER ? style.roleBadgeIssuer :
                          role === CredentialRole.VERIFIER ? style.roleBadgeVerifier :
                          style.roleBadgeHolder
                        }`}
                      >
                        {role}
                      </span>
                    ))}
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
              {getRoleBadges()}
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
