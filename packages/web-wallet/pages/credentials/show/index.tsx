import React, {FC, ReactElement, useEffect, useState} from 'react'
import {HttpError, useList, useOne, useResource, useTranslate} from '@refinedev/core'
import {TabViewRoute} from '@sphereon/ui-components.core'
import {
  ColumnHeader,
  CredentialMiniCardView,
  CredentialMiniCardViewProps,
  JSONDataView,
  SSICredentialCardView,
  SSITableView,
  SSITabView,
  TableCellType,
} from '@sphereon/ui-components.ssi-react'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import style from './index.module.css'
import {CredentialTableItem, DataResource} from '@typings'
import {CredentialRole, NaturalPerson, Organization, Party, PartyTypeType} from '@sphereon/ssi-sdk.data-store'
import {useParams} from 'react-router-dom'
import {staticPropsWithSST} from '@/src/i18n/server'
import agent from '@agent'

import {CredentialSummary, toCredentialSummary} from '@sphereon/ui-components.credential-branding'
import {DigitalCredential} from '@sphereon/ssi-sdk.credential-store'
import {VerifiableCredential} from '@veramo/core'
import {CredentialMapper} from '@sphereon/ssi-types'

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

const truncationLength: number = process.env.NEXT_PUBLIC_TRUNCATION_LENGTH ? Number(process.env.NEXT_PUBLIC_TRUNCATION_LENGTH) : 8

type Props = {
  credentialRole: CredentialRole
}

const ShowCredentialDetails: FC<Props> = (props: Props): ReactElement => {
  const {credentialRole} = props
  const translate = useTranslate()
  const params = useParams()
  const {id} = params
  const [credentialSummary, setCredentialSummary] = useState<CredentialSummary | undefined>(undefined)
  const credentialResult = useOne<DigitalCredential, HttpError>({
    resource: DataResource.CREDENTIALS,
    id,
    meta: {variables: {credentialRole: credentialRole}},
  })

  const partyResults = useList<Party, HttpError>({resource: 'parties'})

  useEffect(() => {
    const fetchBranding = async () => {
      if (!credentialResult.data?.data) return

      const {hash, issuerCorrelationId, subjectCorrelationId, rawDocument} = credentialResult.data.data

      try {
        const issuerParties: Party[] = await agent.cmGetContacts({
          filter: [{identities: {identifier: {correlationId: issuerCorrelationId}}}],
        })

        const subjectParties = subjectCorrelationId
          ? await agent.cmGetContacts({
              filter: [{identities: {identifier: {correlationId: subjectCorrelationId}}}],
            })
          : []

        const credentialBrandings = await agent.ibGetCredentialBranding({
          filter: [
            {
              vcHash: hash,
            },
          ],
        })

        const wrappedCredential = CredentialMapper.toWrappedVerifiableCredential(rawDocument)  // FIXME
        const credentialSummary: CredentialSummary = await toCredentialSummary({
          verifiableCredential: wrappedCredential.decoded as VerifiableCredential,   // FIXME
          hash,
          credentialRole,
          branding: credentialBrandings.length ? credentialBrandings[0].localeBranding : undefined,
          issuer: issuerParties.length ? issuerParties[0] : undefined,
          subject: subjectParties.length ? subjectParties[0] : undefined,
        })

        setCredentialSummary(credentialSummary)
      } catch (error) {
        console.error(error)
      }
    }

    fetchBranding()
  }, [credentialResult.data])

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
  const getVerifiedInformationContent = (): ReactElement => {
    const wrappedCredential = CredentialMapper.toWrappedVerifiableCredential(credentialResult.data.data.rawDocument)
    const credentialSubject = wrappedCredential.decoded.credentialSubject
    if ('id' in credentialSubject && credentialSubject.id.startsWith('did:')) {
      delete credentialSubject.id
    }
    const termsOfUse = credentialSummary.termsOfUse?.length
      ? credentialSummary.termsOfUse.length === 1
        ? credentialSummary.termsOfUse[0]
        : credentialSummary.termsOfUse
      : undefined
    return (
      <div className={style.tabViewContentContainer}>
        <div className={style.verifiedInformationDataContainer}>
          <JSONDataView
            data={{type: credentialSummary.title, issuer: credentialSummary.issuer, ...(termsOfUse && {termsOfUse}), ...credentialSubject}}
            shouldExpandNodeInitially={true}
          />
        </div>
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

  return (
    <div className={style.container}>
      <PageHeaderBar path={translate('credential_details_path_label')} />
      <div className={style.headerContainer}>
        <CredentialMiniCardView {...credentialCardViewProps} />
      </div>
      <SSITabView routes={routes} />
    </div>
  )
}

export const getStaticProps = staticPropsWithSST

export default ShowCredentialDetails
