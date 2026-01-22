import React, {FC, ReactElement, useEffect, useRef, useState} from 'react'
import {HttpError, useList, useOne, useTranslate} from '@refinedev/core'
import {CredentialStatus} from '@sphereon/ui-components.core'
import {useBrandingSync} from '@services/brandingSyncService'
import {
  JSONDataView,
  SSICredentialCardView,
  SSISwitchItem,
} from '@sphereon/ui-components.ssi-react'
import {EvidenceList, EvidenceItem} from '@components/views/EvidenceList'
import {getAgentBaseUrl} from '@agent'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import style from './index.module.css'
import {CredentialTableItem, DataResource} from '@typings'
import type {NaturalPerson, Organization, Party} from '@sphereon/ssi-sdk.data-store-types'
import {PartyTypeType} from '@sphereon/ssi-sdk.data-store-types'
import {useNavigate, useParams} from 'react-router-dom'
import {staticPropsWithSST} from '@/src/i18n/server'
import {getAgent} from '@agent'
import PublishLinkedVPModal from '@components/modals/PublishLinkedVP'

import {CredentialSummary, toCredentialSummary} from '@sphereon/ui-components.credential-branding'
import {DigitalCredential} from '@sphereon/ssi-sdk.credential-store'
import {VerifiableCredential} from '@veramo/core'
import {
  CredentialMapper,
  CredentialRole,
  IVerifiableCredential,
  sdJwtDecodedCredentialToUniformCredential,
  SdJwtDecodedVerifiableCredential,
} from '@sphereon/ssi-types'
import {defaultHasher} from '@sphereon/ssi-sdk.core'
import {useRole} from '@/src/contexts/RoleContext'
import {extractIssuerDid} from '@helpers/IdentityFilters'

enum CredentialDetailsTabRoute {
  INFO = 'info',
  ACTIVITY = 'activity',
  DOCUMENTS = 'documents',
  CONTACTS = 'contacts',
}

interface ContactDisplayItem {
  id: string
  displayName: string
  legalName?: string
  partyType: PartyTypeType
  roles: CredentialRole[]
  role: 'issuer' | 'subject'
}

type Props = {
  credentialRole?: CredentialRole
}

async function getUnifiedVC(rawDocument: any): Promise<IVerifiableCredential> {
  const wrappedCredential = CredentialMapper.toWrappedVerifiableCredential(rawDocument, {hasher: defaultHasher})
  if (CredentialMapper.isSdJwtDecodedCredential(wrappedCredential.credential)) {
    return sdJwtDecodedCredentialToUniformCredential(wrappedCredential.credential as SdJwtDecodedVerifiableCredential)
  } else if (CredentialMapper.isSdJwtEncoded(wrappedCredential.credential)) {
    const asyncHasher = (data: string | ArrayBuffer, algorithm: string) => Promise.resolve(defaultHasher(data, algorithm))
    const decodedSdJwt = await CredentialMapper.decodeSdJwtVcAsync(wrappedCredential.credential, asyncHasher)
    return sdJwtDecodedCredentialToUniformCredential(decodedSdJwt as SdJwtDecodedVerifiableCredential)
  } else {
    return wrappedCredential.credential as IVerifiableCredential
  }
}

