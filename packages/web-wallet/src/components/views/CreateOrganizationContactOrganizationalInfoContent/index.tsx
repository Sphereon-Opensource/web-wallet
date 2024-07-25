import React, {FC} from 'react'
import {useTranslate} from '@refinedev/core'
import TextInputField from '@components/fields/TextInputField'
import {useOrganizationContactOutletContext} from '@typings'
import style from './index.module.css'

const CreateOrganizationContactOrganizationalInfoContent: FC = () => {
  const translate = useTranslate()
  const {context, onLegalNameChanged, onEmailAddressChanged, onPhoneNumberChanged, onDisplayNameChanged} = useOrganizationContactOutletContext()
  const {legalName, displayName, emailAddress, phoneNumber} = context
  return (
    <div className={style.container}>
      <div>
        <div className={style.titleCaption}>{translate('contact_create_organization_details_title')}</div>
        <div className={style.subTitleCaption}>{translate('contact_create_organization_details_description')}</div>
      </div>
      <TextInputField
        label={{
          caption: translate('contact_create_legal_name_field_caption'),
        }}
        onChange={onLegalNameChanged}
        value={legalName}
        placeholder={translate('contact_create_legal_name_field_placeholder')}
      />
      <TextInputField
        label={{
          caption: translate('contact_create_display_name_field_caption'),
        }}
        onChange={onDisplayNameChanged}
        value={displayName}
        placeholder={translate('contact_create_display_name_field_placeholder')}
      />
      <TextInputField
        label={{
          caption: translate('contact_create_email_address_field_caption'),
        }}
        onChange={onEmailAddressChanged}
        value={emailAddress}
        placeholder={translate('contact_create_email_address_field_placeholder')}
      />
      <TextInputField
        label={{
          caption: translate('contact_create_phone_number_field_caption'),
        }}
        onChange={onPhoneNumberChanged}
        value={phoneNumber}
        placeholder={translate('contact_create_phone_number_field_placeholder')}
      />
    </div>
  )
}

export default CreateOrganizationContactOrganizationalInfoContent
