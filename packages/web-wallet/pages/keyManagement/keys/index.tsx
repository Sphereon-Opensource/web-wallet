import React from 'react'
import {useTranslate} from '@refinedev/core'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import KeysList from '@components/views/KeysList'
import style from './index.module.css'
import {SSRConfig} from 'next-i18next'
import {serverSideTranslations} from 'next-i18next/serverSideTranslations'
import nextI18nextConfig from '@/next-i18next.config.mjs'
import {staticPropsWithSST} from '@/src/i18n/server'

const KeysListPage: React.FC = () => {
  const translate = useTranslate()

  return (
    <div className={style.container}>
      <div className={style.headerContainer}>
        <div className={style.pathCaption}>{translate('key_management_path_label')}</div>
        <div className={style.currentPathCaption}>{translate('keys_path_label')}</div>
      </div>
      <AppHeaderBar title={translate('keys_overview_title')} />
      <KeysList />
    </div>
  )
}

export const getStaticProps = staticPropsWithSST

export default KeysListPage
