import React, {FC, ReactElement, useCallback, useMemo, useState} from 'react'
import {useDelete, useList, useNavigation} from '@refinedev/core'
import {PrimaryButton} from '@sphereon/ui-components.ssi-react'
import {ButtonIcon} from '@sphereon/ui-components.core'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import StatusBadge from '@components/badges/StatusBadge'
import ConfirmDeleteModal, {useConfirmDelete, useBulkDelete} from '@components/modals/ConfirmDeleteModal'
import {useListPageState} from '@/src/hooks/useListPageState'
import {BookingDataResource, BookingResource, ResourceCategory} from '@typings'
import style from './index.module.css'

type StatusFilter = 'all' | 'ACTIVE' | 'MAINTENANCE' | 'RETIRED'
type SortColumn = 'name' | 'category' | 'status' | 'capacity' | 'created'
type SortDirection = 'asc' | 'desc'

const STATUS_OPTIONS: {value: StatusFilter; label: string}[] = [
  {value: 'all', label: 'All Statuses'},
  {value: 'ACTIVE', label: 'Active'},
  {value: 'MAINTENANCE', label: 'Maintenance'},
  {value: 'RETIRED', label: 'Retired'},
]

const AdminResourcesPage: FC = (): ReactElement => {
  const {create} = useNavigation()

  const [selectedResource, setSelectedResource] = useState<BookingResource | null>(null)
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')
  const [activeCategory, setActiveCategory] = useState<string>('all')

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
    sortColumn,
    sortDirection,
    handleSort,
    openMenuId,
    menuPosition,
    toggleMenu,
    closeMenu,
  } = useListPageState<SortColumn>({
    defaultSortColumn: 'name',
    defaultSortDirection: 'asc',
    getItemId: (item: BookingResource) => item.id,
  })

  const {data: resourcesData, isLoading, refetch} = useList<BookingResource>({
    resource: BookingDataResource.RESOURCES,
    pagination: {pageSize: 100},
  })

  const {data: categoriesData} = useList<ResourceCategory>({
    resource: BookingDataResource.CATEGORIES,
    pagination: {pageSize: 100},
  })

  const {mutateAsync: deleteResource} = useDelete()

  const resources = resourcesData?.data ?? []
  const categories = categoriesData?.data ?? []

  // Get category name by ID
  const getCategoryName = useCallback(
    (categoryId: string): string => {
      return categories.find(c => c.id === categoryId)?.name || 'Unknown'
    },
    [categories],
  )

  // Filter and sort resources
  const filteredResources = useMemo(() => {
    let filtered = resources
    if (activeCategory !== 'all') {
      filtered = filtered.filter(r => r.categoryId === activeCategory)
    }
    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.status === filterStatus)
    }

    // Sort function
    const getSortValue = (resource: BookingResource, column: SortColumn): string | number => {
      switch (column) {
        case 'name':
          return resource.name.toLowerCase()
        case 'category':
          return getCategoryName(resource.categoryId).toLowerCase()
        case 'status':
          return resource.status.toLowerCase()
        case 'capacity':
          return resource.capacity || 0
        case 'created':
          return new Date(resource.createdAt).getTime()
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
  }, [resources, activeCategory, filterStatus, sortColumn, sortDirection, getCategoryName])

  // Get category count for tabs
  const getCategoryCount = useCallback(
    (categoryId: string): number => {
      if (categoryId === 'all') return resources.length
      return resources.filter(r => r.categoryId === categoryId).length
    },
    [resources],
  )

  // Get status count
  const getStatusCount = useCallback(
    (status: StatusFilter): number => {
      if (status === 'all') return resources.length
      return resources.filter(r => r.status === status).length
    },
    [resources],
  )

  // Format date
  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  // Delete confirmation hooks
  const singleDelete = useConfirmDelete({
    onConfirm: async (id: string) => {
      await deleteResource({
        resource: BookingDataResource.RESOURCES,
        id,
      })
      if (selectedResource?.id === id) {
        setSelectedResource(null)
      }
    },
    onSuccess: () => {
      void refetch()
    },
    onError: err => {
      console.error('Failed to delete resource:', err)
    },
  })

  const bulkDelete = useBulkDelete({
    onConfirm: async (ids: string[]) => {
      for (const id of ids) {
        await deleteResource({
          resource: BookingDataResource.RESOURCES,
          id,
        })
        if (selectedResource?.id === id) {
          setSelectedResource(null)
        }
      }
    },
    onSuccess: () => {
      clearSelection()
      void refetch()
    },
    onError: err => {
      console.error('Failed to delete resources:', err)
    },
  })

  const handleDeleteSelected = useCallback((): void => {
    if (selectionCount === 0) return
    bulkDelete.openModal(Array.from(selectedIds))
  }, [selectionCount, selectedIds, bulkDelete])

  // Handle actions
  const handleAction = useCallback(
    (action: string, resource: BookingResource, e: React.MouseEvent): void => {
      e.stopPropagation()
      closeMenu()

      switch (action) {
        case 'view':
          window.location.href = `/booking/admin/resources/${resource.id}`
          break
        case 'edit':
          window.location.href = `/booking/admin/resources/edit/${resource.id}`
          break
        case 'delete':
          singleDelete.openModal(resource.id, resource.name)
          break
      }
    },
    [closeMenu, singleDelete],
  )

  const handleCreateResource = useCallback(async (): Promise<void> => {
    window.location.href = '/booking/admin/resources/create'
  }, [])

  const getStatusVariant = (status: string): 'valid' | 'expired' | 'revoked' | 'pending' => {
    switch (status) {
      case 'ACTIVE':
        return 'valid'
      case 'MAINTENANCE':
        return 'pending'
      case 'RETIRED':
        return 'expired'
      default:
        return 'pending'
    }
  }

  // Render meatballs icon
  const renderMeatballsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  )

  // Render menu
  const renderMenu = (resource: BookingResource) => {
    if (openMenuId !== resource.id || !menuPosition) return null

    return (
      <>
        <div className={style.menuBackdrop} onClick={closeMenu} />
        <div className={style.menuDropdown} style={{top: menuPosition.top, left: menuPosition.left}}>
          <button className={style.menuItem} onClick={e => handleAction('view', resource, e)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            View Details
          </button>
          <button className={style.menuItem} onClick={e => handleAction('edit', resource, e)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </button>
          <div className={style.menuDivider} />
          <button className={`${style.menuItem} ${style.menuItemDanger}`} onClick={e => handleAction('delete', resource, e)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Delete
          </button>
        </div>
      </>
    )
  }

  // Render table
  const renderTable = () => {
    if (filteredResources.length === 0) {
      return (
        <div className={style.emptyState}>
          <div className={style.emptyStateIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
          </div>
          <div className={style.emptyStateTitle}>No Resources Found</div>
          <div className={style.emptyStateDescription}>
            {filterStatus !== 'all' ? 'Try changing the filter or add a new resource.' : 'Add your first resource to get started.'}
          </div>
          <button className={style.emptyStateButton} onClick={handleCreateResource}>
            Add Resource
          </button>
        </div>
      )
    }

    return (
      <div className={`${style.table} ${selectionCount > 0 ? style.tableWithSelections : ''}`}>
        <div className={style.tableHeader}>
          <div className={style.checkboxCell}>
            <input
              type="checkbox"
              className={style.checkbox}
              checked={isAllSelected(filteredResources)}
              ref={input => {
                if (input) {
                  input.indeterminate = isIndeterminate(filteredResources)
                }
              }}
              onChange={e => handleSelectAllItems(filteredResources, e.target.checked)}
              aria-label="Select all"
            />
          </div>
          <div
            className={`${style.headerCell} ${style.headerCellSortable} ${style.cellName} ${sortColumn === 'name' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('name')}
            role="columnheader">
            Name
            <SortIcon field="name" sortColumn={sortColumn} sortDirection={sortDirection} />
          </div>
          <div
            className={`${style.headerCell} ${style.headerCellSortable} ${style.cellCategory} ${sortColumn === 'category' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('category')}
            role="columnheader">
            Category
            <SortIcon field="category" sortColumn={sortColumn} sortDirection={sortDirection} />
          </div>
          <div
            className={`${style.headerCell} ${style.headerCellSortable} ${style.cellCapacity} ${sortColumn === 'capacity' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('capacity')}
            role="columnheader">
            Capacity
            <SortIcon field="capacity" sortColumn={sortColumn} sortDirection={sortDirection} />
          </div>
          <div
            className={`${style.headerCell} ${style.headerCellSortable} ${style.cellStatus} ${sortColumn === 'status' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('status')}
            role="columnheader">
            Status
            <SortIcon field="status" sortColumn={sortColumn} sortDirection={sortDirection} />
          </div>
          <div
            className={`${style.headerCell} ${style.headerCellSortable} ${style.cellCreated} ${sortColumn === 'created' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('created')}
            role="columnheader">
            Created
            <SortIcon field="created" sortColumn={sortColumn} sortDirection={sortDirection} />
          </div>
          <div className={`${style.headerCell} ${style.cellActions}`} />
        </div>

        {filteredResources.map(resource => (
          <div
            key={resource.id}
            className={`${style.tableRow} ${selectedResource?.id === resource.id ? style.selected : ''}`}
            onClick={() => setSelectedResource(resource)}
            onDoubleClick={() => (window.location.href = `/booking/admin/resources/${resource.id}`)}
            role="row"
            tabIndex={0}>
            <div className={style.checkboxCell}>
              <input
                type="checkbox"
                checked={isSelected(resource.id)}
                onChange={() => {}}
                onClick={e => toggleSelection(resource.id, e)}
                className={style.checkbox}
                aria-label={`Select ${resource.name}`}
              />
            </div>
            <div className={`${style.cell} ${style.cellName}`}>
              <div className={style.resourceInfo}>
                <div className={style.resourceAvatar}>
                  {resource.imageUrl ? (
                    <img src={resource.imageUrl} alt={resource.name} />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <path d="M8 21h8M12 17v4" />
                    </svg>
                  )}
                </div>
                <div className={style.resourceNameWrapper}>
                  <span className={style.resourceName}>{resource.name}</span>
                  {resource.description && <span className={style.resourceDescription}>{resource.description}</span>}
                </div>
              </div>
            </div>
            <div className={`${style.cell} ${style.cellCategory}`}>
              <span className={style.categoryBadge}>{getCategoryName(resource.categoryId)}</span>
            </div>
            <div className={`${style.cell} ${style.cellCapacity}`}>{resource.capacity || '-'}</div>
            <div className={`${style.cell} ${style.cellStatus}`}>
              <StatusBadge label={resource.status} variant={getStatusVariant(resource.status)} size="small" />
            </div>
            <div className={`${style.cell} ${style.cellCreated}`}>{formatDate(resource.createdAt)}</div>
            <div className={`${style.cell} ${style.cellActions}`}>
              <div className={style.menuContainer}>
                <button
                  type="button"
                  className={style.meatballsButton}
                  onClick={e => toggleMenu(resource.id, e)}
                  onMouseDown={e => e.stopPropagation()}
                  aria-label="Open menu">
                  {renderMeatballsIcon()}
                </button>
                {renderMenu(resource)}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Render detail panel
  const renderDetailPanel = () => {
    if (!selectedResource) return null

    return (
      <div className={style.detailPanel}>
        <div className={style.detailHeader}>
          <h2 className={style.detailTitle}>Resource Details</h2>
          <button className={style.closeButton} onClick={() => setSelectedResource(null)} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={style.detailBody}>
          {/* Resource Card */}
          <div className={style.resourceCard}>
            <div className={style.resourceCardImage}>
              {selectedResource.imageUrl ? (
                <img src={selectedResource.imageUrl} alt={selectedResource.name} />
              ) : (
                <div className={style.resourceCardPlaceholder}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8M12 17v4" />
                  </svg>
                </div>
              )}
            </div>
            <div className={style.resourceCardInfo}>
              <span className={style.resourceCardName}>{selectedResource.name}</span>
              <span className={style.resourceCardCategory}>{getCategoryName(selectedResource.categoryId)}</span>
            </div>
            <StatusBadge label={selectedResource.status} variant={getStatusVariant(selectedResource.status)} size="small" />
          </div>

          {/* Description */}
          {selectedResource.description && (
            <div className={style.descriptionSection}>
              <p>{selectedResource.description}</p>
            </div>
          )}

          {/* Metadata Section */}
          <div className={style.metadataSection}>
            <div className={style.metadataBorder} />
            <div className={style.metadataContent}>
              <div className={style.metadataTitle}>Information</div>
              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>Capacity</span>
                <span className={style.metadataValue}>{selectedResource.capacity || '-'} person(s)</span>
              </div>
              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>Timezone</span>
                <span className={style.metadataValue}>{selectedResource.timezone}</span>
              </div>
              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>Verification</span>
                <span className={style.metadataValue}>
                  {selectedResource.requirements && selectedResource.requirements.length > 0 ? 'Required' : 'Not required'}
                </span>
              </div>
              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>Created</span>
                <span className={style.metadataValue}>{formatDate(selectedResource.createdAt)}</span>
              </div>
              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>ID</span>
                <span className={style.metadataValueMono}>{selectedResource.id}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={style.actionButtons}>
            <button
              className={style.viewFullButton}
              onClick={() => (window.location.href = `/booking/admin/resources/${selectedResource.id}`)}>
              View Full Details
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>
            <button
              className={style.editButton}
              onClick={() => (window.location.href = `/booking/admin/resources/edit/${selectedResource.id}`)}>
              Edit
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Footer with Delete */}
        <div className={style.detailFooter}>
          <button className={style.deleteButton} onClick={() => singleDelete.openModal(selectedResource.id, selectedResource.name)}>
            Delete Resource
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={style.container}>
      <AppHeaderBar title="Manage Resources" />

      <div className={style.mainLayout}>
        {/* Content Area */}
        <div className={`${style.contentArea} ${selectedResource ? style.contentAreaWithDetail : ''}`}>
          {/* Tab Navigation with Selection Overlay */}
          <div className={style.tabNavigationWrapper}>
            <div className={style.tabNavigation}>
              {/* Category Tabs */}
              <button
                className={`${style.tabButton} ${activeCategory === 'all' ? style.tabButtonActive : ''}`}
                onClick={() => {
                  setActiveCategory('all')
                  setSelectedResource(null)
                }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                All Resources
                {resources.length > 0 && <span className={style.tabBadge}>{resources.length}</span>}
              </button>
              {categories.map(category => (
                <button
                  key={category.id}
                  className={`${style.tabButton} ${activeCategory === category.id ? style.tabButtonActive : ''}`}
                  onClick={() => {
                    setActiveCategory(category.id)
                    setSelectedResource(null)
                  }}>
                  {category.name}
                  {getCategoryCount(category.id) > 0 && (
                    <span className={style.tabBadge}>{getCategoryCount(category.id)}</span>
                  )}
                </button>
              ))}

              <div className={style.tabSpacer} />

              {/* Status Filter Dropdown */}
              <div className={style.filterItem}>
                <select
                  className={style.filterSelect}
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value as StatusFilter)}>
                  {STATUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={style.actionButtonContainer}>
                <PrimaryButton caption="Add Resource" icon={ButtonIcon.ADD} onClick={handleCreateResource} />
              </div>
            </div>

            {/* Selection Actions Overlay */}
            {selectionCount > 0 && (
              <div className={style.selectionOverlay}>
                <div className={style.selectionInfo}>
                  <button type="button" className={style.deselectButton} onClick={clearSelection} aria-label="Deselect all">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                  <span className={style.selectionCount}>
                    {selectionCount} {selectionCount === 1 ? 'resource' : 'resources'} selected
                  </span>
                </div>
                <button type="button" className={style.bulkDeleteButton} onClick={handleDeleteSelected} aria-label="Delete selected">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Delete
                </button>
              </div>
            )}
          </div>

          {/* Table Content */}
          {isLoading ? (
            <div className={style.loadingState}>
              <div className={style.spinner} />
              <span>Loading resources...</span>
            </div>
          ) : (
            <div className={style.tableContainer}>{renderTable()}</div>
          )}
        </div>

        {/* Detail Panel */}
        {renderDetailPanel()}
      </div>

      {/* Delete Confirmation Modals */}
      <ConfirmDeleteModal
        isOpen={singleDelete.isOpen}
        title="Delete Resource"
        message='Are you sure you want to delete "{name}"? This action cannot be undone.'
        itemName={singleDelete.itemName || undefined}
        onCancel={singleDelete.closeModal}
        onConfirm={singleDelete.handleConfirm}
        isLoading={singleDelete.isLoading}
        cancelText="Cancel"
        confirmText="Delete"
      />
      <ConfirmDeleteModal
        isOpen={bulkDelete.isOpen}
        title="Delete Resources"
        message="Are you sure you want to delete {count} resource(s)? This action cannot be undone."
        itemCount={bulkDelete.itemIds.length}
        onCancel={bulkDelete.closeModal}
        onConfirm={bulkDelete.handleConfirm}
        isLoading={bulkDelete.isLoading}
        cancelText="Cancel"
        confirmText="Delete"
      />
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
      {sortDirection === 'asc' ? <path d="M6 2L9 5H3L6 2Z" fill="currentColor" /> : <path d="M6 10L3 7H9L6 10Z" fill="currentColor" />}
    </svg>
  )
}

export default AdminResourcesPage
