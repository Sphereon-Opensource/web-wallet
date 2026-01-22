import React, {useCallback, useEffect, useState, useMemo} from 'react'
import {HttpError, useDelete, useList, useNavigation, useTranslate} from '@refinedev/core'
import {PrimaryButton} from '@sphereon/ui-components.ssi-react'
import {ButtonIcon} from '@sphereon/ui-components.core'
import {CredentialRole} from '@sphereon/ssi-types'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import {ContactCard, AddressCard} from '@components/fields'
import {staticPropsWithSST} from '@/src/i18n/server'
import {DataResource} from '@typings'
import type {Party, Identity} from '@sphereon/ssi-sdk.data-store-types'
import {PartyTypeType} from '@sphereon/ssi-sdk.data-store-types'
import style from './index.module.css'

type ContactTypeFilter = 'organizations' | 'individuals'
type SortColumn = 'name' | 'did' | 'legalName' | 'email' | 'created'
type SortDirection = 'asc' | 'desc'

// Contact type tabs
const CONTACT_TYPE_TABS: {value: ContactTypeFilter; labelKey: string; defaultLabel: string}[] = [
  {value: 'organizations', labelKey: 'contacts_tab_organizations', defaultLabel: 'Organizations'},
  {value: 'individuals', labelKey: 'contacts_tab_individuals', defaultLabel: 'Individuals'},
]

