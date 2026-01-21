import React, {FC, ReactNode} from 'react'
import {useTranslate} from '@refinedev/core'
import style from './index.module.css'

export type ContactCardType = 'organization' | 'individual'

export interface ContactCardField {
  label: string
  value?: string
}

export interface ContactCardProps {
  /** Type of contact - determines icon and header text */
  type: ContactCardType
  /** Name of the contact (organization name or person name) */
  name: string
  /** Additional fields to display (email, phone, etc.) */
  fields?: ContactCardField[]
  /** Additional content to render after fields */
  children?: ReactNode
  /** Additional CSS class */
  className?: string
}

const ContactCard: FC<ContactCardProps> = ({
  type,
  name,
  fields = [],
  children,
  className,
}) => {
  const translate = useTranslate()

  const headerText = type === 'organization'
    ? translate('contact_type_organization', 'Organization')
    : translate('contact_type_individual', 'Individual')

  return (
    <div className={`${style.card} ${style[type]} ${className || ''}`}>
      <div className={style.header}>
        {type === 'organization' ? (
          <svg className={style.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        ) : (
          <svg className={style.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        )}
        <span className={style.title}>{headerText}</span>
      </div>
      <div className={style.content}>
        <div className={style.name}>{name}</div>
        {fields.map((field, index) => (
          <div key={index} className={style.field}>
            <span className={style.fieldLabel}>{field.label}</span>
            {field.value ? (
              <span className={style.fieldValue}>{field.value}</span>
            ) : (
              <span className={style.fieldEmpty}>{translate('contact_review_not_provided', 'Not provided')}</span>
            )}
          </div>
        ))}
        {children}
      </div>
    </div>
  )
}

export default ContactCard
