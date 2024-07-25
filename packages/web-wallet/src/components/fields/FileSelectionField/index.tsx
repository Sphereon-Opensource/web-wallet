import React, {CSSProperties, ReactElement} from 'react'
import DocumentIcon from '@components/assets/icons/DocumentIcon'
import DropDownList from '@components/lists/DropDownList'
import styles from './index.module.css'
import {AssetFilePermission, ValueSelection} from '@typings'

type Props = {
  file: File
  permission?: AssetFilePermission
  onPermissionChange?: (permission: AssetFilePermission) => Promise<void>
  style?: CSSProperties
}

const filePermissions: Array<ValueSelection> = [
  {label: 'Public', value: 'public'},
  {label: 'Private', value: 'private'},
]

const getFileSizeDisplay = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`
  } else if (bytes <= 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  } else if (bytes <= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }
}

const FileSelectionField: React.FC<Props> = (props: Props): ReactElement => {
  const {file, permission, style, onPermissionChange} = props

  const onChange = async (selection: ValueSelection): Promise<void> => {
    if (onPermissionChange) {
      await onPermissionChange(selection.value as AssetFilePermission)
    }
  }

  return (
    <div className={styles.container} style={style}>
      <div className={styles.iconContainer}>
        <DocumentIcon />
      </div>
      <div className={styles.fileDataContainer}>
        <div className={styles.fileNameCaption}>{file.name}</div>
        {file.size && <div className={styles.fileSizeCaption}>{getFileSizeDisplay(file.size)}</div>}
      </div>
      {permission && (
        <div className={styles.permissionSelectionContainer}>
          <DropDownList<ValueSelection>
            style={{width: 152, marginLeft: 'auto'}}
            defaultValue={filePermissions.find((selection: ValueSelection): boolean => selection.value === permission)}
            onChange={onChange}
            options={filePermissions}
          />
        </div>
      )}
    </div>
  )
}

export default FileSelectionField
