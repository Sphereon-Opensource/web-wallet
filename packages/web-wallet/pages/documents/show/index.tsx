import React, {FC, ReactElement} from 'react'
import HeaderContainer from '@components/views/HeaderContainer'
import PdfViewer from '@components/viewers/PdfViewer'
import styles from './index.module.css'
import {ObjectStorage} from '@objectstorage'
import {StoragePathResolver} from '@objectstorage/StoragePathResolver'
import {staticPropsWithSST} from '../../../src/i18n/server'

type Props = {
  createdAt: string
  filePath: string // TODO we need to support multiple files in the future
  titleCaption: string
  onClose: () => Promise<void>
}

const WF_BUCKET_STORAGE_ID = 'dpp-workflow-storage'
const pathResolver = new StoragePathResolver(WF_BUCKET_STORAGE_ID)

const DocumentViewerModal: FC<Props> = (props: Props): ReactElement => {
  const {createdAt, filePath, titleCaption, onClose} = props

  return (
    <div className={styles.container}>
      <HeaderContainer titleCaption={titleCaption} subCloseCaption={createdAt} onClose={onClose} />
      <div className={styles.contentContainer}>
        <PdfViewer pdfPath={filePath} renderAllPages={true} storage={ObjectStorage.fromResolver(pathResolver)} />
      </div>
    </div>
  )
}
export const getStaticProps = staticPropsWithSST
export default DocumentViewerModal
