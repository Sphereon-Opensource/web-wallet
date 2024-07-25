import {useTranslate} from '@refinedev/core'
import React, {CSSProperties} from 'react'
import WorkflowApproveDocuments from '@components/views/WorkflowApproveDocuments'
import {IWorkflowStepData, progressWorkflowState} from '../../../../src/workflows/simpleWorkflowRouter'
import {WorkflowDocumentStorageInfo} from '@typings'
import {staticPropsWithSST} from '../../../../src/i18n/server'

type Props = {
  workflowState: IWorkflowStepData
  titleCaption: string
  subTitleCaption: string
  subCloseCaption: string
  caption: string
  actionAbortLabel?: string
  actionSubmitLabel?: string
  documentType?: string
  storageInfo: WorkflowDocumentStorageInfo
  onPostSubmit?: () => Promise<void>
  onSubmit?: () => Promise<void>
  onAbort?: () => Promise<void>
  onClose?: () => Promise<void>
  style?: CSSProperties
}

const WorkflowApproveDocumentsModal: React.FC<Props> = (props: Props) => {
  const {
    workflowState,
    onPostSubmit,
    onAbort,
    onSubmit,
    onClose,
    storageInfo,
    titleCaption,
    subTitleCaption,
    subCloseCaption,
    caption,
    actionAbortLabel,
    actionSubmitLabel,
    documentType,
  } = props
  const translate = useTranslate()
  const onSubmitDefault = async (): Promise<void> => {
    await progressWorkflowState(workflowState)
    typeof onClose === 'function' ? await onClose() : await onCloseDefault()
    typeof props.onPostSubmit === 'function' && void props.onPostSubmit()
  }
  const onAbortDefault = async (): Promise<void> => {
    window.history.back()
  }

  const onCloseDefault = async (): Promise<void> => {
    window.history.back()
  }

  return (
    <WorkflowApproveDocuments
      filePath={storageInfo.storage_object_path}
      storageInfo={storageInfo}
      workflowId={workflowState.workflow.id}
      assetName={workflowState.workflow.asset.name}
      titleCaption={titleCaption}
      subTitleCaption={subTitleCaption}
      subCloseCaption={subCloseCaption}
      caption={caption}
      onClose={typeof onClose === 'function' ? onClose : onCloseDefault}
      onAbort={typeof onAbort === 'function' ? onAbort : undefined /*onAbortDefault*/}
      actionAbortLabel={actionAbortLabel ?? translate('action_decline_label')}
      onSubmit={typeof onSubmit === 'function' ? onSubmit : onSubmitDefault}
      actionSubmitLabel={actionSubmitLabel ?? translate('action_approve_label')}
    />
  )
}

export const getStaticProps = staticPropsWithSST

export default WorkflowApproveDocumentsModal
