import React, {ReactElement} from 'react'
import {useLocation} from 'react-router-dom'
import {useTranslate} from '@refinedev/core'
import {SSRConfig} from 'next-i18next'
import {serverSideTranslations} from 'next-i18next/serverSideTranslations'
import nextI18NextConfig from '../../../next-i18next.config.mjs'
import {PrimaryButton, WarningImage} from '@sphereon/ui-components.ssi-react'
import {OID4VCINavigationEventListenerType, Siopv2NavigationEventListenerType} from '@typings'
import style from './index.module.css'
import {staticPropsWithSST} from '@/src/i18n/server'

// TODO create shared error page?  (We do have the customEvent)

export type ErrorPageState = {
  title: string
  message: string
}

const Siopv2ErrorPage: React.FC = (): ReactElement => {
  const location = useLocation()
  const translate = useTranslate()
  const {message, title}: ErrorPageState = location.state

  const onNext = async (): Promise<void> => {
    const customEvent: CustomEvent<never> = new CustomEvent(Siopv2NavigationEventListenerType.NEXT)
    window.dispatchEvent(customEvent)
  }

  return (
    <div className={style.container}>
      <div className={style.contentContainer}>
        <WarningImage />
        <div className={style.textContainer}>
          <div className={style.titleText}>{title}</div>
          <div className={style.messageText}>{message}</div>
        </div>
        <PrimaryButton caption={translate('action_ok_label')} onClick={onNext} />
      </div>
    </div>
  )
}

export const getStaticProps = staticPropsWithSST

export default Siopv2ErrorPage
