import React from 'react'
import {useTranslate} from '@refinedev/core'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import CredentialsList from '@components/views/CredentialsList'
import style from './index.module.css'
import {staticPropsWithSST} from '@/src/i18n/server'

const CredentialsListPage: React.FC = () => {
  const translate = useTranslate()

  return (
    <div className={style.container}>
      <AppHeaderBar title={translate('credentials_overview_title')} />
      <CredentialsList allowIssueCredential={!process.env.NEXT_PUBLIC_DISABLE_ISSUER_INTERFACE} />
    </div>
  )
}

export const getStaticProps = staticPropsWithSST

export default CredentialsListPage
