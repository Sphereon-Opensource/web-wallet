import React, {useCallback, useMemo, useState} from 'react'
import {HttpError, useList, useTranslate} from '@refinedev/core'
import {useNavigate} from 'react-router-dom'
import {PrimaryButton} from '@sphereon/ui-components.ssi-react'
import {ButtonIcon} from '@sphereon/ui-components.core'
import KeyIcon from '@sphereon/ui-components.ssi-react/dist/components/assets/icons/Key'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import {ListPageHeader, TabItem, FilterDropdown} from '@components/tables'
import ConfirmDeleteModal, {useConfirmDelete, useBulkDelete} from '@components/modals/ConfirmDeleteModal'
import {useListPageState, createSortComparator} from '@/src/hooks/useListPageState'
import {staticPropsWithSST} from '@/src/i18n/server'
import {DataResource, KeyManagementRoute, MainRoute} from '@typings'
import {IIdentifier, ManagedKeyInfo} from '@veramo/core'
import style from './index.module.css'

type SortField = 'kid' | 'type' | 'alias' | 'identifierAlias' | 'kms'
type SortDirection = 'asc' | 'desc'

interface KeyTableItem {
  id: string
  kid: string
  type: string
  alias: string
  identifierAlias: string
  kms: string
}

const mapKeysData = (keys: ManagedKeyInfo[], identifiers: IIdentifier[]): KeyTableItem[] => {
  if (!keys) return []
  return keys.map((key: ManagedKeyInfo) => {
    const filteredIdentifiers: IIdentifier[] =
      identifiers && identifiers.length ? identifiers.filter(id => id.keys.some(idKey => idKey.kid === key.kid)) : []
    const identifier: IIdentifier | undefined = filteredIdentifiers.length ? filteredIdentifiers[0] : undefined
    return {
      id: key.kid,
      kid: key.kid,
      type: key.type,
      alias: key.meta?.alias || '',
      identifierAlias: identifier?.alias || '',
      kms: key.kms || '',
    }
  })
}

