import React, {useCallback, useMemo, useState} from 'react'
import {HttpError, useDeleteMany, useDelete, useList, useNavigation, useTranslate} from '@refinedev/core'
import {PrimaryButton, SecondaryButton} from '@sphereon/ui-components.ssi-react'
import {ButtonIcon} from '@sphereon/ui-components.core'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import {ListPageHeader, TabItem} from '@components/tables'
import ConfirmDeleteModal, {useConfirmDelete, useBulkDelete} from '@components/modals/ConfirmDeleteModal'
import CreateExternalIdentifierModal from '@components/modals/CreateExternalIdentifierModal'
import {RoleBadges} from '@components/badges'
import {useListPageState} from '@/src/hooks/useListPageState'
import {staticPropsWithSST} from '@/src/i18n/server'
import {DataResource, ExternalIdentifierItem} from '@typings'
import {IIdentifier} from '@veramo/core'
import {getDidMethodFromDID} from '@helpers/DID/DIDService'
import style from './index.module.css'

type IdentifierTab = 'managed' | 'external'
type SortField = 'type' | 'method' | 'alias' | 'value' | 'origin' | 'contact'
type SortDirection = 'asc' | 'desc'

interface IdentifierTableItem {
  id: string
  type: string
  method: string
  alias: string
  value: string
  origin: string
  roles?: string[]
  partyId?: string | null
  partyName?: string | null
  isExternal?: boolean
}

const mapManagedIdentifierData = (identifierData?: IIdentifier[]): IdentifierTableItem[] => {
  if (!identifierData) {
    return []
  }
  return identifierData.map(identifier => ({
    id: identifier.did,
    type: 'DID',
    method: getDidMethodFromDID(identifier.did),
    alias: identifier.alias || '',
    value: identifier.did,
    origin: 'Managed',
    isExternal: false,
  }))
}

const mapExternalIdentifierData = (identifierData?: ExternalIdentifierItem[]): IdentifierTableItem[] => {
  if (!identifierData) {
    return []
  }
  return identifierData.map(identifier => ({
    id: identifier.id,
    type: identifier.type,
    method: identifier.method,
    alias: identifier.alias || '',
    value: identifier.value,
    origin: identifier.origin,
    roles: identifier.roles,
    partyId: identifier.partyId,
    partyName: identifier.partyName,
    isExternal: true,
  }))
}