const ShowCredentialDetails: FC<Props> = (props: Props): ReactElement => {
  const {credentialRole: credentialRoleFromContext} = useRole()
  const credentialRole = props.credentialRole ?? credentialRoleFromContext
  const translate = useTranslate()
  const navigate = useNavigate()
  const params = useParams()
  const {id} = params
  const [credentialSummary, setCredentialSummary] = useState<CredentialSummary | undefined>(undefined)
  const [activeTab, setActiveTab] = useState<CredentialDetailsTabRoute>(CredentialDetailsTabRoute.INFO)

  // Use reactive branding sync hook
  const {service: brandingSync, sync: syncBrandings} = useBrandingSync()
  const credentialResult = useOne<DigitalCredential, HttpError>({
    resource: DataResource.CREDENTIALS,
    id,
    meta: {variables: {credentialRole: credentialRole}},
  })
  const {refetch: refetchCredential} = credentialResult

  const partyResults = useList<Party, HttpError>({resource: 'parties'})
  const [showCreateSharedIdModal, setShowCreateSharedIdModal] = useState(false)

  // Track which credential hash we've synced for to avoid re-syncing
  const lastSyncedHashRef = useRef<string | null>(null)

  useEffect(() => {
    const fetchBranding = async () => {
      if (!credentialResult.data?.data) {
        return
      }

      const {hash, issuerCorrelationId, subjectCorrelationId, rawDocument, linkedVpId, linkedVpFrom, linkedVpUntil} = credentialResult.data.data

      try {
        const uniformVerifiableCredential = await getUnifiedVC(rawDocument)

        // Try to find issuer by correlationId first
        let issuerParties: Party[] = []
        if (issuerCorrelationId && issuerCorrelationId !== 'unknown') {
          issuerParties = await getAgent().cmGetContacts({
            filter: [{identities: {identifier: {correlationId: issuerCorrelationId}}}],
          })
        }

        // Fallback: if no issuer found, try to find by DID from the credential
        if (issuerParties.length === 0) {
          const issuerDid = extractIssuerDid(uniformVerifiableCredential)
          if (issuerDid) {
            issuerParties = await getAgent().cmGetContacts({
              filter: [{identities: {identifier: {correlationId: issuerDid}}}],
            })
          }
        }

        const subjectParties = subjectCorrelationId
          ? await getAgent().cmGetContacts({
              filter: [{identities: {identifier: {correlationId: subjectCorrelationId}}}],
            })
          : []

        // Use BrandingSync service for efficient credential branding retrieval
        // Only sync if we haven't already synced for this credential
        if (lastSyncedHashRef.current !== hash) {
          await syncBrandings()
          lastSyncedHashRef.current = hash
        }

        // Then get brandings from cache filtered by vcHash
        const credentialBrandings = brandingSync.getBrandingsByVcHash(hash)
        console.debug('[ShowCredentialDetails] Found', credentialBrandings.length, 'brandings for hash', hash)

        const credentialSummary: CredentialSummary = await toCredentialSummary({
          verifiableCredential: uniformVerifiableCredential as VerifiableCredential,
          hash,
          credentialRole,
          branding: credentialBrandings.length ? credentialBrandings[0].localeBranding : undefined,
          issuer: issuerParties.length ? issuerParties[0] : undefined,
          subject: subjectParties.length ? subjectParties[0] : undefined,
          ...(linkedVpId && linkedVpFrom && {linkedVp: {linkedVpId, linkedVpFrom, linkedVpUntil}}),
        })

        setCredentialSummary(credentialSummary)
      } catch (error) {
        console.error('[ShowCredentialDetails] Error fetching branding:', error)
      }
    }

    void fetchBranding()
    // Note: syncBrandings and brandingSync are stable references from useBrandingSync
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentialResult.data, credentialRole])

  if (credentialResult.isLoading || partyResults.isLoading || !credentialSummary) {
    return (
      <div className={style.pageContainer}>
        <PageHeaderBar path={translate('credential_details_path_label')} />
        <div className={style.container}>
          <div className={style.body}>
            <div className={style.emptyText}>{translate('data_provider_loading_message')}</div>
          </div>
        </div>
      </div>
    )
  }

  if (credentialResult.isError || partyResults.isError) {
    return (
      <div className={style.pageContainer}>
        <PageHeaderBar path={translate('credential_details_path_label')} />
        <div className={style.container}>
          <div className={style.body}>
            <div className={style.emptyText}>{translate('data_provider_error_message')}</div>
          </div>
        </div>
      </div>
    )
  }

  const credentialTableItem: CredentialTableItem = CredentialTableItem.from(
    credentialResult.data.data,
    partyResults.data?.data ?? [],
    credentialSummary,
  )

  const onTogglePublished = async (checked: boolean) => {
    if (checked) {
      setShowCreateSharedIdModal(true)
    } else if (credentialSummary.linkedVp) {
      await getAgent().lvpUnpublishCredential({linkedVpId: credentialSummary.linkedVp.linkedVpId})
      await refetchCredential()
    }
  }

  const handlePublishVP = async (linkedVpId: string, linkedVpFrom?: Date, linkedVpUntil?: Date): Promise<void> => {
    try {
      const credentialId = credentialResult.data.data.id

      await getAgent().lvpPublishCredential({
        digitalCredentialId: credentialId,
        linkedVpId,
        linkedVpFrom,
        linkedVpUntil,
      })

      setShowCreateSharedIdModal(false)
      await refetchCredential()
    } catch (error) {
      console.error('Failed to publish credential:', error)
      // Handle error appropriately
    }
  }

  const handleCloseModal = async (): Promise<void> => {
    setShowCreateSharedIdModal(false)
  }

  const buildLinkedVPInfo = (): ReactElement | undefined => {
    if (!credentialSummary.linkedVp) {
      return undefined
    }

    return (
      <div>
        <div>
          {translate('credential_details_published_since_label')}: {new Date(credentialSummary.linkedVp.linkedVpFrom).toLocaleString()}
        </div>
        {credentialSummary.linkedVp.linkedVpUntil && (
          <div>
            {translate('credential_details_published_until_label')}: {new Date(credentialSummary.linkedVp.linkedVpUntil).toLocaleString()}
          </div>
        )}
      </div>
    )
  }

  const getVerifiedInformationContent = (): ReactElement => {
    // Get the raw credential document to preserve nested structure
    const rawDoc = JSON.parse(credentialResult.data.data.uniformDocument ?? credentialResult.data.data.rawDocument)

    // Build claims data directly from the credential, preserving nested structure
    const buildClaimsData = (): Record<string, any> => {
      const result: Record<string, any> = {}

      // Add type
      if (rawDoc.type) {
        const types = Array.isArray(rawDoc.type) ? rawDoc.type : [rawDoc.type]
        const credentialType = types.find((t: string) => t !== 'VerifiableCredential') || types[0]
        result.type = credentialType
      } else if (rawDoc.vct) {
        // SD-JWT format uses vct instead of type
        result.type = rawDoc.vct
      }

      // Add issuer info
      if (rawDoc.issuer || rawDoc.iss) {
        const issuerValue = rawDoc.issuer || rawDoc.iss
        const issuerDisplayName = credentialTableItem.issuer?.contact?.displayName ?? 'Unknown Issuer'
        if (typeof issuerValue === 'string') {
          result.issuer = {
            id: issuerValue,
            name: issuerDisplayName,
          }
        } else if (typeof issuerValue === 'object') {
          result.issuer = {
            ...issuerValue,
            name: issuerDisplayName,
          }
        }
      }

      // Add terms of use if present
      if (rawDoc.termsOfUse?.length) {
        result.termsOfUse = rawDoc.termsOfUse.length === 1 ? rawDoc.termsOfUse[0] : rawDoc.termsOfUse
      }

      // Add credentialSubject - this preserves nested structure
      if (rawDoc.credentialSubject) {
        const subject = rawDoc.credentialSubject
        // Spread all credentialSubject properties except 'id' which is the DID
        Object.entries(subject).forEach(([key, value]) => {
          if (key !== 'id') {
            result[key] = value
          }
        })
        // Add subject DID separately if present
        if (subject.id) {
          result.subjectDid = subject.id
        }
      }

      // For SD-JWT format, claims are at root level (not in credentialSubject)
      // Add any other root-level claims that aren't standard VC fields
      const standardFields = ['@context', 'type', 'vct', 'issuer', 'iss', 'iat', 'exp', 'nbf', 'jti', 'sub', 'credentialSubject', 'proof', 'termsOfUse', 'evidence', 'cnf', '_sd', '_sd_alg']
      Object.entries(rawDoc).forEach(([key, value]) => {
        if (!standardFields.includes(key) && !result[key]) {
          result[key] = value
        }
      })

      // Add evidence summary if present (details shown in Documents tab)
      if (rawDoc.evidence?.length) {
        result.evidenceCount = `${rawDoc.evidence.length} document(s) attached`
      }

      return result
    }

    return (
      <div className={style.tabContent}>
        <div className={style.verifiedInfoContent}>
          <div className={style.claimsSection}>
            <div className={style.claimsSectionTitle}>
              {translate('credential_details_claims_title', 'Credential Claims')}
            </div>
            <div className={style.claimsContainer}>
              <JSONDataView
                data={buildClaimsData()}
                shouldExpandNodeInitially={true}
              />
            </div>
          </div>
          <div className={style.credentialSidePanel}>
            <SSICredentialCardView
              header={{
                credentialTitle: credentialTableItem.type,
                logo: credentialSummary.branding?.logo,
              }}
              body={{
                issuerName: credentialTableItem.issuer?.contact?.displayName ?? 'Unknown Issuer',
              }}
              footer={{
                credentialStatus: credentialTableItem.status,
                expirationDate: credentialSummary.expirationDate,
              }}
              display={{
                backgroundColor: credentialSummary.branding?.background?.color,
                backgroundImage: credentialSummary.branding?.background?.image,
                textColor: credentialSummary.branding?.text?.color,
              }}
            />
            <div className={style.publishContainer}>
              <SSISwitchItem
                label={translate('credential_details_published_label')}
                checked={!!credentialSummary.linkedVp?.linkedVpId}
                onChange={onTogglePublished}
                tooltip={buildLinkedVPInfo()}
              />
              {credentialSummary.linkedVp && (
                <div className={style.publishInfo}>
                  {buildLinkedVPInfo()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const getActivityContent = (): ReactElement => {
    return (
      <div className={style.tabContent}>
        <div className={style.sectionHeader}>
          <h3 className={style.sectionTitle}>{translate('credential_details_activity_title', 'Activity')}</h3>
        </div>
        <div className={style.emptyText}>{translate('credential_details_no_activity', 'No activity recorded')}</div>
      </div>
    )
  }

  // Helper to decode SD-JWT payload
  const decodeJwtPayload = (jwt: string): any | null => {
    try {
      // SD-JWT format: header.payload.signature~disclosure1~disclosure2...
      const mainJwt = jwt.split('~')[0]
      const parts = mainJwt.split('.')
      if (parts.length < 2) return null

      const payload = parts[1]
      // Convert base64url to base64
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
      // Add padding if needed
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
      const decoded = atob(padded)
      return JSON.parse(decoded)
    } catch (e) {
      console.error('Failed to decode JWT payload:', e)
      return null
    }
  }

  const getDocumentsContent = (): ReactElement => {
    // Extract evidence from the credential's raw document
    // For SD-JWT credentials, evidence may be in the decoded JWT payload, not in uniformDocument
    const credential = credentialResult.data.data
    const rawDocument = credential.rawDocument
    let evidenceArray: any[] = []

    // First try uniformDocument
    const uniformDoc = credential.uniformDocument
    if (uniformDoc) {
      const parsed = typeof uniformDoc === 'string' ? JSON.parse(uniformDoc) : uniformDoc
      evidenceArray = parsed.evidence || []
    }

    // If no evidence found and rawDocument looks like a JWT (SD-JWT), decode it
    if (evidenceArray.length === 0 && rawDocument && typeof rawDocument === 'string' && rawDocument.startsWith('ey')) {
      const sdJwtPayload = decodeJwtPayload(rawDocument)
      if (sdJwtPayload?.evidence) {
        evidenceArray = sdJwtPayload.evidence
      }
    }

    // Fallback to rawDocument if it's JSON
    if (evidenceArray.length === 0 && rawDocument) {
      try {
        const parsed = typeof rawDocument === 'string' ? JSON.parse(rawDocument) : rawDocument
        evidenceArray = parsed.evidence || []
      } catch (e) {
        // rawDocument is likely a JWT string, already handled above
      }
    }

    const agentBaseUrl = getAgentBaseUrl()

    // Convert evidence to EvidenceItem format
    const evidenceItems: EvidenceItem[] = evidenceArray.map((ev: any, index: number) => {
      const name = ev.name || `Evidence ${index + 1}`
      const type = Array.isArray(ev.type) ? ev.type.join(', ') : (ev.type || 'Document')

      // Build URL from digestMultibase if available, otherwise use id/url
      let url = ev.id || ev.url
      const digestMultibase = ev.digestMultibase
      if (digestMultibase) {
        // Assets are served at /api/assets/{digestMultibase}
        url = `${agentBaseUrl}/api/assets/${digestMultibase}`
      }

      // Determine storage status
      let storageStatus: 'stored' | 'external' | 'pending' = 'external'
      if (digestMultibase) {
        // If it has a digestMultibase, it's stored in our asset system
        storageStatus = 'stored'
      } else if (url?.includes(agentBaseUrl)) {
        storageStatus = 'stored'
      }

      return {
        id: ev.id || digestMultibase || `evidence-${index}`,
        name,
        type,
        size: ev.size,
        url,
        storageStatus,
      }
    })

    const handleEvidenceClick = (item: EvidenceItem) => {
      if (item.url) {
        window.open(item.url, '_blank')
      }
    }

    return (
      <div className={style.tabContent}>
        <div className={style.sectionHeader}>
          <h3 className={style.sectionTitle}>{translate('credential_details_documents_title', 'Documents')}</h3>
        </div>
        {evidenceItems.length === 0 ? (
          <div className={style.emptyText}>{translate('credential_details_no_documents', 'No documents attached')}</div>
        ) : (
          <EvidenceList
            items={evidenceItems}
            onItemClick={handleEvidenceClick}
            statusLabels={{
              stored: translate('evidence_status_stored', 'Stored') as string,
              external: translate('evidence_status_external', 'External') as string,
              fetching: translate('evidence_status_fetching', 'Fetching') as string,
              pending: translate('evidence_status_pending', 'Pending') as string,
            }}
          />
        )}
      </div>
    )
  }

  const getContactsContent = (): ReactElement => {
    // Build contacts array from issuer and subject
    const contacts: ContactDisplayItem[] = []

    // Add issuer if present
    if (credentialTableItem.issuer) {
      const issuerLegalName = credentialTableItem.issuer.partyType.type === PartyTypeType.ORGANIZATION
        ? (credentialTableItem.issuer.contact as Organization).legalName
        : `${(credentialTableItem.issuer.contact as NaturalPerson).firstName} ${(credentialTableItem.issuer.contact as NaturalPerson).lastName}`

      contacts.push({
        id: credentialTableItem.issuer.id,
        displayName: credentialTableItem.issuer.contact.displayName,
        legalName: issuerLegalName,
        partyType: credentialTableItem.issuer.partyType.type,
        roles: credentialTableItem.issuer.roles,
        role: 'issuer',
      })
    }

    // Add subject if present
    if (credentialTableItem.subject) {
      const subjectLegalName = credentialTableItem.subject.partyType.type === PartyTypeType.ORGANIZATION
        ? (credentialTableItem.subject.contact as Organization).legalName
        : `${(credentialTableItem.subject.contact as NaturalPerson).firstName} ${(credentialTableItem.subject.contact as NaturalPerson).lastName}`

      contacts.push({
        id: credentialTableItem.subject.id,
        displayName: credentialTableItem.subject.contact.displayName,
        legalName: subjectLegalName,
        partyType: credentialTableItem.subject.partyType.type,
        roles: credentialTableItem.subject.roles || [],
        role: 'subject',
      })
    }

    const handleViewContact = (contactId: string) => {
      navigate(`/contacts/${contactId}`)
    }

    return (
      <div className={style.tabContent}>
        <div className={style.sectionHeader}>
          <h3 className={style.sectionTitle}>{translate('credential_details_contacts_title', 'Related Contacts')}</h3>
        </div>
        {contacts.length === 0 ? (
          <div className={style.emptyText}>{translate('credential_details_no_contacts', 'No contacts associated')}</div>
        ) : (
          <div className={style.contactsGrid}>
            {contacts.map((contact) => (
              <div key={`${contact.role}-${contact.id}`} className={style.contactCard}>
                <div className={style.contactCardHeader}>
                  <div className={`${style.contactCardAccent} ${contact.role === 'issuer' ? style.contactCardAccentIssuer : style.contactCardAccentSubject}`} />
                  <div className={style.contactCardInfo}>
                    <div className={style.contactCardRole}>
                      {contact.role === 'issuer' ? translate('credential_role_issuer', 'Issuer') : translate('credential_role_subject', 'Subject')}
                    </div>
                    <div className={style.contactCardName}>{contact.displayName}</div>
                  </div>
                  <button
                    className={style.viewContactButton}
                    onClick={() => handleViewContact(contact.id)}
                    title={translate('action_view_contact', 'View Contact') as string}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </button>
                </div>
                <div className={style.contactCardBody}>
                  {contact.legalName && (
                    <div className={style.contactCardField}>
                      <span className={style.contactCardFieldLabel}>{translate('contact_legal_name', 'Legal Name')}</span>
                      <span className={style.contactCardFieldValue}>{contact.legalName}</span>
                    </div>
                  )}
                  <div className={style.contactCardField}>
                    <span className={style.contactCardFieldLabel}>{translate('contact_type', 'Type')}</span>
                    <span className={style.contactCardFieldValue}>{contact.partyType}</span>
                  </div>
                  {contact.roles && contact.roles.length > 0 && (
                    <div className={style.contactCardRoles}>
                      {contact.roles.map((role) => (
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
            ))}
          </div>
        )}
      </div>
    )
  }

  // Build tabs array
  const tabs: {id: CredentialDetailsTabRoute; label: string}[] = [
    {id: CredentialDetailsTabRoute.INFO, label: translate('credential_details_verified_info_tab_label') as string},
    {id: CredentialDetailsTabRoute.ACTIVITY, label: translate('credential_details_activity_tab_label') as string},
    {id: CredentialDetailsTabRoute.DOCUMENTS, label: translate('credential_details_documents_tab_label') as string},
    {id: CredentialDetailsTabRoute.CONTACTS, label: translate('credential_details_contacts_tab_label') as string},
  ]

  const renderTabContent = (): ReactElement => {
    switch (activeTab) {
      case CredentialDetailsTabRoute.INFO:
        return getVerifiedInformationContent()
      case CredentialDetailsTabRoute.ACTIVITY:
        return getActivityContent()
      case CredentialDetailsTabRoute.DOCUMENTS:
        return getDocumentsContent()
      case CredentialDetailsTabRoute.CONTACTS:
        return getContactsContent()
      default:
        return getVerifiedInformationContent()
    }
  }

  // Get status badge class
  const getStatusBadgeClass = (): string => {
    switch (credentialTableItem.status) {
      case CredentialStatus.VALID:
        return style.statusValid
      case CredentialStatus.EXPIRED:
        return style.statusExpired
      case CredentialStatus.REVOKED:
        return style.statusRevoked
      default:
        return style.statusValid
    }
  }

  const handleClose = () => {
    navigate('/credentials')
  }

  return (
    <div className={style.pageContainer}>
      <PageHeaderBar path={translate('credential_details_path_label')} />
      <div className={style.container}>
        {/* Header */}
        <div className={style.header}>
          <div className={style.titleSection}>
            <span className={style.credentialTitle}>{credentialSummary.title || credentialTableItem.type}</span>
            <span className={`${style.statusBadge} ${getStatusBadgeClass()}`}>
              {credentialTableItem.status}
            </span>
          </div>
          <div className={style.headerActions}>
            <button className={style.closeButton} onClick={handleClose} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
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
            </button>
          ))}
        </div>

        {/* Body */}
        <div className={style.body}>
          {renderTabContent()}
        </div>
      </div>

      {showCreateSharedIdModal && <PublishLinkedVPModal onClose={handleCloseModal} onSubmit={handlePublishVP} />}
    </div>
  )
}

export const getStaticProps = async ({locale = 'en'}: {locale?: string}) => staticPropsWithSST({locale})

export default ShowCredentialDetails
