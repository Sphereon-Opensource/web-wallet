import React, {FC, useState, useCallback} from 'react'
import {useTranslate} from '@refinedev/core'
import {useNaturalPersonOutletContext} from '@typings'
import {StepHeader, FormRow, FormInput, FormSection} from '@components/fields'
import style from './index.module.css'

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const CreateNaturalPersonPersonalInfoContent: FC = () => {
  const translate = useTranslate()
  const {context, onFirstNameChanged, onMiddleNameChanged, onLastNameChanged, onEmailAddressChanged, onPhoneNumberChanged} =
    useNaturalPersonOutletContext()
  const {firstName, middleName, lastName, emailAddress, phoneNumber} = {...context}

  // Track which fields have been touched (blurred)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const handleBlur = useCallback((field: string) => {
    setTouched(prev => ({...prev, [field]: true}))
  }, [])

  // Validation helpers
  const isFirstNameValid = firstName && firstName.trim().length > 0
  const isLastNameValid = lastName && lastName.trim().length > 0
  const isEmailValid = !emailAddress || EMAIL_REGEX.test(emailAddress)

  // Show error only if field is touched and invalid
  const firstNameError = touched.firstName && !isFirstNameValid
    ? translate('validation_required_field', 'This field is required') as string
    : undefined
  const lastNameError = touched.lastName && !isLastNameValid
    ? translate('validation_required_field', 'This field is required') as string
    : undefined
  const emailError = touched.emailAddress && !isEmailValid
    ? translate('validation_invalid_email', 'Please enter a valid email address') as string
    : undefined

  return (
    <div className={style.container}>
      <StepHeader
        title={translate('natural_person_create_personal_info_title', 'Personal Information') as string}
        description={translate('natural_person_create_personal_info_subtitle', 'Enter the contact\'s personal details') as string}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        }
      />

      <FormSection title={translate('natural_person_create_name_section', 'Name') as string}>
        <FormRow>
          <div onBlur={() => handleBlur('firstName')}>
            <FormInput
              type="text"
              label={translate('natural_person_create_personal_info_field_first_name_field_caption', 'First Name') as string}
              value={firstName || ''}
              onChange={onFirstNameChanged}
              placeholder={translate('natural_person_create_personal_info_field_first_name_field_placeholder', 'John') as string}
              required
              error={!!firstNameError}
              helperText={firstNameError}
            />
          </div>
          <div onBlur={() => handleBlur('lastName')}>
            <FormInput
              type="text"
              label={translate('natural_person_create_personal_info_field_last_name_caption', 'Last Name') as string}
              value={lastName || ''}
              onChange={onLastNameChanged}
              placeholder={translate('natural_person_create_personal_info_field_last_name_placeholder', 'Doe') as string}
              required
              error={!!lastNameError}
              helperText={lastNameError}
            />
          </div>
        </FormRow>
        <FormRow columns={1}>
          <FormInput
            type="text"
            label={translate('natural_person_create_personal_info_field_middle_name_caption', 'Middle Name') as string}
            value={middleName || ''}
            onChange={onMiddleNameChanged}
            placeholder={translate('natural_person_create_personal_info_field_middle_name_placeholder', 'Optional') as string}
          />
        </FormRow>
      </FormSection>

      <FormSection title={translate('natural_person_create_contact_section', 'Contact Details') as string}>
        <FormRow>
          <div onBlur={() => handleBlur('emailAddress')}>
            <FormInput
              type="email"
              label={translate('contact_create_email_address_field_caption', 'Email Address') as string}
              value={emailAddress || ''}
              onChange={onEmailAddressChanged}
              placeholder={translate('contact_create_email_address_field_placeholder', 'john.doe@example.com') as string}
              error={!!emailError}
              helperText={emailError}
            />
          </div>
          <FormInput
            type="tel"
            label={translate('contact_create_phone_number_field_caption', 'Phone Number') as string}
            value={phoneNumber || ''}
            onChange={onPhoneNumberChanged}
            placeholder={translate('contact_create_phone_number_field_placeholder', '+1 234 567 890') as string}
          />
        </FormRow>
      </FormSection>
    </div>
  )
}

export default CreateNaturalPersonPersonalInfoContent
