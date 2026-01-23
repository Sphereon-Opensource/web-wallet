import {useState, useCallback, useMemo} from 'react'
import {ContextMenuPosition} from '@components/menus/ContextMenu'

/**
 * Configuration options for useListPageState hook
 */
export interface UseListPageStateOptions<TSortColumn extends string> {
  /** Default column to sort by */
  defaultSortColumn: TSortColumn
  /** Default sort direction */
  defaultSortDirection?: 'asc' | 'desc'
  /** Function to get unique ID from item */
  getItemId: (item: any) => string
  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: Set<string>) => void
}

/**
 * Return type for useListPageState hook
 */
export interface UseListPageStateReturn<TSortColumn extends string> {
  // Selection state
  selectedIds: Set<string>
  hasSelection: boolean
  selectionCount: number
  isSelected: (id: string) => boolean
  isAllSelected: (items: any[]) => boolean
  isIndeterminate: (items: any[]) => boolean
  toggleSelection: (id: string, e?: React.MouseEvent) => void
  selectAll: (items: any[]) => void
  clearSelection: () => void
  handleSelectAll: (items: any[], checked: boolean) => void

  // Sorting state
  sortColumn: TSortColumn
  sortDirection: 'asc' | 'desc'
  handleSort: (column: TSortColumn) => void
  getSortIconState: (column: TSortColumn) => 'asc' | 'desc' | null

  // Context menu state
  openMenuId: string | null
  menuPosition: ContextMenuPosition | null
  isMenuOpen: (id: string) => boolean
  toggleMenu: (id: string, e: React.MouseEvent<HTMLButtonElement>) => void
  closeMenu: () => void
}

/**
 * useListPageState - Combines common list page state management patterns
 *
 * This hook manages:
 * - Row selection (single/multi-select, select all)
 * - Column sorting (sortable columns with direction toggle)
 * - Context menu positioning (meatball menu state)
 *
 * @example
 * const {
 *   selectedIds,
 *   toggleSelection,
 *   sortColumn,
 *   handleSort,
 *   openMenuId,
 *   toggleMenu,
 *   closeMenu,
 * } = useListPageState({
 *   defaultSortColumn: 'name',
 *   getItemId: (item) => item.id,
 * })
 */
export function useListPageState<TSortColumn extends string>(
  options: UseListPageStateOptions<TSortColumn>
): UseListPageStateReturn<TSortColumn> {
  const {
    defaultSortColumn,
    defaultSortDirection = 'asc',
    getItemId,
    onSelectionChange,
  } = options

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Sorting state
  const [sortColumn, setSortColumn] = useState<TSortColumn>(defaultSortColumn)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultSortDirection)

  // Context menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<ContextMenuPosition | null>(null)

  // Selection handlers
  const updateSelection = useCallback((newSelection: Set<string>) => {
    setSelectedIds(newSelection)
    onSelectionChange?.(newSelection)
  }, [onSelectionChange])

  const toggleSelection = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      onSelectionChange?.(next)
      return next
    })
  }, [onSelectionChange])

  const selectAll = useCallback((items: any[]) => {
    const allIds = new Set(items.map(getItemId))
    updateSelection(allIds)
  }, [getItemId, updateSelection])

  const clearSelection = useCallback(() => {
    updateSelection(new Set())
  }, [updateSelection])

  const handleSelectAll = useCallback((items: any[], checked: boolean) => {
    if (checked) {
      selectAll(items)
    } else {
      clearSelection()
    }
  }, [selectAll, clearSelection])

  const isSelected = useCallback((id: string) => {
    return selectedIds.has(id)
  }, [selectedIds])

  const isAllSelected = useCallback((items: any[]) => {
    return items.length > 0 && selectedIds.size === items.length
  }, [selectedIds])

  const isIndeterminate = useCallback((items: any[]) => {
    return selectedIds.size > 0 && selectedIds.size < items.length
  }, [selectedIds])

  // Sorting handlers
  const handleSort = useCallback((column: TSortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }, [sortColumn])

  const getSortIconState = useCallback((column: TSortColumn): 'asc' | 'desc' | null => {
    if (sortColumn !== column) return null
    return sortDirection
  }, [sortColumn, sortDirection])

  // Context menu handlers
  const toggleMenu = useCallback((id: string, e: React.MouseEvent<HTMLButtonElement>) => {
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

  const closeMenu = useCallback(() => {
    setOpenMenuId(null)
    setMenuPosition(null)
  }, [])

  const isMenuOpen = useCallback((id: string) => {
    return openMenuId === id
  }, [openMenuId])

  // Computed values
  const hasSelection = selectedIds.size > 0
  const selectionCount = selectedIds.size

  return {
    // Selection
    selectedIds,
    hasSelection,
    selectionCount,
    isSelected,
    isAllSelected,
    isIndeterminate,
    toggleSelection,
    selectAll,
    clearSelection,
    handleSelectAll,

    // Sorting
    sortColumn,
    sortDirection,
    handleSort,
    getSortIconState,

    // Context menu
    openMenuId,
    menuPosition,
    isMenuOpen,
    toggleMenu,
    closeMenu,
  }
}

/**
 * Utility type for creating sort value getter functions
 */
export type SortValueGetter<T, TSortColumn extends string> = (
  item: T,
  column: TSortColumn
) => string | number | Date | null

/**
 * Create a comparator function for sorting items
 */
export function createSortComparator<T, TSortColumn extends string>(
  sortColumn: TSortColumn,
  sortDirection: 'asc' | 'desc',
  getSortValue: SortValueGetter<T, TSortColumn>
): (a: T, b: T) => number {
  return (a: T, b: T) => {
    const aVal = getSortValue(a, sortColumn)
    const bVal = getSortValue(b, sortColumn)

    // Handle null/undefined values
    if (aVal == null && bVal == null) return 0
    if (aVal == null) return sortDirection === 'asc' ? 1 : -1
    if (bVal == null) return sortDirection === 'asc' ? -1 : 1

    // Compare values
    let comparison = 0
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      comparison = aVal.localeCompare(bVal)
    } else if (aVal instanceof Date && bVal instanceof Date) {
      comparison = aVal.getTime() - bVal.getTime()
    } else {
      comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    }

    return sortDirection === 'asc' ? comparison : -comparison
  }
}

export default useListPageState
