import React from 'react'
import {useTranslate} from '@refinedev/core'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import CredentialsList from '@components/views/CredentialsList'
import style from './index.module.css'
import {staticPropsWithSST} from '@/src/i18n/server'
import {CredentialRole} from '@sphereon/ssi-sdk.data-store'

const CredentialsListPage: React.FC = () => {
  const translate = useTranslate()

  return (
    <div className={style.container}>
      <AppHeaderBar title={translate('credentials_overview_title')} />
      <CredentialsList credentialRole={CredentialRole.HOLDER} allowIssueCredential={!process.env.NEXT_PUBLIC_DISABLE_ISSUER_INTERFACE} />
    </div>
  )
}

export const getStaticProps = staticPropsWithSST

export default CredentialsListPage
