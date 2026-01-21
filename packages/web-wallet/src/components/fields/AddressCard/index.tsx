import React, {FC} from 'react'
import {useTranslate} from '@refinedev/core'
import style from './index.module.css'

export interface AddressCardProps {
  /** Street name */
  streetName?: string
  /** Street/house number */
  streetNumber?: string
  /** Building name */
  buildingName?: string
  /** Postal/ZIP code */
  postalCode?: string
  /** City name */
  cityName?: string
  /** Province or state */
  provinceName?: string
  /** Country code (e.g., NL, US) */
  countryCode?: string
  /** Additional CSS class */
  className?: string
}

const AddressCard: FC<AddressCardProps> = ({
  streetName,
  streetNumber,
  buildingName,
  postalCode,
  cityName,
  provinceName,
  countryCode,
  className,
}) => {
  const translate = useTranslate()

  // Check if any address fields are filled
  const hasAddress = streetName || streetNumber || buildingName || postalCode || cityName || provinceName || countryCode

  // Format street line (e.g., "Main Street 123")
  const streetLine = [streetName, streetNumber].filter(Boolean).join(' ')
  // Format city line (e.g., "12345 Amsterdam")
  const cityLine = [postalCode, cityName].filter(Boolean).join(' ')
  // Format region line (e.g., "North Holland, NL")
  const regionLine = [provinceName, countryCode].filter(Boolean).join(', ')

  return (
    <div className={`${style.card} ${className || ''}`}>
      <div className={style.header}>
        <svg className={style.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span className={style.title}>{translate('contact_create_physical_address_title', 'Physical Address')}</span>
      </div>
      <div className={style.content}>
        {hasAddress ? (
          <>
            {streetLine && <div className={style.addressLine}>{streetLine}</div>}
            {buildingName && <div className={style.addressLineSecondary}>{buildingName}</div>}
            {cityLine && <div className={style.addressLine}>{cityLine}</div>}
            {regionLine && <div className={style.addressLineSecondary}>{regionLine}</div>}
          </>
        ) : (
          <div className={style.addressEmpty}>{translate('contact_review_no_address', 'No address provided')}</div>
        )}
      </div>
    </div>
  )
}

export default AddressCard
