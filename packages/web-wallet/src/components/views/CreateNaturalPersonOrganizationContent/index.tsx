import React, {FC} from 'react'
import style from './index.module.css'
import {HttpError, useList, useTranslate} from '@refinedev/core'
import {useNaturalPersonOutletContext} from '@typings'
import DropDownList from '@components/lists/DropDownList'
import SelectionField from '@components/fields/SelectionField'
import {Party, PartyTypeType} from '@sphereon/ssi-sdk.data-store'

type OrganizationSelection = {
  value: Party
  label: string
}

// todo: https://sphereon.atlassian.net/jira/software/c/projects/DPP/issues/DPP-115
const onOrganizationCreateClick = async () => {
  console.log(`clicked on onOrganizationCreateClick`)
}

const CreateNaturalPersonOrganizationContent: FC = () => {
  const translate = useTranslate()
  const {context, onSetOrganization} = useNaturalPersonOutletContext()
  const {organization} = {...context}
  const partiesData = useList<Party, HttpError>({resource: 'parties'})
  const parties: Party[] = partiesData.data?.data ?? []

  const organizationsData: Party[] = parties.filter(party => party.partyType.type === PartyTypeType.ORGANIZATION)

  const organizationSelections: OrganizationSelection[] = organizationsData.map(
    (party: Party): OrganizationSelection => ({
      value: party,
      label: party.contact.displayName,
    }),
  )

  const onOrganizationSelect = async (organizationSelection: OrganizationSelection): Promise<void> => {
    if (onSetOrganization) {
      onSetOrganization(organizationSelection.value)
    }
  }

  const onOrganizationRemove = async (): Promise<void> => {
    if (onSetOrganization) {
      onSetOrganization(undefined)
    }
  }

  return (
    <div className={style.createNaturalPersonOrganizationFormContainer}>
      <div>
        <div className={style.titleCaption}>{translate('natural_person_create_organization_title')}</div>
        <div className={style.subTitleCaption}>{translate('natural_person_create_organization_subtitle')}</div>
      </div>
      <div className={style.labelsContainer}>
        <div className={style.contactAddSelectOrganizationLabel}>{translate('natural_person_create_organization_field_caption')}</div>
        <div className={style.contactAddSelectOrganizationOptionalLabel}>{translate('text_input_field_optional_caption')}</div>
      </div>
      {!organization && (
        <DropDownList<OrganizationSelection>
          onChange={onOrganizationSelect}
          options={organizationSelections}
          placeholder={translate('natural_person_create_select_organization_field_placeholder')}
          noOptionsMessage={translate('natural_person_create_organization_field_no_option_message')}
          inlineOption={{
            caption: translate('natural_person_create_select_organization_field_inline_add_label'),
            onCreate: onOrganizationCreateClick,
          }}
        />
      )}
      {organization && (
        <SelectionField
          value={organization.contact.displayName}
          details={[
            {
              title: 'contact_card_contact_id_label',
              value: organization.id,
            },
          ]}
          onRemove={onOrganizationRemove}
        />
      )}
    </div>
  )
}

export default CreateNaturalPersonOrganizationContent
