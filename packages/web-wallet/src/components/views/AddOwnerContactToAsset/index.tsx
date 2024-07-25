import React, {ReactElement} from 'react'
import {useAssetOutletContext} from '@typings'
import style from './index.module.css'
import DropDownList from '@components/lists/DropDownList'
import SelectionField from '@components/fields/SelectionField'
import {useTranslate} from '@refinedev/core'
import {Contact} from '@sphereon/ssi-sdk.data-store'

type ContactSelection = {
  value: Contact
  label: string
}

const AddOwnerContactToAsset = (): ReactElement => {
  const translate = useTranslate()
  const {context, onOwnerContactChanged, contacts = []} = useAssetOutletContext()
  const {ownerContact} = context

  const contactsSelection: ContactSelection[] = contacts.map(
    (contact: Contact): ContactSelection => ({
      value: contact,
      label: contact.displayName,
    }),
  )

  return (
    <div className={style.contentContainer}>
      <div className={style.titleCaption}>{translate('asset_create_add_contact_title')}</div>
      <div className={style.subTitleCaption}>{translate('asset_create_add_contact_subtitle')}</div>
      <div className={style.contactAddSelectContactLabel}>{translate('asset_create_select_contact_label')}</div>
      {!ownerContact && (
        <DropDownList<ContactSelection>
          onChange={async (selection: ContactSelection): Promise<void> => onOwnerContactChanged(selection.value)}
          options={contactsSelection}
          placeholder={translate('asset_create_select_contact_placeholder')}
          noOptionsMessage={translate('asset_create_select_contact_no_option_message')}
        />
      )}
      {ownerContact && (
        <SelectionField
          value={ownerContact.displayName}
          details={[
            {
              title: 'contact_card_contact_id_label',
              value: ownerContact.id,
            },
          ]}
          onRemove={() => onOwnerContactChanged(undefined)}
        />
      )}
    </div>
  )
}

export default AddOwnerContactToAsset
