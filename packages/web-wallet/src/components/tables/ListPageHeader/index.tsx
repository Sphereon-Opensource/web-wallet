import React, {FC, ReactNode} from 'react'
import style from './index.module.css'

// ============================================
// Tab Types
// ============================================

export interface TabItem {
  /** Unique identifier for the tab */
  id: string
  /** Display label */
  label: string
  /** Optional icon (ReactNode for SVG) */
  icon?: ReactNode
  /** Badge count (shown if > 0) */
  count?: number
}

// ============================================
// Filter Dropdown Types
// ============================================

export interface FilterOption {
  /** Option value */
  value: string
  /** Display label */
  label: string
  /** Optional count badge */
  count?: number
}

export interface FilterDropdown {
  /** Unique identifier */
  id: string
  /** Current selected value */
  value: string
  /** Available options */
  options: FilterOption[]
  /** Change handler */
  onChange: (value: string) => void
  /** Optional label shown before dropdown */
  label?: string
}

// ============================================
// ListPageHeader Props
// ============================================

export interface ListPageHeaderProps {
  /** Tab items to display */
  tabs?: TabItem[]
  /** Currently active tab ID */
  activeTab?: string
  /** Tab change handler */
  onTabChange?: (tabId: string) => void

  /** Filter dropdowns */
  filters?: FilterDropdown[]

  /** Action buttons (rendered on the right side) */
  actions?: ReactNode

  /** Selection state */
  selectionCount?: number
  /** Handler for clearing selection */
  onClearSelection?: () => void
  /** Handler for deleting selected items */
  onDeleteSelected?: () => void
  /** Custom selection actions (replaces default delete button) */
  selectionActions?: ReactNode
  /** Label for selected items (default: "item"/"items") */
  selectionLabel?: {singular: string; plural: string}

  /** Additional class name */
  className?: string
}

// ============================================
// ListPageHeader Component
// ============================================

export const ListPageHeader: FC<ListPageHeaderProps> = ({
  tabs,
  activeTab,
  onTabChange,
  filters,
  actions,
  selectionCount = 0,
  onClearSelection,
  onDeleteSelected,
  selectionActions,
  selectionLabel = {singular: 'item', plural: 'items'},
  className,
}) => {
  const hasSelection = selectionCount > 0

  return (
    <div className={`${style.headerWrapper} ${className || ''}`}>
      {/* Normal header with tabs and actions */}
      <div className={style.header}>
        {/* Tabs */}
        {tabs && tabs.length > 0 && (
          <div className={style.tabs}>
            {tabs.map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`${style.tab} ${isActive ? style.tabActive : ''}`}
                  onClick={() => onTabChange?.(tab.id)}
                  role="tab"
                  aria-selected={isActive}
                >
                  {tab.icon && <span className={style.tabIcon}>{tab.icon}</span>}
                  <span className={style.tabLabel}>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={style.tabBadge}>{tab.count}</span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Filters */}
        {filters && filters.length > 0 && (
          <div className={style.filters}>
            {filters.map(filter => (
              <div key={filter.id} className={style.filterItem}>
                {filter.label && (
                  <span className={style.filterLabel}>{filter.label}</span>
                )}
                <select
                  className={style.filterSelect}
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                >
                  {filter.options.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                      {option.count !== undefined && ` (${option.count})`}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        {/* Spacer */}
        <div className={style.spacer} />

        {/* Actions */}
        {actions && (
          <div className={style.actions}>
            {actions}
          </div>
        )}
      </div>

      {/* Selection overlay */}
      {hasSelection && (
        <div className={style.selectionOverlay}>
          <div className={style.selectionInfo}>
            <button
              type="button"
              className={style.deselectButton}
              onClick={onClearSelection}
              aria-label="Deselect all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <span className={style.selectionCount}>
              {selectionCount} {selectionCount === 1 ? selectionLabel.singular : selectionLabel.plural} selected
            </span>
          </div>

          <div className={style.selectionActions}>
            {selectionActions || (
              <button
                type="button"
                className={style.deleteButton}
                onClick={onDeleteSelected}
                aria-label="Delete selected"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ListPageHeader
