import React, {FC, ReactElement} from 'react'
import short from 'short-uuid'
import {HttpError, useDeleteMany, useList, useNavigation, useTranslate, useDataProvider} from '@refinedev/core'
import {ButtonIcon} from '@sphereon/ui-components.core'
import {ColumnHeader, Row, SSITableView, TableCellType} from '@sphereon/ui-components.ssi-react'
import {PresentationDefinitionItem} from '@sphereon/ssi-sdk.data-store'
import {DataProvider, DataResource} from '@typings'

type Props = {
  allowAddNewPresentationDefinition?: boolean
}

type PresentationDefinitionMenuItem = PresentationDefinitionItem & {
  actions: string
}

const PresentationDefinitionsList: FC<Props> = (props: Props): ReactElement => {
  const translate = useTranslate()
  const {allowAddNewPresentationDefinition = false} = props
  const uuidTruncationLength: number = process.env.NEXT_PUBLIC_TRUNCATION_LENGTH ? Number(process.env.NEXT_PUBLIC_TRUNCATION_LENGTH) : 8
  const {mutateAsync: deletePresentationDefinitionItems} = useDeleteMany<PresentationDefinitionItem[], HttpError>()
  const {show, create, edit} = useNavigation()
  const dataProvider = useDataProvider()

  const results = useList<PresentationDefinitionItem, HttpError>({
    resource: DataResource.PRESENTATION_DEFINITIONS,
  })

  if (results.isError) {
    return <div>{translate('data_provider_error_message')}</div>
  }
  if (results.isLoading) {
    return <div>{translate('data_provider_loading_message')}</div>
  }

  const onShowDefinition = async (row: Row<PresentationDefinitionMenuItem>): Promise<void> => {
    show(DataResource.PRESENTATION_DEFINITIONS, row.original.id)
  }

  const onCreateDefinition = async (): Promise<void> => {
    create(DataResource.PRESENTATION_DEFINITIONS)
  }

  const onEditDefinition = async (opts: Row<PresentationDefinitionMenuItem>): Promise<void> => {
    edit(DataResource.PRESENTATION_DEFINITIONS, opts.original.id)
  }

  const onDeleteDefinition = async (opts: Row<PresentationDefinitionMenuItem>): Promise<void> => {
    await onDelete(opts)
  }

  const columns: ColumnHeader<PresentationDefinitionMenuItem>[] = [
    {
      accessor: 'id',
      label: translate('presentation_definitions_overview_column_id_label'),
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
      accessor: 'definitionId',
      label: translate('presentation_definitions_overview_column_definition_id_label'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 120,
      },
    },
    {
      accessor: 'version',
      label: translate('presentation_definitions_overview_column_version_label'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 120,
      },
    },
    {
      accessor: 'name',
      label: translate('presentation_definitions_overview_column_name_label'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 120,
      },
    },
    {
      accessor: 'purpose',
      label: translate('presentation_definitions_overview_column_purpose_label'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 200,
      },
    },
    {
      accessor: 'actions',
      label: translate('presentation_definitions_overview_column_actions_label'),
      type: TableCellType.ACTIONS,
      columnOptions: {
        cellOptions: {
          actions: [
            {
              caption: translate('presentation_definitions_overview_fields_actions_edit'),
              icon: ButtonIcon.EDIT,
              onClick: onEditDefinition,
            },
            {
              caption: translate('presentation_definitions_overview_fields_actions_delete'),
              icon: ButtonIcon.DELETE,
              onClick: onDeleteDefinition,
            },
          ],
        },
      },
    },
  ]

  const onDelete = async (rowData: Row<PresentationDefinitionMenuItem>): Promise<void> => {
    if (!rowData) {
      return
    }
    const allVersions = await dataProvider(DataProvider.PRESENTATION_DEFINITIONS).getList<PresentationDefinitionItem>({
      resource: DataResource.PRESENTATION_DEFINITIONS,
      filters: [
        {field: 'definitionId', operator: 'eq', value: rowData.original.definitionId},
        {field: 'tenantId', operator: 'eq', value: rowData.original.tenantId},
      ],
      meta: {
        variables: {showVersionHistory: true},
      },
    })

    if (allVersions.isError) {
      throw new Error('Failed to fetch versions')
    }

    await deletePresentationDefinitionItems(
      {
        resource: DataResource.PRESENTATION_DEFINITIONS,
        ids: allVersions.data?.map((versionedItem: PresentationDefinitionItem) => versionedItem.id) ?? [],
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
    if (allowAddNewPresentationDefinition) {
      actions.push({
        caption: translate('presentation_definitions_overview_action_add_presentation_definition'),
        icon: ButtonIcon.ADD,
        onClick: onCreateDefinition,
      })
    }
    return actions
  }

  const data = results.data.data.map(value => ({...value, actions: ''}))
  return (
    <SSITableView<PresentationDefinitionMenuItem>
      key={short.generate()}
      data={data}
      columns={columns}
      actions={buildActionList()}
      onRowClick={onShowDefinition}
    />
  )
}

export default PresentationDefinitionsList
