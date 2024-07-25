import React from 'react'
import {useTranslate} from '@refinedev/core'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import IdentifiersList from '@components/views/IdentifiersList'
import style from './index.module.css'
import {staticPropsWithSST} from '@/src/i18n/server'

const IdentifiersListPage: React.FC = () => {
  const translate = useTranslate()

  return (
    <div className={style.container}>
      <div className={style.headerContainer}>
        <div className={style.pathCaption}>{translate('key_management_path_label')}</div>
        <div className={style.currentPathCaption}>{translate('identifiers_path_label')}</div>
      </div>
      <AppHeaderBar title={translate('identifiers_overview_title')} />
      <IdentifiersList />
    </div>
  )
}

export const getStaticProps = staticPropsWithSST

export default IdentifiersListPage
