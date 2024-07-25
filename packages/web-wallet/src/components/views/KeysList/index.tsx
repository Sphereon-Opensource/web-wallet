import {ColumnHeader, Row, SSITableView, TableCellType} from '@sphereon/ui-components.ssi-react'
import React, {FC, ReactElement} from 'react'
import {HttpError, useDelete, useList, useTranslate} from '@refinedev/core'
import {DataResource} from '@typings'
import {ButtonIcon} from '@sphereon/ui-components.core'
import {IIdentifier, ManagedKeyInfo} from '@veramo/core'
import {DataProvider} from '@typings'

class KeyTableItem {
  kid: string
  type: string
  alias?: string
  identifierAlias?: string
  actions: string

  constructor(data: {kid: string; type: string; alias?: string; identifierAlias?: string; actions: string}) {
    this.kid = data.kid
    this.type = data.type
    this.alias = data.alias
    this.identifierAlias = data.identifierAlias
    this.actions = data.actions
  }

  static from(key: ManagedKeyInfo, identifiers: IIdentifier[]): KeyTableItem {
    const filteredIdentifiers: IIdentifier[] =
      identifiers && identifiers.length ? identifiers.filter(id => id.keys.some(idKey => idKey.kid === key.kid)) : []
    const identifier: IIdentifier | undefined = filteredIdentifiers.length ? filteredIdentifiers[0] : undefined
    return new KeyTableItem({
      kid: key.kid,
      identifierAlias: identifier?.alias,
      type: key.type,
      //todo
      /**
       * this should come from the key itself. probably we need to revisit this during CWALL-211. according to Niels: Not for every implementation a kid will be equal to an alias
       */
      // alias: key.alias,
      actions: '',
    })
  }
}

const mapKeysData = (keys: ManagedKeyInfo[], identifiers: IIdentifier[]): KeyTableItem[] => {
  if (!keys) return []
  return keys.map((key: ManagedKeyInfo) => KeyTableItem.from(key, identifiers))
}

type Props = {
  allowAddKey?: boolean
}

const KeysList: FC<Props> = ({allowAddKey = true}: Props): ReactElement => {
  const translate = useTranslate()

  const {
    data: keyData,
    isError: isKeyListError,
    isLoading: isKeyListLoading,
    refetch: refetchKeyList,
  } = useList<ManagedKeyInfo, HttpError>({
    resource: DataResource.KEYS,
  })

  const {
    data: identifierData,
    isError: isIdentifierListError,
    isLoading: isIdentifierListLoading,
  } = useList<IIdentifier, HttpError>({
    resource: DataResource.IDENTIFIERS,
  })

  if (isKeyListError || isIdentifierListError) {
    return <div>{translate('data_provider_error_message')}</div>
  }
  if (isKeyListLoading || isIdentifierListLoading) {
    return <div>{translate('data_provider_loading_message')}</div>
  }

  const keys: KeyTableItem[] = mapKeysData(keyData?.data, identifierData?.data)

  const onAddKey = async (): Promise<void> => {
    console.log('clicked on add')
  }

  const buildActionList = () => {
    const actions = []
    if (allowAddKey) {
      actions.push({
        caption: translate('key_overview_action_add_key'),
        icon: ButtonIcon.ADD,
        onClick: onAddKey,
      })
    }
    return actions
  }

  const truncationLength: number = 20

  const columns: ColumnHeader<KeyTableItem>[] = [
    {
      accessor: 'kid',
      label: translate('key_fields_kid'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 200,
        cellOptions: {
          enableHover: true,
          truncationLength: truncationLength,
        },
      },
    },
    {
      accessor: 'type',
      label: translate('key_fields_type'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 120,
      },
    },
    {
      accessor: 'alias',
      label: translate('key_fields_alias'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 200,
      },
    },
    {
      accessor: 'identifierAlias',
      label: translate('key_fields_associated_identifier'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 200,
      },
    },
    //TODO: CWALL-242
    /*{
      accessor: 'actions',
      label: translate('key_fields_actions'),
      type: TableCellType.ACTIONS,
      columnOptions: {
        cellOptions: {
          actions: [
            {
              caption: translate('key_fields_actions_delete'),
              icon: ButtonIcon.DELETE,
              onClick: onDelete,
            },
          ],
        },
      },
    },*/
  ]

  return <SSITableView data={keys} columns={columns} actions={buildActionList()} />
}

export default KeysList
