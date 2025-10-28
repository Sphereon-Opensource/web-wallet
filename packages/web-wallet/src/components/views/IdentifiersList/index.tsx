import React, {FC, ReactElement} from 'react'
import short from 'short-uuid'
import {HttpError, useList, useNavigation, useTranslate, useDeleteMany} from '@refinedev/core'
import {ButtonIcon} from '@sphereon/ui-components.core'
import {ColumnHeader, Row, SSITableView, TableCellType} from '@sphereon/ui-components.ssi-react'
import {DataResource, KeyManagementIdentifier} from '@typings'
import {IIdentifier} from '@veramo/core'
import {getDidMethodFromDID} from '@helpers/DID/DIDService'

type Props = {
  allowAddNewIdentifier?: boolean
}

type KeyManagementIdentifierWithActions = KeyManagementIdentifier & {
  actions: string
  isWebDid: boolean // FIXME
}

const mapIdentifierData = (identifierData?: IIdentifier[]): KeyManagementIdentifierWithActions[] => {
  if (!identifierData) {
    return []
  }
  return identifierData.map(identifier => ({
    type: 'did',
    method: getDidMethodFromDID(identifier.did),
    alias: identifier.alias,
    value: identifier.did,
    origin: 'Managed',
    actions: '',
    isWebDid: identifier.did.startsWith('did:web'),
  }))
}

const IdentifiersList: FC<Props> = (props: Props): ReactElement => {
  const {allowAddNewIdentifier = true} = props
  const translate = useTranslate()
  const {create, edit} = useNavigation()
  const {mutateAsync: deleteIdentifiers} = useDeleteMany<IIdentifier[], HttpError>()
  const {
    data: identifierData,
    isError: isIdentifierListError,
    isLoading: isIdentifierListLoading,
    refetch,
  } = useList<IIdentifier, HttpError>({
    resource: DataResource.IDENTIFIERS,
  })
  if (identifierData?.isError) {
    return <div>{translate('data_provider_error_message')}</div>
  }
  if (identifierData?.isLoading) {
    return <div>{translate('data_provider_loading_message')}</div>
  }

  const keyManagementIdentifiers: KeyManagementIdentifierWithActions[] = mapIdentifierData(identifierData?.data)

  const truncationLength: number = 20

  const onCreateIdentifier = async (): Promise<void> => {
    create(DataResource.IDENTIFIERS)
  }

  const onEditIdentifier = async (row: Row<KeyManagementIdentifierWithActions>): Promise<void> => {
    edit(DataResource.IDENTIFIERS, row.original.value)
  }

  const onDeleteIdentifier = async (row: Row<KeyManagementIdentifierWithActions>): Promise<void> => {
    await deleteIdentifiers(
      {
        resource: DataResource.IDENTIFIERS,
        ids: [row.original.value],
      },
      {
        onError: error => {
          throw new Error(`Failed to delete identifier: ${JSON.stringify(error)}`)
        },
      },
    )

    await refetch()
  }

  const columns: ColumnHeader<KeyManagementIdentifierWithActions>[] = [
    {
      accessor: 'type',
      label: translate('identifiers_overview_column_type_label'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 10,
      },
    },
    {
      accessor: 'method',
      label: translate('identifiers_overview_column_method_label'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 10,
      },
    },
    {
      accessor: 'alias',
      label: translate('identifiers_overview_column_alias_label'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 60,
      },
    },
    {
      accessor: 'value',
      label: translate('identifiers_overview_column_value_label'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 60,
        cellOptions: {
          truncationLength,
          enableHover: true,
        },
      },
    },
    {
      accessor: 'origin',
      label: translate('identifiers_overview_column_origin_label'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 120,
      },
    },
    {
      accessor: (row) => ({
        actions: [
          {
            caption: translate('identifiers_overview_fields_actions_edit'),
            icon: ButtonIcon.EDIT,
            onClick: onEditIdentifier,
            disabled: !row.isWebDid,
          },
          {
            caption: translate('identifiers_overview_fields_actions_delete'),
            icon: ButtonIcon.DELETE,
            onClick: onDeleteIdentifier,
          },
        ],
      }),
      label: translate('identifiers_overview_column_actions_label'),
      type: TableCellType.ACTIONS,
      columnOptions: {
        columnWidth: 120,
      },
    },
  ]

  const buildActionList = () => {
    const actions = []
    if (allowAddNewIdentifier) {
      actions.push({
        caption: translate('identifiers_overview_action_add_identifier'),
        icon: ButtonIcon.ADD,
        onClick: onCreateIdentifier,
      })
    }
    return actions
  }

  return (
    <SSITableView<KeyManagementIdentifierWithActions>
      key={short.generate()}
      data={keyManagementIdentifiers}
      columns={columns}
      actions={buildActionList()}
    />
  )
}

export default IdentifiersList
