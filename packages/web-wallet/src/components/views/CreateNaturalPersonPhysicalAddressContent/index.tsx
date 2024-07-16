import React, {FC} from 'react'
import {useTranslate} from '@refinedev/core'
import TextInputField from '@components/fields/TextInputField'
import {useNaturalPersonOutletContext} from '@typings'
import style from './index.module.css'

const CreateNaturalPersonPhysicalAddressContent: FC = () => {
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
  } = useNaturalPersonOutletContext()
  const {streetName, streetNumber, postalCode, cityName, provinceName, countryCode, buildingName} = context
  return (
    <div className={style.createNaturalPersonFormContainer}>
      <div>
        <div className={style.titleCaption}>{translate('contact_create_physical_address_title')}</div>
        <div className={style.subTitleCaption}>{translate('contact_create_physical_address_description')}</div>
      </div>
      <TextInputField
        label={{
          caption: translate('contact_create_street_name_field_caption'),
        }}
        onChange={onStreetNameNameChanged}
        value={streetName}
        placeholder={translate('contact_create_street_name_field_placeholder')}
      />
      <TextInputField
        label={{
          caption: translate('contact_create_street_number_field_caption'),
        }}
        onChange={onStreetNumberChanged}
        value={streetNumber}
        placeholder={translate('contact_create_street_number_field_placeholder')}
      />
      <TextInputField
        label={{
          caption: translate('contact_create_postal_code_field_caption'),
        }}
        onChange={onPostalCodeChanged}
        value={postalCode}
        placeholder={translate('contact_create_postal_code_field_placeholder')}
      />
      <TextInputField
        label={{
          caption: translate('contact_create_city_name_field_caption'),
        }}
        onChange={onCityNameChanged}
        value={cityName}
        placeholder={translate('contact_create_city_name_field_placeholder')}
      />
      <TextInputField
        label={{
          caption: translate('contact_create_province_name_field_caption'),
        }}
        onChange={onProvinceNameChanged}
        value={provinceName}
        placeholder={translate('contact_create_province_name_field_placeholder')}
      />
      <TextInputField
        label={{
          caption: translate('contact_create_country_code_field_caption'),
        }}
        onChange={onCountryCodeChanged}
        value={countryCode}
        placeholder={translate('contact_create_country_code_field_placeholder')}
      />
    </div>
  )
}

export default CreateNaturalPersonPhysicalAddressContent
