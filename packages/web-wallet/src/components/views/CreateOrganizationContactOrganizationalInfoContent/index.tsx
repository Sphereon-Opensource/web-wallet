import React, {FC, useState, useCallback} from 'react'
import {useTranslate} from '@refinedev/core'
import {useOrganizationContactOutletContext} from '@typings'
import {StepHeader, FormRow, FormInput, FormSection} from '@components/fields'
import style from './index.module.css'

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const CreateOrganizationContactOrganizationalInfoContent: FC = () => {
  const translate = useTranslate()
  const {context, onLegalNameChanged, onEmailAddressChanged, onPhoneNumberChanged, onDisplayNameChanged} = useOrganizationContactOutletContext()
  const {legalName, displayName, emailAddress, phoneNumber} = context

  // Track which fields have been touched (blurred)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const handleBlur = useCallback((field: string) => {
    setTouched(prev => ({...prev, [field]: true}))
  }, [])

  // Validation helpers
  const isLegalNameValid = legalName && legalName.trim().length > 0
  const isEmailValid = !emailAddress || EMAIL_REGEX.test(emailAddress)

  // Show error only if field is touched and invalid
  const legalNameError = touched.legalName && !isLegalNameValid
    ? translate('validation_required_field', 'This field is required') as string
    : undefined
  const emailError = touched.emailAddress && !isEmailValid
    ? translate('validation_invalid_email', 'Please enter a valid email address') as string
    : undefined

  return (
    <div className={style.container}>
      <StepHeader
        title={translate('contact_create_organization_details_title', 'Organization Details') as string}
        description={translate('contact_create_organization_details_description', 'Enter the organization information') as string}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        }
      />

      <FormSection title={translate('organization_create_name_section', 'Organization Name') as string}>
        <FormRow>
          <div onBlur={() => handleBlur('legalName')}>
            <FormInput
              type="text"
              label={translate('contact_create_legal_name_field_caption', 'Legal Name') as string}
              value={legalName || ''}
              onChange={onLegalNameChanged}
              placeholder={translate('contact_create_legal_name_field_placeholder', 'Acme Corporation') as string}
              required
              error={!!legalNameError}
              helperText={legalNameError}
            />
          </div>
          <FormInput
            type="text"
            label={translate('contact_create_display_name_field_caption', 'Display Name') as string}
            value={displayName || ''}
            onChange={onDisplayNameChanged}
            placeholder={translate('contact_create_display_name_field_placeholder', 'Acme Corp') as string}
          />
        </FormRow>
      </FormSection>

      <FormSection title={translate('organization_create_contact_section', 'Contact Details') as string}>
        <FormRow>
          <div onBlur={() => handleBlur('emailAddress')}>
            <FormInput
              type="email"
              label={translate('contact_create_email_address_field_caption', 'Email Address') as string}
              value={emailAddress || ''}
              onChange={onEmailAddressChanged}
              placeholder={translate('contact_create_email_address_field_placeholder', 'info@acme.com') as string}
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

export default CreateOrganizationContactOrganizationalInfoContent
