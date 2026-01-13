import React from 'react'
import {useTranslate} from '@refinedev/core'
import {staticPropsWithSST} from '@/src/i18n/server'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import CredentialDesignsList from '@components/views/CredentialDesignsList'
import {getEnv} from '@/src/services/env'
import style from './index.module.css'

const CredentialDesignsListPage: React.FC = () => {
  const translate = useTranslate()

  return (
    <div className={style.container}>
      <AppHeaderBar title={translate('credential_designs_overview_title')} />
      <CredentialDesignsList allowCreateCredentialDesign={getEnv('BROWSER_PUBLIC_DISABLE_CREDENTIAL_DESIGN_INTERFACE') !== 'true'} />
    </div>
  )
}

export const getStaticProps = async ({locale = 'en'}: {locale?: string}) => staticPropsWithSST({locale})

export default CredentialDesignsListPage
