import React, {CSSProperties, ReactElement} from 'react'
import styles from './index.module.css'
import HeaderContainer from '@components/views/HeaderContainer'
import ItemCaption from '@components/views/ItemCaption'
import SelectionField from '@components/fields/SelectionField'
import AddDocuments from '@components/views/AddDocuments'
import {AssetFilePermission, SelectedAssetFile} from '@typings'
import {PrimaryButton, SecondaryButton} from '@sphereon/ui-components.ssi-react'
import {useTranslate} from '@refinedev/core'

export type WorkflowAddDocumentsProps = {
  titleCaption: string
  subTitleCaption?: string
  subCloseCaption?: string
  caption?: string
  addDocumentSelectionCaption?: string
  addDocumentSelectionDescription?: string
  selectionFieldValue: string
  addDocumentsTitleCaption?: string
  addDocumentsSubTitleCaption?: string
  addDocumentsCaption: string
  addDocumentsDescription: string
  onAddFile: (file: File) => Promise<void>
  onClose: () => Promise<void>
  onAbort?: () => Promise<void>
  actionAbortLabel?: string
  onSubmit: () => Promise<void>
  actionSubmitLabel?: string
  selectedFile: SelectedAssetFile | null
  onPermissionChange: (permission: AssetFilePermission) => Promise<void>
  style?: CSSProperties
}

const WorkflowAddDocuments: React.FC<WorkflowAddDocumentsProps> = (props: WorkflowAddDocumentsProps): ReactElement => {
  const translate = useTranslate()
  const {
    titleCaption,
    subTitleCaption,
    subCloseCaption,
    onClose,
    caption,
    addDocumentSelectionCaption,
    addDocumentSelectionDescription,
    selectionFieldValue,
    addDocumentsTitleCaption,
    addDocumentsSubTitleCaption,
    addDocumentsCaption,
    addDocumentsDescription,
    onAddFile,
    selectedFile,
    onPermissionChange,
    onAbort,
    actionAbortLabel,
    onSubmit,
    actionSubmitLabel,
    style,
  } = props

  return (
    <div className={styles.workflowAddDocumentsContainer} style={style}>
      <HeaderContainer titleCaption={titleCaption} subTitleCaption={subTitleCaption} subCloseCaption={subCloseCaption} onClose={onClose} />
      <div className={styles.workflowAddDocumentsContent}>
        {caption && <div className={styles.workflowAddDocumentCaption}>{caption}</div>}
        <ItemCaption caption={addDocumentSelectionCaption} description={addDocumentSelectionDescription} />
        {/*todo: width*/}
        <SelectionField style={{width: 582, marginBottom: 24}} value={selectionFieldValue} />
        <AddDocuments
          titleCaption={addDocumentsTitleCaption}
          subTitleCaption={addDocumentsSubTitleCaption}
          caption={addDocumentsCaption}
          description={addDocumentsDescription}
          onChangeFile={onAddFile}
          selectedFile={selectedFile}
          onPermissionChange={onPermissionChange}
        />
      </div>
      <div className={styles.buttonsContainer}>
        {onAbort && <SecondaryButton caption={actionAbortLabel ?? translate('action_decline_label')} onClick={onAbort} />}
        <PrimaryButton caption={actionSubmitLabel ?? translate('action_approve_label')} disabled={!selectedFile} onClick={onSubmit} />
      </div>
    </div>
  )
}

export default WorkflowAddDocuments
