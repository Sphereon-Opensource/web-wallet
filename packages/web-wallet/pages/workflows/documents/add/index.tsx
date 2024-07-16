import {useTranslate} from '@refinedev/core'
import React, {CSSProperties, useState} from 'react'
import {AssetFilePermission, SelectedAssetFile} from '@typings'
import WorkflowAddDocuments from '@components/views/WorkflowAddDocuments'
import {IWorkflowStepData, progressWorkflowState} from '../../../../src/workflows/simpleWorkflowRouter'
import {WorkflowStorageService} from '@objectstorage/WorkflowStorageService'
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
  onSubmit?: () => Promise<void>
  onPostSubmit?: () => Promise<void>
  onAbort?: () => Promise<void>
  onClose?: () => Promise<void>
  style?: CSSProperties
}
const WorkflowAddDocumentModal: React.FC<Props> = (props: Props) => {
  const {
    onAbort,
    workflowState,
    onSubmit,
    onClose,
    titleCaption,
    subTitleCaption,
    subCloseCaption,
    caption,
    actionAbortLabel,
    actionSubmitLabel,
    documentType,
  } = props

  const translate = useTranslate()
  const [selectedFile, setSelectedFile] = useState<SelectedAssetFile | null>(null)

  const onSubmitDefault = async (): Promise<void> => {
    if (!selectedFile) {
      throw Error('No file present!')
    }
    const uploadResult = await WorkflowStorageService.uploadUsingState(selectedFile, workflowState)
    if (!uploadResult.data) {
      throw Error(`Could not upload file`)
    }
    await progressWorkflowState(workflowState, [uploadResult.data.correlation_id])
    typeof onClose === 'function' ? await onClose() : await onCloseDefault()
    typeof props.onPostSubmit === 'function' && void props.onPostSubmit()
  }

  const onAbortDefault = async (): Promise<void> => {
    window.history.back()
  }

  const onCloseDefault = async (): Promise<void> => {
    window.history.back()
  }
  const iSubmitDisabled = (): boolean => {
    return !selectedFile
  }

  const onAddFile = async (file: File): Promise<void> => {
    // Adding private as default permission
    setSelectedFile({file, permission: AssetFilePermission.PRIVATE})
  }

  /*const storeDocument = async (): Promise<void> => {
        if (!selectedFile?.file) {
            throw Error('No file provided')
        }

        const workflowStorage = WorkflowStorageService.fromState(workflowState)
        const {data, error} = await workflowStorage.upload({
            fileName: selectedFile.file.name,
            fileBody: selectedFile.file,
            documentDescriptor: {...workflowState.descriptor?.document!, correlationId: uuid()},
            uploaderDID: workflowState.workflowStep.senderIdentity.identifier.correlationId,
            workflowStepId: workflowState.workflowStep.id
        })


      /!*  // todo once workflowState is implemented get it from there
        const storage = ObjectStorage.fromObject(new Test())
        // todo path config

        const {data2, error2} = await storage.upload(`${documentType ?? 'example'}-${new Date()}`, selectedFile.file, {upsert: true})*!/
        if (error) {
            console.log('Error adding file '+ error)
        } else {
            console.log(`File uploaded: ${JSON.stringify(data)}`)
        }
    }
*/
  const onFilePermissionChange = async (selectedFile: SelectedAssetFile, permission: AssetFilePermission): Promise<void> => {
    setSelectedFile({...selectedFile, permission})
  }

  return (
    <WorkflowAddDocuments
      style={{width: 900}}
      titleCaption={titleCaption}
      subTitleCaption={subTitleCaption}
      subCloseCaption={subCloseCaption}
      addDocumentSelectionCaption={translate('workflow_add_documents_selection_object_caption')}
      // fixme: Probably needs to change when we get the actual workflowState object
      selectionFieldValue={workflowState.workflow.asset.name}
      addDocumentsTitleCaption={translate('workflow_add_documents_title')}
      addDocumentsSubTitleCaption={translate('workflow_add_documents_subtitle', {documentType})}
      caption={caption}
      addDocumentsCaption={translate('add_documents_drag_and_drop_caption')}
      addDocumentsDescription={translate('add_documents_drag_and_drop_description', {documentType})}
      onClose={typeof onClose === 'function' ? onClose : onCloseDefault}
      onAddFile={onAddFile}
      selectedFile={selectedFile}
      onAbort={typeof onAbort === 'function' ? onAbort : undefined /*onAbortDefault*/}
      actionAbortLabel={actionAbortLabel ?? translate('action_decline_label')}
      onSubmit={typeof onSubmit === 'function' ? onSubmit : onSubmitDefault}
      actionSubmitLabel={actionSubmitLabel ?? translate('action_send_label')}
      onPermissionChange={async (permission: AssetFilePermission): Promise<void> => {
        selectedFile && void onFilePermissionChange(selectedFile, permission)
      }}
    />
  )
}
export const getStaticProps = staticPropsWithSST

export default WorkflowAddDocumentModal
