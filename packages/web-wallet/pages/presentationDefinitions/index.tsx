import React, {FC, ReactElement} from 'react'
import {useTranslate} from '@refinedev/core'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import PresentationDefinitionsList from '@components/views/PresentationDefinitionsList'
import style from './index.module.css'
import {staticPropsWithSST} from '@/src/i18n/server'

const PresentationDefinitionsListPage: FC = (): ReactElement => {
  const translate = useTranslate()

  return (
    <div className={style.container}>
      <AppHeaderBar title={translate('queries_overview_title')} />
      <PresentationDefinitionsList allowAddNewDcqlQueryItem={true} />
    </div>
  )
}

export const getStaticProps = async ({locale = 'en'}: {locale?: string}) =>
  staticPropsWithSST({locale})

export default PresentationDefinitionsListPage