const KeysListPage: React.FC = () => {
  const translate = useTranslate()
  const navigate = useNavigate()

  const [selectedKey, setSelectedKey] = useState<KeyTableItem | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [kmsFilter, setKmsFilter] = useState<string>('all')

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
    defaultSortColumn: 'type',
    defaultSortDirection: 'asc',
    getItemId: (item: KeyTableItem) => item.id,
  })

  const {
    data: keyData,
    isError: isKeyListError,
    isLoading: isKeyListLoading,
  } = useList<ManagedKeyInfo, HttpError>({
    resource: DataResource.KEYS,
  })

  const {
    data: identifierData,
    isError: isIdentifierListError,
    isLoading: isIdentifierListLoading,
  } = useList<IIdentifier, HttpError>({
    resource: DataResource.IDENTIFIERS,
  })

  const isLoading = isKeyListLoading || isIdentifierListLoading
  const isError = isKeyListError || isIdentifierListError

  const keys: KeyTableItem[] = useMemo(() => {
    return mapKeysData(keyData?.data || [], identifierData?.data || [])
  }, [keyData?.data, identifierData?.data])

  // Get unique key types
  const uniqueTypes = useMemo(() => {
    const types = new Set(keys.map(k => k.type).filter(Boolean))
    return Array.from(types).sort()
  }, [keys])

  // Get unique KMS values
  const uniqueKms = useMemo(() => {
    const kmsValues = new Set(keys.map(k => k.kms).filter(Boolean))
    return Array.from(kmsValues).sort()
  }, [keys])

  // Filter and sort keys
  const filteredAndSortedKeys = useMemo(() => {
    // Apply filters
    let filtered = keys
    if (typeFilter !== 'all') {
      filtered = filtered.filter(k => k.type === typeFilter)
    }
    if (kmsFilter !== 'all') {
      filtered = filtered.filter(k => k.kms === kmsFilter)
    }

    // Apply sorting
    return [...filtered].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'kid':
          comparison = a.kid.localeCompare(b.kid)
          break
        case 'type':
          comparison = a.type.localeCompare(b.type)
          break
        case 'alias':
          comparison = (a.alias || '').localeCompare(b.alias || '')
          break
        case 'identifierAlias':
          comparison = (a.identifierAlias || '').localeCompare(b.identifierAlias || '')
          break
        case 'kms':
          comparison = (a.kms || '').localeCompare(b.kms || '')
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [keys, typeFilter, kmsFilter, sortField, sortDirection])

  // Alias for backwards compatibility
  const sortedKeys = filteredAndSortedKeys

  // Handle add key (placeholder)
  const handleAddKey = useCallback(async () => {
    console.log('Add key clicked')
  }, [])

  // Delete confirmation hooks
  // TODO: Implement key deletion when backend supports it (CWALL-242)
  const singleDelete = useConfirmDelete({
    onConfirm: async (id: string) => {
      console.log('Delete key:', id)
      // Backend deletion not yet supported
    },
    onSuccess: () => {
      // void refetch() when backend supports deletion
    },
    onError: err => {
      console.error('Failed to delete key:', err)
    },
  })

  const bulkDelete = useBulkDelete({
    onConfirm: async (ids: string[]) => {
      console.log('Delete keys:', ids)
      // Backend deletion not yet supported
    },
    onSuccess: () => {
      clearSelection()
      // void refetch() when backend supports deletion
    },
    onError: err => {
      console.error('Failed to delete keys:', err)
    },
  })

  const handleDeleteSelected = useCallback((): void => {
    if (selectionCount === 0) return
    bulkDelete.openModal(Array.from(selectedIds))
  }, [selectionCount, selectedIds, bulkDelete])

  const handleViewFullDetails = useCallback(
    (kid: string) => {
      navigate(`${MainRoute.KEY_MANAGEMENT}/${KeyManagementRoute.KEYS}/${MainRoute.SUB_SHOW}/${encodeURIComponent(kid)}`)
    },
    [navigate],
  )

  const handleMenuAction = useCallback(
    (action: string, key: KeyTableItem, e: React.MouseEvent): void => {
      e.stopPropagation()
      closeMenu()

      switch (action) {
        case 'details':
          setSelectedKey(key)
          break
        case 'fullDetails':
          handleViewFullDetails(key.kid)
          break
        case 'delete':
          singleDelete.openModal(key.id, key.alias || key.type)
          break
      }
    },
    [closeMenu, handleViewFullDetails, singleDelete],
  )

  // Truncate KID for display
  const truncateKid = (kid: string, maxLength: number = 30): string => {
    if (kid.length <= maxLength) return kid
    return `${kid.substring(0, 15)}...${kid.substring(kid.length - 10)}`
  }

  // Build tabs for ListPageHeader
  const headerTabs: TabItem[] = useMemo(() => {
    return [
      {
        id: 'all',
        label: translate('keys_tab_all', 'All Keys') as string,
        count: filteredAndSortedKeys.length,
        icon: <KeyIcon size={18} />,
      },
    ]
  }, [translate, filteredAndSortedKeys.length])

  // Build filter dropdowns
  const headerFilters: FilterDropdown[] = useMemo(() => {
    const filters: FilterDropdown[] = []

    // Key Type filter
    if (uniqueTypes.length > 1) {
      filters.push({
        id: 'type',
        value: typeFilter,
        label: translate('keys_filter_type', 'Type') as string,
        options: [
          {value: 'all', label: translate('keys_filter_all_types', 'All Types') as string, count: keys.length},
          ...uniqueTypes.map(type => ({
            value: type,
            label: type,
            count: keys.filter(k => k.type === type).length,
          })),
        ],
        onChange: setTypeFilter,
      })
    }

    // KMS filter
    if (uniqueKms.length > 1) {
      filters.push({
        id: 'kms',
        value: kmsFilter,
        label: translate('keys_filter_kms', 'KMS') as string,
        options: [
          {value: 'all', label: translate('keys_filter_all_kms', 'All KMS') as string, count: keys.length},
          ...uniqueKms.map(kms => ({
            value: kms,
            label: kms,
            count: keys.filter(k => k.kms === kms).length,
          })),
        ],
        onChange: setKmsFilter,
      })
    }

    return filters
  }, [translate, uniqueTypes, uniqueKms, typeFilter, kmsFilter, keys])

  // Render meatballs icon
  const renderMeatballsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  )

  // Render menu
  const renderMenu = (key: KeyTableItem) => {
    if (openMenuId !== key.id || !menuPosition) return null

    return (
      <>
        <div className={style.menuBackdrop} onClick={closeMenu} />
        <div className={style.menuDropdown} style={{top: menuPosition.top, left: menuPosition.left}}>
          <button className={style.menuItem} onClick={e => handleMenuAction('details', key, e)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            {translate('action_details_label', 'Details')}
          </button>
          <button className={style.menuItem} onClick={e => handleMenuAction('fullDetails', key, e)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {translate('action_full_details_label', 'Full Details')}
          </button>
          <div className={style.menuDivider} />
          <button className={`${style.menuItem} ${style.menuItemDanger}`} onClick={e => handleMenuAction('delete', key, e)}>
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

  // Check if filters are active
  const hasActiveFilters = typeFilter !== 'all' || kmsFilter !== 'all'

  // Render table
  const renderTable = () => {
    if (sortedKeys.length === 0) {
      // Different message if filters are applied but no results
      if (hasActiveFilters && keys.length > 0) {
        return (
          <div className={style.emptyState}>
            <div className={style.emptyStateIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </div>
            <div className={style.emptyStateTitle}>{translate('keys_no_results_title', 'No Matching Keys')}</div>
            <div className={style.emptyStateDescription}>
              {translate('keys_no_results_description', 'No keys match the current filters. Try adjusting your filters.')}
            </div>
            <button
              className={style.emptyStateButton}
              onClick={() => {
                setTypeFilter('all')
                setKmsFilter('all')
              }}>
              {translate('keys_clear_filters', 'Clear Filters')}
            </button>
          </div>
        )
      }

      return (
        <div className={style.emptyState}>
          <div className={style.emptyStateIcon}>
            <KeyIcon size={48} />
          </div>
          <div className={style.emptyStateTitle}>{translate('keys_empty_title', 'No Keys')}</div>
          <div className={style.emptyStateDescription}>
            {translate('keys_empty_description', 'Keys are created when you create identifiers.')}
          </div>
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
              checked={isAllSelected(sortedKeys)}
              ref={input => {
                if (input) {
                  input.indeterminate = isIndeterminate(sortedKeys)
                }
              }}
              onChange={e => handleSelectAllItems(sortedKeys, e.target.checked)}
              aria-label="Select all"
            />
          </div>
          <div
            className={`${style.headerCell} ${style.cellKid} ${style.sortable} ${sortField === 'kid' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('kid')}>
            {translate('key_fields_kid', 'Key ID')}
            <SortIcon field="kid" sortField={sortField} sortDirection={sortDirection} />
          </div>
          <div
            className={`${style.headerCell} ${style.cellType} ${style.sortable} ${sortField === 'type' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('type')}>
            {translate('key_fields_type', 'Type')}
            <SortIcon field="type" sortField={sortField} sortDirection={sortDirection} />
          </div>
          <div
            className={`${style.headerCell} ${style.cellAlias} ${style.sortable} ${sortField === 'alias' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('alias')}>
            {translate('key_fields_alias', 'Alias')}
            <SortIcon field="alias" sortField={sortField} sortDirection={sortDirection} />
          </div>
          <div
            className={`${style.headerCell} ${style.cellIdentifierAlias} ${style.sortable} ${sortField === 'identifierAlias' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('identifierAlias')}>
            {translate('key_fields_associated_identifier', 'Identifier')}
            <SortIcon field="identifierAlias" sortField={sortField} sortDirection={sortDirection} />
          </div>
          <div
            className={`${style.headerCell} ${style.cellKms} ${style.sortable} ${sortField === 'kms' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('kms')}>
            {translate('key_fields_kms', 'KMS')}
            <SortIcon field="kms" sortField={sortField} sortDirection={sortDirection} />
          </div>
          <div className={`${style.headerCell} ${style.cellActions}`} />
        </div>

        {sortedKeys.map(key => (
          <div
            key={key.id}
            className={`${style.tableRow} ${selectedKey?.id === key.id ? style.selected : ''}`}
            onClick={() => setSelectedKey(key)}
            onDoubleClick={() => handleViewFullDetails(key.kid)}
            role="row"
            tabIndex={0}>
            <div className={style.checkboxCell}>
              <input
                type="checkbox"
                checked={isSelected(key.id)}
                onChange={() => {}}
                onClick={e => {
                  e.stopPropagation()
                  toggleSelection(key.id)
                }}
                className={style.checkbox}
                aria-label={`Select ${key.alias || key.kid}`}
              />
            </div>
            <div className={`${style.cell} ${style.cellKid}`}>
              <span className={style.kidValue} title={key.kid}>
                {truncateKid(key.kid)}
              </span>
            </div>
            <div className={`${style.cell} ${style.cellType}`}>
              <span className={style.typeBadge}>{key.type}</span>
            </div>
            <div className={`${style.cell} ${style.cellAlias}`}>
              <span className={style.aliasValue}>{key.alias || '-'}</span>
            </div>
            <div className={`${style.cell} ${style.cellIdentifierAlias}`}>
              <span className={style.identifierValue}>{key.identifierAlias || '-'}</span>
            </div>
            <div className={`${style.cell} ${style.cellKms}`}>
              <span className={style.kmsBadge}>{key.kms || '-'}</span>
            </div>
            <div className={`${style.cell} ${style.cellActions}`}>
              <div className={style.menuContainer}>
                <button
                  type="button"
                  className={style.meatballsButton}
                  onClick={e => toggleMenu(key.id, e)}
                  onMouseDown={e => e.stopPropagation()}
                  aria-label="Open menu">
                  {renderMeatballsIcon()}
                </button>
                {renderMenu(key)}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Render detail panel
  const renderDetailPanel = () => {
    if (!selectedKey) return null

    return (
      <div className={style.detailPanel}>
        <div className={style.detailHeader}>
          <h3 className={style.detailTitle}>{translate('keys_detail_title', 'Key Details')}</h3>
          <button className={style.closeButton} onClick={() => setSelectedKey(null)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={style.detailBody}>
          {/* Key Card */}
          <div className={style.keyCard}>
            <div className={style.keyIcon}>
              <KeyIcon size={24} />
            </div>
            <div className={style.keyInfo}>
              <span className={style.keyAlias}>{selectedKey.alias || selectedKey.type}</span>
              <span className={style.keyType}>{selectedKey.type}</span>
            </div>
            <span className={style.typeBadge}>{selectedKey.type}</span>
          </div>

          {/* Metadata Section */}
          <section className={style.metadataSection}>
            <div className={style.metadataBorder} />
            <div className={style.metadataContent}>
              <div className={style.metadataTitle}>{translate('keys_detail_info', 'Information')}</div>
              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>{translate('keys_detail_type', 'Type')}</span>
                <span className={style.metadataValue}>{selectedKey.type}</span>
              </div>
              {selectedKey.alias && (
                <div className={style.metadataRow}>
                  <span className={style.metadataLabel}>{translate('keys_detail_alias', 'Alias')}</span>
                  <span className={style.metadataValue}>{selectedKey.alias}</span>
                </div>
              )}
              {selectedKey.identifierAlias && (
                <div className={style.metadataRow}>
                  <span className={style.metadataLabel}>{translate('keys_detail_identifier', 'Identifier')}</span>
                  <span className={style.metadataValue}>{selectedKey.identifierAlias}</span>
                </div>
              )}
              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>{translate('keys_detail_kms', 'KMS')}</span>
                <span className={style.metadataValue}>{selectedKey.kms || '-'}</span>
              </div>
            </div>
          </section>

          {/* Key ID Section */}
          <section className={style.kidSection}>
            <div className={style.kidTitle}>{translate('keys_detail_kid', 'Key ID')}</div>
            <div className={style.kidFullValue}>{selectedKey.kid}</div>
            <button
              className={style.copyButton}
              onClick={() => {
                navigator.clipboard.writeText(selectedKey.kid)
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              {translate('action_copy', 'Copy Key ID')}
            </button>
          </section>

          {/* View Full Details button in body */}
          <button className={style.viewFullButton} onClick={() => handleViewFullDetails(selectedKey.kid)}>
            {translate('action_view_full_details', 'View Full Details')}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
        </div>

        <div className={style.detailFooter}>
          <button className={style.dangerButton} onClick={() => handleMenuAction('delete', selectedKey, {} as React.MouseEvent)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
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
          <div className={style.currentPathCaption}>{translate('keys_path_label')}</div>
        </div>
        <AppHeaderBar title={translate('keys_overview_title', 'Keys')} />
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
          <div className={style.currentPathCaption}>{translate('keys_path_label')}</div>
        </div>
        <AppHeaderBar title={translate('keys_overview_title', 'Keys')} />
        <div className={style.errorBanner}>{translate('data_provider_error_message', 'Failed to load data')}</div>
      </div>
    )
  }

  return (
    <div className={style.container}>
      <div className={style.headerContainer}>
        <div className={style.pathCaption}>{translate('key_management_path_label')}</div>
        <div className={style.currentPathCaption}>{translate('keys_path_label')}</div>
      </div>
      <AppHeaderBar title={translate('keys_overview_title', 'Keys')} />

      <div className={style.mainLayout}>
        {/* Content Area */}
        <div className={`${style.contentArea} ${selectedKey ? style.contentAreaWithDetail : ''}`}>
          {/* Header with tabs, filters and selection overlay */}
          <ListPageHeader
            tabs={headerTabs}
            activeTab="all"
            onTabChange={() => {}}
            filters={headerFilters}
            selectionCount={selectionCount}
            onClearSelection={clearSelection}
            onDeleteSelected={handleDeleteSelected}
            selectionLabel={{singular: 'key', plural: 'keys'}}
            actions={
              <PrimaryButton
                caption={translate('key_overview_action_add_key', 'Add Key')}
                icon={ButtonIcon.ADD}
                onClick={handleAddKey}
              />
            }
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
        title="Delete Key"
        message="Are you sure you want to delete this key? This action cannot be undone."
        itemName={singleDelete.itemName ?? undefined}
        onCancel={singleDelete.closeModal}
        onConfirm={singleDelete.handleConfirm}
        isLoading={singleDelete.isLoading}
      />
      <ConfirmDeleteModal
        isOpen={bulkDelete.isOpen}
        title="Delete Keys"
        message="Are you sure you want to delete these keys? This action cannot be undone."
        itemCount={bulkDelete.itemIds.length}
        onCancel={bulkDelete.closeModal}
        onConfirm={bulkDelete.handleConfirm}
        isLoading={bulkDelete.isLoading}
      />
    </div>
  )
}

// Sort Icon Component
const SortIcon: React.FC<{field: SortField; sortField: SortField; sortDirection: SortDirection}> = ({field, sortField, sortDirection}) => {
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

export default KeysListPage
