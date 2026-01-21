import React, {FC} from 'react'
import {useTranslate} from '@refinedev/core'
import {useNaturalPersonOutletContext} from '@typings'
import {StepHeader, FormSection, FormRow, FormInput} from '@components/fields'
import style from './index.module.css'

// Example roles for quick selection
const ROLE_SUGGESTIONS = [
  {key: 'developer', label: 'Developer'},
  {key: 'manager', label: 'Manager'},
  {key: 'director', label: 'Director'},
  {key: 'accountant', label: 'Accountant'},
  {key: 'sales', label: 'Sales Representative'},
  {key: 'hr', label: 'HR Manager'},
  {key: 'partner', label: 'Partner'},
  {key: 'consultant', label: 'Consultant'},
]

const CreateNaturalPersonRoleContent: FC = () => {
  const translate = useTranslate()
  const {context, onSetRole} = useNaturalPersonOutletContext()
  const {role} = {...context}

  const handleSuggestionClick = (suggestion: string) => {
    if (onSetRole) {
      onSetRole(suggestion)
    }
  }

  return (
    <div className={style.container}>
      <StepHeader
        title={translate('natural_person_create_role_title', 'Role') as string}
        description={translate('natural_person_create_role_subtitle', 'Assign a role to this contact (optional)') as string}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <polyline points="17 11 19 13 23 9" />
          </svg>
        }
      />

      <FormSection title={translate('natural_person_create_role_section', 'Contact Role') as string}>
        {/* Quick selection chips */}
        <div className={style.suggestionsLabel}>
          {translate('natural_person_role_quick_select', 'Quick select:')}
        </div>
        <div className={style.suggestions}>
          {ROLE_SUGGESTIONS.map((suggestion) => {
            const isSelected = role?.toLowerCase() === suggestion.label.toLowerCase()
            return (
              <button
                key={suggestion.key}
                type="button"
                className={`${style.suggestionChip} ${isSelected ? style.suggestionChipSelected : ''}`}
                onClick={() => handleSuggestionClick(suggestion.label)}
              >
                {suggestion.label}
              </button>
            )
          })}
        </div>

        {/* Or divider */}
        <div className={style.orDivider}>
          {translate('natural_person_role_or_custom', 'or enter custom role')}
        </div>

        {/* Free-form input */}
        <FormRow columns={1}>
          <FormInput
            type="text"
            label={translate('natural_person_create_role_field_caption', 'Custom Role') as string}
            value={role || ''}
            onChange={onSetRole}
            placeholder={translate('natural_person_create_role_field_placeholder', 'Enter a custom role...') as string}
          />
        </FormRow>
      </FormSection>
    </div>
  )
}

export default CreateNaturalPersonRoleContent
