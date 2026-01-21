import React, {ReactNode, useCallback, useRef} from 'react'
import style from './index.module.css'

// ============================================
// Column Definition
// ============================================

export type SortDirection = 'asc' | 'desc'

export interface ColumnDef<T> {
  /** Unique column identifier (used for sorting) */
  id: string
  /** Column header label */
  header: string
  /** Width (CSS value, e.g., '200px', '20%', 'auto') */
  width?: string
  /** Flex grow value */
  flex?: number
  /** Whether this column is sortable */
  sortable?: boolean
  /** Cell renderer */
  cell: (item: T) => ReactNode
  /** Custom header renderer (overrides default) */
  headerRenderer?: () => ReactNode
}

// ============================================
// DataTable Props
// ============================================

export interface DataTableProps<T> {
  /** Data items to display */
  data: T[]
  /** Column definitions */
  columns: ColumnDef<T>[]
  /** Function to get unique ID from item */
  getItemId: (item: T) => string

  /** Enable row selection */
  selectable?: boolean
  /** Set of selected item IDs */
  selectedIds?: Set<string>
  /** Handler for toggling row selection */
  onToggleSelection?: (item: T) => void
  /** Handler for select all */
  onSelectAll?: (checked: boolean) => void

  /** Current sort column ID */
  sortColumn?: string
  /** Current sort direction */
  sortDirection?: SortDirection
  /** Handler for sort change */
  onSort?: (columnId: string) => void

  /** Currently highlighted/active item ID */
  activeItemId?: string
  /** Handler for row click */
  onRowClick?: (item: T) => void

  /** Row actions renderer (meatballs menu) */
  rowActions?: (item: T) => ReactNode

  /** Empty state content */
  emptyState?: ReactNode

  /** Additional class name */
  className?: string

  /** Whether to show checkboxes only on hover (default: true) */
  hideCheckboxesUntilHover?: boolean
}

// ============================================
// DataTable Component
// ============================================

export function DataTable<T>({
  data,
  columns,
  getItemId,
  selectable = false,
  selectedIds = new Set(),
  onToggleSelection,
  onSelectAll,
  sortColumn,
  sortDirection,
  onSort,
  activeItemId,
  onRowClick,
  rowActions,
  emptyState,
  className,
  hideCheckboxesUntilHover = true,
}: DataTableProps<T>) {
  const selectAllRef = useRef<HTMLInputElement>(null)

  // Update indeterminate state
  const setSelectAllRef = useCallback((input: HTMLInputElement | null) => {
    if (input) {
      const allSelected = data.length > 0 && selectedIds.size === data.length
      const someSelected = selectedIds.size > 0 && selectedIds.size < data.length
      input.indeterminate = someSelected
      input.checked = allSelected
    }
  }, [data.length, selectedIds.size])

  const hasSelection = selectedIds.size > 0

  // Handle checkbox click (stop propagation to prevent row click)
  const handleCheckboxClick = (item: T, e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleSelection?.(item)
  }

  // Render sort indicator
  const renderSortIndicator = (columnId: string) => {
    if (sortColumn !== columnId) return null
    return (
      <span className={style.sortIcon}>
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    )
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>
  }

  const tableClasses = [
    style.table,
    hasSelection ? style.tableWithSelections : '',
    hideCheckboxesUntilHover ? style.hideCheckboxesUntilHover : '',
    className || '',
  ].filter(Boolean).join(' ')

  return (
    <div className={tableClasses}>
      {/* Header */}
      <div className={style.tableHeader}>
        {selectable && (
          <div className={style.checkboxCell}>
            <input
              type="checkbox"
              className={style.checkbox}
              ref={setSelectAllRef}
              onChange={(e) => onSelectAll?.(e.target.checked)}
              aria-label="Select all"
            />
          </div>
        )}

        {columns.map(column => {
          const isSorted = sortColumn === column.id
          const headerClasses = [
            style.headerCell,
            column.sortable ? style.headerCellSortable : '',
            isSorted ? style.headerCellSorted : '',
          ].filter(Boolean).join(' ')

          const cellStyle: React.CSSProperties = {}
          if (column.width) cellStyle.width = column.width
          if (column.flex) cellStyle.flex = column.flex

          return (
            <div
              key={column.id}
              className={headerClasses}
              style={cellStyle}
              onClick={column.sortable ? () => onSort?.(column.id) : undefined}
              role="columnheader"
              aria-sort={isSorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
            >
              {column.headerRenderer ? column.headerRenderer() : column.header}
              {column.sortable && renderSortIndicator(column.id)}
            </div>
          )
        })}

        {rowActions && <div className={`${style.headerCell} ${style.actionsCell}`} />}
      </div>

      {/* Body */}
      {data.map(item => {
        const itemId = getItemId(item)
        const isSelected = selectedIds.has(itemId)
        const isActive = activeItemId === itemId

        const rowClasses = [
          style.tableRow,
          isActive ? style.tableRowActive : '',
          isSelected ? style.tableRowSelected : '',
        ].filter(Boolean).join(' ')

        return (
          <div
            key={itemId}
            className={rowClasses}
            onClick={() => onRowClick?.(item)}
            role="row"
            tabIndex={0}
          >
            {selectable && (
              <div className={style.checkboxCell}>
                <input
                  type="checkbox"
                  className={style.checkbox}
                  checked={isSelected}
                  onChange={() => {}}
                  onClick={(e) => handleCheckboxClick(item, e)}
                  aria-label={`Select row`}
                />
              </div>
            )}

            {columns.map(column => {
              const cellStyle: React.CSSProperties = {}
              if (column.width) cellStyle.width = column.width
              if (column.flex) cellStyle.flex = column.flex

              return (
                <div key={column.id} className={style.cell} style={cellStyle}>
                  {column.cell(item)}
                </div>
              )
            })}

            {rowActions && (
              <div className={`${style.cell} ${style.actionsCell}`}>
                {rowActions(item)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default DataTable
