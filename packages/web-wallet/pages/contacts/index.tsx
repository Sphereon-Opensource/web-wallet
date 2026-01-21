import React, {useCallback, useEffect, useState, useMemo} from 'react'
import {HttpError, useDelete, useList, useNavigation, useTranslate} from '@refinedev/core'
import {PrimaryButton} from '@sphereon/ui-components.ssi-react'
import {ButtonIcon} from '@sphereon/ui-components.core'
import {CredentialRole} from '@sphereon/ssi-types'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import {staticPropsWithSST} from '@/src/i18n/server'
import {DataResource} from '@typings'
import type {Party, Identity} from '@sphereon/ssi-sdk.data-store-types'
import {PartyTypeType} from '@sphereon/ssi-sdk.data-store-types'
import style from './index.module.css'

type ContactTypeFilter = 'organizations' | 'individuals'

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

  const {data: partiesData, isLoading, isError, refetch} = useList<Party, HttpError>({resource: 'parties'})

  const parties: Party[] = partiesData?.data ?? []

  // Filter contacts by type
  const filteredContacts = useMemo(() => {
    const partyType = filterType === 'organizations' ? PartyTypeType.ORGANIZATION : PartyTypeType.NATURAL_PERSON
    return parties.filter(party => party.partyType.type === partyType)
  }, [parties, filterType])

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
          dataProviderName: 'supaBase',
          resource: 'Party',
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
              dataProviderName: 'supaBase',
              resource: 'Party',
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
        dataProviderName: 'supaBase',
        resource: 'Party',
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
            {translate('contacts_action_add', 'Add Contact')}
          </button>
        </div>
      )
    }

    return (
      <div className={style.table}>
        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className={style.bulkActionsBar}>
            <span className={style.bulkActionsCount}>
              {selectedIds.size} {selectedIds.size === 1 ? 'item' : 'items'} selected
            </span>
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
              {translate('action_delete_selected', 'Delete Selected')}
            </button>
          </div>
        )}
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
          <div className={`${style.headerCell} ${style.cellName}`}>{translate('contacts_column_name', 'Name')}</div>
          <div className={`${style.headerCell} ${style.cellDid}`}>{translate('contacts_column_did', 'DID')}</div>
          {filterType === 'organizations' && (
            <div className={`${style.headerCell} ${style.cellLegalName}`}>{translate('contacts_column_legal_name', 'Legal Name')}</div>
          )}
          {filterType === 'individuals' && (
            <div className={`${style.headerCell} ${style.cellEmail}`}>{translate('contacts_column_email', 'Email')}</div>
          )}
          <div className={`${style.headerCell} ${style.cellCreated}`}>{translate('contacts_column_created', 'Created')}</div>
          <div className={`${style.headerCell} ${style.cellActions}`} />
        </div>

        {filteredContacts.map(contact => (
          <div
            key={contact.id}
            className={`${style.tableRow} ${selectedContact?.id === contact.id ? style.selected : ''}`}
            onClick={() => setSelectedContact(contact)}
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
          <div className={style.contactCard}>
            <div className={style.contactCardAvatar}>
              {filterType === 'organizations' ? (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </div>
            <div className={style.contactCardInfo}>
              <span className={style.contactCardName}>{contact.displayName || '-'}</span>
              <div className={style.contactCardSubtitle}>
                <span className={style.contactCardType}>
                  {filterType === 'organizations' ? translate('contact_type_organization', 'Organization') : translate('contact_type_individual', 'Individual')}
                </span>
                {renderRoleBadges(selectedContact)}
              </div>
            </div>
          </div>

          {/* Metadata Section */}
          <section className={style.metadataSection}>
            <div className={style.metadataBorder} />
            <div className={style.metadataContent}>
              <div className={style.metadataTitle}>{translate('contacts_detail_info', 'Information')}</div>

              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>{translate('contacts_field_display_name', 'Display Name')}</span>
                <span className={style.metadataValue}>{contact.displayName || '-'}</span>
              </div>

              {filterType === 'organizations' && (
                <div className={style.metadataRow}>
                  <span className={style.metadataLabel}>{translate('contacts_field_legal_name', 'Legal Name')}</span>
                  <span className={style.metadataValue}>{(contact as any).legalName || '-'}</span>
                </div>
              )}

              {filterType === 'individuals' && (
                <>
                  <div className={style.metadataRow}>
                    <span className={style.metadataLabel}>{translate('contacts_field_first_name', 'First Name')}</span>
                    <span className={style.metadataValue}>{(contact as any).firstName || '-'}</span>
                  </div>
                  <div className={style.metadataRow}>
                    <span className={style.metadataLabel}>{translate('contacts_field_last_name', 'Last Name')}</span>
                    <span className={style.metadataValue}>{(contact as any).lastName || '-'}</span>
                  </div>
                </>
              )}

              {email && (
                <div className={style.metadataRow}>
                  <span className={style.metadataLabel}>{translate('contacts_field_email', 'Email')}</span>
                  <span className={style.metadataValue}>{email}</span>
                </div>
              )}

              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>{translate('contacts_field_did', 'DID')}</span>
                <span className={style.metadataValueMono}>{truncateDid(primaryDid, 35)}</span>
              </div>

              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>{translate('contacts_field_created', 'Created')}</span>
                <span className={style.metadataValue}>{formatDate(contact.createdAt)}</span>
              </div>
            </div>
          </section>

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
          {/* Tab Navigation */}
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
                caption={translate('contacts_action_add', 'Add Contact')}
                icon={ButtonIcon.ADD}
                onClick={handleCreateContact}
              />
            </div>
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

export const getStaticProps = async ({locale = 'en'}: {locale?: string}) => staticPropsWithSST({locale})

export default ContactsListPage
