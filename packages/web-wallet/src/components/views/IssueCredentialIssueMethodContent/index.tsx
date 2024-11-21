import React, {FC, ReactElement} from 'react'
import {useTranslate} from '@refinedev/core'
import {ColumnHeader, CredentialMiniCardViewProps, SSITableView, TableCellType, ValueSelection} from '@sphereon/ui-components.ssi-react'
import {CredentialStatus} from '@sphereon/ui-components.core'
import {useCredentialsOutletContext} from '@machines/credentials/credentialsCreateStateNavigation'
import styles from './index.module.css'

type CredentialDetails = {
  credentialTitle: string
  credentialStatus: CredentialStatus
  issuerName: string
  issueDate: number
  expirationDate?: number
}

type CredentialIssueMethod = {
  card: CredentialMiniCardViewProps
  credentialDetails: CredentialDetails
  issueType: ValueSelection
  actions: string
}

const IssueCredentialIssueMethodContent: FC = (): ReactElement => {
  const translate = useTranslate()
  const {onIssueMethodChange, issueMethod, issueMethods, credentialType} = useCredentialsOutletContext()

  const credentials: Array<CredentialIssueMethod> = [
    {
      card: {},
      credentialDetails: {
        credentialTitle: credentialType?.label ?? translate('unknown_label'),
        credentialStatus: CredentialStatus.DRAFT,
        issuerName: process.env.NEXT_PUBLIC_TEMP_CREDENTIAL_ISSUER_NAME ?? translate('unknown_label'),
        issueDate: Date.now(),
      },
      issueType: issueMethod ?? issueMethods[0],
      actions: 'actions',
    },
  ]

  const columns: Array<ColumnHeader<CredentialIssueMethod>> = [
    {
      accessor: 'card',
      label: translate('credential_issuance_column_card_label'),
      type: TableCellType.CREDENTIAL_CARD,
      columnOptions: {
        columnWidth: 76,
      },
    },
    {
      accessor: 'credentialDetails',
      label: translate('credential_issuance_column_credential_information_label'),
      type: TableCellType.CREDENTIAL_DETAILS,
      columnOptions: {
        columnWidth: 374,
      },
    },
    {
      accessor: 'issueType',
      label: translate('credential_issuance_column_issue_method_label'),
      type: TableCellType.COMBOBOX,
      columnOptions: {
        columnWidth: 170,
        cellOptions: {
          selectOptions: issueMethods,
          defaultValue: issueMethods[0],
          onChange: onIssueMethodChange,
        },
      },
    },
    {
      accessor: 'actions',
      label: translate('credential_issuance_column_actions_label'),
      type: TableCellType.ACTIONS,
      columnOptions: {
        columnWidth: 62,
        cellOptions: {
          actions: [], // TODO implementation when we need actions
        },
      },
    },
  ]

  return (
    <div className={styles.container}>
      <div className={styles.titleContainer}>
        <div className={styles.titleCaption}>{translate('credential_issuance_issue_method_title')}</div>
        <div className={styles.descriptionCaption}>{translate('credential_issuance_issue_method_description')}</div>
      </div>
      <SSITableView data={credentials} columns={columns} enableRowHover={false} />
    </div>
  )
}

export default IssueCredentialIssueMethodContent
