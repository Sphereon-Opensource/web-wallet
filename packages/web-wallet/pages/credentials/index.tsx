import React from 'react'
import {useTranslate} from '@refinedev/core'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import CredentialsList from '@components/views/CredentialsList'
import style from './index.module.css'
import {staticPropsWithSST} from '@/src/i18n/server'
import {CredentialRole} from '@sphereon/ssi-types'
import {getEnv} from '@/src/services/env'

const CredentialsListPage: React.FC = () => {
  const translate = useTranslate()

  return (
    <div className={style.container}>
      <AppHeaderBar title={translate('credentials_overview_title')} />
      <CredentialsList credentialRole={CredentialRole.HOLDER} allowIssueCredential={getEnv('BROWSER_PUBLIC_DISABLE_ISSUER_INTERFACE') !== 'true'} />
    </div>
  )
}

export const getStaticProps = async ({locale = 'en'}: {locale?: string}) => staticPropsWithSST({locale})

export default CredentialsListPage
