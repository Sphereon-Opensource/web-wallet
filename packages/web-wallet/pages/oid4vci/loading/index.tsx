import React, {ReactElement} from 'react'
import {useTranslate} from '@refinedev/core'
import {useLocation} from 'react-router-dom'
import {SSIActivityIndicator} from '@sphereon/ui-components.ssi-react'
import style from './index.module.css'
import {staticPropsWithSST} from '../../../src/i18n/server'

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
