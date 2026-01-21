import React, {FC, useMemo} from 'react'
import {useTranslate} from '@refinedev/core'
import {useOrganizationContactOutletContext} from '@typings'
import {StepHeader, FormRow, FormInput, FormSelect, FormSection} from '@components/fields'
import {getCountryOptions} from '@/src/constants/countries'
import style from './index.module.css'

const CreateOrganizationContactPhysicalAddressContent: FC = () => {
  const translate = useTranslate()
  const {
    context,
    onStreetNameNameChanged,
    onStreetNumberChanged,
    onPostalCodeChanged,
    onCityNameChanged,
    onProvinceNameChanged,
    onCountryCodeChanged,
    onBuildingNameChanged,
  } = useOrganizationContactOutletContext()
  const {streetName, streetNumber, postalCode, cityName, provinceName, countryCode, buildingName} = context

  // Memoize country options to avoid recreation on each render
  const countryOptions = useMemo(() => getCountryOptions(), [])

  return (
    <div className={style.container}>
      <StepHeader
        title={translate('contact_create_physical_address_title', 'Physical Address') as string}
        description={translate('contact_create_physical_address_description', 'Enter the organization address') as string}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        }
      />

      <FormSection title={translate('contact_create_street_section', 'Street Address') as string}>
        <FormRow>
          <FormInput
            type="text"
            label={translate('contact_create_street_name_field_caption', 'Street Name') as string}
            value={streetName || ''}
            onChange={onStreetNameNameChanged}
            placeholder={translate('contact_create_street_name_field_placeholder', 'Main Street') as string}
          />
          <FormInput
            type="text"
            label={translate('contact_create_street_number_field_caption', 'Street Number') as string}
            value={streetNumber || ''}
            onChange={onStreetNumberChanged}
            placeholder={translate('contact_create_street_number_field_placeholder', '123') as string}
          />
        </FormRow>
        <FormRow columns={1}>
          <FormInput
            type="text"
            label={translate('contact_create_building_name_field_caption', 'Building Name') as string}
            value={buildingName || ''}
            onChange={onBuildingNameChanged}
            placeholder={translate('contact_create_building_name_field_placeholder', 'Optional') as string}
          />
        </FormRow>
      </FormSection>

      <FormSection title={translate('contact_create_location_section', 'City & Region') as string}>
        <FormRow>
          <FormInput
            type="text"
            label={translate('contact_create_postal_code_field_caption', 'Postal Code') as string}
            value={postalCode || ''}
            onChange={onPostalCodeChanged}
            placeholder={translate('contact_create_postal_code_field_placeholder', '12345') as string}
          />
          <FormInput
            type="text"
            label={translate('contact_create_city_name_field_caption', 'City') as string}
            value={cityName || ''}
            onChange={onCityNameChanged}
            placeholder={translate('contact_create_city_name_field_placeholder', 'Amsterdam') as string}
          />
        </FormRow>
        <FormRow>
          <FormInput
            type="text"
            label={translate('contact_create_province_name_field_caption', 'Province/State') as string}
            value={provinceName || ''}
            onChange={onProvinceNameChanged}
            placeholder={translate('contact_create_province_name_field_placeholder', 'North Holland') as string}
          />
          <FormSelect
            label={translate('contact_create_country_field_caption', 'Country') as string}
            value={countryCode || ''}
            onChange={onCountryCodeChanged}
            options={countryOptions}
            placeholder={translate('contact_create_country_field_placeholder', 'Select a country') as string}
          />
        </FormRow>
      </FormSection>
    </div>
  )
}

export default CreateOrganizationContactPhysicalAddressContent
