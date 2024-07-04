import React, {FC, ReactElement} from 'react'
import {SSRConfig} from 'next-i18next'
import {serverSideTranslations} from 'next-i18next/serverSideTranslations'
import {useTranslate} from '@refinedev/core'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import PresentationDefinitionsList from '@components/views/PresentationDefinitionsList'
import style from './index.module.css'
import nextI18nextConfig from '@/next-i18next.config.mjs'
import {staticPropsWithSST} from '@/src/i18n/server'

const PresentationDefinitionsListPage: FC = (): ReactElement => {
  const translate = useTranslate()

  return (
    <div className={style.container}>
      <AppHeaderBar title={translate('presentation_definitions_overview_title')} />
      <PresentationDefinitionsList allowAddNewPresentationDefinition={true} />
    </div>
  )
}

export const getStaticProps = staticPropsWithSST

export default PresentationDefinitionsListPage