const ContactsListPage: React.FC = () => {
  const translate = useTranslate()
  const {show, create} = useNavigation()
  const {mutateAsync: deleteContact} = useDelete<Party, HttpError>()

  const [selectedContact, setSelectedContact] = useState<Party | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filterType, setFilterType] = useState<ContactTypeFilter>('organizations')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{top: number; left: number} | null>(null)
  const [sortColumn, setSortColumn] = useState<SortColumn>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const {data: partiesData, isLoading, isError, refetch} = useList<Party, HttpError>({resource: 'parties'})

  const parties: Party[] = partiesData?.data ?? []

  // Filter and sort contacts
  const filteredContacts = useMemo(() => {
    const partyType = filterType === 'organizations' ? PartyTypeType.ORGANIZATION : PartyTypeType.NATURAL_PERSON
    const filtered = parties.filter(party => party.partyType.type === partyType)

    // Sort function
    const getSortValue = (party: Party, column: SortColumn): string | number => {
      switch (column) {
        case 'name':
          return party.contact.displayName?.toLowerCase() || ''
        case 'did':
          return party.identities?.[0]?.identifier?.correlationId?.toLowerCase() || ''
        case 'legalName':
          return (party.contact as any).legalName?.toLowerCase() || ''
        case 'email':
          return party.electronicAddresses?.find(e => e.type === 'email')?.electronicAddress?.toLowerCase() || ''
        case 'created':
          return new Date(party.createdAt).getTime()
        default:
          return ''
      }
    }

    return [...filtered].sort((a, b) => {
      const aVal = getSortValue(a, sortColumn)
      const bVal = getSortValue(b, sortColumn)

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [parties, filterType, sortColumn, sortDirection])

  // Handle column sort
  const handleSort = useCallback(
    (column: SortColumn) => {
      if (sortColumn === column) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortColumn(column)
        setSortDirection('asc')
      }
    },
    [sortColumn]
  )

  // Get count by type
  const getTypeCount = useCallback((type: ContactTypeFilter): number => {
    const partyType = type === 'organizations' ? PartyTypeType.ORGANIZATION : PartyTypeType.NATURAL_PERSON
    return parties.filter(party => party.partyType.type === partyType).length
  }, [parties])

  // Format date
  const formatDate = (dateStr: string | Date | undefined): string => {
    if (!dateStr) return '-'
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  // Get primary DID from identities
  const getPrimaryDid = (identities: Identity[]): string => {
    if (!identities || identities.length === 0) return '-'
    const primaryIdentity = identities.find(id => id.identifier?.correlationId)
    return primaryIdentity?.identifier?.correlationId || '-'
  }

  // Truncate DID for display
  const truncateDid = (did: string, maxLength: number = 30): string => {
    if (did.length <= maxLength) return did
    return `${did.substring(0, 15)}...${did.substring(did.length - 10)}`
  }

  // Check if party has issuer role
  const hasIssuerRole = (party: Party): boolean => {
    return party.roles?.includes(CredentialRole.ISSUER) ?? false
  }

  // Check if party has verifier role
  const hasVerifierRole = (party: Party): boolean => {
    return party.roles?.includes(CredentialRole.VERIFIER) ?? false
  }

  // Check if party has holder role
  const hasHolderRole = (party: Party): boolean => {
    return party.roles?.includes(CredentialRole.HOLDER) ?? false
  }

  // Render role badges for organization
  const renderRoleBadges = (party: Party) => {
    if (filterType !== 'organizations') return null

    const isIssuer = hasIssuerRole(party)
    const isVerifier = hasVerifierRole(party)
    const isHolder = hasHolderRole(party)

    if (!isIssuer && !isVerifier && !isHolder) return null

    return (
      <div className={style.roleBadges}>
        {isIssuer && <span className={`${style.roleBadge} ${style.roleBadgeIssuer}`}>Issuer</span>}
        {isVerifier && <span className={`${style.roleBadge} ${style.roleBadgeVerifier}`}>Verifier</span>}
        {isHolder && <span className={`${style.roleBadge} ${style.roleBadgeHolder}`}>Holder</span>}
      </div>
    )
  }

  // Handle menu toggle
  const handleToggleMenu = useCallback((id: string, e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation()
    e.preventDefault()

    const button = e.currentTarget
    const rect = button.getBoundingClientRect()

    setOpenMenuId(prev => {
      if (prev === id) {
        setMenuPosition(null)
        return null
      }
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 180,
      })
      return id
    })
  }, [])

  const handleCloseMenu = useCallback((): void => {
    setOpenMenuId(null)
    setMenuPosition(null)
  }, [])

  // Selection handlers
  const handleToggleSelection = useCallback((id: string, e: React.MouseEvent): void => {
    e.stopPropagation()
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(
    (selectAll: boolean): void => {
      if (selectAll) {
        const allIds = new Set(filteredContacts.map((c) => c.id))
        setSelectedIds(allIds)
      } else {
        setSelectedIds(new Set())
      }
    },
    [filteredContacts]
  )

  const handleDeleteSelected = useCallback(async (): Promise<void> => {
    if (selectedIds.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} contact(s)?`)) return

    const idsToDelete = Array.from(selectedIds)
    for (const id of idsToDelete) {
      try {
        await deleteContact({
          resource: DataResource.CONTACTS,
          id: id,
        })
        if (selectedContact?.id === id) {
          setSelectedContact(null)
        }
      } catch (error) {
        console.error('Failed to delete contact:', id, error)
      }
    }
    setSelectedIds(new Set())
    await refetch()
  }, [selectedIds, selectedContact, deleteContact, refetch])

  // Handle contact actions
  const handleAction = useCallback(
    async (action: string, contact: Party, e: React.MouseEvent): Promise<void> => {
      e.stopPropagation()
      handleCloseMenu()

      switch (action) {
        case 'view':
          show(DataResource.CONTACTS, contact.id)
          break
        case 'delete':
          try {
            await deleteContact({
              resource: DataResource.CONTACTS,
              id: contact.id,
            })
            if (selectedContact?.id === contact.id) {
              setSelectedContact(null)
            }
            await refetch()
          } catch (error) {
            console.error('Failed to delete contact:', error)
          }
          break
      }
    },
    [handleCloseMenu, show, deleteContact, selectedContact, refetch]
  )

  // Handle view details
  const handleViewDetails = useCallback((contact: Party): void => {
    show(DataResource.CONTACTS, contact.id)
  }, [show])

  // Handle delete from detail panel
  const handleDelete = useCallback(async (contact: Party): Promise<void> => {
    try {
      await deleteContact({
        resource: DataResource.CONTACTS,
        id: contact.id,
      })
      setSelectedContact(null)
      await refetch()
    } catch (error) {
      console.error('Failed to delete contact:', error)
    }
  }, [deleteContact, refetch])

  // Navigate to create
  const handleCreateContact = useCallback(async (): Promise<void> => {
    const resource = filterType === 'organizations' ? DataResource.ORGANIZATION_CONTACTS : DataResource.PERSON_CONTACTS
    await create(resource)
  }, [create, filterType])

  // Render meatballs icon
  const renderMeatballsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  )

  // Render menu
  const renderMenu = (contact: Party) => {
    if (openMenuId !== contact.id || !menuPosition) return null

    return (
      <>
        <div className={style.menuBackdrop} onClick={handleCloseMenu} />
        <div className={style.menuDropdown} style={{top: menuPosition.top, left: menuPosition.left}}>
          <button className={style.menuItem} onClick={(e) => handleAction('view', contact, e)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {translate('action_view_details', 'View Details')}
          </button>
          <div className={style.menuDivider} />
          <button
            className={`${style.menuItem} ${style.menuItemDanger}`}
            onClick={(e) => handleAction('delete', contact, e)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            {translate('action_delete', 'Delete')}
          </button>
        </div>
      </>
    )
  }

  // Render table
  const renderTable = () => {
    if (filteredContacts.length === 0) {
      return (
        <div className={style.emptyState}>
          <div className={style.emptyStateIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className={style.emptyStateTitle}>
            {filterType === 'organizations'
              ? translate('contacts_empty_organizations_title', 'No Organizations')
              : translate('contacts_empty_individuals_title', 'No Individuals')}
          </div>
          <div className={style.emptyStateDescription}>
            {filterType === 'organizations'
              ? translate('contacts_empty_organizations_description', 'Add your first organization contact to get started.')
              : translate('contacts_empty_individuals_description', 'Add your first individual contact to get started.')}
          </div>
          <button className={style.emptyStateButton} onClick={handleCreateContact}>
            {filterType === 'organizations'
              ? translate('contacts_action_add_organization', 'Add organization')
              : translate('contacts_action_add_individual', 'Add individual')}
          </button>
        </div>
      )
    }

    return (
      <div className={`${style.table} ${selectedIds.size > 0 ? style.tableWithSelections : ''}`}>
        <div className={style.tableHeader}>
          <div className={style.checkboxCell}>
            <input
              type="checkbox"
              className={style.checkbox}
              checked={filteredContacts.length > 0 && selectedIds.size === filteredContacts.length}
              ref={(input) => {
                if (input) {
                  input.indeterminate = selectedIds.size > 0 && selectedIds.size < filteredContacts.length
                }
              }}
              onChange={(e) => handleSelectAll(e.target.checked)}
              aria-label="Select all"
            />
          </div>
          <div
            className={`${style.headerCell} ${style.headerCellSortable} ${style.cellName} ${sortColumn === 'name' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('name')}
            role="columnheader"
            aria-sort={sortColumn === 'name' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
          >
            {translate('contacts_column_name', 'Name')}
            <SortIcon field="name" sortColumn={sortColumn} sortDirection={sortDirection} />
          </div>
          <div
            className={`${style.headerCell} ${style.headerCellSortable} ${style.cellDid} ${sortColumn === 'did' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('did')}
            role="columnheader"
            aria-sort={sortColumn === 'did' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
          >
            {translate('contacts_column_did', 'DID')}
            <SortIcon field="did" sortColumn={sortColumn} sortDirection={sortDirection} />
          </div>
          {filterType === 'organizations' && (
            <div
              className={`${style.headerCell} ${style.headerCellSortable} ${style.cellLegalName} ${sortColumn === 'legalName' ? style.headerCellSorted : ''}`}
              onClick={() => handleSort('legalName')}
              role="columnheader"
              aria-sort={sortColumn === 'legalName' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
            >
              {translate('contacts_column_legal_name', 'Legal Name')}
              <SortIcon field="legalName" sortColumn={sortColumn} sortDirection={sortDirection} />
            </div>
          )}
          {filterType === 'individuals' && (
            <div
              className={`${style.headerCell} ${style.headerCellSortable} ${style.cellEmail} ${sortColumn === 'email' ? style.headerCellSorted : ''}`}
              onClick={() => handleSort('email')}
              role="columnheader"
              aria-sort={sortColumn === 'email' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
            >
              {translate('contacts_column_email', 'Email')}
              <SortIcon field="email" sortColumn={sortColumn} sortDirection={sortDirection} />
            </div>
          )}
          <div
            className={`${style.headerCell} ${style.headerCellSortable} ${style.cellCreated} ${sortColumn === 'created' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('created')}
            role="columnheader"
            aria-sort={sortColumn === 'created' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
          >
            {translate('contacts_column_created', 'Created')}
            <SortIcon field="created" sortColumn={sortColumn} sortDirection={sortDirection} />
          </div>
          <div className={`${style.headerCell} ${style.cellActions}`} />
        </div>

        {filteredContacts.map(contact => (
          <div
            key={contact.id}
            className={`${style.tableRow} ${selectedContact?.id === contact.id ? style.selected : ''}`}
            onClick={() => setSelectedContact(contact)}
            onDoubleClick={() => handleViewDetails(contact)}
            role="row"
            tabIndex={0}
          >
            <div className={style.checkboxCell}>
              <input
                type="checkbox"
                checked={selectedIds.has(contact.id)}
                onChange={() => {}}
                onClick={(e) => handleToggleSelection(contact.id, e)}
                className={style.checkbox}
                aria-label={`Select ${contact.contact.displayName}`}
              />
            </div>
            <div className={`${style.cell} ${style.cellName}`}>
              <div className={style.contactInfo}>
                <div className={style.contactAvatar}>
                  {filterType === 'organizations' ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                </div>
                <div className={style.contactNameWrapper}>
                  <span className={style.contactName}>{contact.contact.displayName || '-'}</span>
                  {renderRoleBadges(contact)}
                </div>
              </div>
            </div>
            <div className={`${style.cell} ${style.cellDid}`}>
              <span className={style.didValue}>{truncateDid(getPrimaryDid(contact.identities))}</span>
            </div>
            {filterType === 'organizations' && (
              <div className={`${style.cell} ${style.cellLegalName}`}>
                <span className={style.secondaryValue}>{(contact.contact as any).legalName || '-'}</span>
              </div>
            )}
            {filterType === 'individuals' && (
              <div className={`${style.cell} ${style.cellEmail}`}>
                <span className={style.secondaryValue}>
                  {contact.electronicAddresses?.find(e => e.type === 'email')?.electronicAddress || '-'}
                </span>
              </div>
            )}
            <div className={`${style.cell} ${style.cellCreated}`}>{formatDate(contact.contact.createdAt)}</div>
            <div className={`${style.cell} ${style.cellActions}`}>
              <div className={style.menuContainer}>
                <button
                  type="button"
                  className={style.meatballsButton}
                  onClick={(e) => handleToggleMenu(contact.id, e)}
                  onMouseDown={(e) => e.stopPropagation()}
                  aria-label="Open menu"
                >
                  {renderMeatballsIcon()}
                </button>
                {renderMenu(contact)}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Render detail panel
  const renderDetailPanel = () => {
    if (!selectedContact) return null

    const contact = selectedContact.contact
    const identities = selectedContact.identities || []
    const primaryDid = getPrimaryDid(identities)
    const email = selectedContact.electronicAddresses?.find(e => e.type === 'email')?.electronicAddress
    const phone = selectedContact.electronicAddresses?.find(e => e.type === 'phone')?.electronicAddress
    const physicalAddress = selectedContact.physicalAddresses?.[0]

    const isOrganization = filterType === 'organizations'
    const contactType = isOrganization ? 'organization' : 'individual'

    // Build contact fields for ContactCard
    const contactFields: {label: string; value: string | undefined}[] = []
    if (email) {
      contactFields.push({label: translate('contacts_field_email', 'Email') as string, value: email})
    }
    if (phone) {
      contactFields.push({label: translate('contacts_field_phone', 'Phone') as string, value: phone})
    }
    if (primaryDid && primaryDid !== '-') {
      contactFields.push({label: translate('contacts_field_did', 'DID') as string, value: truncateDid(primaryDid, 35)})
    }
    contactFields.push({label: translate('contacts_field_created', 'Created') as string, value: formatDate(contact.createdAt)})

    return (
      <div className={style.detailPanel}>
        <div className={style.detailHeader}>
          <h2 className={style.detailTitle}>{translate('contacts_detail_title', 'Contact Details')}</h2>
          <button className={style.closeButton} onClick={() => setSelectedContact(null)} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={style.detailBody}>
          {/* Contact Card */}
          <ContactCard
            type={contactType}
            name={contact.displayName || '-'}
            fields={contactFields}
          >
            {renderRoleBadges(selectedContact)}
          </ContactCard>

          {/* Address Card */}
          {physicalAddress && (
            <AddressCard
              streetName={physicalAddress.streetName}
              streetNumber={physicalAddress.houseNumber}
              buildingName={physicalAddress.buildingName}
              postalCode={physicalAddress.postalCode}
              cityName={physicalAddress.cityName}
              provinceName={physicalAddress.provinceName}
              countryCode={physicalAddress.countryCode}
            />
          )}

          {/* View Full Details Button */}
          <button className={style.viewFullButton} onClick={() => handleViewDetails(selectedContact)}>
            {translate('action_view_full_details', 'View Full Details')}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Footer with Delete */}
        <div className={style.detailFooter}>
          <button className={style.deleteButton} onClick={() => handleDelete(selectedContact)}>
            {translate('contacts_action_delete', 'Delete Contact')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={style.container}>
      <AppHeaderBar title={translate('contacts_overview_title', 'Contacts')} />

      <div className={style.mainLayout}>
        {/* Content Area */}
        <div className={`${style.contentArea} ${selectedContact ? style.contentAreaWithDetail : ''}`}>
          {/* Tab Navigation with Selection Overlay */}
          <div className={style.tabNavigationWrapper}>
            <div className={style.tabNavigation}>
              {CONTACT_TYPE_TABS.map(tab => {
                const count = getTypeCount(tab.value)
                const isActive = filterType === tab.value

                return (
                  <button
                    key={tab.value}
                    className={`${style.tabButton} ${isActive ? style.tabButtonActive : ''}`}
                    onClick={() => {
                      setFilterType(tab.value)
                      setSelectedContact(null)
                    }}
                  >
                    {tab.value === 'organizations' ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    )}
                    {translate(tab.labelKey, tab.defaultLabel)}
                    {count > 0 && <span className={style.tabBadge}>{count}</span>}
                  </button>
                )
              })}
              <div className={style.tabSpacer} />
              <div className={style.actionButtonContainer}>
                <PrimaryButton
                  caption={filterType === 'organizations'
                    ? translate('contacts_action_add_organization', 'Add organization')
                    : translate('contacts_action_add_individual', 'Add individual')}
                  icon={ButtonIcon.ADD}
                  onClick={handleCreateContact}
                />
              </div>
            </div>

            {/* Selection Actions Overlay */}
            {selectedIds.size > 0 && (
              <div className={style.selectionOverlay}>
                <div className={style.selectionInfo}>
                  <button
                    type="button"
                    className={style.deselectButton}
                    onClick={() => setSelectedIds(new Set())}
                    aria-label={translate('action_deselect_all', 'Deselect all')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                  <span className={style.selectionCount}>
                    {selectedIds.size} {selectedIds.size === 1 ? 'item' : 'items'} selected
                  </span>
                </div>
                <button
                  type="button"
                  className={style.bulkDeleteButton}
                  onClick={handleDeleteSelected}
                  aria-label={translate('action_delete_selected', 'Delete selected')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  {translate('action_delete_selected', 'Delete')}
                </button>
              </div>
            )}
          </div>

          {/* Table Content */}
          {isLoading ? (
            <div className={style.loadingState}>
              <div className={style.spinner} />
              <span>{translate('loading', 'Loading...')}</span>
            </div>
          ) : isError ? (
            <div className={style.errorBanner}>
              {translate('contacts_error_loading', 'Failed to load contacts')}
            </div>
          ) : (
            <div className={style.tableContainer}>
              {renderTable()}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {renderDetailPanel()}
      </div>
    </div>
  )
}

// Sort Icon Component
const SortIcon: React.FC<{field: SortColumn; sortColumn: SortColumn; sortDirection: SortDirection}> = ({
  field,
  sortColumn,
  sortDirection,
}) => {
  if (sortColumn !== field) {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={style.sortIconInactive}>
        <path d="M6 2L9 5H3L6 2Z" fill="currentColor" />
        <path d="M6 10L3 7H9L6 10Z" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={style.sortIcon}>
      {sortDirection === 'asc' ? (
        <path d="M6 2L9 5H3L6 2Z" fill="currentColor" />
      ) : (
        <path d="M6 10L3 7H9L6 10Z" fill="currentColor" />
      )}
    </svg>
  )
}

export const getStaticProps = async ({locale = 'en'}: {locale?: string}) => staticPropsWithSST({locale})

export default ContactsListPage
