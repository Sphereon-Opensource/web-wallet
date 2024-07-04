import React, {ReactElement} from 'react'
import {useTranslate} from '@refinedev/core'
import {SSRConfig} from 'next-i18next'
import {serverSideTranslations} from 'next-i18next/serverSideTranslations'
import {useLocation} from 'react-router-dom'
import {SSIActivityIndicator} from '@sphereon/ui-components.ssi-react'
import nextI18NextConfig from '../../../next-i18next.config.mjs'
import style from './index.module.css'
import {staticPropsWithSST} from '@/src/i18n/server'

// TODO create shared loading page?

export type LoadingPageState = {
  message: string
}

const LoadingPage: React.FC = (): ReactElement => {
  const translate = useTranslate()
  const location = useLocation()
  const {message}: LoadingPageState = location.state

  return (
    <div className={style.container}>
      <div className={style.contentContainer}>
        <SSIActivityIndicator />
        <div className={style.messageText}>{translate(message)}</div>
      </div>
    </div>
  )
}

export const getStaticProps = staticPropsWithSST

export default LoadingPage
