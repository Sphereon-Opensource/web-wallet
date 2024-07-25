import {useTranslate} from '@refinedev/core'
import {PrimaryButton, SecondaryButton} from '@sphereon/ui-components.ssi-react'
import React, {CSSProperties, FC, ReactElement} from 'react'
import * as path from 'path'
import HeaderContainer from '@components/views/HeaderContainer'
import FileSelectionField from '@components/fields/FileSelectionField'
import SelectionField from '@components/fields/SelectionField'
import PdfViewer from '@components/viewers/PdfViewer'
import styles from './index.module.css'
import {ObjectStorage} from '@objectstorage'
import {StoragePathResolver} from '@objectstorage/StoragePathResolver'
import {WorkflowDocumentStorageInfo} from '@typings'

type Props = {
  filePath: string // TODO we need to support multiple files in the future
  storageInfo: WorkflowDocumentStorageInfo
  workflowId: string
  assetName: string
  titleCaption: string
  subTitleCaption?: string
  subCloseCaption?: string
  caption?: string
  onClose: () => Promise<void>
  onAbort?: () => Promise<void>
  actionAbortLabel?: string
  onSubmit: () => Promise<void>
  actionSubmitLabel?: string
  style?: CSSProperties
}

export const WF_BUCKET_STORAGE_ID = 'dpp-workflow-storage'
const WorkflowApproveDocuments: FC<Props> = (props: Props): ReactElement => {
  const {
    filePath,
    storageInfo,
    workflowId,
    assetName,
    titleCaption,
    subTitleCaption,
    subCloseCaption,
    caption,
    onClose,
    onAbort,
    actionAbortLabel,
    onSubmit,
    actionSubmitLabel,
    style, // TODO
  } = props
  const translate = useTranslate()

  return (
    <div className={styles.container}>
      <HeaderContainer titleCaption={titleCaption} subTitleCaption={subTitleCaption} subCloseCaption={subCloseCaption} onClose={onClose} />
      <div className={styles.contentContainer}>
        <div className={styles.fileInformationContainer}>
          <div className={styles.fileInformationContentContainer}>
            {caption && <div className={styles.descriptionCaption}>{caption}</div>}
            <SelectionField value={assetName} />
            {/*FIXME should use file data*/}
            {/*// @ts-ignore*/}
            <FileSelectionField style={{width: 455}} file={{name: path.basename(filePath)}} />
          </div>
          <div className={styles.buttonsContainer}>
            {onAbort && <SecondaryButton caption={actionAbortLabel ?? translate('action_decline_label')} onClick={onAbort} />}
            <PrimaryButton caption={actionSubmitLabel ?? translate('action_approve_label')} onClick={onSubmit} />
          </div>
        </div>
        <PdfViewer
          pdfPath={filePath ?? storageInfo.storage_object_path}
          renderAllPages={true}
          storage={ObjectStorage.fromResolver(new StoragePathResolver(WF_BUCKET_STORAGE_ID))}
        />
      </div>
    </div>
  )
}

export default WorkflowApproveDocuments
