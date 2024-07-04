import React from 'react'
import {useTranslate} from '@refinedev/core'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import DocumentsList from '@components/views/DocumentsList'
import style from './index.module.css'
import {staticPropsWithSST} from '../../src/i18n/server'

const DocumentsListPage: React.FC = () => {
  const translate = useTranslate()

  return (
    <div className={style.container}>
      <AppHeaderBar title={translate('documents_overview_title')} />
      <DocumentsList />
    </div>
  )
}

export const getStaticProps = staticPropsWithSST

export default DocumentsListPage
