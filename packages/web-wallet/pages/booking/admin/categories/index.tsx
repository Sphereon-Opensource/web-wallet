import React, {FC, ReactElement, useEffect, useState, useMemo, useCallback} from 'react'
import {useCreate, useDeleteMany, useList, useUpdate} from '@refinedev/core'
import {PrimaryButton} from '@sphereon/ui-components.ssi-react'
import {ButtonIcon} from '@sphereon/ui-components.core'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import StatusBadge, {getStatusVariant} from '@components/badges/StatusBadge'
import {ListPageHeader, TabItem} from '@components/tables'
import ConfirmDeleteModal, {useBulkDelete, useConfirmDelete} from '@components/modals/ConfirmDeleteModal'
import {useListPageState, createSortComparator} from '@/src/hooks/useListPageState'
import {BookingDataResource, ResourceCategory} from '@typings'
import style from './index.module.css'

type SortField = 'name' | 'slug' | 'displayOrder'
type StatusFilter = 'all' | 'active' | 'inactive'

const STATUS_TABS: {value: StatusFilter; label: string}[] = [
  {value: 'all', label: 'All'},
  {value: 'active', label: 'Active'},
  {value: 'inactive', label: 'Inactive'},
]

// Sort Icon Component
const SortIcon: FC<{field: SortField; sortField: SortField; sortDirection: 'asc' | 'desc'}> = ({
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
      {sortDirection === 'asc' ? (
        <path d="M6 2L9 5H3L6 2Z" fill="currentColor" />
      ) : (
        <path d="M6 10L3 7H9L6 10Z" fill="currentColor" />
      )}
    </svg>
  )
}

