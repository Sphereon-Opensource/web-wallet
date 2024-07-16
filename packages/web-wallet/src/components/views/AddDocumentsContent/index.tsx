import React, {ReactElement} from 'react'
import AddDocuments from '@components/views/AddDocuments'
import {AssetFilePermission, useAssetOutletContext} from '@typings'
import {useTranslate} from '@refinedev/core'

const AddDocumentsContent = (): ReactElement => {
  const translate = useTranslate()
  const {context, onAddFile, onFilePermissionChange} = useAssetOutletContext()
  const {document: selectedFile} = context
  return (
    <AddDocuments
      titleCaption={translate('asset_create_add_documents_title')}
      subTitleCaption={translate('asset_create_add_documents_subtitle')}
      caption={translate('add_documents_drag_and_drop_caption')}
      description={translate('add_documents_drag_and_drop_description')}
      onChangeFile={onAddFile}
      selectedFile={selectedFile}
      style={{height: '100%'}}
      onPermissionChange={async (permission: AssetFilePermission): Promise<void> => {
        selectedFile && void onFilePermissionChange(selectedFile, permission)
      }}
    />
  )
}

export default AddDocumentsContent
