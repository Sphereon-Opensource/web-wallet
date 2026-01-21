import {useState, useCallback, useMemo} from 'react'

export interface UseTableSelectionOptions<T> {
  /** Function to get unique ID from item */
  getItemId: (item: T) => string
  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: Set<string>) => void
}

export interface UseTableSelectionReturn<T> {
  /** Set of selected item IDs */
  selectedIds: Set<string>
  /** Whether any items are selected */
  hasSelection: boolean
  /** Number of selected items */
  selectionCount: number
  /** Check if specific item is selected */
  isSelected: (item: T) => boolean
  /** Check if all items are selected */
  isAllSelected: (items: T[]) => boolean
  /** Check if some but not all items are selected */
  isIndeterminate: (items: T[]) => boolean
  /** Toggle selection of a single item */
  toggleSelection: (item: T) => void
  /** Select all items */
  selectAll: (items: T[]) => void
  /** Deselect all items */
  clearSelection: () => void
  /** Handle select all checkbox change */
  handleSelectAll: (items: T[], checked: boolean) => void
}

/**
 * Hook for managing table row selection state
 */
export function useTableSelection<T>(
  options: UseTableSelectionOptions<T>
): UseTableSelectionReturn<T> {
  const {getItemId, onSelectionChange} = options
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const updateSelection = useCallback((newSelection: Set<string>) => {
    setSelectedIds(newSelection)
    onSelectionChange?.(newSelection)
  }, [onSelectionChange])

  const toggleSelection = useCallback((item: T) => {
    const id = getItemId(item)
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
  }, [getItemId, onSelectionChange])

  const selectAll = useCallback((items: T[]) => {
    const allIds = new Set(items.map(getItemId))
    updateSelection(allIds)
  }, [getItemId, updateSelection])

  const clearSelection = useCallback(() => {
    updateSelection(new Set())
  }, [updateSelection])

  const handleSelectAll = useCallback((items: T[], checked: boolean) => {
    if (checked) {
      selectAll(items)
    } else {
      clearSelection()
    }
  }, [selectAll, clearSelection])

  const isSelected = useCallback((item: T) => {
    return selectedIds.has(getItemId(item))
  }, [selectedIds, getItemId])

  const isAllSelected = useCallback((items: T[]) => {
    return items.length > 0 && selectedIds.size === items.length
  }, [selectedIds])

  const isIndeterminate = useCallback((items: T[]) => {
    return selectedIds.size > 0 && selectedIds.size < items.length
  }, [selectedIds])

  const hasSelection = selectedIds.size > 0
  const selectionCount = selectedIds.size

  return {
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
  }
}
