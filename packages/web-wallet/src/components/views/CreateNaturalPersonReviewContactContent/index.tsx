import React, {FC} from 'react'
import {useNaturalPersonOutletContext} from '@typings'
import {StepHeader, ContactCard, AddressCard} from '@components/fields'
import style from './index.module.css'
import {useTranslate} from '@refinedev/core'

const CreateNaturalPersonReviewContactContent: FC = () => {
  const translate = useTranslate()
  const {context} = useNaturalPersonOutletContext()
  const {
    firstName,
    lastName,
    emailAddress,
    phoneNumber,
    organization,
    streetName,
    streetNumber,
    postalCode,
    countryCode,
    buildingName,
    provinceName,
    cityName,
  } = {...context}

  const fullName = [firstName, lastName].filter(Boolean).join(' ')

  return (
    <div className={style.container}>
      <StepHeader
        title={translate('natural_person_create_overview_title', 'Review Contact') as string}
        description={translate('natural_person_create_overview_subtitle', 'Review the contact information before saving') as string}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        }
      />
      <div className={style.summaryBoxes}>
        <ContactCard
          type="individual"
          name={fullName}
          fields={[
            {label: translate('contact_create_email_address_field_caption', 'Email') as string, value: emailAddress},
            {label: translate('contact_create_phone_number_field_caption', 'Phone') as string, value: phoneNumber},
          ]}
        />
        {organization && (
          <ContactCard
            type="organization"
            name={organization.contact.displayName}
          />
        )}
        <AddressCard
          streetName={streetName}
          streetNumber={streetNumber}
          buildingName={buildingName}
          postalCode={postalCode}
          cityName={cityName}
          provinceName={provinceName}
          countryCode={countryCode}
        />
      </div>
    </div>
  )
}

export default CreateNaturalPersonReviewContactContent
