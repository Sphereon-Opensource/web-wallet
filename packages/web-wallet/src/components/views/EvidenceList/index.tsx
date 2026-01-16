import React, {FC, ReactElement} from 'react'
import {formatFileSize} from '@helpers/formatUtils'
import style from './index.module.css'

export type EvidenceStorageStatus = 'stored' | 'fetching' | 'external' | 'pending'

export interface EvidenceItem {
  /** Unique identifier for the evidence item */
  id: string
  /** File name */
  name: string
  /** MIME type or type label */
  type: string
  /** File size in bytes (optional) */
  size?: number
  /** Storage status for display */
  storageStatus?: EvidenceStorageStatus
  /** URL to the evidence (optional, for external links) */
  url?: string
}

export interface EvidenceListProps {
  /** List of evidence items to display */
  items: EvidenceItem[]
  /** Title for the section (optional) */
  title?: string
  /** Show item count badge next to title */
  showCount?: boolean
  /** Called when remove button is clicked (if provided, shows remove buttons) */
  onRemove?: (id: string) => void
  /** Called when an item is clicked (optional, for viewing/downloading) */
  onItemClick?: (item: EvidenceItem) => void
  /** Labels for status badges */
  statusLabels?: {
    stored?: string
    fetching?: string
    external?: string
    pending?: string
  }
  /** Additional CSS class for the container */
  className?: string
  /** Compact layout variant */
  compact?: boolean
}

/**
 * A reusable evidence/file list component for displaying attached files.
 *
 * @example
 * // Basic usage
 * <EvidenceList
 *   items={evidenceItems}
 *   title="Evidence Files"
 *   showCount
 * />
 *
 * @example
 * // With remove buttons
 * <EvidenceList
 *   items={files}
 *   title="Attached Files"
 *   onRemove={(id) => handleRemove(id)}
 * />
 */
export const EvidenceList: FC<EvidenceListProps> = ({
  items,
  title,
  showCount = true,
  onRemove,
  onItemClick,
  statusLabels = {},
  className,
  compact = false,
}) => {
  const labels = {
    stored: statusLabels.stored || 'Stored',
    fetching: statusLabels.fetching || 'Fetching',
    external: statusLabels.external || 'External',
    pending: statusLabels.pending || 'Pending',
  }

  const getFileIcon = (name: string, type: string): ReactElement => {
    if (name.endsWith('.xml') || type.includes('xml')) {
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      )
    }
    if (type.includes('pdf')) {
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    }
    if (type.includes('image')) {
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      )
    }
    // Default file icon
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <polyline points="13 2 13 9 20 9" />
      </svg>
    )
  }

  const renderStatus = (status?: EvidenceStorageStatus): ReactElement | null => {
    if (!status) return null

    const statusClass = {
      stored: style.statusStored,
      fetching: style.statusFetching,
      external: style.statusExternal,
      pending: style.statusPending,
    }[status]

    const statusIcon = {
      stored: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
      fetching: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      external: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      ),
      pending: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
    }[status]

    return (
      <span className={`${style.status} ${statusClass}`}>
        {statusIcon}
        {labels[status]}
      </span>
    )
  }

  if (items.length === 0) return null

  return (
    <section className={`${style.container} ${compact ? style.compact : ''} ${className || ''}`}>
      {title && (
        <div className={style.header}>
          <span className={style.title}>{title}</span>
          {showCount && <span className={style.count}>{items.length}</span>}
        </div>
      )}
      <div className={style.list}>
        {items.map((item) => (
          <div
            key={item.id}
            className={`${style.item} ${onItemClick ? style.itemClickable : ''}`}
            onClick={() => onItemClick?.(item)}
            role={onItemClick ? 'button' : undefined}
            tabIndex={onItemClick ? 0 : undefined}
            onKeyDown={(e) => e.key === 'Enter' && onItemClick?.(item)}>
            <div className={style.icon}>{getFileIcon(item.name, item.type)}</div>
            <div className={style.info}>
              <span className={style.name}>{item.name}</span>
              <span className={style.meta}>
                {item.type}
                {item.size != null && item.size > 0 && ` • ${formatFileSize(item.size)}`}
              </span>
            </div>
            {renderStatus(item.storageStatus)}
            {onRemove && (
              <button
                type="button"
                className={style.removeButton}
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(item.id)
                }}
                aria-label="Remove">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

export default EvidenceList
