import React, {ReactElement, useEffect, useState} from 'react'
import {useLocation} from 'react-router-dom'
import {useTranslate} from '@refinedev/core'
import {CredentialStatus} from '@sphereon/ui-components.core'

import {InformationRequestView, PrimaryButton, SecondaryButton} from '@sphereon/ui-components.ssi-react'
import {Siopv2NavigationEventListenerType} from '@typings'
import style from './index.module.css'
import CredentialSelectionView from '@components/views/CredentialSelectionView'
import {SelectableCredentialsMap} from '@sphereon/ssi-sdk.siopv2-oid4vp-op-auth'

import {staticPropsWithSST} from '@/src/i18n/server'
import {CredentialRole, UniqueDigitalCredential} from '@sphereon/ssi-sdk.credential-store'
import {DcqlQuery} from '@sphereon/ssi-sdk.pd-manager'
import {DcqlCredentialQuery} from 'dcql'

export type InformationRequestPageState = {
  verifierName: string
  dcqlQuery: DcqlQuery
  selectableCredentialsMap: SelectableCredentialsMap
  format: any
  subjectSyntaxTypesSupported: Array<string> | undefined
}

const InformationRequestPage: React.FC = (): ReactElement => {
  const translate = useTranslate()
  const location = useLocation()
  const {verifierName, dcqlQuery, selectableCredentialsMap}: InformationRequestPageState = location.state
  const [selectedCredential, setSelectedCredential] = useState<UniqueDigitalCredential | undefined>()
  const [isSendDisabled, setIsSendDisabled] = useState<boolean>(true)

  const emitSelectedCredentialsEvent = (eventType: Siopv2NavigationEventListenerType): void => {
    const detail: Array<UniqueDigitalCredential> = []
    if (selectedCredential !== undefined) {
      detail.push(selectedCredential)
    }
    const event: CustomEvent<Array<UniqueDigitalCredential>> = new CustomEvent(eventType, {detail: detail})
    window.dispatchEvent(event)
  }

  useEffect(() => {
    emitSelectedCredentialsEvent(Siopv2NavigationEventListenerType.SET_SELECTED_CREDENTIALS)
  }, [selectedCredential])

  useEffect(() => {
    const handleNextEnabledStateUpdate = (event: any): void => {
      setIsSendDisabled(!event.detail)
    }

    window.addEventListener(Siopv2NavigationEventListenerType.NEXT_ENABLED_STATE_UPDATED, handleNextEnabledStateUpdate)

    return () => {
      window.removeEventListener(Siopv2NavigationEventListenerType.NEXT_ENABLED_STATE_UPDATED, handleNextEnabledStateUpdate)
    }
  }, [])

  const onAccept = async (): Promise<void> => {
    emitSelectedCredentialsEvent(Siopv2NavigationEventListenerType.NEXT)
  }

  const onDecline = async (): Promise<void> => {
    const event: CustomEvent<void> = new CustomEvent(Siopv2NavigationEventListenerType.DECLINE_CREDENTIALS_REQUEST)
    window.dispatchEvent(event)
  }

  const handleCredentialSelect = (credential: UniqueDigitalCredential | undefined) => {
    setSelectedCredential(credential)
  }

  return (
    <div className={style.outerContentContainer}>
      <div className={style.informationRequestDataContainer}>
        <InformationRequestView
          purpose={''} // TODO SSISDK-41
          credentialStatus={CredentialStatus.VALID}
          relyingPartyName={verifierName}
        />
      </div>
      <div className={style.shareCredentialsDataContainer}>
        {dcqlQuery.credentials?.map((credential:DcqlCredentialQuery, index) => {
            return ( // FIXME how to map which credential?
              <CredentialSelectionView
                key={credential.id}
                credentialRole={CredentialRole.HOLDER}
                credential={credential}
                selectableCredentials={selectableCredentialsMap.get(credential.id) ?? []}
                fallbackPurpose={''} // TODO SSISDK-41
                index={index}
                onSelect={handleCredentialSelect}
              />
            )
        })}

        <div className={style.buttonContainer}>
          <SecondaryButton caption={translate('action_decline_label')} onClick={onDecline} />
          <PrimaryButton
            caption={translate('action_accept_label')}
            disabled={isSendDisabled}
            onClick={onAccept}
            style={{marginLeft: 'auto', width: 180}}
          />
        </div>
      </div>
    </div>
  )
}

export const getStaticProps = async ({locale = 'en'}: {locale?: string}) =>
  staticPropsWithSST({locale})

export default InformationRequestPage
