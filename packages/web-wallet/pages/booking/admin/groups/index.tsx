import React, {FC, ReactElement, useState, useMemo, useCallback} from 'react'
import {useList, useDelete, HttpError} from '@refinedev/core'
import {useNavigate} from 'react-router-dom'
import {PrimaryButton} from '@sphereon/ui-components.ssi-react'
import {ButtonIcon} from '@sphereon/ui-components.core'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import ConfirmDeleteModal, {useConfirmDelete, useBulkDelete} from '@components/modals/ConfirmDeleteModal'
import {useListPageState} from '@/src/hooks/useListPageState'
import {BookingDataResource, ResourceGroup, ResourceCategory} from '@typings'
import style from './index.module.css'

type SortColumn = 'name' | 'category' | 'status' | 'created'
type SortDirection = 'asc' | 'desc'

const AdminGroupsPage: FC = (): ReactElement => {
  const navigate = useNavigate()
  const [selectedGroup, setSelectedGroup] = useState<ResourceGroup | null>(null)

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
    getItemId: (item: ResourceGroup) => item.id,
  })

  const {data: groupsData, isLoading, isError, refetch} = useList<ResourceGroup, HttpError>({
    resource: BookingDataResource.GROUPS,
    pagination: {pageSize: 100},
  })

  const {data: categoriesData} = useList<ResourceCategory, HttpError>({
    resource: BookingDataResource.CATEGORIES,
    pagination: {pageSize: 100},
  })

  const {mutate: deleteGroup} = useDelete()

  const groups = groupsData?.data ?? []
  const categories = categoriesData?.data ?? []

  // Create a map of category IDs to names
  const categoryMap = categories.reduce((acc, cat) => {
    acc[cat.id] = cat
    return acc
  }, {} as Record<string, ResourceCategory>)

  // Sort groups
  const sortedGroups = useMemo(() => {
    const getSortValue = (group: ResourceGroup, column: SortColumn): string | number => {
      switch (column) {
        case 'name':
          return group.name.toLowerCase()
        case 'category':
          return group.categoryId ? (categoryMap[group.categoryId]?.name || '').toLowerCase() : ''
        case 'status':
          return group.status.toLowerCase()
        case 'created':
          return new Date(group.createdAt).getTime()
        default:
          return ''
      }
    }

    return [...groups].sort((a, b) => {
      const aVal = getSortValue(a, sortColumn)
      const bVal = getSortValue(b, sortColumn)

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [groups, sortColumn, sortDirection, categoryMap])

  // Format date
  const formatDate = (dateStr: string | Date): string => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  // Delete confirmation hooks
  const singleDelete = useConfirmDelete({
    onConfirm: async (id: string) => {
      return new Promise<void>((resolve, reject) => {
        deleteGroup(
          {
            resource: BookingDataResource.GROUPS,
            id: id,
          },
          {
            onSuccess: () => {
              if (selectedGroup?.id === id) {
                setSelectedGroup(null)
              }
              resolve()
            },
            onError: (error) => {
              reject(error)
            },
          },
        )
      })
    },
    onSuccess: () => {
      void refetch()
    },
    onError: (err) => {
      console.error('Failed to delete group:', err)
    },
  })

  const bulkDelete = useBulkDelete({
    onConfirm: async (ids: string[]) => {
      for (const id of ids) {
        await new Promise<void>((resolve, reject) => {
          deleteGroup(
            {
              resource: BookingDataResource.GROUPS,
              id: id,
            },
            {
              onSuccess: () => {
                if (selectedGroup?.id === id) {
                  setSelectedGroup(null)
                }
                resolve()
              },
              onError: (error) => {
                reject(error)
              },
            },
          )
        })
      }
    },
    onSuccess: () => {
      clearSelection()
      void refetch()
    },
    onError: (err) => {
      console.error('Failed to delete groups:', err)
    },
  })

  const handleDeleteSelected = useCallback((): void => {
    if (selectionCount === 0) return
    bulkDelete.openModal(Array.from(selectedIds))
  }, [selectionCount, selectedIds, bulkDelete])

  const handleViewDetails = useCallback((group: ResourceGroup): void => {
    navigate(`/booking/admin/groups/${group.id}`)
  }, [navigate])

  const handleCreate = useCallback(async (): Promise<void> => {
    navigate('/booking/admin/groups/create')
  }, [navigate])

  const handleAction = useCallback(
    (action: string, group: ResourceGroup, e: React.MouseEvent): void => {
      e.stopPropagation()
      closeMenu()

      switch (action) {
        case 'view':
          handleViewDetails(group)
          break
        case 'delete':
          singleDelete.openModal(group.id, group.name)
          break
      }
    },
    [closeMenu, handleViewDetails, singleDelete]
  )

  const handleDelete = useCallback((group: ResourceGroup): void => {
    singleDelete.openModal(group.id, group.name)
  }, [singleDelete])

  // Render meatballs icon
  const renderMeatballsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  )

  // Render menu
  const renderMenu = (group: ResourceGroup) => {
    if (openMenuId !== group.id || !menuPosition) return null

    return (
      <>
        <div className={style.menuBackdrop} onClick={closeMenu} />
        <div className={style.menuDropdown} style={{top: menuPosition.top, left: menuPosition.left}}>
          <button className={style.menuItem} onClick={(e) => handleAction('view', group, e)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            View Details
          </button>
          <div className={style.menuDivider} />
          <button
            className={`${style.menuItem} ${style.menuItemDanger}`}
            onClick={(e) => handleAction('delete', group, e)}
          >
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
    if (sortedGroups.length === 0) {
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
          <div className={style.emptyStateTitle}>No Resource Groups</div>
          <div className={style.emptyStateDescription}>
            Create groups to bundle resources together and apply shared schedules and policies.
          </div>
          <button className={style.emptyStateButton} onClick={handleCreate}>
            Create Group
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
              checked={isAllSelected(sortedGroups)}
              ref={(input) => {
                if (input) {
                  input.indeterminate = isIndeterminate(sortedGroups)
                }
              }}
              onChange={(e) => handleSelectAllItems(sortedGroups, e.target.checked)}
              aria-label="Select all"
            />
          </div>
          <div
            className={`${style.headerCell} ${style.headerCellSortable} ${style.cellName} ${sortColumn === 'name' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('name')}
            role="columnheader"
          >
            Name
            <SortIcon field="name" sortColumn={sortColumn} sortDirection={sortDirection} />
          </div>
          <div
            className={`${style.headerCell} ${style.headerCellSortable} ${style.cellCategory} ${sortColumn === 'category' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('category')}
            role="columnheader"
          >
            Category
            <SortIcon field="category" sortColumn={sortColumn} sortDirection={sortDirection} />
          </div>
          <div
            className={`${style.headerCell} ${style.headerCellSortable} ${style.cellStatus} ${sortColumn === 'status' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('status')}
            role="columnheader"
          >
            Status
            <SortIcon field="status" sortColumn={sortColumn} sortDirection={sortDirection} />
          </div>
          <div
            className={`${style.headerCell} ${style.headerCellSortable} ${style.cellCreated} ${sortColumn === 'created' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('created')}
            role="columnheader"
          >
            Created
            <SortIcon field="created" sortColumn={sortColumn} sortDirection={sortDirection} />
          </div>
          <div className={`${style.headerCell} ${style.cellActions}`} />
        </div>

        {sortedGroups.map(group => {
          const category = group.categoryId ? categoryMap[group.categoryId] : undefined
          return (
            <div
              key={group.id}
              className={`${style.tableRow} ${selectedGroup?.id === group.id ? style.selected : ''}`}
              onClick={() => setSelectedGroup(group)}
              onDoubleClick={() => handleViewDetails(group)}
              role="row"
              tabIndex={0}
            >
              <div className={style.checkboxCell}>
                <input
                  type="checkbox"
                  checked={isSelected(group.id)}
                  onChange={() => {}}
                  onClick={(e) => toggleSelection(group.id, e)}
                  className={style.checkbox}
                  aria-label={`Select ${group.name}`}
                />
              </div>
              <div className={`${style.cell} ${style.cellName}`}>
                <div className={style.groupInfo}>
                  <div className={style.groupAvatar}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <div className={style.groupNameWrapper}>
                    <span className={style.groupName}>{group.name}</span>
                    {group.description && (
                      <span className={style.groupDescription}>{group.description}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className={`${style.cell} ${style.cellCategory}`}>
                {category ? (
                  <span className={style.categoryBadge}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                    </svg>
                    {category.name}
                  </span>
                ) : (
                  <span className={style.secondaryValue}>-</span>
                )}
              </div>
              <div className={`${style.cell} ${style.cellStatus}`}>
                <span className={`${style.statusBadge} ${group.status === 'ACTIVE' ? style.statusActive : style.statusInactive}`}>
                  {group.status}
                </span>
              </div>
              <div className={`${style.cell} ${style.cellCreated}`}>
                {formatDate(group.createdAt)}
              </div>
              <div className={`${style.cell} ${style.cellActions}`}>
                <div className={style.menuContainer}>
                  <button
                    type="button"
                    className={style.meatballsButton}
                    onClick={(e) => toggleMenu(group.id, e)}
                    onMouseDown={(e) => e.stopPropagation()}
                    aria-label="Open menu"
                  >
                    {renderMeatballsIcon()}
                  </button>
                  {renderMenu(group)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Render detail panel
  const renderDetailPanel = () => {
    if (!selectedGroup) return null

    const category = selectedGroup.categoryId ? categoryMap[selectedGroup.categoryId] : undefined

    return (
      <div className={style.detailPanel}>
        <div className={style.detailHeader}>
          <h2 className={style.detailTitle}>Group Details</h2>
          <button className={style.closeButton} onClick={() => setSelectedGroup(null)} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={style.detailBody}>
          {/* Group Card */}
          <div className={style.groupCard}>
            <div className={style.groupCardAvatar}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className={style.groupCardInfo}>
              <span className={style.groupCardName}>{selectedGroup.name}</span>
              <div className={style.groupCardSubtitle}>
                <span className={`${style.statusBadge} ${selectedGroup.status === 'ACTIVE' ? style.statusActive : style.statusInactive}`}>
                  {selectedGroup.status}
                </span>
                {category && (
                  <span className={style.categoryBadge}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                    </svg>
                    {category.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Metadata Section */}
          <div className={style.metadataSection}>
            <div className={style.metadataBorder} />
            <div className={style.metadataContent}>
              <div className={style.metadataTitle}>Information</div>
              {selectedGroup.description && (
                <div className={style.metadataRow}>
                  <span className={style.metadataLabel}>Description</span>
                  <span className={style.metadataValue}>{selectedGroup.description}</span>
                </div>
              )}
              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>Category</span>
                <span className={style.metadataValue}>{category?.name || 'None'}</span>
              </div>
              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>Created</span>
                <span className={style.metadataValue}>{formatDate(selectedGroup.createdAt)}</span>
              </div>
              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>Updated</span>
                <span className={style.metadataValue}>{formatDate(selectedGroup.updatedAt)}</span>
              </div>
            </div>
          </div>

          {/* View Full Details Button */}
          <button className={style.viewFullButton} onClick={() => handleViewDetails(selectedGroup)}>
            View Full Details
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
        </div>

        {/* Footer with Delete */}
        <div className={style.detailFooter}>
          <button className={style.deleteButton} onClick={() => handleDelete(selectedGroup)}>
            Delete Group
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={style.container}>
      <AppHeaderBar title="Manage Resource Groups" />

      <div className={style.mainLayout}>
        {/* Content Area */}
        <div className={`${style.contentArea} ${selectedGroup ? style.contentAreaWithDetail : ''}`}>
          {/* Tab Navigation with Selection Overlay */}
          <div className={style.tabNavigationWrapper}>
            <div className={style.tabNavigation}>
              <div className={style.pageTitle}>Resource Groups</div>
              <div className={style.tabSpacer} />
              <div className={style.actionButtonContainer}>
                <PrimaryButton
                  caption="Create Group"
                  icon={ButtonIcon.ADD}
                  onClick={handleCreate}
                />
              </div>
            </div>

            {/* Selection Actions Overlay */}
            {selectionCount > 0 && (
              <div className={style.selectionOverlay}>
                <div className={style.selectionInfo}>
                  <button
                    type="button"
                    className={style.deselectButton}
                    onClick={clearSelection}
                    aria-label="Deselect all"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                  <span className={style.selectionCount}>
                    {selectionCount} {selectionCount === 1 ? 'item' : 'items'} selected
                  </span>
                </div>
                <button
                  type="button"
                  className={style.bulkDeleteButton}
                  onClick={handleDeleteSelected}
                  aria-label="Delete selected"
                >
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
              <span>Loading...</span>
            </div>
          ) : isError ? (
            <div className={style.errorBanner}>
              Failed to load groups
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

      {/* Delete Confirmation Modals */}
      <ConfirmDeleteModal
        isOpen={singleDelete.isOpen}
        title="Delete Resource Group"
        message='Are you sure you want to delete "{name}"? Resources in this group will be unassigned.'
        itemName={singleDelete.itemName || undefined}
        onCancel={singleDelete.closeModal}
        onConfirm={singleDelete.handleConfirm}
        isLoading={singleDelete.isLoading}
        cancelText="Cancel"
        confirmText="Delete"
      />
      <ConfirmDeleteModal
        isOpen={bulkDelete.isOpen}
        title="Delete Resource Groups"
        message="Are you sure you want to delete {count} group(s)? Resources in these groups will be unassigned."
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
      {sortDirection === 'asc' ? (
        <path d="M6 2L9 5H3L6 2Z" fill="currentColor" />
      ) : (
        <path d="M6 10L3 7H9L6 10Z" fill="currentColor" />
      )}
    </svg>
  )
}

export default AdminGroupsPage