const AdminCategoriesPage: FC = (): ReactElement => {
  const [selectedCategory, setSelectedCategory] = useState<ResourceCategory | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ResourceCategory | null>(null)
  const [formData, setFormData] = useState({name: '', description: '', slug: ''})
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')

  const {data: categoriesData, isLoading, refetch} = useList<ResourceCategory>({
    resource: BookingDataResource.CATEGORIES,
    pagination: {pageSize: 100},
  })

  const {mutate: createCategory, isLoading: isCreating} = useCreate()
  const {mutate: updateCategory, isLoading: isUpdating} = useUpdate()
  const {mutate: deleteMany} = useDeleteMany()

  const categories = categoriesData?.data ?? []

  // Filter categories by status
  const filteredCategories = useMemo(() => {
    if (filterStatus === 'all') return categories
    return categories.filter(c => (filterStatus === 'active' ? c.isActive : !c.isActive))
  }, [categories, filterStatus])

  const {
    selectedIds,
    selectionCount,
    isSelected,
    isAllSelected,
    isIndeterminate,
    toggleSelection,
    handleSelectAll: handleSelectAllItems,
    clearSelection,
    sortColumn: sortField,
    sortDirection,
    handleSort,
    openMenuId,
    menuPosition,
    toggleMenu,
    closeMenu,
  } = useListPageState<SortField>({
    defaultSortColumn: 'name',
    defaultSortDirection: 'asc',
    getItemId: (item: ResourceCategory) => item.id,
  })

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = () => closeMenu()
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [openMenuId, closeMenu])

  const deleteModal = useConfirmDelete({
    onConfirm: async (itemId: string) => {
      return new Promise<void>((resolve, reject) => {
        deleteMany(
          {
            resource: BookingDataResource.CATEGORIES,
            ids: [itemId],
          },
          {
            onSuccess: () => {
              setSelectedCategory(null)
              refetch()
              resolve()
            },
            onError: error => reject(error),
          },
        )
      })
    },
  })

  const bulkDelete = useBulkDelete({
    onConfirm: async (itemIds: string[]) => {
      return new Promise<void>((resolve, reject) => {
        deleteMany(
          {
            resource: BookingDataResource.CATEGORIES,
            ids: itemIds,
          },
          {
            onSuccess: () => {
              setSelectedCategory(null)
              clearSelection()
              refetch()
              resolve()
            },
            onError: error => reject(error),
          },
        )
      })
    },
  })

  const getSortValue = (item: ResourceCategory, column: SortField): string | number | null => {
    switch (column) {
      case 'name':
        return item.name
      case 'slug':
        return item.slug
      case 'displayOrder':
        return item.displayOrder ?? 0
      default:
        return null
    }
  }

  const sortedCategories = [...filteredCategories].sort(createSortComparator(sortField, sortDirection, getSortValue))

  const handleOpenCreate = () => {
    setFormData({name: '', description: '', slug: ''})
    setEditingCategory(null)
    setIsCreateModalOpen(true)
  }

  const handleOpenEdit = (category: ResourceCategory) => {
    setFormData({
      name: category.name,
      description: category.description || '',
      slug: category.slug,
    })
    setEditingCategory(category)
    setIsCreateModalOpen(true)
    closeMenu()
  }

  const handleCloseModal = () => {
    setIsCreateModalOpen(false)
    setEditingCategory(null)
    setFormData({name: '', description: '', slug: ''})
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-')

    if (editingCategory) {
      updateCategory(
        {
          resource: BookingDataResource.CATEGORIES,
          id: editingCategory.id,
          values: {...formData, slug},
        },
        {
          onSuccess: () => {
            handleCloseModal()
            refetch()
          },
        },
      )
    } else {
      createCategory(
        {
          resource: BookingDataResource.CATEGORIES,
          values: {...formData, slug, isActive: true, displayOrder: categories.length + 1},
        },
        {
          onSuccess: () => {
            handleCloseModal()
            refetch()
          },
        },
      )
    }
  }

  const handleRowClick = (category: ResourceCategory) => {
    setSelectedCategory(selectedCategory?.id === category.id ? null : category)
  }

  const handleDelete = useCallback(
    (category: ResourceCategory) => {
      deleteModal.openModal(category.id, category.name)
      closeMenu()
    },
    [deleteModal, closeMenu],
  )

  const handleDeleteSelected = useCallback((): void => {
    if (selectionCount === 0) return
    bulkDelete.openModal(Array.from(selectedIds))
  }, [selectionCount, selectedIds, bulkDelete])

  // Get status count for tabs
  const getStatusCount = useCallback(
    (status: StatusFilter): number => {
      if (status === 'all') return categories.length
      return categories.filter(c => (status === 'active' ? c.isActive : !c.isActive)).length
    },
    [categories],
  )

  // Build tabs for ListPageHeader
  const headerTabs: TabItem[] = useMemo(() => {
    return STATUS_TABS.map(tab => ({
      id: tab.value,
      label: tab.label,
      count: getStatusCount(tab.value),
      icon:
        tab.value === 'all' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
          </svg>
        ) : tab.value === 'active' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        ),
    }))
  }, [getStatusCount])

  const handleMenuAction = useCallback(
    async (action: string, category: ResourceCategory, e: React.MouseEvent): Promise<void> => {
      e.stopPropagation()
      closeMenu()

      switch (action) {
        case 'details':
          setSelectedCategory(category)
          break
        case 'edit':
          handleOpenEdit(category)
          break
        case 'delete':
          handleDelete(category)
          break
      }
    },
    [closeMenu, handleDelete],
  )

  // Render meatballs icon
  const renderMeatballsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  )

  // Render menu for category
  const renderCategoryMenu = (category: ResourceCategory) => {
    if (openMenuId !== category.id || !menuPosition) return null

    return (
      <>
        <div className={style.menuBackdrop} onClick={closeMenu} />
        <div className={style.menuDropdown} style={{top: menuPosition.top, left: menuPosition.left}}>
          <button className={style.menuItem} onClick={e => handleMenuAction('details', category, e)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            Details
          </button>
          <button className={style.menuItem} onClick={e => handleMenuAction('edit', category, e)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </button>
          <div className={style.menuDivider} />
          <button className={`${style.menuItem} ${style.menuItemDanger}`} onClick={e => handleMenuAction('delete', category, e)}>
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
  const renderTable = () => (
    <div className={style.tableContainer}>
      {sortedCategories.length === 0 ? (
        <div className={style.emptyState}>
          <div className={style.emptyStateIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
          </div>
          <div className={style.emptyStateTitle}>No Categories Yet</div>
          <div className={style.emptyStateDescription}>Create categories to organize your bookable resources.</div>
          <button className={style.emptyStateButton} onClick={handleOpenCreate}>
            Add Category
          </button>
        </div>
      ) : (
        <div className={`${style.table} ${selectionCount > 0 ? style.tableWithSelections : ''}`}>
          <div className={style.tableHeader}>
            <div className={style.checkboxCell}>
              <input
                type="checkbox"
                className={style.checkbox}
                checked={isAllSelected(sortedCategories)}
                ref={input => {
                  if (input) {
                    input.indeterminate = isIndeterminate(sortedCategories)
                  }
                }}
                onChange={e => handleSelectAllItems(sortedCategories, e.target.checked)}
                aria-label="Select all"
              />
            </div>
            <div
              className={`${style.headerCell} ${style.cellName} ${style.sortable} ${sortField === 'name' ? style.headerCellSorted : ''}`}
              onClick={() => handleSort('name')}>
              Name
              <SortIcon field="name" sortField={sortField} sortDirection={sortDirection} />
            </div>
            <div
              className={`${style.headerCell} ${style.cellSlug} ${style.sortable} ${sortField === 'slug' ? style.headerCellSorted : ''}`}
              onClick={() => handleSort('slug')}>
              Slug
              <SortIcon field="slug" sortField={sortField} sortDirection={sortDirection} />
            </div>
            <div className={`${style.headerCell} ${style.cellDescription}`}>Description</div>
            <div className={`${style.headerCell} ${style.cellStatus}`}>Status</div>
            <div
              className={`${style.headerCell} ${style.cellOrder} ${style.sortable} ${sortField === 'displayOrder' ? style.headerCellSorted : ''}`}
              onClick={() => handleSort('displayOrder')}>
              Order
              <SortIcon field="displayOrder" sortField={sortField} sortDirection={sortDirection} />
            </div>
            <div className={`${style.headerCell} ${style.cellActions}`} />
          </div>

          {sortedCategories.map(category => (
            <div
              key={category.id}
              className={`${style.tableRow} ${selectedCategory?.id === category.id ? style.selected : ''}`}
              onClick={() => handleRowClick(category)}
              role="row"
              tabIndex={0}>
              <div className={style.checkboxCell}>
                <input
                  type="checkbox"
                  checked={isSelected(category.id)}
                  onChange={() => {}}
                  onClick={e => toggleSelection(category.id, e)}
                  className={style.checkbox}
                  aria-label={`Select ${category.name}`}
                />
              </div>
              <div className={`${style.cell} ${style.cellName}`}>
                <div className={style.nameContent}>
                  <div className={style.categoryIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                    </svg>
                  </div>
                  <span className={style.categoryName}>{category.name}</span>
                </div>
              </div>
              <div className={`${style.cell} ${style.cellSlug}`}>
                <span className={style.slugBadge}>/{category.slug}</span>
              </div>
              <div className={`${style.cell} ${style.cellDescription}`}>
                <span className={style.descriptionText}>{category.description || '-'}</span>
              </div>
              <div className={`${style.cell} ${style.cellStatus}`}>
                <StatusBadge
                  label={category.isActive ? 'Active' : 'Inactive'}
                  variant={getStatusVariant(category.isActive ? 'active' : 'inactive')}
                  size="small"
                />
              </div>
              <div className={`${style.cell} ${style.cellOrder}`}>{category.displayOrder || '-'}</div>
              <div className={`${style.cell} ${style.cellActions}`}>
                <div className={style.menuContainer}>
                  <button
                    type="button"
                    className={style.meatballsButton}
                    onClick={e => toggleMenu(category.id, e)}
                    onMouseDown={e => e.stopPropagation()}
                    aria-label="Open menu">
                    {renderMeatballsIcon()}
                  </button>
                  {renderCategoryMenu(category)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  if (isLoading && categories.length === 0) {
    return (
      <div className={style.container}>
        <AppHeaderBar title="Manage Categories" />
        <div className={style.loadingState}>
          <div className={style.spinner} />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={style.container}>
      <AppHeaderBar title="Manage Categories" />

      <div className={style.mainLayout}>
        {/* Content Area */}
        <div className={`${style.contentArea} ${selectedCategory ? style.contentAreaWithDetail : ''}`}>
          {/* Header with tabs and selection overlay */}
          <ListPageHeader
            tabs={headerTabs}
            activeTab={filterStatus}
            onTabChange={tabId => setFilterStatus(tabId as StatusFilter)}
            selectionCount={selectionCount}
            onClearSelection={clearSelection}
            onDeleteSelected={handleDeleteSelected}
            selectionLabel={{singular: 'category', plural: 'categories'}}
            actions={<PrimaryButton caption="Add Category" icon={ButtonIcon.ADD} onClick={async () => handleOpenCreate()} />}
          />

          {/* Table */}
          {renderTable()}
        </div>

        {/* Detail Panel */}
        {selectedCategory && (
          <div className={style.detailPanel}>
            <div className={style.detailHeader}>
              <h3 className={style.detailTitle}>Category Details</h3>
              <button className={style.closeButton} onClick={() => setSelectedCategory(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className={style.detailBody}>
              {/* Category Card */}
              <div className={style.filenameCard}>
                <div className={style.filenameIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                  </svg>
                </div>
                <div className={style.filenameInfo}>
                  <span className={style.filenameText}>{selectedCategory.name}</span>
                  <span className={style.filenameType}>/{selectedCategory.slug}</span>
                </div>
                <StatusBadge
                  label={selectedCategory.isActive ? 'Active' : 'Inactive'}
                  variant={getStatusVariant(selectedCategory.isActive ? 'active' : 'inactive')}
                  size="small"
                />
              </div>

              {/* Metadata Section - with purple left border */}
              <section className={style.metadataSection}>
                <div className={style.metadataBorder} />
                <div className={style.metadataContent}>
                  <div className={style.metadataTitle}>Information</div>
                  <div className={style.metadataRow}>
                    <span className={style.metadataLabel}>Name</span>
                    <span className={style.metadataValue}>{selectedCategory.name}</span>
                  </div>
                  <div className={style.metadataRow}>
                    <span className={style.metadataLabel}>Slug</span>
                    <span className={style.metadataValueMono}>/{selectedCategory.slug}</span>
                  </div>
                  <div className={style.metadataRow}>
                    <span className={style.metadataLabel}>Status</span>
                    <span className={style.metadataValue}>{selectedCategory.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div className={style.metadataRow}>
                    <span className={style.metadataLabel}>Display Order</span>
                    <span className={style.metadataValue}>{selectedCategory.displayOrder || 'Not set'}</span>
                  </div>
                  {selectedCategory.description && (
                    <div className={style.metadataRow}>
                      <span className={style.metadataLabel}>Description</span>
                      <span className={style.metadataValue}>{selectedCategory.description}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Edit Button */}
              <button className={style.viewFullButton} onClick={() => handleOpenEdit(selectedCategory)}>
                Edit Category
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>

            <div className={style.detailFooter}>
              <button className={style.dangerButton} onClick={() => handleDelete(selectedCategory)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isCreateModalOpen && (
        <div className={style.modalOverlay} onClick={handleCloseModal}>
          <div className={style.modal} onClick={e => e.stopPropagation()}>
            <div className={style.modalHeader}>
              <h3>{editingCategory ? 'Edit Category' : 'Create Category'}</h3>
              <button className={style.modalCloseButton} onClick={handleCloseModal}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={style.formGroup}>
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Meeting Rooms"
                  required
                />
              </div>
              <div className={style.formGroup}>
                <label>Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={e => setFormData({...formData, slug: e.target.value})}
                  placeholder="Auto-generated from name"
                />
                <span className={style.helpText}>URL-friendly identifier. Leave blank to auto-generate.</span>
              </div>
              <div className={style.formGroup}>
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Brief description of this category"
                  rows={3}
                />
              </div>
              <div className={style.modalActions}>
                <button type="button" className={style.secondaryButton} onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className={style.primaryButton} disabled={isCreating || isUpdating}>
                  {isCreating || isUpdating ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modals */}
      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onCancel={deleteModal.closeModal}
        onConfirm={deleteModal.handleConfirm}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteModal.itemName || ''}"? This action cannot be undone.`}
        isLoading={deleteModal.isLoading}
        itemName={deleteModal.itemName || undefined}
      />

      <ConfirmDeleteModal
        isOpen={bulkDelete.isOpen}
        onCancel={bulkDelete.closeModal}
        onConfirm={bulkDelete.handleConfirm}
        title="Delete Categories"
        message={`Are you sure you want to delete {count} categories? This action cannot be undone.`}
        isLoading={bulkDelete.isLoading}
        itemCount={bulkDelete.itemIds.length}
      />
    </div>
  )
}

export default AdminCategoriesPage
