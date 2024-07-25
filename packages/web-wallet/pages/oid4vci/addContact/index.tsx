import React, {ReactElement, useEffect} from 'react'
import {useLocation} from 'react-router-dom'
import {useTranslate} from '@refinedev/core'
import {NonPersistedIdentity, Party, PartyOrigin, PartyTypeType} from '@sphereon/ssi-sdk.data-store'
import {fontColors} from '@sphereon/ui-components.core'
import {SSICheckbox, PrimaryButton, SecondaryButton, TextInputField} from '@sphereon/ui-components.ssi-react'
import {addParty} from '@/src/services/contactService'
import {CONTACT_ALIAS_MAX_LENGTH} from '@/src/agent/environment'
import {NavigationEventListenerType, OID4VCINavigationEventListenerType} from '@typings'
import style from './index.module.css'
import {staticPropsWithSST} from '@/src/i18n/server'

export type AddContactPageState = {
  hasContactConsent: boolean
  contactAlias: string
  isCreateDisabled: boolean
  identities: Array<NonPersistedIdentity>
  contactName: string
  contactUri: string
}

const AddContactPage: React.FC = (): ReactElement => {
  const location = useLocation()
  const translate = useTranslate()
  const {hasContactConsent, contactAlias, isCreateDisabled, identities, contactName, contactUri}: AddContactPageState = location.state

  const onAliasChange = async (value: string): Promise<void> => {
    const customEvent: CustomEvent<string> = new CustomEvent(OID4VCINavigationEventListenerType.ALIAS_CHANGE, {detail: value})
    window.dispatchEvent(customEvent)
  }

  // FIXME we should set the default name in the machine and pass that to the screen
  useEffect((): void => {
    void onAliasChange(contactName)
  }, [])

  const onConsentChange = async (value: boolean): Promise<void> => {
    const customEvent: CustomEvent<boolean> = new CustomEvent(OID4VCINavigationEventListenerType.CONTACT_CONSENT_CHANGE, {detail: value})
    window.dispatchEvent(customEvent)
  }

  const onAccept = async (): Promise<void> => {
    addParty({
      legalName: contactName,
      displayName: contactAlias,
      uri: contactUri,
      identities,
      // FIXME maybe it's nicer if we can also just use the id only
      // TODO using the predefined party type from the contact migrations here
      contactType: {
        id: '3875c12e-fdaa-4ef6-a340-c936e054b627',
        origin: PartyOrigin.EXTERNAL,
        type: PartyTypeType.ORGANIZATION,
        name: 'Sphereon_default_type',
        tenantId: '95e09cfc-c974-4174-86aa-7bf1d5251fb4',
      },
    }).then((party: Party): void => {
      const customEvent: CustomEvent<Party> = new CustomEvent(OID4VCINavigationEventListenerType.CREATE_CONTACT, {detail: party})
      window.dispatchEvent(customEvent)
    })
  }

  const onDecline = async (): Promise<void> => {
    const customEvent: CustomEvent<never> = new CustomEvent(NavigationEventListenerType.POPSTATE)
    window.dispatchEvent(customEvent)
  }

  return (
    <div className={style.container}>
      <div className={style.contentContainer}>
        <div className={style.nameInputContainer}>
          <div>
            <div className={style.nameInputContainerTitle}>{translate('contact_add_new_contact_detected_title')}</div>
            <div className={style.nameInputContainerDescription}>{translate('contact_add_new_contact_detected_subtitle')}</div>
          </div>
          <TextInputField
            label={translate('contact_name_label')}
            placeholder={translate('contact_name_placeholder')}
            onChangeValue={onAliasChange}
            initialValue={contactName}
            maxLength={CONTACT_ALIAS_MAX_LENGTH}
          />
        </div>
        <SSICheckbox
          label={translate('contact_add_disclaimer')}
          initialValue={true}
          style={{marginLeft: 15}}
          labelColor={fontColors.dark}
          borderColor={fontColors.dark}
          onValueChange={onConsentChange}
          isChecked={hasContactConsent}
        />
        <div className={style.buttonsContainer}>
          <SecondaryButton caption={translate('action_decline_label')} onClick={onDecline} />
          <PrimaryButton
            caption={translate('action_accept_label')}
            onClick={onAccept}
            disabled={isCreateDisabled}
            style={{marginLeft: 'auto', width: 180}}
          />
        </div>
      </div>
    </div>
  )
}

export const getStaticProps = staticPropsWithSST

export default AddContactPage
