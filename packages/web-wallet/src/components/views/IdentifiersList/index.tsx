import React, {FC, ReactElement} from 'react'
import short from 'short-uuid'
import {useTranslate, useNavigation, useList, HttpError} from '@refinedev/core'
import {ButtonIcon} from '@sphereon/ui-components.core'
import {ColumnHeader, SSITableView, TableCellType} from '@sphereon/ui-components.ssi-react'
import {DataResource, KeyManagementIdentifier} from '@typings'
import {IIdentifier} from '@veramo/core'
import {getDidMethodFromDID} from '@helpers/DID/DIDService'

type Props = {
  allowAddNewIdentifier?: boolean
}

const mapIdentifierData = (identifierData?: IIdentifier[]): KeyManagementIdentifier[] => {
  if (!identifierData) return []
  return identifierData.map(identifier => ({
    type: 'did',
    method: getDidMethodFromDID(identifier.did),
    alias: identifier.alias,
    value: identifier.did,
    origin: 'Managed',
  }))
}

const IdentifiersList: FC<Props> = (props: Props): ReactElement => {
  const {allowAddNewIdentifier = true} = props
  const translate = useTranslate()
  const {create} = useNavigation()
  const {
    data: identifierData,
    isError: isIdentifierListError,
    isLoading: isIdentifierListLoading,
  } = useList<IIdentifier, HttpError>({
    resource: DataResource.IDENTIFIERS,
  })
  if (identifierData?.isError) {
    return <div>{translate('data_provider_error_message')}</div>
  }
  if (identifierData?.isLoading) {
    return <div>{translate('data_provider_loading_message')}</div>
  }
  const keyManagementIdentifiers: KeyManagementIdentifier[] = mapIdentifierData(identifierData?.data)

  const truncationLength: number = 20

  const onCreateIdentifier = async (): Promise<void> => {
    create(DataResource.IDENTIFIERS)
  }

  const columns: ColumnHeader<KeyManagementIdentifier>[] = [
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
    <SSITableView<KeyManagementIdentifier> key={short.generate()} data={keyManagementIdentifiers} columns={columns} actions={buildActionList()} />
  )
}

export default IdentifiersList
