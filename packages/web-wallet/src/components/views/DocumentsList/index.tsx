import React, {ReactElement, useEffect, useState} from 'react'
import {ColumnHeader, Row, SSITableView, TableCellType} from '@sphereon/ui-components.ssi-react'
import {HttpError, useList, useTranslate} from '@refinedev/core'
import {createStorageDocumentTableRows, StorageDocumentDTO, StorageDocumentTableItem, StorageObject, WorkflowDocumentStorageInfo} from '@typings'
import SidePanelModal from '@components/modals/SidePanelModal'
import DocumentViewerModal from '../../../../pages/documents/show'
import {ButtonIcon} from '@sphereon/ui-components.core'
import {supabaseServiceClient, supabaseStorageServiceClient} from '@helpers/SupabaseClient'
import {StoragePathResolver} from '@objectstorage/StoragePathResolver'
import {WF_BUCKET_STORAGE_ID} from '@components/views/WorkflowApproveDocuments'
import {ObjectStorage} from '@objectstorage'

type Props = {
  allowAddNewDocument?: boolean
  path?: string
}
type QueryOptions = {
  path?: string
}

const getBucketObjects = async (opts?: QueryOptions) => {
  let query = supabaseServiceClient.from('objects_view').select('*')
  if (opts?.path) {
    query = query.ilike('name', `${opts.path}%`)
  }
  const {data, error} = await query
  if (error) {
    throw new Error(`Error on getting the query result: ${JSON.stringify(error)}`)
  }
  return data as StorageObject[]
}

const DocumentsList: React.FC<Props> = (props: Props): ReactElement => {
  const {allowAddNewDocument = true, path} = props
  const translate = useTranslate()
  const [showModal, setShowModal] = useState(false)
  const [rowData, setRowData] = useState<StorageDocumentDTO | null>(null)
  const [bucketObjects, setBucketObjects] = useState<StorageObject[] | null>(null)
  const workflowDocumentRows = useList<WorkflowDocumentStorageInfo, HttpError>({
    resource: `workflow_document`,
    dataProviderName: 'supaBase',
    ...(path && {
      filters: [
        {
          field: 'storage_object_path',
          operator: 'contains',
          value: path,
        },
      ],
    }),
    pagination: {
      mode: 'server',
      pageSize: 100,
    },
  })
  const fetchBucketObjects = async (opts: QueryOptions) => {
    const objects = await getBucketObjects(opts)
    setBucketObjects(objects)
  }
  useEffect(() => {
    fetchBucketObjects({path})
  }, [])

  if (workflowDocumentRows.isLoading) {
    return <div>{translate('data_provider_loading_message')}</div>
  }

  if (workflowDocumentRows.isError || !bucketObjects) {
    return <div>{translate('data_provider_error_message')}</div>
  }
  const workflowDocumentStorageInfos: WorkflowDocumentStorageInfo[] = workflowDocumentRows.data?.data ?? []

  const storageDocumentDTOs: StorageDocumentTableItem[] = createStorageDocumentTableRows(workflowDocumentStorageInfos, bucketObjects)
  const onCloseModal = async (): Promise<void> => {
    setShowModal(false)
  }

  // todo: move this to environment-vars.ts file like we're doing in the web-wallet-agent
  const truncationLength: number = process.env.NEXT_PUBLIC_TRUNCATION_LENGTH ? Number(process.env.NEXT_PUBLIC_TRUNCATION_LENGTH) : 8
  const columns: Array<ColumnHeader<StorageDocumentTableItem>> = [
    {
      accessor: 'asset_id',
      label: translate('documents_fields_asset_id'),
      type: TableCellType.TEXT,
      columnOptions: {
        cellOptions: {
          truncationLength,
          enableHover: true,
        },
        columnWidth: 120,
      },
    },
    {
      accessor: 'workflow_id',
      label: translate('documents_fields_workflow_id'),
      type: TableCellType.TEXT,
      columnOptions: {
        cellOptions: {
          truncationLength,
          enableHover: true,
        },
        columnWidth: 130,
      },
    },
    {
      accessor: 'type',
      label: translate('documents_fields_type'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 300,
      },
    },
    {
      accessor: 'file_name',
      label: translate('documents_fields_file_name'),
      type: TableCellType.TEXT,
    },
    {
      accessor: 'created_at',
      label: translate('documents_fields_created_at'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 200,
      },
    },
    {
      accessor: 'actions',
      label: translate('documents_fields_actions'),
      type: TableCellType.ACTIONS,
      columnOptions: {
        cellOptions: {
          actions: [
            {
              caption: translate('documents_fields_actions_delete'),
              onClick: async (opts: Row<StorageDocumentTableItem>) => {
                await onDelete(opts)
              },
              icon: ButtonIcon.DELETE,
            },
          ],
        },
      },
    },
  ]

  function getDocumentViewer(currentRowData: StorageDocumentDTO): ReactElement {
    return (
      <DocumentViewerModal
        createdAt={currentRowData.created_at}
        titleCaption={currentRowData.file_name}
        filePath={currentRowData.storage_object_path!}
        onClose={onCloseModal}
      />
    )
  }

  const onDelete = async (rowData: Row<StorageDocumentTableItem>) => {
    if (!rowData) {
      return
    }
    const storage: ObjectStorage = ObjectStorage.fromResolver(new StoragePathResolver(WF_BUCKET_STORAGE_ID))
    const response = await storage.remove(rowData.original.storage_object_path)
    if (response.error) {
      throw new Error('Error deleting the object:', response.error)
    } else {
      await fetchBucketObjects({path})
    }
  }

  return (
    <div>
      <SSITableView<StorageDocumentTableItem>
        data={storageDocumentDTOs}
        columns={columns}
        onRowClick={async (row: Row<StorageDocumentTableItem>): Promise<void> => {
          setRowData(row.original)
          setShowModal(true)
        }}
      />
      {showModal && rowData && <SidePanelModal content={getDocumentViewer(rowData)} onClose={onCloseModal} />}
    </div>
  )
}

export default DocumentsList
