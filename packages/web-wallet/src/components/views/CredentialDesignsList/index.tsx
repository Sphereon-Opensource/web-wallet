import React, {FC, ReactElement} from 'react'
import {HttpError, useDelete, useList, useNavigation, useTranslate} from '@refinedev/core'
import {ColumnHeader, Row, SSITableView, TableCellType} from '@sphereon/ui-components.ssi-react'
import {ButtonIcon} from '@sphereon/ui-components.core'
import {Button, CredentialDesignTableItem, DataResource} from '@typings'

type Props = {
  allowCreateCredentialDesign?: boolean
}

const CredentialDesignsList: FC<Props> = (props: Props): ReactElement => {
  const {allowCreateCredentialDesign = true} = props
  const translate = useTranslate()
  const {mutateAsync: deleteCredential} = useDelete<CredentialDesignTableItem, HttpError>()
  const {create, show} = useNavigation()

  const {
    data: credentialDesigns,
    isLoading: credentialDesignsLoading,
    isError: credentialDesignsError,
    refetch: refetchCredentialDesigns,
  } = useList<CredentialDesignTableItem, HttpError>({
    resource: DataResource.CREDENTIAL_DESIGNS,
    pagination: {
      pageSize: 1000,
      mode: 'server',
    },
    sorters: [
      {
        field: 'name',
        order: 'asc',
      },
    ],
    meta: {
      idColumnName: 'id',
    }
  })

  const onDelete = async (data: Row<CredentialDesignTableItem>): Promise<void> => {
    // TODO implement
  }

  const onShow = async (data: Row<CredentialDesignTableItem>): Promise<void> => {
    // TODO implement
  }

  const onCreate = async (): Promise<void> => {
    create(DataResource.CREDENTIAL_DESIGNS)
  }

  const columns: ColumnHeader<CredentialDesignTableItem>[] = [
    {
      accessor: 'name',
      label: translate('credential_design_fields_name'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 120,
      },
    },
    {
      accessor: 'actions',
      label: translate('credential_design_fields_actions'),
      type: TableCellType.ACTIONS,
      columnOptions: {
        cellOptions: {
          actions: [
            {
              caption: translate('credential_design_actions_delete'),
              icon: ButtonIcon.DELETE,
              onClick: onDelete,
            }
          ]
        }
      }
    }
  ]

  const buildActionList = (): Array<Button> => {
    const actions: Array<Button> = []
    if (allowCreateCredentialDesign) {
      actions.push({
        caption: translate('credential_designs_overview_action_create_design'),
        icon: ButtonIcon.ADD,
        onClick: onCreate,
      })
    }

    return actions
  }

  if (credentialDesignsError) {
    return <div>{translate('data_provider_error_message')}</div>
  }

  if (credentialDesignsLoading) {
    return <div>{translate('data_provider_loading_message')}</div>
  }

  return <div>
    <SSITableView
      data={credentialDesigns.data}
      columns={columns}
      actions={buildActionList()}
      onRowClick={onShow}
    />
  </div>
}

export default CredentialDesignsList