const IdentifiersListPage: React.FC = () => {
  const translate = useTranslate()
  const {create, edit, show} = useNavigation()
  const {mutateAsync: deleteIdentifiers} = useDeleteMany<IIdentifier[], HttpError>()
  const {mutateAsync: deleteExternalIdentifier} = useDelete<ExternalIdentifierItem, HttpError>()

  const [activeTab, setActiveTab] = useState<IdentifierTab>('managed')
  const [selectedIdentifier, setSelectedIdentifier] = useState<IdentifierTableItem | null>(null)
  const [isCreateExternalModalOpen, setIsCreateExternalModalOpen] = useState(false)

  // Use shared list page state hook for selection, sorting, and context menu
  const {
    selectedIds,
    selectionCount,
    isSelected,
    isAllSelected,
    isIndeterminate,
    toggleSelection,
    clearSelection,
    handleSelectAll: handleSelectAllItems,
    sortColumn: sortField,
    sortDirection,
    handleSort,
    openMenuId,
    menuPosition,
    toggleMenu,
    closeMenu,
  } = useListPageState<SortField>({
    defaultSortColumn: 'method',
    defaultSortDirection: 'asc',
    getItemId: (item: IdentifierTableItem) => item.id,
  })

  // Fetch managed identifiers
  const {
    data: managedIdentifierData,
    isError: isManagedError,
    isLoading: isManagedLoading,
    refetch: refetchManaged,
  } = useList<IIdentifier, HttpError>({
    resource: DataResource.IDENTIFIERS,
  })

  // Fetch external identifiers
  const {
    data: externalIdentifierData,
    isError: isExternalError,
    isLoading: isExternalLoading,
    refetch: refetchExternal,
  } = useList<ExternalIdentifierItem, HttpError>({
    resource: DataResource.EXTERNAL_IDENTIFIERS,
  })

  const managedIdentifiers: IdentifierTableItem[] = useMemo(() => {
    return mapManagedIdentifierData(managedIdentifierData?.data)
  }, [managedIdentifierData?.data])

  const externalIdentifiers: IdentifierTableItem[] = useMemo(() => {
    return mapExternalIdentifierData(externalIdentifierData?.data)
  }, [externalIdentifierData?.data])

  // Current identifiers based on active tab
  const currentIdentifiers = activeTab === 'managed' ? managedIdentifiers : externalIdentifiers
  const isLoading = activeTab === 'managed' ? isManagedLoading : isExternalLoading
  const isError = activeTab === 'managed' ? isManagedError : isExternalError
  const refetch = activeTab === 'managed' ? refetchManaged : refetchExternal

  // Sort identifiers
  const sortedIdentifiers = useMemo(() => {
    return [...currentIdentifiers].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'type':
          comparison = a.type.localeCompare(b.type)
          break
        case 'method':
          comparison = a.method.localeCompare(b.method)
          break
        case 'alias':
          comparison = (a.alias || '').localeCompare(b.alias || '')
          break
        case 'value':
          comparison = a.value.localeCompare(b.value)
          break
        case 'origin':
          comparison = a.origin.localeCompare(b.origin)
          break
        case 'contact':
          comparison = (a.partyName || '').localeCompare(b.partyName || '')
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [currentIdentifiers, sortField, sortDirection])

  // Delete confirmation hooks
  const singleDelete = useConfirmDelete({
    onConfirm: async (id: string) => {
      if (activeTab === 'managed') {
        await deleteIdentifiers({
          resource: DataResource.IDENTIFIERS,
          ids: [id],
        })
      } else {
        await deleteExternalIdentifier({
          resource: DataResource.EXTERNAL_IDENTIFIERS,
          id,
        })
      }
      if (selectedIdentifier?.id === id) {
        setSelectedIdentifier(null)
      }
    },
    onSuccess: () => {
      void refetch()
    },
    onError: (err) => {
      console.error('Failed to delete identifier:', err)
    },
  })

  const bulkDelete = useBulkDelete({
    onConfirm: async (ids: string[]) => {
      if (activeTab === 'managed') {
        await deleteIdentifiers({
          resource: DataResource.IDENTIFIERS,
          ids: ids,
        })
      } else {
        // For external identifiers, delete one by one
        for (const id of ids) {
          await deleteExternalIdentifier({
            resource: DataResource.EXTERNAL_IDENTIFIERS,
            id,
          })
        }
      }
      if (selectedIdentifier && ids.includes(selectedIdentifier.id)) {
        setSelectedIdentifier(null)
      }
    },
    onSuccess: () => {
      clearSelection()
      void refetch()
    },
    onError: (err) => {
      console.error('Failed to delete identifiers:', err)
    },
  })

  // Handle create managed identifier
  const handleCreateManaged = useCallback(async () => {
    create(DataResource.IDENTIFIERS)
  }, [create])

  // Handle create external identifier
  const handleCreateExternal = useCallback(() => {
    setIsCreateExternalModalOpen(true)
  }, [])

  // Handle edit
  const handleEdit = useCallback(
    (identifier: IdentifierTableItem) => {
      if (identifier.isExternal) {
        // External identifiers currently don't have separate edit pages
        // Could open edit modal here
        return
      }
      if (!identifier.value.startsWith('did:web')) {
        return
      }
      edit(DataResource.IDENTIFIERS, identifier.value)
    },
    [edit],
  )

  // Handle delete
  const handleDelete = useCallback(
    (identifier: IdentifierTableItem) => {
      const deleteId = identifier.isExternal ? identifier.id : identifier.value
      singleDelete.openModal(deleteId, identifier.alias || identifier.method)
    },
    [singleDelete],
  )

  const handleDeleteSelected = useCallback((): void => {
    if (selectionCount === 0) return
    bulkDelete.openModal(Array.from(selectedIds))
  }, [selectionCount, selectedIds, bulkDelete])

  // Handle show details
  const handleShowDetails = useCallback(
    (identifier: IdentifierTableItem) => {
      if (identifier.isExternal) {
        show(DataResource.EXTERNAL_IDENTIFIERS, encodeURIComponent(identifier.id))
      } else {
        show(DataResource.IDENTIFIERS, encodeURIComponent(identifier.value))
      }
    },
    [show],
  )

  // Handle navigate to contact
  const handleNavigateToContact = useCallback(
    (partyId: string) => {
      show('CONTACTS', partyId)
    },
    [show],
  )

  // Menu action handler
  const handleMenuAction = useCallback(
    (action: string, identifier: IdentifierTableItem, e: React.MouseEvent): void => {
      e.stopPropagation()
      closeMenu()

      switch (action) {
        case 'details':
          handleShowDetails(identifier)
          break
        case 'edit':
          handleEdit(identifier)
          break
        case 'delete':
          handleDelete(identifier)
          break
        case 'contact':
          if (identifier.partyId) {
            handleNavigateToContact(identifier.partyId)
          }
          break
      }
    },
    [closeMenu, handleShowDetails, handleEdit, handleDelete, handleNavigateToContact],
  )

  // Handle tab change
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId as IdentifierTab)
    setSelectedIdentifier(null)
    clearSelection()
  }, [clearSelection])

  // Handle external identifier created
  const handleExternalIdentifierCreated = useCallback(() => {
    setIsCreateExternalModalOpen(false)
    void refetchExternal()
  }, [refetchExternal])

  // Truncate DID for display
  const truncateDid = (did: string, maxLength: number = 35): string => {
    if (did.length <= maxLength) return did
    return `${did.substring(0, 18)}...${did.substring(did.length - 12)}`
  }

  // Build tabs for ListPageHeader
  const headerTabs: TabItem[] = useMemo(() => {
    return [
      {
        id: 'managed',
        label: translate('identifiers_tab_managed', 'Managed') as string,
        count: managedIdentifiers.length,
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        ),
      },
      {
        id: 'external',
        label: translate('identifiers_tab_external', 'External') as string,
        count: externalIdentifiers.length,
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        ),
      },
    ]
  }, [translate, managedIdentifiers.length, externalIdentifiers.length])

  // Render meatballs icon
  const renderMeatballsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  )

  // Render menu
  const renderMenu = (identifier: IdentifierTableItem) => {
    if (openMenuId !== identifier.id || !menuPosition) return null

    const canEdit = !identifier.isExternal && identifier.value.startsWith('did:web')
    const hasContact = identifier.isExternal && identifier.partyId

    return (
      <>
        <div className={style.menuBackdrop} onClick={closeMenu} />
        <div className={style.menuDropdown} style={{top: menuPosition.top, left: menuPosition.left}}>
          <button className={style.menuItem} onClick={e => handleMenuAction('details', identifier, e)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            {translate('action_details_label', 'Details')}
          </button>
          {hasContact && (
            <button className={style.menuItem} onClick={e => handleMenuAction('contact', identifier, e)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {translate('action_view_contact', 'View Contact')}
            </button>
          )}
          {canEdit && (
            <button className={style.menuItem} onClick={e => handleMenuAction('edit', identifier, e)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
              {translate('action_edit_label', 'Edit')}
            </button>
          )}
          <div className={style.menuDivider} />
          <button className={`${style.menuItem} ${style.menuItemDanger}`} onClick={e => handleMenuAction('delete', identifier, e)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            {translate('action_delete_label', 'Delete')}
          </button>
        </div>
      </>
    )
  }

  // Render empty state
  const renderEmptyState = () => {
    const isExternal = activeTab === 'external'
    return (
      <div className={style.emptyState}>
        <div className={style.emptyStateIcon}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </div>
        <div className={style.emptyStateTitle}>
          {isExternal
            ? translate('identifiers_external_empty_title', 'No External Identifiers')
            : translate('identifiers_empty_title', 'No Identifiers')}
        </div>
        <div className={style.emptyStateDescription}>
          {isExternal
            ? translate('identifiers_external_empty_description', 'Add external identifiers from your contacts.')
            : translate('identifiers_empty_description', 'Create your first identifier to get started.')}
        </div>
        <button className={style.emptyStateButton} onClick={isExternal ? handleCreateExternal : handleCreateManaged}>
          {isExternal
            ? translate('identifiers_action_add_external', 'Add External Identifier')
            : translate('identifiers_overview_action_add_identifier', 'Add Identifier')}
        </button>
      </div>
    )
  }

  // Render managed table
  const renderManagedTable = () => {
    return (
      <div className={`${style.table} ${selectionCount > 0 ? style.tableWithSelections : ''}`}>
        <div className={style.tableHeader}>
          <div className={style.checkboxCell}>
            <input
              type="checkbox"
              className={style.checkbox}
              checked={isAllSelected(sortedIdentifiers)}
              ref={input => {
                if (input) {
                  input.indeterminate = isIndeterminate(sortedIdentifiers)
                }
              }}
              onChange={e => handleSelectAllItems(sortedIdentifiers, e.target.checked)}
              aria-label="Select all"
            />
          </div>
          <div
            className={`${style.headerCell} ${style.cellType} ${style.sortable} ${sortField === 'type' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('type')}>
            {translate('identifiers_overview_column_type_label', 'Type')}
            <SortIcon field="type" sortField={sortField} sortDirection={sortDirection} />
          </div>
          <div
            className={`${style.headerCell} ${style.cellMethod} ${style.sortable} ${sortField === 'method' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('method')}>
            {translate('identifiers_overview_column_method_label', 'Method')}
            <SortIcon field="method" sortField={sortField} sortDirection={sortDirection} />
          </div>
          <div
            className={`${style.headerCell} ${style.cellAlias} ${style.sortable} ${sortField === 'alias' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('alias')}>
            {translate('identifiers_overview_column_alias_label', 'Alias')}
            <SortIcon field="alias" sortField={sortField} sortDirection={sortDirection} />
          </div>
          <div
            className={`${style.headerCell} ${style.cellValue} ${style.sortable} ${sortField === 'value' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('value')}>
            {translate('identifiers_overview_column_value_label', 'Value')}
            <SortIcon field="value" sortField={sortField} sortDirection={sortDirection} />
          </div>
          <div className={`${style.headerCell} ${style.cellActions}`} />
        </div>

        {sortedIdentifiers.map(identifier => (
          <div
            key={identifier.id}
            className={`${style.tableRow} ${selectedIdentifier?.id === identifier.id ? style.selected : ''}`}
            onClick={() => setSelectedIdentifier(identifier)}
            onDoubleClick={() => handleShowDetails(identifier)}
            role="row"
            tabIndex={0}>
            <div className={style.checkboxCell}>
              <input
                type="checkbox"
                checked={isSelected(identifier.id)}
                onChange={() => {}}
                onClick={e => toggleSelection(identifier.id, e)}
                className={style.checkbox}
                aria-label={`Select ${identifier.alias || identifier.value}`}
              />
            </div>
            <div className={`${style.cell} ${style.cellType}`}>
              <span className={style.typeBadge}>{identifier.type}</span>
            </div>
            <div className={`${style.cell} ${style.cellMethod}`}>
              <span className={style.methodBadge}>{identifier.method}</span>
            </div>
            <div className={`${style.cell} ${style.cellAlias}`}>
              <span className={style.aliasValue}>{identifier.alias || '-'}</span>
            </div>
            <div className={`${style.cell} ${style.cellValue}`}>
              <span className={style.didValue} title={identifier.value}>
                {truncateDid(identifier.value)}
              </span>
            </div>
            <div className={`${style.cell} ${style.cellActions}`}>
              <div className={style.menuContainer}>
                <button
                  type="button"
                  className={style.meatballsButton}
                  onClick={e => toggleMenu(identifier.id, e)}
                  onMouseDown={e => e.stopPropagation()}
                  aria-label="Open menu">
                  {renderMeatballsIcon()}
                </button>
                {renderMenu(identifier)}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Render external table
  const renderExternalTable = () => {
    return (
      <div className={`${style.table} ${selectionCount > 0 ? style.tableWithSelections : ''}`}>
        <div className={style.tableHeader}>
          <div className={style.checkboxCell}>
            <input
              type="checkbox"
              className={style.checkbox}
              checked={isAllSelected(sortedIdentifiers)}
              ref={input => {
                if (input) {
                  input.indeterminate = isIndeterminate(sortedIdentifiers)
                }
              }}
              onChange={e => handleSelectAllItems(sortedIdentifiers, e.target.checked)}
              aria-label="Select all"
            />
          </div>
          <div
            className={`${style.headerCell} ${style.cellType} ${style.sortable} ${sortField === 'type' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('type')}>
            {translate('identifiers_overview_column_type_label', 'Type')}
            <SortIcon field="type" sortField={sortField} sortDirection={sortDirection} />
          </div>
          <div
            className={`${style.headerCell} ${style.cellMethod} ${style.sortable} ${sortField === 'method' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('method')}>
            {translate('identifiers_overview_column_method_label', 'Method')}
            <SortIcon field="method" sortField={sortField} sortDirection={sortDirection} />
          </div>
          <div
            className={`${style.headerCell} ${style.cellAlias} ${style.sortable} ${sortField === 'alias' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('alias')}>
            {translate('identifiers_overview_column_alias_label', 'Alias')}
            <SortIcon field="alias" sortField={sortField} sortDirection={sortDirection} />
          </div>
          <div
            className={`${style.headerCell} ${style.cellValueSmall} ${style.sortable} ${sortField === 'value' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('value')}>
            {translate('identifiers_overview_column_value_label', 'Value')}
            <SortIcon field="value" sortField={sortField} sortDirection={sortDirection} />
          </div>
          <div
            className={`${style.headerCell} ${style.cellContact} ${style.sortable} ${sortField === 'contact' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('contact')}>
            {translate('identifiers_overview_column_contact_label', 'Contact')}
            <SortIcon field="contact" sortField={sortField} sortDirection={sortDirection} />
          </div>
          <div className={`${style.headerCell} ${style.cellOrigin}`}>
            {translate('identifiers_overview_column_origin_label', 'Origin')}
          </div>
          <div className={`${style.headerCell} ${style.cellActions}`} />
        </div>

        {sortedIdentifiers.map(identifier => (
          <div
            key={identifier.id}
            className={`${style.tableRow} ${selectedIdentifier?.id === identifier.id ? style.selected : ''}`}
            onClick={() => setSelectedIdentifier(identifier)}
            onDoubleClick={() => handleShowDetails(identifier)}
            role="row"
            tabIndex={0}>
            <div className={style.checkboxCell}>
              <input
                type="checkbox"
                checked={isSelected(identifier.id)}
                onChange={() => {}}
                onClick={e => toggleSelection(identifier.id, e)}
                className={style.checkbox}
                aria-label={`Select ${identifier.alias || identifier.value}`}
              />
            </div>
            <div className={`${style.cell} ${style.cellType}`}>
              <span className={style.typeBadge}>{identifier.type}</span>
            </div>
            <div className={`${style.cell} ${style.cellMethod}`}>
              <span className={style.methodBadge}>{identifier.method}</span>
            </div>
            <div className={`${style.cell} ${style.cellAlias}`}>
              <span className={style.aliasValue}>{identifier.alias || '-'}</span>
            </div>
            <div className={`${style.cell} ${style.cellValueSmall}`}>
              <span className={style.didValue} title={identifier.value}>
                {truncateDid(identifier.value, 25)}
              </span>
            </div>
            <div className={`${style.cell} ${style.cellContact}`}>
              {identifier.partyName ? (
                <button
                  className={style.contactLink}
                  onClick={e => {
                    e.stopPropagation()
                    if (identifier.partyId) {
                      handleNavigateToContact(identifier.partyId)
                    }
                  }}>
                  {identifier.partyName}
                </button>
              ) : (
                <span className={style.noContact}>-</span>
              )}
            </div>
            <div className={`${style.cell} ${style.cellOrigin}`}>
              <span className={`${style.originBadge} ${identifier.origin === 'External' ? style.originExternal : style.originInternal}`}>
                {identifier.origin}
              </span>
            </div>
            <div className={`${style.cell} ${style.cellActions}`}>
              <div className={style.menuContainer}>
                <button
                  type="button"
                  className={style.meatballsButton}
                  onClick={e => toggleMenu(identifier.id, e)}
                  onMouseDown={e => e.stopPropagation()}
                  aria-label="Open menu">
                  {renderMeatballsIcon()}
                </button>
                {renderMenu(identifier)}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Render table based on active tab
  const renderTable = () => {
    if (sortedIdentifiers.length === 0) {
      return renderEmptyState()
    }
    return activeTab === 'managed' ? renderManagedTable() : renderExternalTable()
  }

  // Render detail panel
  const renderDetailPanel = () => {
    if (!selectedIdentifier) return null

    const canEdit = !selectedIdentifier.isExternal && selectedIdentifier.value.startsWith('did:web')
    const isExternal = selectedIdentifier.isExternal

    return (
      <div className={style.detailPanel}>
        <div className={style.detailHeader}>
          <h3 className={style.detailTitle}>{translate('identifiers_detail_title', 'Identifier Details')}</h3>
          <button className={style.closeButton} onClick={() => setSelectedIdentifier(null)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={style.detailBody}>
          {/* Identifier Card */}
          <div className={style.identifierCard}>
            <div className={style.identifierIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <div className={style.identifierInfo}>
              <span className={style.identifierAlias}>{selectedIdentifier.alias || selectedIdentifier.method}</span>
              <span className={style.identifierMethod}>{selectedIdentifier.method}</span>
            </div>
            <span className={style.typeBadge}>{selectedIdentifier.type}</span>
          </div>

          {/* Metadata Section */}
          <section className={style.metadataSection}>
            <div className={style.metadataBorder} />
            <div className={style.metadataContent}>
              <div className={style.metadataTitle}>{translate('identifiers_detail_info', 'Information')}</div>
              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>{translate('identifiers_detail_type', 'Type')}</span>
                <span className={style.metadataValue}>{selectedIdentifier.type}</span>
              </div>
              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>{translate('identifiers_detail_method', 'Method')}</span>
                <span className={style.metadataValue}>{selectedIdentifier.method}</span>
              </div>
              {selectedIdentifier.alias && (
                <div className={style.metadataRow}>
                  <span className={style.metadataLabel}>{translate('identifiers_detail_alias', 'Alias')}</span>
                  <span className={style.metadataValue}>{selectedIdentifier.alias}</span>
                </div>
              )}
              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>{translate('identifiers_detail_origin', 'Origin')}</span>
                <span className={style.metadataValue}>{selectedIdentifier.origin}</span>
              </div>
            </div>
          </section>

          {/* Contact Section (for external identifiers) */}
          {isExternal && selectedIdentifier.partyName && (
            <section className={style.contactSection}>
              <div className={style.contactSectionHeader}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>{translate('identifiers_detail_contact', 'Associated Contact')}</span>
              </div>
              <button
                className={style.contactCard}
                onClick={() => selectedIdentifier.partyId && handleNavigateToContact(selectedIdentifier.partyId)}>
                <div className={style.contactAvatar}>{selectedIdentifier.partyName[0].toUpperCase()}</div>
                <span className={style.contactName}>{selectedIdentifier.partyName}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </button>
            </section>
          )}

          {/* Roles Section (for external identifiers) */}
          {isExternal && selectedIdentifier.roles && selectedIdentifier.roles.length > 0 && (
            <section className={style.rolesSection}>
              <div className={style.rolesSectionTitle}>{translate('identifiers_detail_roles', 'Roles')}</div>
              <RoleBadges roles={selectedIdentifier.roles as any} size="small" />
            </section>
          )}

          {/* DID Value Section */}
          <section className={style.didSection}>
            <div className={style.didTitle}>
              {selectedIdentifier.type === 'URL'
                ? translate('identifiers_detail_url', 'URL Value')
                : translate('identifiers_detail_did', 'DID Value')}
            </div>
            <div className={style.didFullValue}>{selectedIdentifier.value}</div>
            <button
              className={style.copyButton}
              onClick={() => {
                navigator.clipboard.writeText(selectedIdentifier.value)
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              {translate('action_copy', 'Copy')}
            </button>
          </section>

          {/* View Full Details Button */}
          <button className={style.viewFullButton} onClick={() => handleShowDetails(selectedIdentifier)}>
            {translate('action_view_full_details', 'View Full Details')}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
        </div>

        <div className={style.detailFooter}>
          {canEdit && (
            <button className={style.secondaryButton} onClick={() => handleEdit(selectedIdentifier)}>
              {translate('action_edit', 'Edit')}
            </button>
          )}
          <button className={style.dangerButton} onClick={() => handleDelete(selectedIdentifier)}>
            {translate('action_delete_label', 'Delete')}
          </button>
        </div>
      </div>
    )
  }

  // Render action buttons based on active tab
  const renderActions = () => {
    if (activeTab === 'external') {
      return (
        <PrimaryButton
          caption={translate('identifiers_action_add_external', 'Add External Identifier')}
          icon={ButtonIcon.ADD}
          onClick={async () => handleCreateExternal()}
        />
      )
    }
    return (
      <PrimaryButton
        caption={translate('identifiers_overview_action_add_identifier', 'Add Identifier')}
        icon={ButtonIcon.ADD}
        onClick={handleCreateManaged}
      />
    )
  }

  if (isLoading) {
    return (
      <div className={style.container}>
        <div className={style.headerContainer}>
          <div className={style.pathCaption}>{translate('key_management_path_label')}</div>
          <div className={style.currentPathCaption}>{translate('identifiers_path_label')}</div>
        </div>
        <AppHeaderBar title={translate('identifiers_overview_title', 'Identifiers')} />
        <div className={style.loadingState}>
          <div className={style.spinner} />
          <span>{translate('data_provider_loading_message', 'Loading...')}</span>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className={style.container}>
        <div className={style.headerContainer}>
          <div className={style.pathCaption}>{translate('key_management_path_label')}</div>
          <div className={style.currentPathCaption}>{translate('identifiers_path_label')}</div>
        </div>
        <AppHeaderBar title={translate('identifiers_overview_title', 'Identifiers')} />
        <div className={style.errorBanner}>{translate('data_provider_error_message', 'Failed to load data')}</div>
      </div>
    )
  }

  return (
    <div className={style.container}>
      <div className={style.headerContainer}>
        <div className={style.pathCaption}>{translate('key_management_path_label')}</div>
        <div className={style.currentPathCaption}>{translate('identifiers_path_label')}</div>
      </div>
      <AppHeaderBar title={translate('identifiers_overview_title', 'Identifiers')} />

      <div className={style.mainLayout}>
        {/* Content Area */}
        <div className={`${style.contentArea} ${selectedIdentifier ? style.contentAreaWithDetail : ''}`}>
          {/* Header with tabs and selection overlay */}
          <ListPageHeader
            tabs={headerTabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            selectionCount={selectionCount}
            onClearSelection={clearSelection}
            onDeleteSelected={handleDeleteSelected}
            selectionLabel={{singular: 'identifier', plural: 'identifiers'}}
            actions={renderActions()}
          />

          {/* Table */}
          <div className={style.tableContainer}>{renderTable()}</div>
        </div>

        {/* Detail Panel */}
        {renderDetailPanel()}
      </div>

      {/* Delete Confirmation Modals */}
      <ConfirmDeleteModal
        isOpen={singleDelete.isOpen}
        title={translate('identifiers_delete_title', 'Delete Identifier')}
        message={translate('identifiers_delete_message', 'Are you sure you want to delete "{name}"? This action cannot be undone.')}
        itemName={singleDelete.itemName || undefined}
        onCancel={singleDelete.closeModal}
        onConfirm={singleDelete.handleConfirm}
        isLoading={singleDelete.isLoading}
        cancelText={translate('action_cancel', 'Cancel')}
        confirmText={translate('action_delete', 'Delete')}
      />
      <ConfirmDeleteModal
        isOpen={bulkDelete.isOpen}
        title={translate('identifiers_delete_bulk_title', 'Delete Identifiers')}
        message={translate('identifiers_delete_bulk_message', 'Are you sure you want to delete {count} identifier(s)? This action cannot be undone.')}
        itemCount={bulkDelete.itemIds.length}
        onCancel={bulkDelete.closeModal}
        onConfirm={bulkDelete.handleConfirm}
        isLoading={bulkDelete.isLoading}
        cancelText={translate('action_cancel', 'Cancel')}
        confirmText={translate('action_delete', 'Delete')}
      />

      {/* Create External Identifier Modal */}
      <CreateExternalIdentifierModal
        isOpen={isCreateExternalModalOpen}
        onClose={() => setIsCreateExternalModalOpen(false)}
        onSuccess={handleExternalIdentifierCreated}
      />
    </div>
  )
}

// Sort Icon Component
const SortIcon: React.FC<{field: SortField; sortField: SortField; sortDirection: SortDirection}> = ({
  field,
  sortField,
  sortDirection,
}) => {
  if (sortField !== field) {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={style.sortIconInactive}>
        <path d="M6 2L9 5H3L6 2Z" fill="currentColor" />
        <path d="M6 10L3 7H9L6 10Z" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={style.sortIcon}>
      {sortDirection === 'asc' ? <path d="M6 2L9 5H3L6 2Z" fill="currentColor" /> : <path d="M6 10L3 7H9L6 10Z" fill="currentColor" />}
    </svg>
  )
}

export const getStaticProps = async ({locale = 'en'}: {locale?: string}) => staticPropsWithSST({locale})

export default IdentifiersListPage
