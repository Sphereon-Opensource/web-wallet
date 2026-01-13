import React, {FC, ReactElement} from 'react'
import short from 'short-uuid'
import {HttpError, useDeleteMany, useList, useNavigation, useTranslate, useDataProvider} from '@refinedev/core'
import {ButtonIcon} from '@sphereon/ui-components.core'
import {ColumnHeader, Row, SSITableView, TableCellType} from '@sphereon/ui-components.ssi-react'
import type {DcqlQueryItem} from '@sphereon/ssi-sdk.data-store-types'
import {DataProvider, DataResource} from '@typings'
import {getEnv} from '@/src/services/env'

type Props = {
  allowAddNewDcqlQueryItem?: boolean
}

type DcqlQueryMenuItem = DcqlQueryItem & {
  actions: string
}

const QueryDefinitionsList: FC<Props> = (props: Props): ReactElement => {
  const translate = useTranslate()
  const {allowAddNewDcqlQueryItem = false} = props
  const uuidTruncationLength: number = getEnv('BROWSER_PUBLIC_TRUNCATION_LENGTH') ? Number(getEnv('BROWSER_PUBLIC_TRUNCATION_LENGTH')) : 8
  const {mutateAsync: deleteDcqlQueryItems} = useDeleteMany<DcqlQueryItem[], HttpError>()
  const {show, create, edit} = useNavigation()
  const dataProvider = useDataProvider()

  const results = useList<DcqlQueryItem, HttpError>({
    resource: DataResource.QUERIES,
  })

  if (results.isError) {
    return <div>{translate('data_provider_error_message')}</div>
  }
  if (results.isLoading) {
    return <div>{translate('data_provider_loading_message')}</div>
  }

  const onShowDefinition = async (row: Row<DcqlQueryMenuItem>): Promise<void> => {
    show(DataResource.QUERIES, row.original.id)
  }

  const onCreateDefinition = async (): Promise<void> => {
    create(DataResource.QUERIES)
  }

  const onEditDefinition = async (opts: Row<DcqlQueryMenuItem>): Promise<void> => {
    edit(DataResource.QUERIES, opts.original.id)
  }

  const onDeleteDefinition = async (opts: Row<DcqlQueryMenuItem>): Promise<void> => {
    await onDelete(opts)
  }

  const columns: ColumnHeader<DcqlQueryMenuItem>[] = [
    {
      accessor: 'id',
      label: translate('queries_overview_column_id_label'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 120,
        cellOptions: {
          truncationLength: uuidTruncationLength,
          enableHover: true,
        },
      },
    },
    {
      accessor: 'queryId',
      label: translate('queries_overview_column_definition_id_label'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 200,
      },
    },
    {
      accessor: 'version',
      label: translate('queries_overview_column_version_label'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 120,
      },
    },
    {
      accessor: 'name',
      label: translate('queries_overview_column_name_label'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 120,
      },
    },
    {
      accessor: 'purpose',
      label: translate('queries_overview_column_purpose_label'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 200,
      },
    },
    {
      accessor: 'actions',
      label: translate('queries_overview_column_actions_label'),
      type: TableCellType.ACTIONS,
      columnOptions: {
        cellOptions: {
          actions: [
            {
              caption: translate('queries_overview_fields_actions_edit'),
              icon: ButtonIcon.EDIT,
              onClick: onEditDefinition,
            },
            {
              caption: translate('queries_overview_fields_actions_delete'),
              icon: ButtonIcon.DELETE,
              onClick: onDeleteDefinition,
            },
          ],
        },
      },
    },
  ]

  const onDelete = async (rowData: Row<DcqlQueryMenuItem>): Promise<void> => {
    if (!rowData) {
      return
    }
    const allVersions = await dataProvider(DataProvider.QUERIES).getList<DcqlQueryItem>({
      resource: DataResource.QUERIES,
      filters: [
        {field: 'queryId', operator: 'eq', value: rowData.original.queryId},
        {field: 'tenantId', operator: 'eq', value: rowData.original.tenantId},
      ],
      meta: {
        variables: {showVersionHistory: true},
      },
    })

    if (allVersions.isError) {
      throw new Error('Failed to fetch versions')
    }

    await deleteDcqlQueryItems(
      {
        resource: DataResource.QUERIES,
        ids: allVersions.data?.map((versionedItem: DcqlQueryItem) => versionedItem.id) ?? [],
      },
      {
        onError: error => {
          throw new Error(`Failed to delete presentation definition: ${JSON.stringify(error)}`)
        },
      },
    )

    await results.refetch()
  }
  const buildActionList = () => {
    const actions = []
    if (allowAddNewDcqlQueryItem) {
      actions.push({
        caption: translate('queries_overview_action_add_presentation_definition'),
        icon: ButtonIcon.ADD,
        onClick: onCreateDefinition,
      })
    }
    return actions
  }

  const data = results.data.data.map(value => ({...value, actions: ''}))
  return (
    <SSITableView<DcqlQueryMenuItem> key={short.generate()} data={data} columns={columns} actions={buildActionList()} onRowClick={onShowDefinition} />
  )
}

export default QueryDefinitionsList
