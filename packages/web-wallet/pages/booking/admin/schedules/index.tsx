import React, {FC, ReactElement, useState, useMemo, useCallback} from 'react'
import {useList, useDelete, HttpError} from '@refinedev/core'
import {useNavigate} from 'react-router-dom'
import {PrimaryButton} from '@sphereon/ui-components.ssi-react'
import {ButtonIcon} from '@sphereon/ui-components.core'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import ConfirmDeleteModal, {useConfirmDelete, useBulkDelete} from '@components/modals/ConfirmDeleteModal'
import {useListPageState} from '@/src/hooks/useListPageState'
import {BookingDataResource, ScheduleSet, ScheduleRule, DayOfWeek} from '@typings'
import style from './index.module.css'

type SortColumn = 'name' | 'priority' | 'rules' | 'created'
type SortDirection = 'asc' | 'desc'

const DAYS_OF_WEEK: {value: DayOfWeek; label: string; short: string}[] = [
  {value: 1, label: 'Monday', short: 'Mon'},
  {value: 2, label: 'Tuesday', short: 'Tue'},
  {value: 3, label: 'Wednesday', short: 'Wed'},
  {value: 4, label: 'Thursday', short: 'Thu'},
  {value: 5, label: 'Friday', short: 'Fri'},
  {value: 6, label: 'Saturday', short: 'Sat'},
  {value: 7, label: 'Sunday', short: 'Sun'},
]

