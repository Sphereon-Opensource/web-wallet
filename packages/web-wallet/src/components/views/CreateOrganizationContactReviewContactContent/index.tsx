import React, {FC} from 'react'
import {useOrganizationContactOutletContext} from '@typings'
import {StepHeader, ContactCard, AddressCard} from '@components/fields'
import style from './index.module.css'
import {useTranslate} from '@refinedev/core'

const CreateOrganizationContactReviewContactContent: FC = () => {
  const translate = useTranslate()
  const {context} = useOrganizationContactOutletContext()
  const {legalName, emailAddress, phoneNumber, streetName, streetNumber, postalCode, countryCode, buildingName, provinceName, cityName} = context

  return (
    <div className={style.container}>
      <StepHeader
        title={translate('organization_create_overview_title', 'Review Organization') as string}
        description={translate('organization_create_overview_subtitle', 'Review the organization information before saving') as string}
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
          type="organization"
          name={legalName}
          fields={[
            {label: translate('contact_create_email_address_field_caption', 'Email') as string, value: emailAddress},
            {label: translate('contact_create_phone_number_field_caption', 'Phone') as string, value: phoneNumber},
          ]}
        />
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

export default CreateOrganizationContactReviewContactContent
