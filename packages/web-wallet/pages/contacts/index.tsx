import React from 'react'
import {useTranslate} from '@refinedev/core'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import ContactsList from '@components/views/ContactsList'
import style from './index.module.css'
import {staticPropsWithSST} from '@/src/i18n/server'

const ContactsListPage: React.FC = () => {
  const translate = useTranslate()

  return (
    <div className={style.container}>
      <AppHeaderBar title={translate('contacts_overview_title')} />
      <ContactsList />
    </div>
  )
}

export const getStaticProps = staticPropsWithSST

export default ContactsListPage