const AdminSchedulesPage: FC = (): ReactElement => {
  const navigate = useNavigate()
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleSet | null>(null)

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
    getItemId: (item: ScheduleSet) => item.id,
  })

  const {data: scheduleSetsData, isLoading, isError, refetch} = useList<ScheduleSet, HttpError>({
    resource: BookingDataResource.SCHEDULE_SETS,
    pagination: {pageSize: 100},
  })

  const {mutate: deleteScheduleSet} = useDelete()

  const scheduleSets = scheduleSetsData?.data ?? []

  // Sort schedule sets
  const sortedScheduleSets = useMemo(() => {
    const getSortValue = (scheduleSet: ScheduleSet, column: SortColumn): string | number => {
      switch (column) {
        case 'name':
          return scheduleSet.name.toLowerCase()
        case 'priority':
          return scheduleSet.priority
        case 'rules':
          return scheduleSet.rules.length
        case 'created':
          return new Date(scheduleSet.createdAt).getTime()
        default:
          return ''
      }
    }

    return [...scheduleSets].sort((a, b) => {
      const aVal = getSortValue(a, sortColumn)
      const bVal = getSortValue(b, sortColumn)

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [scheduleSets, sortColumn, sortDirection])

  // Format date
  const formatDate = (dateStr: string | Date): string => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  // Get a preview of schedule rules
  const getSchedulePreview = (rules: ScheduleRule[]): string => {
    if (!rules || rules.length === 0) return 'No rules defined'

    const dayRules = rules.filter(r => r.dayOfWeek && !r.isClosed)
    if (dayRules.length === 0) {
      const closedRules = rules.filter(r => r.isClosed)
      if (closedRules.length > 0) return `${closedRules.length} closure rule(s)`
      return 'No time rules'
    }

    const groups: string[] = []
    let currentGroup: {days: DayOfWeek[]; time: string} | null = null

    dayRules.sort((a, b) => (a.dayOfWeek || 0) - (b.dayOfWeek || 0))

    for (const rule of dayRules) {
      const timeStr = `${rule.startTime}-${rule.endTime}`
      if (currentGroup && currentGroup.time === timeStr &&
          rule.dayOfWeek === (currentGroup.days[currentGroup.days.length - 1] + 1)) {
        currentGroup.days.push(rule.dayOfWeek!)
      } else {
        if (currentGroup) {
          groups.push(formatDayGroup(currentGroup))
        }
        currentGroup = {days: [rule.dayOfWeek!], time: timeStr}
      }
    }
    if (currentGroup) {
      groups.push(formatDayGroup(currentGroup))
    }

    return groups.slice(0, 2).join(', ') + (groups.length > 2 ? ` +${groups.length - 2} more` : '')
  }

  const formatDayGroup = (group: {days: DayOfWeek[]; time: string}): string => {
    const getShortDay = (d: DayOfWeek) => DAYS_OF_WEEK.find(day => day.value === d)?.short || ''
    if (group.days.length === 1) {
      return `${getShortDay(group.days[0])} ${group.time}`
    }
    return `${getShortDay(group.days[0])}-${getShortDay(group.days[group.days.length - 1])} ${group.time}`
  }

  // Delete confirmation hooks
  const singleDelete = useConfirmDelete({
    onConfirm: async (id: string) => {
      return new Promise<void>((resolve, reject) => {
        deleteScheduleSet(
          {
            resource: BookingDataResource.SCHEDULE_SETS,
            id: id,
          },
          {
            onSuccess: () => {
              if (selectedSchedule?.id === id) {
                setSelectedSchedule(null)
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
      console.error('Failed to delete schedule:', err)
    },
  })

  const bulkDelete = useBulkDelete({
    onConfirm: async (ids: string[]) => {
      for (const id of ids) {
        await new Promise<void>((resolve, reject) => {
          deleteScheduleSet(
            {
              resource: BookingDataResource.SCHEDULE_SETS,
              id: id,
            },
            {
              onSuccess: () => {
                if (selectedSchedule?.id === id) {
                  setSelectedSchedule(null)
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
      console.error('Failed to delete schedules:', err)
    },
  })

  const handleDeleteSelected = useCallback((): void => {
    if (selectionCount === 0) return
    bulkDelete.openModal(Array.from(selectedIds))
  }, [selectionCount, selectedIds, bulkDelete])

  const handleViewDetails = useCallback((scheduleSet: ScheduleSet): void => {
    navigate(`/booking/admin/schedules/${scheduleSet.id}`)
  }, [navigate])

  const handleCreate = useCallback(async (): Promise<void> => {
    navigate('/booking/admin/schedules/create')
  }, [navigate])

  const handleAction = useCallback(
    (action: string, scheduleSet: ScheduleSet, e: React.MouseEvent): void => {
      e.stopPropagation()
      closeMenu()

      switch (action) {
        case 'view':
          handleViewDetails(scheduleSet)
          break
        case 'delete':
          singleDelete.openModal(scheduleSet.id, scheduleSet.name)
          break
      }
    },
    [closeMenu, handleViewDetails, singleDelete]
  )

  const handleDelete = useCallback((scheduleSet: ScheduleSet): void => {
    singleDelete.openModal(scheduleSet.id, scheduleSet.name)
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
  const renderMenu = (scheduleSet: ScheduleSet) => {
    if (openMenuId !== scheduleSet.id || !menuPosition) return null

    return (
      <>
        <div className={style.menuBackdrop} onClick={closeMenu} />
        <div className={style.menuDropdown} style={{top: menuPosition.top, left: menuPosition.left}}>
          <button className={style.menuItem} onClick={(e) => handleAction('view', scheduleSet, e)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            View Details
          </button>
          <div className={style.menuDivider} />
          <button
            className={`${style.menuItem} ${style.menuItemDanger}`}
            onClick={(e) => handleAction('delete', scheduleSet, e)}
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
    if (sortedScheduleSets.length === 0) {
      return (
        <div className={style.emptyState}>
          <div className={style.emptyStateIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>
          <div className={style.emptyStateTitle}>No Schedules</div>
          <div className={style.emptyStateDescription}>
            Create reusable schedule templates for your resources.
          </div>
          <button className={style.emptyStateButton} onClick={handleCreate}>
            Create Schedule
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
              checked={isAllSelected(sortedScheduleSets)}
              ref={(input) => {
                if (input) {
                  input.indeterminate = isIndeterminate(sortedScheduleSets)
                }
              }}
              onChange={(e) => handleSelectAllItems(sortedScheduleSets, e.target.checked)}
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
            className={`${style.headerCell} ${style.headerCellSortable} ${style.cellRules} ${sortColumn === 'rules' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('rules')}
            role="columnheader"
          >
            Rules
            <SortIcon field="rules" sortColumn={sortColumn} sortDirection={sortDirection} />
          </div>
          <div
            className={`${style.headerCell} ${style.headerCellSortable} ${style.cellPriority} ${sortColumn === 'priority' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('priority')}
            role="columnheader"
          >
            Priority
            <SortIcon field="priority" sortColumn={sortColumn} sortDirection={sortDirection} />
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

        {sortedScheduleSets.map(scheduleSet => (
          <div
            key={scheduleSet.id}
            className={`${style.tableRow} ${selectedSchedule?.id === scheduleSet.id ? style.selected : ''}`}
            onClick={() => setSelectedSchedule(scheduleSet)}
            onDoubleClick={() => handleViewDetails(scheduleSet)}
            role="row"
            tabIndex={0}
          >
            <div className={style.checkboxCell}>
              <input
                type="checkbox"
                checked={isSelected(scheduleSet.id)}
                onChange={() => {}}
                onClick={(e) => toggleSelection(scheduleSet.id, e)}
                className={style.checkbox}
                aria-label={`Select ${scheduleSet.name}`}
              />
            </div>
            <div className={`${style.cell} ${style.cellName}`}>
              <div className={style.scheduleSetInfo}>
                <div className={style.scheduleSetAvatar}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                </div>
                <div className={style.scheduleSetNameWrapper}>
                  <span className={style.scheduleSetName}>{scheduleSet.name}</span>
                  {scheduleSet.includedSetIds.length > 0 && (
                    <span className={style.compositeBadge}>
                      Includes {scheduleSet.includedSetIds.length} set(s)
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className={`${style.cell} ${style.cellRules}`}>
              <span className={style.rulesPreview}>{getSchedulePreview(scheduleSet.rules)}</span>
            </div>
            <div className={`${style.cell} ${style.cellPriority}`}>
              <span className={style.priorityBadge}>Priority {scheduleSet.priority}</span>
            </div>
            <div className={`${style.cell} ${style.cellCreated}`}>
              {formatDate(scheduleSet.createdAt)}
            </div>
            <div className={`${style.cell} ${style.cellActions}`}>
              <div className={style.menuContainer}>
                <button
                  type="button"
                  className={style.meatballsButton}
                  onClick={(e) => toggleMenu(scheduleSet.id, e)}
                  onMouseDown={(e) => e.stopPropagation()}
                  aria-label="Open menu"
                >
                  {renderMeatballsIcon()}
                </button>
                {renderMenu(scheduleSet)}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Render detail panel
  const renderDetailPanel = () => {
    if (!selectedSchedule) return null

    return (
      <div className={style.detailPanel}>
        <div className={style.detailHeader}>
          <h2 className={style.detailTitle}>Schedule Details</h2>
          <button className={style.closeButton} onClick={() => setSelectedSchedule(null)} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={style.detailBody}>
          {/* Schedule Set Card */}
          <div className={style.scheduleSetCard}>
            <div className={style.scheduleSetCardAvatar}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <div className={style.scheduleSetCardInfo}>
              <span className={style.scheduleSetCardName}>{selectedSchedule.name}</span>
              <div className={style.scheduleSetCardSubtitle}>
                <span className={style.priorityBadge}>Priority {selectedSchedule.priority}</span>
                {selectedSchedule.includedSetIds.length > 0 && (
                  <span className={style.compositeBadge}>
                    Composite ({selectedSchedule.includedSetIds.length} sets)
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
              {selectedSchedule.description && (
                <div className={style.metadataRow}>
                  <span className={style.metadataLabel}>Description</span>
                  <span className={style.metadataValue}>{selectedSchedule.description}</span>
                </div>
              )}
              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>Rules</span>
                <span className={style.metadataValue}>{selectedSchedule.rules.length} rule(s)</span>
              </div>
              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>Schedule</span>
                <span className={style.metadataValue}>{getSchedulePreview(selectedSchedule.rules)}</span>
              </div>
              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>Created</span>
                <span className={style.metadataValue}>{formatDate(selectedSchedule.createdAt)}</span>
              </div>
              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>Updated</span>
                <span className={style.metadataValue}>{formatDate(selectedSchedule.updatedAt)}</span>
              </div>
            </div>
          </div>

          {/* View Full Details Button */}
          <button className={style.viewFullButton} onClick={() => handleViewDetails(selectedSchedule)}>
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
          <button className={style.deleteButton} onClick={() => handleDelete(selectedSchedule)}>
            Delete Schedule
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={style.container}>
      <AppHeaderBar title="Manage Schedules" />

      <div className={style.mainLayout}>
        {/* Content Area */}
        <div className={`${style.contentArea} ${selectedSchedule ? style.contentAreaWithDetail : ''}`}>
          {/* Tab Navigation with Selection Overlay */}
          <div className={style.tabNavigationWrapper}>
            <div className={style.tabNavigation}>
              <div className={style.pageTitle}>Schedules</div>
              <div className={style.tabSpacer} />
              <div className={style.actionButtonContainer}>
                <PrimaryButton
                  caption="Create Schedule"
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
              Failed to load schedules
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
        title="Delete Schedule"
        message='Are you sure you want to delete "{name}"? This will remove it from any assignments.'
        itemName={singleDelete.itemName || undefined}
        onCancel={singleDelete.closeModal}
        onConfirm={singleDelete.handleConfirm}
        isLoading={singleDelete.isLoading}
        cancelText="Cancel"
        confirmText="Delete"
      />
      <ConfirmDeleteModal
        isOpen={bulkDelete.isOpen}
        title="Delete Schedules"
        message="Are you sure you want to delete {count} schedule(s)? This will remove them from any assignments."
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

export default AdminSchedulesPage
