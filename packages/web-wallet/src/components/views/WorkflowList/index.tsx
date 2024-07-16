import {ColumnHeader, SSITableView, TableCellType} from '@sphereon/ui-components.ssi-react'
import React, {ReactElement, useEffect, useState} from 'react'
import WorkflowAddDocumentModal from '../../../../pages/workflows/documents/add'
import WorkflowApproveDocumentsModal from '../../../../pages/workflows/documents/approve'
import WorkflowApproveAssetModal from '../../../../pages/workflows/assets/approve'
import {getWorkflowStepData, IWorkflowStepData} from '../../../workflows/simpleWorkflowRouter'
import {
  Asset,
  WorkflowActionType,
  WorkflowDocumentStorageInfo,
  WorkflowDTOType,
  WorkflowEntity,
  WorkflowStatus,
  WorkflowStepDTO,
  WorkflowStepDTOType,
  WorkflowStepEntity,
} from '@typings'
import {WorkflowStorageService} from '@objectstorage/WorkflowStorageService'
import {HttpError, useList, useTranslate} from '@refinedev/core'
import SidePanelModal from '@components/modals/SidePanelModal'
import {Party} from '@sphereon/ssi-sdk.data-store'

type Props = {
  assetIdFilter?: string
  fetchLatest?: boolean
}

