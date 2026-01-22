import React, {FC, useState, useMemo} from 'react'
import {HttpError, useList, useTranslate} from '@refinedev/core'
import {useNaturalPersonOutletContext} from '@typings'
import {StepHeader, FormSection, ContactCard} from '@components/fields'
import type {Organization, Party} from '@sphereon/ssi-sdk.data-store-types'
import {PartyTypeType} from '@sphereon/ssi-sdk.data-store-types'
import style from './index.module.css'

const CreateNaturalPersonOrganizationContent: FC = () => {
  const translate = useTranslate()
  const {context, onSetOrganization} = useNaturalPersonOutletContext()
  const {organization} = {...context}

  // Local state
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  // Fetch parties
  const partiesData = useList<Party, HttpError>({resource: 'parties'})
  const isLoading = partiesData.isLoading
  const parties: Party[] = partiesData.data?.data ?? []

  // Filter to only organizations
  const organizations = useMemo(() => {
    return parties.filter(party => party.partyType.type === PartyTypeType.ORGANIZATION)
  }, [parties])

  // Filter by search query
  const filteredOrganizations = useMemo(() => {
    if (!searchQuery) return organizations
    const query = searchQuery.toLowerCase()
    return organizations.filter(org => {
      const displayName = org.contact.displayName?.toLowerCase() || ''
      const legalName = (org.contact as Organization).legalName?.toLowerCase() || ''
      return displayName.includes(query) || legalName.includes(query)
    })
  }, [organizations, searchQuery])

  // Get email from organization's electronic addresses
  const getOrgEmail = (org: Party): string | undefined => {
    const emailAddr = org.electronicAddresses?.find(ea => ea.type === 'email')
    return emailAddr?.electronicAddress
  }

  // Handle organization selection
  const handleSelectOrganization = (org: Party) => {
    setShowDropdown(false)
    setSearchQuery('')
    if (onSetOrganization) {
      onSetOrganization(org)
    }
  }

  // Handle clearing organization
  const handleClear = () => {
    setSearchQuery('')
    if (onSetOrganization) {
      onSetOrganization(undefined)
    }
  }

  // Render organization dropdown item
  const renderOrganizationItem = (org: Party) => {
    const displayName = org.contact.displayName || (org.contact as Organization).legalName || 'Unknown'
    const email = getOrgEmail(org)
    return (
      <button
        key={org.id}
        className={style.organizationItem}
        onClick={() => handleSelectOrganization(org)}
        type="button"
      >
        <div className={style.organizationAvatar}>
          {displayName[0].toUpperCase()}
        </div>
        <div className={style.organizationInfo}>
          <span className={style.organizationName}>{displayName}</span>
          {email && <span className={style.organizationEmail}>{email}</span>}
        </div>
      </button>
    )
  }

  return (
    <div className={style.container}>
      <StepHeader
        title={translate('natural_person_create_organization_title', 'Organization') as string}
        description={translate('natural_person_create_organization_subtitle', 'Link this contact to an organization (optional)') as string}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        }
      />

      {/* Search/Selection when no organization selected */}
      {!organization && (
        <FormSection
          title={translate('natural_person_create_organization_section', 'Link Organization') as string}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          }
        >
          <div className={style.searchContainer}>
            <div className={style.searchInputWrapper}>
              <svg className={style.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className={style.searchInput}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setShowDropdown(true)
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder={translate('natural_person_search_organization_placeholder', 'Search organizations...') as string}
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  className={style.clearSearchButton}
                  onClick={() => {
                    setSearchQuery('')
                    setShowDropdown(false)
                  }}
                  type="button"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            {/* Organization Dropdown */}
            {showDropdown && (
              <div className={style.dropdown}>
                {isLoading ? (
                  <div className={style.dropdownLoading}>
                    <div className={style.spinner} />
                    <span>{translate('natural_person_loading_organizations', 'Loading organizations...')}</span>
                  </div>
                ) : filteredOrganizations.length === 0 ? (
                  <div className={style.dropdownEmpty}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    <span>
                      {searchQuery
                        ? translate('natural_person_no_matching_organizations', 'No organizations match your search')
                        : translate('natural_person_no_organizations', 'No organizations found')}
                    </span>
                  </div>
                ) : (
                  <div className={style.organizationList}>
                    {filteredOrganizations.slice(0, 10).map(renderOrganizationItem)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Click outside to close dropdown */}
          {showDropdown && <div className={style.dropdownBackdrop} onClick={() => setShowDropdown(false)} />}
        </FormSection>
      )}

      {/* Selected Organization Card */}
      {organization && (
        <div className={style.selectedContainer}>
          <button
            className={style.removeButton}
            onClick={handleClear}
            type="button"
            title={translate('action_change_label', 'Change') as string}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <ContactCard
            type="organization"
            name={organization.contact.displayName || (organization.contact as Organization).legalName || 'Unknown'}
            fields={[
              {
                label: translate('contact_create_email_address_field_caption', 'Email') as string,
                value: getOrgEmail(organization),
              },
            ]}
          />
        </div>
      )}
    </div>
  )
}

export default CreateNaturalPersonOrganizationContent
