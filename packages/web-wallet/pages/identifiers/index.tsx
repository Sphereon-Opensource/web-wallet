import React from 'react'
import {useTranslate} from '@refinedev/core'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import style from './index.module.css'
import IdentifiersList from '@components/views/IdentifiersList'
import {staticPropsWithSST} from '@/src/i18n/server'

const IdentifiersListPage: React.FC = () => {
  const translate = useTranslate()

  return (
    <div className={style.container}>
      <AppHeaderBar title={translate('identifiers_overview_title')} />
      <IdentifiersList />
    </div>
  )
}

export const getStaticProps = staticPropsWithSST

export default IdentifiersListPage