const WorkflowList: React.FC<Props> = (props: Props): ReactElement => {
  const {assetIdFilter, fetchLatest} = props
  const translate = useTranslate()
  const [selectedWorkflowStep, setSelectedWorkflowStep] = useState<
    | {
        workflow: WorkflowDTOType
        workflowStep: WorkflowStepDTOType
      }
    | undefined
  >()
  const [workflowStepData, setWorkflowStepData] = useState<IWorkflowStepData | undefined>()
  const [storageInfo, setStorageInfo] = useState<WorkflowDocumentStorageInfo | undefined>()

  useEffect((): void => {
    if (!selectedWorkflowStep) {
      setWorkflowStepData(undefined)
      return
    }
    const workflowData = getWorkflowStepData(selectedWorkflowStep.workflow, selectedWorkflowStep.workflowStep)
    const {workflow, sender, senderIdentity, recipientIdentity, recipient, ...rest} = selectedWorkflowStep.workflowStep
    if (selectedWorkflowStep.workflowStep.documentCorrelationId) {
      WorkflowStorageService.fromState(workflowData)
        .getStorageInfo({correlationId: selectedWorkflowStep.workflowStep.documentCorrelationId!})
        .then(info => {
          console.log(`Storage info called ${JSON.stringify(info)}`)
          setStorageInfo(info)
        })
    }
    setWorkflowStepData(workflowData)
  }, [selectedWorkflowStep, setWorkflowStepData])

  const refreshData = async () => {
    await workflowResults.refetch()
    await assetResults.refetch()
    await partyResults.refetch()
    await workflowStepResults.refetch()
  }

  const onPostSubmit = async (): Promise<void> => {
    await refreshData()
  }

  const workflowResults = useList<WorkflowEntity, HttpError>({
    resource: 'workflow',
    dataProviderName: 'supaBase',
    ...(assetIdFilter && {
      filters: [
        {
          field: 'asset_id',
          operator: 'eq',
          value: assetIdFilter,
        },
      ],
    }),
  })
  const assetResults = useList<Asset, HttpError>({
    resource: `asset`,
    dataProviderName: 'supaBase',
    filters: [
      {
        field: 'id',
        operator: 'in',
        value: Array.from(new Set(workflowResults.data?.data.map(v => v.asset_id))),
      },
    ],
  })
  const partyResults = useList<Party, HttpError>({
    resource: 'parties',
    // no filtering yet
  })
  const workflowStepResults = fetchLatest
    ? useList<WorkflowStepEntity, HttpError>({
        resource: `view_latest_workflow_step`,
        dataProviderName: 'supaBase',
        pagination: {
          pageSize: 1000,
          mode: 'server',
        },
        sorters: [
          {
            field: 'created_at',
            order: 'asc',
          },
        ],
      })
    : useList<WorkflowStepEntity, HttpError>({
        resource: `view_all_workflow_step`,
        dataProviderName: 'supaBase',
        pagination: {
          pageSize: 1000,
          mode: 'server',
        },
        filters: [
          {
            field: 'asset_id',
            operator: 'eq',
            value: assetIdFilter,
          },
        ],
        sorters: [
          {
            field: 'created_at',
            order: 'asc',
          },
        ],
      })
  if (workflowResults.isError || partyResults.isError || assetResults.isError || workflowStepResults.isError) {
    return <div>{translate('data_provider_error_message')}</div>
  }
  if (workflowResults.isLoading || partyResults.isLoading || assetResults.isLoading || workflowStepResults.isLoading) {
    return <div>{translate('data_provider_loading_message')}</div>
  }
  const workflowEntities: WorkflowEntity[] = workflowResults.data?.data ?? []
  const parties: Party[] = partyResults.data?.data ?? []
  const assets: Asset[] = assetResults.data?.data ?? []
  const workflowSteps: WorkflowStepEntity[] = workflowStepResults.data?.data ?? []
  const workflows: WorkflowDTOType[] = workflowEntities.map(workflowEntity => WorkflowEntity.toDTO(workflowEntity, assets, parties))
  const workflowStepDTOs: WorkflowStepDTOType[] = workflowSteps.map(step => WorkflowStepEntity.toDTO(step, workflows, parties, translate))

  const getSidePanelContent = (type?: WorkflowActionType) => {
    if (workflowStepData?.descriptor) {
      const assetName = workflowStepData.workflow.asset.name
      if (workflowStepData.workflowStep.status === WorkflowStatus.New || workflowStepData.workflowStep.status === WorkflowStatus.Pending) {
        switch (type) {
          case WorkflowActionType.APPROVE_ASSET:
            return (
              <WorkflowApproveAssetModal
                workflowState={workflowStepData}
                titleCaption={translate(workflowStepData.descriptor.titleCaption)}
                subTitleCaption={workflowStepData.workflow.owner.contact.displayName}
                subCloseCaption={workflowStepData.workflowStep.createdAtStr}
                caption={translate('workflow_approve_asset_caption', {
                  sender: workflowStepData.workflow.owner.contact.displayName,
                  assetName,
                })}
                documentType={translate(workflowStepData.descriptor.documentType!)}
                onPostSubmit={onPostSubmit}
                onClose={onCloseSidePanel}
                onAbort={onCloseSidePanel}
              />
            )
          case WorkflowActionType.ATTACH_DOCUMENT:
            return (
              <WorkflowAddDocumentModal
                workflowState={workflowStepData}
                titleCaption={translate(workflowStepData.descriptor.titleCaption)}
                subTitleCaption={workflowStepData.workflow.owner.contact.displayName}
                subCloseCaption={workflowStepData.workflowStep.createdAtStr}
                caption={translate('workflow_add_documents_caption', {
                  sender: workflowStepData.workflow.owner.contact.displayName,
                  documentType: translate(workflowStepData.descriptor.documentType!),
                  assetName,
                })}
                documentType={translate(workflowStepData.descriptor.documentType!)}
                onPostSubmit={onPostSubmit}
                onClose={onCloseSidePanel}
              />
            )
          case WorkflowActionType.APPROVE_DOCUMENT: {
            return (
              <WorkflowApproveDocumentsModal
                workflowState={workflowStepData}
                storageInfo={storageInfo!}
                titleCaption={translate(workflowStepData.descriptor.titleCaption)}
                subTitleCaption={workflowStepData.workflow.owner.contact.displayName}
                subCloseCaption={workflowStepData.workflowStep.createdAtStr}
                caption={translate('workflow_approve_documents_caption', {
                  sender: workflowStepData.workflow.owner.contact.displayName,
                  documentType: translate(workflowStepData.descriptor.documentType!), // FIXME add "of type {{documentType}}" but descriptor does not have documentType atm
                })}
                documentType={translate(workflowStepData.descriptor.documentType!)}
                onPostSubmit={onPostSubmit}
                onClose={onCloseSidePanel}
                onAbort={onCloseSidePanel}
              />
            )
          }
        }
      }
    }
    return <div style={{width: 910}}>Not implemented!</div>
  }

  const getSidePanel = () => {
    const type = selectedWorkflowStep && workflowStepData?.descriptor?.actionType
    if (workflowStepData?.descriptor) {
      if (type !== WorkflowActionType.APPROVE_DOCUMENT || (type === WorkflowActionType.APPROVE_DOCUMENT && storageInfo)) {
        return <SidePanelModal content={getSidePanelContent(type)} onClose={onCloseSidePanel} />
      }
    }
  }

  const onCloseSidePanel = async (): Promise<void> => {
    setSelectedWorkflowStep(undefined)
    await refreshData()
  }

  const columns: ColumnHeader<Omit<WorkflowStepDTO, 'toEntity' | 'asEntity'>>[] = [
    {
      accessor: 'code',
      label: translate('workflows_fields_code'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 120,
      },
    },
    {
      accessor: 'createdAtStr',
      label: translate('workflows_fields_created_at'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 200,
      },
    },
    {
      accessor: 'workflow.asset.name',
      label: translate('workflows_fields_asset'),
      type: TableCellType.TEXT,
    },
    {
      accessor: 'action',
      label: translate('workflows_fields_action'),
      type: TableCellType.TEXT,
    },
    {
      accessor: 'sender.contact.displayName',
      label: translate('workflows_fields_sender'),
      type: TableCellType.TEXT,
    },
    {
      accessor: 'recipient.contact.displayName',
      label: translate('workflows_fields_recipient'),
      type: TableCellType.TEXT,
    },
    {
      accessor: 'message',
      label: translate('workflows_fields_message'),
      type: TableCellType.TEXT,
    },
    {
      accessor: 'status',
      label: translate('workflows_fields_status'),
      type: TableCellType.STATUS,
      columnOptions: {
        columnWidth: 120,
      },
    },
  ]

  return (
    <>
      <SSITableView
        data={workflowStepDTOs}
        columns={columns}
        onRowClick={async (row): Promise<void> =>
          setSelectedWorkflowStep({
            workflow: row.original.workflow,
            workflowStep: row.original,
          })
        }
      />
      {getSidePanel()}
    </>
  )
}

export default WorkflowList
