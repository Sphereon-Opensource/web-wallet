import React from 'react'
import {useTranslate} from '@refinedev/core'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import style from './index.module.css'
import {staticPropsWithSST} from '../../src/i18n/server'

const DocumentsListPage: React.FC = () => {
  const translate = useTranslate()

  return (
    <div className={style.container}>
      <AppHeaderBar title={translate('documents_overview_title')} />
      <div style={{padding: '2rem', textAlign: 'center', color: '#666'}}>
        <p>Documents feature is not available.</p>
      </div>
    </div>
  )
}

export const getStaticProps = async ({locale = 'en'}: {locale?: string}) => staticPropsWithSST({locale})

export default DocumentsListPage
