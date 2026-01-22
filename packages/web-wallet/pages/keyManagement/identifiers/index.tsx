import React, {useCallback, useMemo, useState} from 'react'
import {HttpError, useDeleteMany, useList, useNavigation, useTranslate} from '@refinedev/core'
import {PrimaryButton} from '@sphereon/ui-components.ssi-react'
import {ButtonIcon} from '@sphereon/ui-components.core'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import {ListPageHeader, TabItem} from '@components/tables'
import {staticPropsWithSST} from '@/src/i18n/server'
import {DataResource} from '@typings'
import {IIdentifier} from '@veramo/core'
import {getDidMethodFromDID} from '@helpers/DID/DIDService'
import style from './index.module.css'

type SortField = 'type' | 'method' | 'alias' | 'value' | 'origin'
type SortDirection = 'asc' | 'desc'

interface IdentifierTableItem {
  id: string
  type: string
  method: string
  alias: string
  value: string
  origin: string
}

const mapIdentifierData = (identifierData?: IIdentifier[]): IdentifierTableItem[] => {
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
  }))
}

const IdentifiersListPage: React.FC = () => {
  const translate = useTranslate()
  const {create, edit, show} = useNavigation()
  const {mutateAsync: deleteIdentifiers} = useDeleteMany<IIdentifier[], HttpError>()

  const [selectedIdentifier, setSelectedIdentifier] = useState<IdentifierTableItem | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>('method')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{top: number; left: number} | null>(null)

  const {
    data: identifierData,
    isError,
    isLoading,
    refetch,
  } = useList<IIdentifier, HttpError>({
    resource: DataResource.IDENTIFIERS,
  })

  const identifiers: IdentifierTableItem[] = useMemo(() => {
    return mapIdentifierData(identifierData?.data)
  }, [identifierData?.data])

  // Sort identifiers
  const sortedIdentifiers = useMemo(() => {
    return [...identifiers].sort((a, b) => {
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
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [identifiers, sortField, sortDirection])

  // Handle sort
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortField(field)
        setSortDirection('asc')
      }
    },
    [sortField],
  )

  // Handle create
  const handleCreate = useCallback(async () => {
    create(DataResource.IDENTIFIERS)
  }, [create])

  // Handle edit
  const handleEdit = useCallback(
    (identifier: IdentifierTableItem) => {
      if (!identifier.value.startsWith('did:web')) {
        return
      }
      edit(DataResource.IDENTIFIERS, identifier.value)
    },
    [edit],
  )

  // Handle delete
  const handleDelete = useCallback(
    async (identifier: IdentifierTableItem) => {
      if (!confirm(`Are you sure you want to delete this identifier?`)) {
        return
      }

      await deleteIdentifiers(
        {
          resource: DataResource.IDENTIFIERS,
          ids: [identifier.value],
        },
        {
          onError: error => {
            console.error('Failed to delete identifier:', error)
          },
        },
      )

      if (selectedIdentifier?.id === identifier.id) {
        setSelectedIdentifier(null)
      }
      await refetch()
    },
    [deleteIdentifiers, selectedIdentifier, refetch],
  )

  // Selection handlers
  const handleToggleSelection = useCallback((id: string, e: React.MouseEvent): void => {
    e.stopPropagation()
    setSelectedIds(prev => {
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
        const allIds = new Set(sortedIdentifiers.map(i => i.id))
        setSelectedIds(allIds)
      } else {
        setSelectedIds(new Set())
      }
    },
    [sortedIdentifiers],
  )

  const handleDeleteSelected = useCallback(async (): Promise<void> => {
    if (selectedIds.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} identifier(s)?`)) return

    const idsToDelete = Array.from(selectedIds)
    await deleteIdentifiers(
      {
        resource: DataResource.IDENTIFIERS,
        ids: idsToDelete,
      },
      {
        onError: error => {
          console.error('Failed to delete identifiers:', error)
        },
      },
    )

    if (selectedIdentifier && selectedIds.has(selectedIdentifier.id)) {
      setSelectedIdentifier(null)
    }
    setSelectedIds(new Set())
    await refetch()
  }, [selectedIds, deleteIdentifiers, selectedIdentifier, refetch])

  // Menu handlers
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

  // Handle show details
  const handleShowDetails = useCallback(
    (identifier: IdentifierTableItem) => {
      show(DataResource.IDENTIFIERS, encodeURIComponent(identifier.value))
    },
    [show],
  )

  const handleMenuAction = useCallback(
    async (action: string, identifier: IdentifierTableItem, e: React.MouseEvent): Promise<void> => {
      e.stopPropagation()
      handleCloseMenu()

      switch (action) {
        case 'details':
          handleShowDetails(identifier)
          break
        case 'edit':
          handleEdit(identifier)
          break
        case 'delete':
          await handleDelete(identifier)
          break
      }
    },
    [handleCloseMenu, handleShowDetails, handleEdit, handleDelete],
  )

  // Truncate DID for display
  const truncateDid = (did: string, maxLength: number = 35): string => {
    if (did.length <= maxLength) return did
    return `${did.substring(0, 18)}...${did.substring(did.length - 12)}`
  }

  // Build tabs for ListPageHeader
  const headerTabs: TabItem[] = useMemo(() => {
    return [
      {
        id: 'all',
        label: translate('identifiers_tab_all', 'All Identifiers') as string,
        count: identifiers.length,
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        ),
      },
    ]
  }, [translate, identifiers.length])

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

    const canEdit = identifier.value.startsWith('did:web')

    return (
      <>
        <div className={style.menuBackdrop} onClick={handleCloseMenu} />
        <div className={style.menuDropdown} style={{top: menuPosition.top, left: menuPosition.left}}>
          <button className={style.menuItem} onClick={e => handleMenuAction('details', identifier, e)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            {translate('action_details_label', 'Details')}
          </button>
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

  // Render table
  const renderTable = () => {
    if (sortedIdentifiers.length === 0) {
      return (
        <div className={style.emptyState}>
          <div className={style.emptyStateIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </div>
          <div className={style.emptyStateTitle}>{translate('identifiers_empty_title', 'No Identifiers')}</div>
          <div className={style.emptyStateDescription}>
            {translate('identifiers_empty_description', 'Create your first identifier to get started.')}
          </div>
          <button className={style.emptyStateButton} onClick={handleCreate}>
            {translate('identifiers_overview_action_add_identifier', 'Add Identifier')}
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
              checked={sortedIdentifiers.length > 0 && selectedIds.size === sortedIdentifiers.length}
              ref={input => {
                if (input) {
                  input.indeterminate = selectedIds.size > 0 && selectedIds.size < sortedIdentifiers.length
                }
              }}
              onChange={e => handleSelectAll(e.target.checked)}
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
          <div
            className={`${style.headerCell} ${style.cellOrigin} ${style.sortable} ${sortField === 'origin' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('origin')}>
            {translate('identifiers_overview_column_origin_label', 'Origin')}
            <SortIcon field="origin" sortField={sortField} sortDirection={sortDirection} />
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
                checked={selectedIds.has(identifier.id)}
                onChange={() => {}}
                onClick={e => handleToggleSelection(identifier.id, e)}
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
            <div className={`${style.cell} ${style.cellOrigin}`}>
              <span className={style.originBadge}>{identifier.origin}</span>
            </div>
            <div className={`${style.cell} ${style.cellActions}`}>
              <div className={style.menuContainer}>
                <button
                  type="button"
                  className={style.meatballsButton}
                  onClick={e => handleToggleMenu(identifier.id, e)}
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

  // Render detail panel
  const renderDetailPanel = () => {
    if (!selectedIdentifier) return null

    const canEdit = selectedIdentifier.value.startsWith('did:web')

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

          {/* DID Value Section */}
          <section className={style.didSection}>
            <div className={style.didTitle}>{translate('identifiers_detail_did', 'DID Value')}</div>
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
              {translate('action_copy', 'Copy DID')}
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
            activeTab="all"
            onTabChange={() => {}}
            selectionCount={selectedIds.size}
            onClearSelection={() => setSelectedIds(new Set())}
            onDeleteSelected={handleDeleteSelected}
            selectionLabel={{singular: 'identifier', plural: 'identifiers'}}
            actions={
              <PrimaryButton
                caption={translate('identifiers_overview_action_add_identifier', 'Add Identifier')}
                icon={ButtonIcon.ADD}
                onClick={handleCreate}
              />
            }
          />

          {/* Table */}
          <div className={style.tableContainer}>{renderTable()}</div>
        </div>

        {/* Detail Panel */}
        {renderDetailPanel()}
      </div>
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
