import React, {FC} from 'react'
import style from './index.module.css'
import TextInputField from '@components/fields/TextInputField'
import {useTranslate} from '@refinedev/core'
import {useNaturalPersonOutletContext} from '@typings'

const CreateNaturalPersonPersonalInfoContent: FC = () => {
  const translate = useTranslate()
  const {context, onFirstNameChanged, onMiddleNameChanged, onLastNameChanged, onEmailAddressChanged, onPhoneNumberChanged} =
    useNaturalPersonOutletContext()
  const {firstName, middleName, lastName, emailAddress, phoneNumber} = {...context}
  return (
    <div className={style.createNaturalPersonFormContainer}>
      <div>
        <div className={style.titleCaption}>{translate('natural_person_create_personal_info_title')}</div>
        <div className={style.subTitleCaption}>{translate('natural_person_create_personal_info_subtitle')}</div>
      </div>
      <TextInputField
        label={{
          caption: translate('natural_person_create_personal_info_field_first_name_field_caption'),
        }}
        onChange={onFirstNameChanged}
        value={firstName}
        placeholder={translate('natural_person_create_personal_info_field_first_name_field_placeholder')}
      />
      <TextInputField
        label={{
          caption: translate('natural_person_create_personal_info_field_middle_name_caption'),
        }}
        required={false}
        onChange={onMiddleNameChanged}
        value={middleName}
        placeholder={translate('natural_person_create_personal_info_field_middle_name_placeholder')}
      />
      <TextInputField
        label={{
          caption: translate('natural_person_create_personal_info_field_last_name_caption'),
        }}
        onChange={onLastNameChanged}
        value={lastName}
        placeholder={translate('natural_person_create_personal_info_field_last_name_placeholder')}
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

export default CreateNaturalPersonPersonalInfoContent
