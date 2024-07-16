import React, {CSSProperties, ReactElement} from 'react'
import {AssetFilePermission, SelectedAssetFile} from '@typings'
import styles from './index.module.css'
import DragAndDropBox from '@components/fields/DragAndDropBox'
import FileSelectionField from '@components/fields/FileSelectionField'

type Props = {
  titleCaption?: string
  subTitleCaption?: string
  caption: string
  description: string
  onChangeFile: (file: File) => Promise<void>
  selectedFile?: SelectedAssetFile | null
  onPermissionChange: (permission: AssetFilePermission) => Promise<void>
  style?: CSSProperties
}

const AddDocuments: React.FC<Props> = (props: Props): ReactElement => {
  const {selectedFile, style, titleCaption, subTitleCaption, onChangeFile, onPermissionChange} = props
  return (
    <div className={styles.contentContainer} style={style}>
      {titleCaption && <div className={styles.titleCaption}>{props.titleCaption}</div>}
      {subTitleCaption && <div className={styles.subTitleCaption}>{props.subTitleCaption}</div>}
      <div className={styles.documentAddDragAndDropContainer}>
        <DragAndDropBox caption={props.caption} description={props.description} onChangeFile={onChangeFile} />
      </div>
      {selectedFile && <FileSelectionField file={selectedFile.file} permission={selectedFile.permission} onPermissionChange={onPermissionChange} />}
    </div>
  )
}

export default AddDocuments
