import React, {FC, ReactElement, useEffect, useRef, useState} from 'react'
import {HttpError, useList, useOne, useTranslate} from '@refinedev/core'
import {TabViewRoute} from '@sphereon/ui-components.core'
import {useBrandingSync} from '@services/brandingSyncService'
import {
  ColumnHeader,
  CredentialMiniCardView,
  CredentialMiniCardViewProps,
  JSONDataView,
  SSICredentialCardView,
  SSISwitchItem,
  SSITableView,
  SSITabView,
  TableCellType,
} from '@sphereon/ui-components.ssi-react'
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
import {getEnvInt} from '@/src/services/env'

enum CredentialDetailsTabRoute {
  INFO = 'info',
  ACTIVITY = 'activity',
  DOCUMENTS = 'documents',
  CONTACTS = 'contacts',
}

type ContactItem = {
  id: string
  legalName: string
  alias: string
  contactType: PartyTypeType
  labels: Array<CredentialRole>
  actions: string
}

type ActivityItem = {
  id: string
  description: string
  event: string
  date: string
  details: string
  actions: string
}

type DocumentItem = {
  fileName: string
  description: string
  fileSize: string
  fileType: string
  attachmentDate: string
  actions: string
}

type Props = {
  credentialRole: CredentialRole
}

async function getUnifiedVC(rawDocument: any) {
  const wrappedCredential = CredentialMapper.toWrappedVerifiableCredential(rawDocument, {hasher: defaultHasher})
  let uniformVerifiableCredential: IVerifiableCredential
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
  const {credentialRole} = props
  const translate = useTranslate()
  const navigate = useNavigate()
  const params = useParams()
  const {id} = params
  const truncationLength: number = getEnvInt('BROWSER_PUBLIC_TRUNCATION_LENGTH', 8)
  const [credentialSummary, setCredentialSummary] = useState<CredentialSummary | undefined>(undefined)

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
        const issuerParties: Party[] = await getAgent().cmGetContacts({
          filter: [{identities: {identifier: {correlationId: issuerCorrelationId}}}],
        })

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

        const uniformVerifiableCredential = await getUnifiedVC(rawDocument)
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
    return <div>{translate('data_provider_loading_message')}</div>
  }

  if (credentialResult.isError || partyResults.isError) {
    return <div>{translate('data_provider_error_message')}</div>
  }

  const credentialTableItem: CredentialTableItem = CredentialTableItem.from(
    credentialResult.data.data,
    partyResults.data?.data ?? [],
    credentialSummary,
  )

  const credentialCardViewProps: CredentialMiniCardViewProps = {
    ...(credentialSummary?.branding?.logo && {logo: credentialSummary?.branding?.logo}),
    ...(credentialSummary?.branding?.background?.image && {backgroundImage: credentialSummary?.branding?.background?.image}),
    ...(credentialSummary?.branding?.background?.color && {backgroundColor: credentialSummary?.branding?.background?.color}),
  }

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
    const filteredSubject: Record<string, any> = Object.fromEntries(
      credentialSummary.properties.filter(prop => prop.label !== 'subject').map(detail => [detail.label, detail.value]),
    )
    const termsOfUse = credentialSummary.termsOfUse?.length
      ? credentialSummary.termsOfUse.length === 1
        ? credentialSummary.termsOfUse[0]
        : credentialSummary.termsOfUse
      : undefined

    return (
      <div className={style.tabViewContentContainer}>
        <div className={style.verifiedInformationDataContainer}>
          <JSONDataView
            data={{
              type: credentialSummary.title,
              issuer: credentialSummary.issuer,
              ...(termsOfUse && {termsOfUse}),
              ...filteredSubject,
            }}
            shouldExpandNodeInitially={true}
          />
        </div>
        <div>
          <SSICredentialCardView
            header={{
              credentialTitle: credentialTableItem.type,
              logo: credentialSummary.branding?.logo,
            }}
            body={{
              issuerName: credentialTableItem.issuer.contact.displayName,
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
          {credentialSummary && (
            <div className={style.publishContainer}>
              <SSISwitchItem
                label={translate('credential_details_published_label')}
                checked={!!credentialSummary.linkedVp?.linkedVpId}
                onChange={onTogglePublished}
                tooltip={buildLinkedVPInfo()}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  const getActivityContent = (): ReactElement => {
    const columns: Array<ColumnHeader<ActivityItem>> = [
      {
        accessor: 'id',
        label: translate('credential_details_activity_tab_column_id_label'),
        type: TableCellType.TEXT,
        columnOptions: {
          columnWidth: 277,
        },
      },
      {
        accessor: 'description',
        label: translate('credential_details_activity_tab_column_description_label'),
        type: TableCellType.TEXT,
        columnOptions: {
          columnWidth: 277,
        },
      },
      {
        accessor: 'event',
        label: translate('credential_details_activity_tab_column_event_label'),
        type: TableCellType.TEXT,
        columnOptions: {
          columnWidth: 277,
        },
      },
      {
        accessor: 'date',
        label: translate('credential_details_activity_tab_column_date_label'),
        type: TableCellType.TEXT,
        columnOptions: {
          columnWidth: 277,
        },
      },
      {
        accessor: 'details',
        label: translate('credential_details_activity_tab_column_details_label'),
        type: TableCellType.TEXT,
        columnOptions: {
          columnWidth: 277,
        },
      },
      {
        accessor: 'actions',
        label: translate('credential_details_activity_tab_column_actions_label'),
        type: TableCellType.ACTIONS,
        columnOptions: {
          columnWidth: 92,
          cellOptions: {
            actions: [], // TODO implementation when we need actions
          },
        },
      },
    ]

    return (
      <div className={style.tabViewContentContainer}>
        <div className={style.tabViewContentTableContainer}>
          <SSITableView<ActivityItem>
            data={[]} // TODO implementation
            columns={columns}
          />
        </div>
      </div>
    )
  }

  const getDocumentsContent = (): ReactElement => {
    const columns: Array<ColumnHeader<DocumentItem>> = [
      {
        accessor: 'fileName',
        label: translate('credential_details_documents_tab_column_file_name_label'),
        type: TableCellType.TEXT,
        columnOptions: {
          columnWidth: 215,
        },
      },
      {
        accessor: 'description',
        label: translate('credential_details_documents_tab_column_description_label'),
        type: TableCellType.TEXT,
        columnOptions: {
          columnWidth: 247,
        },
      },
      {
        accessor: 'fileSize',
        label: translate('credential_details_documents_tab_column_file_size_label'),
        type: TableCellType.TEXT,
        columnOptions: {
          columnWidth: 247,
        },
      },
      {
        accessor: 'fileType',
        label: translate('credential_details_documents_tab_column_file_type_label'),
        type: TableCellType.TEXT,
        columnOptions: {
          columnWidth: 247,
        },
      },
      {
        accessor: 'attachmentDate',
        label: translate('credential_details_documents_tab_column_attachment_date_label'),
        type: TableCellType.TEXT,
        columnOptions: {
          columnWidth: 247,
        },
      },
      {
        accessor: 'actions',
        label: translate('credential_details_documents_tab_column_actions_label'),
        type: TableCellType.ACTIONS,
        columnOptions: {
          columnWidth: 92,
          cellOptions: {
            actions: [], // TODO implementation when we need actions
          },
        },
      },
    ]

    return (
      <div className={style.tabViewContentContainer}>
        <div className={style.tabViewContentTableContainer}>
          <SSITableView<DocumentItem>
            data={[]} // TODO implementation
            columns={columns}
          />
        </div>
      </div>
    )
  }

  const getContactsContent = (): ReactElement => {
    const columns: Array<ColumnHeader<ContactItem>> = [
      {
        accessor: 'id',
        label: translate('credential_details_contacts_tab_column_id_label'),
        type: TableCellType.TEXT,
        columnOptions: {
          columnWidth: 68,
          cellOptions: {
            truncationLength,
            enableHover: true,
          },
        },
      },
      {
        accessor: 'legalName',
        label: translate('credential_details_contacts_tab_legal_column_name_label'),
        type: TableCellType.TEXT,
        columnOptions: {
          columnWidth: 252,
        },
      },
      {
        accessor: 'alias',
        label: translate('credential_details_contacts_tab_column_alias_label'),
        type: TableCellType.TEXT,
        columnOptions: {
          columnWidth: 252,
        },
      },
      {
        accessor: 'contactType',
        label: translate('credential_details_contacts_tab_column_contact_type_label'),
        type: TableCellType.TEXT,
        columnOptions: {
          columnWidth: 252,
        },
      },
      {
        accessor: 'labels',
        label: translate('credential_details_contacts_tab_column_contact_kind_label'),
        type: TableCellType.TEXT,
        columnOptions: {
          columnWidth: 252,
        },
      },
      {
        accessor: 'actions',
        label: translate('credential_details_contacts_tab_column_actions_label'),
        type: TableCellType.ACTIONS,
        columnOptions: {
          columnWidth: 68,
          cellOptions: {
            actions: [], // TODO implementation when we need actions
          },
        },
      },
    ]

    // TODO eventually we need a better system for getting all the involved contacts
    const contacts: Array<ContactItem> = [
      {
        id: credentialTableItem.issuer.id,
        legalName:
          credentialTableItem.issuer.partyType.type === PartyTypeType.ORGANIZATION
            ? (credentialTableItem.issuer.contact as Organization).legalName
            : `${(credentialTableItem.issuer.contact as NaturalPerson).firstName} ${(credentialTableItem.issuer.contact as NaturalPerson).lastName}`,
        alias: credentialTableItem.issuer.contact.displayName,
        contactType: credentialTableItem.issuer.partyType.type,
        labels: credentialTableItem.issuer.roles,
        actions: 'actions',
      },
    ]

    if (credentialTableItem.subject) {
      contacts.push({
        id: credentialTableItem.subject.id,
        legalName:
          credentialTableItem.subject.partyType.type === PartyTypeType.ORGANIZATION
            ? (credentialTableItem.subject.contact as Organization).legalName
            : `${(credentialTableItem.subject.contact as NaturalPerson).firstName} ${(credentialTableItem.subject.contact as NaturalPerson).lastName}`,
        alias: credentialTableItem.subject.contact.displayName,
        contactType: credentialTableItem.subject.partyType.type,
        labels: credentialTableItem.issuer.roles,
        actions: 'actions',
      })
    }

    return (
      <div className={style.tabViewContentContainer}>
        <div className={style.tabViewContentTableContainer}>
          <SSITableView<ContactItem> data={contacts} columns={columns} />
        </div>
      </div>
    )
  }

  const routes: Array<TabViewRoute> = [
    {
      key: CredentialDetailsTabRoute.INFO,
      title: translate('credential_details_verified_info_tab_label'),
      content: getVerifiedInformationContent,
    },
    {
      key: CredentialDetailsTabRoute.ACTIVITY,
      title: translate('credential_details_activity_tab_label'),
      content: getActivityContent,
    },
    {
      key: CredentialDetailsTabRoute.DOCUMENTS,
      title: translate('credential_details_documents_tab_label'),
      content: getDocumentsContent,
    },
    {
      key: CredentialDetailsTabRoute.CONTACTS,
      title: translate('credential_details_contacts_tab_label'),
      content: getContactsContent,
    },
  ]

  const handleClose = () => {
    navigate('/credentials')
  }

  return (
    <div className={style.container}>
      <PageHeaderBar path={translate('credential_details_path_label')} />
      <div className={style.headerContainer}>
        <CredentialMiniCardView {...credentialCardViewProps} />
        <button className={style.closeButton} onClick={handleClose} aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <SSITabView routes={routes} />
      {showCreateSharedIdModal && <PublishLinkedVPModal onClose={handleCloseModal} onSubmit={handlePublishVP} />}
    </div>
  )
}

export const getStaticProps = async ({locale = 'en'}: {locale?: string}) => staticPropsWithSST({locale})

export default ShowCredentialDetails
