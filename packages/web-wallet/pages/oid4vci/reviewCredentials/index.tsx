import React, {ReactElement} from 'react'
import {useLocation} from 'react-router-dom'
import {useTranslate} from '@refinedev/core'
import {TabViewRoute} from '@sphereon/ui-components.core'
import {
  CredentialMiniCardView,
  CredentialMiniCardViewProps,
  JSONDataView,
  SSICredentialCardView,
  PrimaryButton,
  SecondaryButton,
  SSITabView,
} from '@sphereon/ui-components.ssi-react'
import {OID4VCINavigationEventListenerType} from '@typings'
import style from './index.module.css'
import {staticPropsWithSST} from '@/src/i18n/server'
import {CredentialSummary, getCredentialStatus} from '@sphereon/ui-components.credential-branding'

enum CredentialDetailsTabRoute {
  INFO = 'info',
}

export type ReviewCredentialsPageState = {
  credential: CredentialSummary
}

const ReviewCredentialsPage: React.FC = (): ReactElement => {
  const translate = useTranslate()
  const location = useLocation()
  const {credential}: ReviewCredentialsPageState = location.state

  const credentialCardViewProps: CredentialMiniCardViewProps = {
    ...(credential?.branding?.logo && {logo: credential.branding.logo}),
    ...(credential?.branding?.background?.image && {backgroundImage: credential.branding.background.image}),
    ...(credential?.branding?.background?.color && {backgroundColor: credential.branding.background.color}),
  }

  const onDecline = async (): Promise<void> => {
    const event: CustomEvent<void> = new CustomEvent(OID4VCINavigationEventListenerType.DECLINE_CREDENTIAL)
    window.dispatchEvent(event)
  }

  const onAccept = async (): Promise<void> => {
    const event: CustomEvent<void> = new CustomEvent(OID4VCINavigationEventListenerType.ACCEPT_CREDENTIAL)
    window.dispatchEvent(event)
  }

  const getVerifiedInformationContent = (): ReactElement => {
    const filteredSubject: Record<string, any> = Object.fromEntries(
      //TODO: filtering subject because it is a did. we need to handle it better in the future
      credential.properties.filter(prop => prop.label !== 'subject').map(detail => [detail.label, detail.value]),
    )
    return (
      <div className={style.tabViewContentContainer}>
        <div className={style.verifiedInformationDataContainer}>
          <JSONDataView data={filteredSubject} shouldExpandNodeInitially={true} />
          <div className={style.buttonContainer}>
            <SecondaryButton caption={translate('action_decline_label')} onClick={onDecline} />
            <PrimaryButton caption={translate('action_accept_label')} onClick={onAccept} style={{marginLeft: 'auto', width: 180}} />
          </div>
        </div>
        <SSICredentialCardView
          header={{
            credentialTitle: credential.title ?? credential.branding?.alias,
            credentialSubtitle: credential.branding?.description,
            logo: credential.branding?.logo,
          }}
          body={{
            issuerName: credential.issuer.alias ?? credential.issuer.name, // TODO shorten name
          }}
          footer={{
            credentialStatus: getCredentialStatus(credential),
            expirationDate: credential.expirationDate,
          }}
          display={{
            backgroundColor: credential.branding?.background?.color,
            backgroundImage: credential.branding?.background?.image,
            textColor: credential.branding?.text?.color,
          }}
        />
      </div>
    )
  }

  const routes: Array<TabViewRoute> = [
    {
      key: CredentialDetailsTabRoute.INFO,
      title: translate('credential_details_verified_info_tab_label'),
      content: getVerifiedInformationContent,
    },
  ]

  return (
    <div className={style.container}>
      <div className={style.headerContainer}>
        <CredentialMiniCardView {...credentialCardViewProps} />
      </div>
      <SSITabView routes={routes} />
    </div>
  )
}

export const getStaticProps = staticPropsWithSST

export default ReviewCredentialsPage
