import React, {FC} from 'react'
import SelectionField from '@components/fields/SelectionField'
import {useNaturalPersonOutletContext} from '@typings'
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
  return (
    <div className={style.createNaturalPersonReviewContactContainer}>
      <div>
        <div className={style.titleCaption}>{translate('natural_person_create_overview_title')}</div>
        <div className={style.subTitleCaption}>{translate('natural_person_create_overview_subtitle')}</div>
      </div>
      <div className={style.sectionLabel}>{translate('contact_create_natural_person_step_title')}</div>
      <SelectionField
        value={`${firstName} ${lastName}`}
        details={[
          {
            title: translate('contact_create_email_address_field_caption'),
            value: emailAddress,
          },
          {
            title: translate('contact_create_phone_number_field_caption'),
            value: phoneNumber,
          },
        ]}
      />
      {organization && (
        <div className={style.organizationSection}>
          <div className={style.sectionLabel}>{translate('natural_person_create_organization_field_caption')}</div>
          <SelectionField
            value={organization.contact.displayName}
            details={[
              {
                title: 'contact_card_contact_id_label',
                value: organization.id,
              },
            ]}
          />
        </div>
      )}
      <SelectionField
        value={translate('contact_create_physical_address_title')}
        details={[
          {
            title: translate('contact_create_street_name_field_caption'),
            value: streetName,
          },
          {
            title: translate('contact_create_street_number_field_caption'),
            value: streetNumber,
          },
          {
            title: translate('contact_create_postal_code_field_caption'),
            value: postalCode,
          },
          {
            title: translate('contact_create_city_name_field_caption'),
            value: cityName,
          },
          {
            title: translate('contact_create_country_code_field_caption'),
            value: countryCode,
          },
          {
            title: translate('contact_create_province_name_field_caption'),
            value: provinceName,
          },
        ]}
      />
    </div>
  )
}

export default CreateNaturalPersonReviewContactContent
