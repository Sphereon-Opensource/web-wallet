import React, {FC, ReactElement, useEffect, useState} from 'react'
import {HttpError, useDelete, useList, useNavigation, useTranslate} from '@refinedev/core'
import {ColumnHeader, Row, SSITableView, TableCellType} from '@sphereon/ui-components.ssi-react'
import {ButtonIcon} from '@sphereon/ui-components.core'
import {Credential, CredentialReference, CredentialTableItem, DataResource} from '@types'
import {toCredentialSummary} from '@sphereon/ui-components.credential-branding'
import agent from '@agent'
import {Party} from '@sphereon/ssi-sdk.data-store'
import {getMatchingIdentity} from '@helpers/IdentityFilters'

type Props = {
  allowIssueCredential?: boolean
}

const CredentialsList: FC<Props> = (props: Props): ReactElement => {
  const {allowIssueCredential = true} = props
  const translate = useTranslate()
  const {mutateAsync: deleteCredential} = useDelete<Credential, HttpError>()
  const {mutateAsync: deleteCredentialReference} = useDelete<CredentialReference, HttpError>()
  const {create, show} = useNavigation()
  const [credentialTableItems, setCredentialTableItems] = useState<CredentialTableItem[]>([])

  const {
    data: credentialData,
    isLoading: credentialsLoading,
    isError: credentialsError,
    refetch: refetchCredentials,
  } = useList<Credential, HttpError>({
    resource: 'credential',
    dataProviderName: 'supaBase',
    pagination: {
      pageSize: 1000,
      mode: 'server',
    },
    sorters: [
      {
        field: 'issuanceDate',
        order: 'asc',
      },
    ],
    meta: {
      idColumnName: 'hash',
    },
  })

  const {data: partyData, isLoading: partiesLoading, isError: partiesError} = useList<Party, HttpError>({resource: 'parties'})

  useEffect(() => {
    const fetchCredentialTableItems = async () => {
      if (!credentialData || !partyData) {
        return
      }

      try {
        const credentialBrandings = await agent.ibGetCredentialBranding()
        const newCredentialTableItems = await Promise.all(
          credentialData.data.map(async credential => {
            const filteredCredentialBrandings = credentialBrandings.filter(cb => cb.vcHash === credential.hash)
            const issuerPartyIdentity = getMatchingIdentity(partyData.data, credential.issuerDid)
            const subjectPartyIdentity = getMatchingIdentity(partyData.data, credential.subjectDid)
            const credentialSummary = await toCredentialSummary(
              {hash: credential.hash, verifiableCredential: JSON.parse(credential.raw)},
              filteredCredentialBrandings.length ? filteredCredentialBrandings[0].localeBranding : undefined,
              issuerPartyIdentity?.party,
              subjectPartyIdentity?.party,
            )

            return CredentialTableItem.from(credential, partyData.data, credentialSummary)
          }),
        )

        setCredentialTableItems(newCredentialTableItems)
      } catch (error) {
        console.error(error)
      }
    }

    fetchCredentialTableItems()
  }, [credentialData, partyData])

  const onCredentialItemDelete = async (opts: Row<CredentialTableItem>): Promise<void> => {
    await onDelete(opts)
  }

  const onCredentialItemIssue = async (opts: Row<CredentialTableItem>): Promise<void> => {
    console.log('Issue credential clicked')
  }

  const columns: ColumnHeader<CredentialTableItem>[] = [
    {
      accessor: 'miniCardView',
      label: translate('credentials_fields_card'),
      type: TableCellType.CREDENTIAL_CARD,
      columnOptions: {
        columnWidth: 120,
      },
    },
    {
      accessor: 'type',
      label: translate('credentials_fields_credential'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 120,
      },
    },
    {
      accessor: 'issuer.contact.displayName',
      label: translate('credentials_fields_issuer_did'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 200,
      },
    },
    {
      accessor: 'subject.contact.displayName',
      label: translate('credentials_fields_subject_did'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 200,
      },
    },
    {
      accessor: 'createdStr',
      label: translate('credentials_fields_created'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 200,
      },
    },
    {
      accessor: 'validFromStr',
      label: translate('credentials_fields_valid_from'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 200,
      },
    },
    {
      accessor: 'expirationDateStr',
      label: translate('credentials_fields_expiration_date'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 200,
      },
    },
    {
      accessor: 'status',
      label: translate('credential_fields_status'),
      type: TableCellType.STATUS,
      columnOptions: {
        columnWidth: 120,
      },
    },
    {
      accessor: 'actions',
      label: translate('credential_fields_actions'),
      type: TableCellType.ACTIONS,
      columnOptions: {
        cellOptions: {
          actions: [
            {
              caption: translate('credential_fields_actions_delete'),
              icon: ButtonIcon.DELETE,
              onClick: onCredentialItemDelete,
            },
            {
              caption: translate('action_issue_credential_caption'),
              onClick: onCredentialItemIssue,
            },
          ],
        },
      },
    },
  ]

  const onDelete = async (rowData: Row<CredentialTableItem>): Promise<void> => {
    if (!rowData) {
      return
    }
    await deleteCredential(
      {
        dataProviderName: 'supaBase',
        resource: 'credential',
        id: rowData.original.hash,
      },
      {
        onError: error => {
          throw new Error(`Failed to delete credential: ${JSON.stringify(error)}`)
        },
      },
    )
    await deleteCredentialReference(
      {
        dataProviderName: 'supaBase',
        resource: 'credential_reference',
        id: rowData.original.hash,
        meta: {
          idColumnName: 'credential_id',
        },
      },
      {
        onError: error => {
          throw new Error(`Failed to delete credential references: ${JSON.stringify(error)}`)
        },
      },
    )

    if (refetchCredentials) {
      refetchCredentials()
    }
  }

  const onIssueCredential = async (): Promise<void> => {
    create(DataResource.CREDENTIALS)
  }

  const onShowCredentialDetails = async (row: Row<CredentialTableItem>): Promise<void> => {
    show(DataResource.CREDENTIALS, row.original.hash, undefined, {idColumnName: 'hash'})
  }

  const buildActionList = () => {
    const actions = []
    if (allowIssueCredential) {
      actions.push({
        caption: translate('credentials_overview_action_add_credential'),
        icon: ButtonIcon.ADD,
        onClick: onIssueCredential,
      })
    }
    return actions
  }

  if (credentialsError || partiesError) {
    return <div>{translate('data_provider_error_message')}</div>
  }

  if (credentialsLoading || partiesLoading) {
    return <div>{translate('data_provider_loading_message')}</div>
  }
  return <SSITableView data={credentialTableItems} columns={columns} actions={buildActionList()} onRowClick={onShowCredentialDetails} />
}

export default CredentialsList
