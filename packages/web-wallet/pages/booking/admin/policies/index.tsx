import React, {FC, ReactElement, useEffect, useState, useMemo, useCallback} from 'react'
import {useCreate, useDeleteMany, useList, useUpdate} from '@refinedev/core'
import {useNavigate} from 'react-router-dom'
import {PrimaryButton} from '@sphereon/ui-components.ssi-react'
import {ButtonIcon} from '@sphereon/ui-components.core'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import StatusBadge, {getStatusVariant} from '@components/badges/StatusBadge'
import {ListPageHeader, TabItem} from '@components/tables'
import ConfirmDeleteModal, {useBulkDelete, useConfirmDelete} from '@components/modals/ConfirmDeleteModal'
import {useListPageState, createSortComparator} from '@/src/hooks/useListPageState'
import {BookingDataResource, UsagePolicy} from '@typings'
import style from './index.module.css'

type SortField = 'name' | 'slotDurationMinutes' | 'maxAdvanceBookingDays'
type StatusFilter = 'all' | 'default' | 'custom'

const STATUS_TABS: {value: StatusFilter; label: string}[] = [
  {value: 'all', label: 'All'},
  {value: 'default', label: 'Default'},
  {value: 'custom', label: 'Custom'},
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

const AdminPoliciesPage: FC = (): ReactElement => {
  const navigate = useNavigate()
  const [selectedPolicy, setSelectedPolicy] = useState<UsagePolicy | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<UsagePolicy | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    slotDurationMinutes: 30,
    minDurationMinutes: 30,
    maxDurationMinutes: 480,
    maxAdvanceBookingDays: 30,
    allowSameDayBooking: true,
  })
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')

  const {data: policiesData, isLoading, refetch} = useList<UsagePolicy>({
    resource: BookingDataResource.POLICIES,
    pagination: {pageSize: 100},
  })

  const {mutate: createPolicy, isLoading: isCreating} = useCreate()
  const {mutate: updatePolicy, isLoading: isUpdating} = useUpdate()
  const {mutate: deleteMany} = useDeleteMany()

  const policies = policiesData?.data ?? []

  // Filter policies by status
  const filteredPolicies = useMemo(() => {
    if (filterStatus === 'all') return policies
    return policies.filter(p => (filterStatus === 'default' ? p.isDefault : !p.isDefault))
  }, [policies, filterStatus])

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
    getItemId: (item: UsagePolicy) => item.id,
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
            resource: BookingDataResource.POLICIES,
            ids: [itemId],
          },
          {
            onSuccess: () => {
              setSelectedPolicy(null)
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
            resource: BookingDataResource.POLICIES,
            ids: itemIds,
          },
          {
            onSuccess: () => {
              setSelectedPolicy(null)
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

  const getSortValue = (item: UsagePolicy, column: SortField): string | number | null => {
    switch (column) {
      case 'name':
        return item.name
      case 'slotDurationMinutes':
        return item.slotDurationMinutes
      case 'maxAdvanceBookingDays':
        return item.maxAdvanceBookingDays
      default:
        return null
    }
  }

  const sortedPolicies = [...filteredPolicies].sort(createSortComparator(sortField, sortDirection, getSortValue))

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      description: '',
      slotDurationMinutes: 30,
      minDurationMinutes: 30,
      maxDurationMinutes: 480,
      maxAdvanceBookingDays: 30,
      allowSameDayBooking: true,
    })
    setEditingPolicy(null)
    setIsCreateModalOpen(true)
  }

  const handleOpenEdit = (policy: UsagePolicy) => {
    setFormData({
      name: policy.name,
      description: policy.description || '',
      slotDurationMinutes: policy.slotDurationMinutes,
      minDurationMinutes: policy.minDurationMinutes || 30,
      maxDurationMinutes: policy.maxDurationMinutes || 480,
      maxAdvanceBookingDays: policy.maxAdvanceBookingDays,
      allowSameDayBooking: policy.allowSameDayBooking,
    })
    setEditingPolicy(policy)
    setIsCreateModalOpen(true)
    closeMenu()
  }

  const handleCloseModal = () => {
    setIsCreateModalOpen(false)
    setEditingPolicy(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingPolicy) {
      updatePolicy(
        {
          resource: BookingDataResource.POLICIES,
          id: editingPolicy.id,
          values: formData,
        },
        {
          onSuccess: () => {
            handleCloseModal()
            refetch()
          },
        },
      )
    } else {
      createPolicy(
        {
          resource: BookingDataResource.POLICIES,
          values: {...formData, isDefault: policies.length === 0},
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

  const handleRowClick = (policy: UsagePolicy) => {
    setSelectedPolicy(selectedPolicy?.id === policy.id ? null : policy)
  }

  const handleViewDetails = useCallback((policy: UsagePolicy) => {
    navigate(`/booking/admin/policies/${policy.id}`)
  }, [navigate])

  const handleDelete = useCallback(
    (policy: UsagePolicy) => {
      deleteModal.openModal(policy.id, policy.name)
      closeMenu()
    },
    [deleteModal, closeMenu],
  )

  const handleDeleteSelected = useCallback((): void => {
    if (selectionCount === 0) return
    bulkDelete.openModal(Array.from(selectedIds))
  }, [selectionCount, selectedIds, bulkDelete])

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  // Get status count for tabs
  const getStatusCount = useCallback(
    (status: StatusFilter): number => {
      if (status === 'all') return policies.length
      return policies.filter(p => (status === 'default' ? p.isDefault : !p.isDefault)).length
    },
    [policies],
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
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
          </svg>
        ) : tab.value === 'default' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        ),
    }))
  }, [getStatusCount])

  const handleMenuAction = useCallback(
    async (action: string, policy: UsagePolicy, e: React.MouseEvent): Promise<void> => {
      e.stopPropagation()
      closeMenu()

      switch (action) {
        case 'details':
          handleViewDetails(policy)
          break
        case 'edit':
          handleOpenEdit(policy)
          break
        case 'delete':
          handleDelete(policy)
          break
      }
    },
    [closeMenu, handleDelete, handleViewDetails],
  )

  // Render meatballs icon
  const renderMeatballsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  )

  // Render menu for policy
  const renderPolicyMenu = (policy: UsagePolicy) => {
    if (openMenuId !== policy.id || !menuPosition) return null

    return (
      <>
        <div className={style.menuBackdrop} onClick={closeMenu} />
        <div className={style.menuDropdown} style={{top: menuPosition.top, left: menuPosition.left}}>
          <button className={style.menuItem} onClick={e => handleMenuAction('details', policy, e)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            Details
          </button>
          <button className={style.menuItem} onClick={e => handleMenuAction('edit', policy, e)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </button>
          {!policy.isDefault && (
            <>
              <div className={style.menuDivider} />
              <button className={`${style.menuItem} ${style.menuItemDanger}`} onClick={e => handleMenuAction('delete', policy, e)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete
              </button>
            </>
          )}
        </div>
      </>
    )
  }

  // Render table
  const renderTable = () => (
    <div className={style.tableContainer}>
      {sortedPolicies.length === 0 ? (
        <div className={style.emptyState}>
          <div className={style.emptyStateIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
            </svg>
          </div>
          <div className={style.emptyStateTitle}>No Policies Yet</div>
          <div className={style.emptyStateDescription}>Create a policy to define booking rules and constraints.</div>
          <button className={style.emptyStateButton} onClick={handleOpenCreate}>
            Add Policy
          </button>
        </div>
      ) : (
        <div className={`${style.table} ${selectionCount > 0 ? style.tableWithSelections : ''}`}>
          <div className={style.tableHeader}>
            <div className={style.checkboxCell}>
              <input
                type="checkbox"
                className={style.checkbox}
                checked={isAllSelected(sortedPolicies)}
                ref={input => {
                  if (input) {
                    input.indeterminate = isIndeterminate(sortedPolicies)
                  }
                }}
                onChange={e => handleSelectAllItems(sortedPolicies, e.target.checked)}
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
              className={`${style.headerCell} ${style.cellSlot} ${style.sortable} ${sortField === 'slotDurationMinutes' ? style.headerCellSorted : ''}`}
              onClick={() => handleSort('slotDurationMinutes')}>
              Slot Interval
              <SortIcon field="slotDurationMinutes" sortField={sortField} sortDirection={sortDirection} />
            </div>
            <div className={`${style.headerCell} ${style.cellDuration}`}>Duration</div>
            <div
              className={`${style.headerCell} ${style.cellAdvance} ${style.sortable} ${sortField === 'maxAdvanceBookingDays' ? style.headerCellSorted : ''}`}
              onClick={() => handleSort('maxAdvanceBookingDays')}>
              Advance
              <SortIcon field="maxAdvanceBookingDays" sortField={sortField} sortDirection={sortDirection} />
            </div>
            <div className={`${style.headerCell} ${style.cellSameDay}`}>Same Day</div>
            <div className={`${style.headerCell} ${style.cellStatus}`}>Status</div>
            <div className={`${style.headerCell} ${style.cellActions}`} />
          </div>

          {sortedPolicies.map(policy => (
            <div
              key={policy.id}
              className={`${style.tableRow} ${selectedPolicy?.id === policy.id ? style.selected : ''}`}
              onClick={() => handleRowClick(policy)}
              onDoubleClick={() => handleViewDetails(policy)}
              role="row"
              tabIndex={0}>
              <div className={style.checkboxCell}>
                <input
                  type="checkbox"
                  checked={isSelected(policy.id)}
                  onChange={() => {}}
                  onClick={e => toggleSelection(policy.id, e)}
                  className={style.checkbox}
                  aria-label={`Select ${policy.name}`}
                />
              </div>
              <div className={`${style.cell} ${style.cellName}`}>
                <div className={style.nameContent}>
                  <div className={style.policyIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                    </svg>
                  </div>
                  <div className={style.nameText}>
                    <span className={style.policyName}>{policy.name}</span>
                    {policy.isDefault && <span className={style.defaultBadge}>Default</span>}
                  </div>
                </div>
              </div>
              <div className={`${style.cell} ${style.cellSlot}`}>{formatDuration(policy.slotDurationMinutes)}</div>
              <div className={`${style.cell} ${style.cellDuration}`}>
                {formatDuration(policy.minDurationMinutes || 30)} - {formatDuration(policy.maxDurationMinutes || 480)}
              </div>
              <div className={`${style.cell} ${style.cellAdvance}`}>{policy.maxAdvanceBookingDays} days</div>
              <div className={`${style.cell} ${style.cellSameDay}`}>
                <StatusBadge
                  label={policy.allowSameDayBooking ? 'Yes' : 'No'}
                  variant={getStatusVariant(policy.allowSameDayBooking ? 'active' : 'inactive')}
                  size="small"
                />
              </div>
              <div className={`${style.cell} ${style.cellStatus}`}>
                <StatusBadge
                  label={policy.isDefault ? 'Default' : 'Custom'}
                  variant={getStatusVariant(policy.isDefault ? 'active' : 'pending')}
                  size="small"
                />
              </div>
              <div className={`${style.cell} ${style.cellActions}`}>
                <div className={style.menuContainer}>
                  <button
                    type="button"
                    className={style.meatballsButton}
                    onClick={e => toggleMenu(policy.id, e)}
                    onMouseDown={e => e.stopPropagation()}
                    aria-label="Open menu">
                    {renderMeatballsIcon()}
                  </button>
                  {renderPolicyMenu(policy)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  if (isLoading && policies.length === 0) {
    return (
      <div className={style.container}>
        <AppHeaderBar title="Manage Policies" />
        <div className={style.loadingState}>
          <div className={style.spinner} />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={style.container}>
      <AppHeaderBar title="Manage Policies" />

      <div className={style.mainLayout}>
        {/* Content Area */}
        <div className={`${style.contentArea} ${selectedPolicy ? style.contentAreaWithDetail : ''}`}>
          {/* Header with tabs and selection overlay */}
          <ListPageHeader
            tabs={headerTabs}
            activeTab={filterStatus}
            onTabChange={tabId => setFilterStatus(tabId as StatusFilter)}
            selectionCount={selectionCount}
            onClearSelection={clearSelection}
            onDeleteSelected={handleDeleteSelected}
            selectionLabel={{singular: 'policy', plural: 'policies'}}
            actions={<PrimaryButton caption="Add Policy" icon={ButtonIcon.ADD} onClick={async () => handleOpenCreate()} />}
          />

          {/* Table */}
          {renderTable()}
        </div>

        {/* Detail Panel */}
        {selectedPolicy && (
          <div className={style.detailPanel}>
            <div className={style.detailHeader}>
              <h3 className={style.detailTitle}>Policy Details</h3>
              <button className={style.closeButton} onClick={() => setSelectedPolicy(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className={style.detailBody}>
              {/* Policy Card */}
              <div className={style.filenameCard}>
                <div className={style.filenameIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                  </svg>
                </div>
                <div className={style.filenameInfo}>
                  <span className={style.filenameText}>{selectedPolicy.name}</span>
                  <span className={style.filenameType}>{selectedPolicy.isDefault ? 'Default Policy' : 'Custom Policy'}</span>
                </div>
                <StatusBadge
                  label={selectedPolicy.isDefault ? 'Default' : 'Custom'}
                  variant={getStatusVariant(selectedPolicy.isDefault ? 'active' : 'pending')}
                  size="small"
                />
              </div>

              {/* Metadata Section - with purple left border */}
              <section className={style.metadataSection}>
                <div className={style.metadataBorder} />
                <div className={style.metadataContent}>
                  <div className={style.metadataTitle}>Booking Rules</div>
                  <div className={style.metadataRow}>
                    <span className={style.metadataLabel}>Slot Interval</span>
                    <span className={style.metadataValue}>{formatDuration(selectedPolicy.slotDurationMinutes)}</span>
                  </div>
                  <div className={style.metadataRow}>
                    <span className={style.metadataLabel}>Min Duration</span>
                    <span className={style.metadataValue}>{formatDuration(selectedPolicy.minDurationMinutes || 30)}</span>
                  </div>
                  <div className={style.metadataRow}>
                    <span className={style.metadataLabel}>Max Duration</span>
                    <span className={style.metadataValue}>{formatDuration(selectedPolicy.maxDurationMinutes || 480)}</span>
                  </div>
                  <div className={style.metadataRow}>
                    <span className={style.metadataLabel}>Advance Booking</span>
                    <span className={style.metadataValue}>{selectedPolicy.maxAdvanceBookingDays} days</span>
                  </div>
                  <div className={style.metadataRow}>
                    <span className={style.metadataLabel}>Same Day Booking</span>
                    <span className={style.metadataValue}>{selectedPolicy.allowSameDayBooking ? 'Allowed' : 'Not Allowed'}</span>
                  </div>
                  {selectedPolicy.description && (
                    <div className={style.metadataRow}>
                      <span className={style.metadataLabel}>Description</span>
                      <span className={style.metadataValue}>{selectedPolicy.description}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* View Full Details Button */}
              <button className={style.viewFullButton} onClick={() => handleViewDetails(selectedPolicy)}>
                View Full Details
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </button>
            </div>

            {!selectedPolicy.isDefault && (
              <div className={style.detailFooter}>
                <button className={style.dangerButton} onClick={() => handleDelete(selectedPolicy)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isCreateModalOpen && (
        <div className={style.modalOverlay} onClick={handleCloseModal}>
          <div className={style.modal} onClick={e => e.stopPropagation()}>
            <div className={style.modalHeader}>
              <h3>{editingPolicy ? 'Edit Policy' : 'Create Policy'}</h3>
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
                  placeholder="e.g., Standard Booking"
                  required
                />
              </div>
              <div className={style.formGroup}>
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Brief description of this policy"
                  rows={2}
                />
              </div>
              <div className={style.formRow}>
                <div className={style.formGroup}>
                  <label>Slot Interval (minutes)</label>
                  <input
                    type="number"
                    value={formData.slotDurationMinutes}
                    onChange={e => setFormData({...formData, slotDurationMinutes: parseInt(e.target.value) || 30})}
                    min={5}
                    max={120}
                  />
                </div>
                <div className={style.formGroup}>
                  <label>Max Advance (days)</label>
                  <input
                    type="number"
                    value={formData.maxAdvanceBookingDays}
                    onChange={e => setFormData({...formData, maxAdvanceBookingDays: parseInt(e.target.value) || 30})}
                    min={1}
                    max={365}
                  />
                </div>
              </div>
              <div className={style.formRow}>
                <div className={style.formGroup}>
                  <label>Min Duration (minutes)</label>
                  <input
                    type="number"
                    value={formData.minDurationMinutes}
                    onChange={e => setFormData({...formData, minDurationMinutes: parseInt(e.target.value) || 30})}
                    min={5}
                  />
                </div>
                <div className={style.formGroup}>
                  <label>Max Duration (minutes)</label>
                  <input
                    type="number"
                    value={formData.maxDurationMinutes}
                    onChange={e => setFormData({...formData, maxDurationMinutes: parseInt(e.target.value) || 480})}
                    min={formData.minDurationMinutes}
                  />
                </div>
              </div>
              <div className={style.formGroup}>
                <label className={style.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.allowSameDayBooking}
                    onChange={e => setFormData({...formData, allowSameDayBooking: e.target.checked})}
                  />
                  <span>Allow same-day bookings</span>
                </label>
              </div>
              <div className={style.modalActions}>
                <button type="button" className={style.secondaryButton} onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className={style.primaryButton} disabled={isCreating || isUpdating}>
                  {isCreating || isUpdating ? 'Saving...' : editingPolicy ? 'Update' : 'Create'}
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
        title="Delete Policy"
        message={`Are you sure you want to delete "${deleteModal.itemName || ''}"? This action cannot be undone.`}
        isLoading={deleteModal.isLoading}
        itemName={deleteModal.itemName || undefined}
      />

      <ConfirmDeleteModal
        isOpen={bulkDelete.isOpen}
        onCancel={bulkDelete.closeModal}
        onConfirm={bulkDelete.handleConfirm}
        title="Delete Policies"
        message={`Are you sure you want to delete {count} policies? This action cannot be undone.`}
        isLoading={bulkDelete.isLoading}
        itemCount={bulkDelete.itemIds.length}
      />
    </div>
  )
}

export default AdminPoliciesPage
