import React, {ChangeEvent, FC, ReactElement, useState} from 'react'
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
  const [current, setCurrent] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)

  const {
    data: credentialDesigns,
    isLoading: credentialDesignsLoading,
    isError: credentialDesignsError,
    refetch: refetchCredentialDesigns,
  } = useList<CredentialDesignTableItem, HttpError>({
    resource: DataResource.CREDENTIAL_DESIGNS,
    pagination: {
      pageSize,
      current,
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
    // TODO SSISDK-92 implement
  }

  const onShow = async (data: Row<CredentialDesignTableItem>): Promise<void> => {
    // TODO SSISDK-93 implement
  }

  const onCreate = async (): Promise<void> => {
    create(DataResource.CREDENTIAL_DESIGNS)
  }

  // TODO SSISDK-86 add support for additional data
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

  const designsData = credentialDesigns?.data ?? []
  const totalDesigns = credentialDesigns?.total ?? 0

  const onPageChange = (_event: ChangeEvent<unknown>, page: number) => {
    setCurrent(page)
  }
  const onPageChangeKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      const input = event.target as HTMLInputElement
      let goToPage = Number(input.value)

      if (!isNaN(goToPage) && goToPage >= 1 && goToPage <= Math.ceil(totalDesigns / pageSize)) {
        setCurrent(goToPage)
      } else {
        console.error('Invalid page number')
      }
    }
  }

  return <div>
    <SSITableView
      data={designsData}
      columns={columns}
      actions={buildActionList()}
      onRowClick={onShow}
      // TODO SSISDK-86 enable when data provider supports pagination
      // pagination={{
      //   page: current,
      //   count: Math.ceil(totalDesigns / pageSize),
      //   onChange: onPageChange,
      //   goToInputId: 'custom-goToInput',
      //   containerStyle: {marginTop: '20px'},
      //   onKeyDown: onPageChangeKeyDown,
      // }}
    />
  </div>
}

export default CredentialDesignsList
