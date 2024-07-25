import React, {ReactElement} from 'react'
import {useLocation} from 'react-router-dom'
import {useTranslate} from '@refinedev/core'
import style from './index.module.css'
import {staticPropsWithSST} from '../../../src/i18n/server'
import {OID4VCINavigationEventListenerType} from '@typings'
import {PrimaryButton, WarningImage} from '@sphereon/ui-components.ssi-react'

export type AuthorizationCodeState = {
  authorizationCodeURL: string
  contactAlias: string
}

// FIXME CWALL-212 needs further implementation
const AuthorizationCodeUrlPage: React.FC = (): ReactElement => {
  const location = useLocation()
  const translate = useTranslate()
  const {authorizationCodeURL, contactAlias}: AuthorizationCodeState = location.state
  const title = `Authentication required by ${contactAlias}`
  const message = `Issuer '${contactAlias}' requires you to authenticate first using an external webpage. After a successful login you should return to the wallet again to finish receiving the credential(s).`

  const onNext = async (): Promise<void> => {
    const customEvent: CustomEvent<never> = new CustomEvent(OID4VCINavigationEventListenerType.INVOKE_AUTHORIZATION_REQUEST)
    window.dispatchEvent(customEvent)
    window.location.href = authorizationCodeURL
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

export default AuthorizationCodeUrlPage
