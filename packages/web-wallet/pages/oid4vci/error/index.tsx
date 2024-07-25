import React, {ReactElement} from 'react'
import {useLocation} from 'react-router-dom'
import {useTranslate} from '@refinedev/core'
import {PrimaryButton, WarningImage} from '@sphereon/ui-components.ssi-react'
import {OID4VCINavigationEventListenerType} from '@typings'
import style from './index.module.css'
import {staticPropsWithSST} from '../../../src/i18n/server'

export type ErrorPageState = {
  title: string
  message: string
}

const Oid4vciErrorPage: React.FC = (): ReactElement => {
  const location = useLocation()
  const translate = useTranslate()
  const {message, title}: ErrorPageState = location.state

  const onNext = async (): Promise<void> => {
    const customEvent: CustomEvent<never> = new CustomEvent(OID4VCINavigationEventListenerType.NEXT)
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
        <PrimaryButton style={{width: 180}} caption={translate('action_ok_label')} onClick={onNext} />
      </div>
    </div>
  )
}

export const getStaticProps = staticPropsWithSST

export default Oid4vciErrorPage
