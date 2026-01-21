import React, {FC, ReactElement, useCallback} from 'react'
import {useTranslate} from '@refinedev/core'
import StatusBadge, {getStatusVariant, getStatusLabel} from '@components/badges/StatusBadge'
import {InboxEInvoice, StatusFilter, STATUS_TABS, InboxItemStatus, formatCurrency, formatDate} from '../types'
import {MeatballsIcon, InfoIcon, DocumentIcon, CheckIcon, RejectIcon, EmptyInboxIcon, TrashIcon} from '../icons'
import styles from './index.module.css'

// Sort types
export type InboxSortField = 'sender' | 'type' | 'invoiceId' | 'amount' | 'date' | 'dueDate'
export type SortDirection = 'asc' | 'desc'

/**
 * InboxTable Component
 *
 * Displays inbox items in a tabular format with:
 * - Status filter tabs (Pending, Approved, Rejected, All)
 * - Selectable rows with checkboxes
 * - Row action menus
 * - Empty state for no items
 *
 * Responsive behavior:
 * - Full table on desktop
 * - Card view on mobile
 * - Collapsible columns on tablet
 */

interface Props {
  invoices: InboxEInvoice[]
  statusFilter: StatusFilter
  selectedIds: Set<string>  // Now stores correlationIds
  selectedCorrelationId?: string  // The currently selected row
  openMenuId: string | null  // correlationId of open menu
  menuPosition: {top: number; left: number} | null
  sortField: InboxSortField
  sortDirection: SortDirection
  onStatusFilterChange: (status: StatusFilter) => void
  onRowClick: (invoice: InboxEInvoice) => void
  onToggleSelection: (correlationId: string, e: React.MouseEvent) => void
  onSelectAll: (selectAll: boolean) => void
  onDeleteSelected: () => void
  onToggleMenu: (correlationId: string, e: React.MouseEvent<HTMLButtonElement>) => void
  onCloseMenu: () => void
  onMenuAction: (action: string, invoice: InboxEInvoice, e: React.MouseEvent) => void
  onSort: (field: InboxSortField) => void
  getStatusCount: (status: InboxItemStatus) => number
  className?: string
}

const InboxTable: FC<Props> = (props: Props): ReactElement => {
  const {
    invoices,
    statusFilter,
    selectedIds,
    selectedCorrelationId,
    openMenuId,
    menuPosition,
    sortField,
    sortDirection,
    onStatusFilterChange,
    onRowClick,
    onToggleSelection,
    onSelectAll,
    onDeleteSelected,
    onToggleMenu,
    onCloseMenu,
    onMenuAction,
    onSort,
    getStatusCount,
    className,
  } = props

  const translate = useTranslate()

  const isInvoiceCredential = useCallback((invoice: InboxEInvoice): boolean => {
    return (
      invoice.invoiceType?.toLowerCase().includes('invoice') || invoice.invoiceType?.toLowerCase().includes('credit note') || true
    )
  }, [])

  const renderEmptyState = (): ReactElement => {
    const getEmptyTitle = (): string => {
      switch (statusFilter) {
        case 'pending':
          return translate('einvoice_inbox_empty_pending_title', 'No Pending Items')
        case 'verified':
          return translate('einvoice_inbox_empty_accepted_title', 'No Accepted Items')
        case 'invalid':
          return translate('einvoice_inbox_empty_rejected_title', 'No Rejected Items')
        default:
          return translate('einvoice_inbox_empty_all_title', 'No Items')
      }
    }

    const getEmptyDescription = (): string => {
      switch (statusFilter) {
        case 'pending':
          return translate('einvoice_inbox_empty_pending_description', 'All caught up! No credentials awaiting approval.')
        case 'verified':
          return translate('einvoice_inbox_empty_accepted_description', 'No accepted credentials yet.')
        case 'invalid':
          return translate('einvoice_inbox_empty_rejected_description', 'No rejected credentials.')
        default:
          return translate('einvoice_inbox_empty_all_description', 'No credentials received in this folder.')
      }
    }

    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyStateIcon}>
          <EmptyInboxIcon />
        </div>
        <div className={styles.emptyStateTitle}>{getEmptyTitle()}</div>
        <div className={styles.emptyStateDescription}>{getEmptyDescription()}</div>
      </div>
    )
  }

  const renderRowMenu = (invoice: InboxEInvoice): ReactElement | null => {
    if (openMenuId !== invoice.correlationId || !menuPosition) return null

    return (
      <>
        <div className={styles.menuBackdrop} onClick={onCloseMenu} />
        <div className={styles.menuDropdown} style={{top: menuPosition.top, left: menuPosition.left}}>
          <button className={styles.menuItem} onClick={e => onMenuAction('details', invoice, e)}>
            <InfoIcon />
            {translate('action_details_label', 'Details')}
          </button>
          {isInvoiceCredential(invoice) && (
            <button className={styles.menuItem} onClick={e => onMenuAction('showInvoice', invoice, e)}>
              <DocumentIcon />
              {translate('action_show_invoice_label', 'Show Invoice')}
            </button>
          )}
          {invoice.status === 'pending' && (
            <>
              <div className={styles.menuDivider} />
              <button className={styles.menuItem} onClick={e => onMenuAction('approve', invoice, e)}>
                <CheckIcon />
                {translate('action_accept_label', 'Accept')}
              </button>
              <button className={styles.menuItem} onClick={e => onMenuAction('reject', invoice, e)}>
                <RejectIcon />
                {translate('action_reject_label', 'Reject')}
              </button>
            </>
          )}
          <div className={styles.menuDivider} />
          <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={e => onMenuAction('delete', invoice, e)}>
            <TrashIcon />
            {translate('action_delete_label', 'Delete')}
          </button>
        </div>
      </>
    )
  }

  return (
    <div className={`${styles.tableContainer} ${className || ''}`}>
      {/* Status Filter Tabs */}
      <div className={styles.statusTabs} role="tablist">
        {STATUS_TABS.map(tab => {
          const count = tab.status !== 'all' ? getStatusCount(tab.status as InboxItemStatus) : 0
          const isActive = statusFilter === tab.status

          return (
            <button
              key={tab.status}
              role="tab"
              aria-selected={isActive}
              className={`${styles.statusTab} ${isActive ? styles.statusTabActive : ''}`}
              onClick={() => onStatusFilterChange(tab.status)}
            >
              {translate(tab.labelKey, tab.defaultLabel)}
              {count > 0 && <span className={styles.statusTabCount}>{count}</span>}
            </button>
          )
        })}
      </div>

      {/* Table Content */}
      {invoices.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className={styles.tableWrapper}>
          {/* Bulk Actions Bar */}
          {selectedIds.size > 0 && (
            <div className={styles.bulkActionsBar}>
              <span className={styles.bulkActionsCount}>
                {selectedIds.size} {selectedIds.size === 1 ? 'item' : 'items'} selected
              </span>
              <button
                type="button"
                className={styles.bulkDeleteButton}
                onClick={onDeleteSelected}
                aria-label={translate('action_delete_selected', 'Delete selected')}
              >
                <TrashIcon />
                {translate('action_delete_selected', 'Delete Selected')}
              </button>
            </div>
          )}

          {/* Desktop Table View */}
          <div className={`${styles.table} ${selectedIds.size > 0 ? styles.tableWithSelections : ''}`}>
            <div className={styles.tableHeader}>
              <div className={styles.checkboxCell}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={invoices.length > 0 && selectedIds.size === invoices.length}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = selectedIds.size > 0 && selectedIds.size < invoices.length
                    }
                  }}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  aria-label="Select all"
                />
              </div>
              <div
                className={`${styles.headerCell} ${styles.cellSender} ${styles.headerCellSortable} ${sortField === 'sender' ? styles.headerCellSorted : ''}`}
                onClick={() => onSort('sender')}
              >
                {translate('einvoice_column_from', 'From')}
                <SortIcon field="sender" sortField={sortField} sortDirection={sortDirection} />
              </div>
              <div
                className={`${styles.headerCell} ${styles.cellType} ${styles.headerCellSortable} ${sortField === 'type' ? styles.headerCellSorted : ''}`}
                onClick={() => onSort('type')}
              >
                {translate('einvoice_column_type', 'Type')}
                <SortIcon field="type" sortField={sortField} sortDirection={sortDirection} />
              </div>
              <div
                className={`${styles.headerCell} ${styles.cellInvoice} ${styles.headerCellSortable} ${sortField === 'invoiceId' ? styles.headerCellSorted : ''}`}
                onClick={() => onSort('invoiceId')}
              >
                {translate('einvoice_column_invoice_id', 'Invoice')}
                <SortIcon field="invoiceId" sortField={sortField} sortDirection={sortDirection} />
              </div>
              <div
                className={`${styles.headerCell} ${styles.cellAmount} ${styles.headerCellSortable} ${sortField === 'amount' ? styles.headerCellSorted : ''}`}
                onClick={() => onSort('amount')}
              >
                {translate('einvoice_column_amount', 'Amount')}
                <SortIcon field="amount" sortField={sortField} sortDirection={sortDirection} />
              </div>
              <div
                className={`${styles.headerCell} ${styles.cellDate} ${styles.headerCellSortable} ${sortField === 'date' ? styles.headerCellSorted : ''}`}
                onClick={() => onSort('date')}
              >
                {translate('einvoice_column_date', 'Date')}
                <SortIcon field="date" sortField={sortField} sortDirection={sortDirection} />
              </div>
              <div
                className={`${styles.headerCell} ${styles.cellDue} ${styles.headerCellSortable} ${sortField === 'dueDate' ? styles.headerCellSorted : ''}`}
                onClick={() => onSort('dueDate')}
              >
                {translate('einvoice_column_due', 'Due')}
                <SortIcon field="dueDate" sortField={sortField} sortDirection={sortDirection} />
              </div>
              <div className={`${styles.headerCell} ${styles.cellStatus}`}>
                {translate('einvoice_column_status', 'Status')}
              </div>
              <div className={`${styles.headerCell} ${styles.cellActions}`} />
            </div>

            {invoices.map(invoice => (
              <div
                key={invoice.correlationId}
                className={`${styles.tableRow} ${selectedCorrelationId === invoice.correlationId ? styles.selected : ''}`}
                onClick={() => onRowClick(invoice)}
                role="row"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && onRowClick(invoice)}
              >
                <div className={styles.checkboxCell}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(invoice.correlationId)}
                    onChange={() => {}}
                    onClick={e => onToggleSelection(invoice.correlationId, e)}
                    className={styles.checkbox}
                    aria-label={`Select ${invoice.invoiceId}`}
                  />
                </div>
                <div className={`${styles.cell} ${styles.cellSender}`}>
                  <div className={styles.senderInfo}>
                    <div className={styles.senderNameRow}>
                      <span className={styles.senderName}>{invoice.supplier?.name || 'Unknown'}</span>
                      {invoice.isApprovedSender === false && (
                        <span className={styles.unknownSenderWarning} title="Unknown sender - not in your contacts">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                        </span>
                      )}
                    </div>
                    {invoice.supplier?.email && <span className={styles.senderEmail}>{invoice.supplier.email}</span>}
                  </div>
                </div>
                <div className={`${styles.cell} ${styles.cellType}`}>
                  <span className={styles.invoiceType}>{invoice.invoiceType || 'Invoice'}</span>
                </div>
                <div className={`${styles.cell} ${styles.cellInvoice}`}>
                  <span className={styles.invoiceId}>{invoice.invoiceId}</span>
                </div>
                <div className={`${styles.cell} ${styles.cellAmount}`}>
                  <span className={styles.amount}>{formatCurrency(invoice.taxInclusiveAmount, invoice.currencyCode)}</span>
                </div>
                <div className={`${styles.cell} ${styles.cellDate}`}>{formatDate(invoice.invoiceDate)}</div>
                <div className={`${styles.cell} ${styles.cellDue}`}>{formatDate(invoice.dueDate)}</div>
                <div className={`${styles.cell} ${styles.cellStatus}`}>
                  <StatusBadge
                    label={getStatusLabel(invoice.status || 'pending')}
                    variant={getStatusVariant(invoice.status || 'pending')}
                    size="small"
                  />
                </div>
                <div className={`${styles.cell} ${styles.cellActions}`}>
                  <div className={styles.menuContainer}>
                    <button
                      type="button"
                      className={styles.meatballsButton}
                      onClick={e => onToggleMenu(invoice.correlationId, e)}
                      onMouseDown={e => e.stopPropagation()}
                      aria-label="Open menu"
                      aria-expanded={openMenuId === invoice.correlationId}
                    >
                      <MeatballsIcon />
                    </button>
                    {renderRowMenu(invoice)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Card View */}
          <div className={styles.mobileCards}>
            {invoices.map(invoice => (
              <div
                key={invoice.correlationId}
                className={`${styles.mobileCard} ${selectedCorrelationId === invoice.correlationId ? styles.selected : ''}`}
                onClick={() => onRowClick(invoice)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && onRowClick(invoice)}
              >
                <div className={styles.mobileCardHeader}>
                  <div className={styles.mobileCardCheckbox}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(invoice.correlationId)}
                      onChange={() => {}}
                      onClick={e => onToggleSelection(invoice.correlationId, e)}
                      className={styles.checkbox}
                    />
                  </div>
                  <div className={styles.mobileCardTitle}>
                    <span className={styles.senderName}>{invoice.supplier?.name || 'Unknown'}</span>
                    <span className={styles.invoiceId}>{invoice.invoiceId}</span>
                  </div>
                  <div className={styles.mobileCardMenu}>
                    <button
                      type="button"
                      className={styles.meatballsButton}
                      onClick={e => onToggleMenu(invoice.correlationId, e)}
                      onMouseDown={e => e.stopPropagation()}
                    >
                      <MeatballsIcon />
                    </button>
                    {renderRowMenu(invoice)}
                  </div>
                </div>
                <div className={styles.mobileCardBody}>
                  <div className={styles.mobileCardRow}>
                    <span className={styles.mobileCardLabel}>{translate('einvoice_column_type', 'Type')}</span>
                    <span className={styles.mobileCardValue}>{invoice.invoiceType || 'Invoice'}</span>
                  </div>
                  <div className={styles.mobileCardRow}>
                    <span className={styles.mobileCardLabel}>{translate('einvoice_column_amount', 'Amount')}</span>
                    <span className={`${styles.mobileCardValue} ${styles.amount}`}>
                      {formatCurrency(invoice.taxInclusiveAmount, invoice.currencyCode)}
                    </span>
                  </div>
                  <div className={styles.mobileCardRow}>
                    <span className={styles.mobileCardLabel}>{translate('einvoice_column_due', 'Due')}</span>
                    <span className={styles.mobileCardValue}>{formatDate(invoice.dueDate)}</span>
                  </div>
                </div>
                <div className={styles.mobileCardFooter}>
                  <StatusBadge
                    label={getStatusLabel(invoice.status || 'pending')}
                    variant={getStatusVariant(invoice.status || 'pending')}
                    size="small"
                  />
                  <span className={styles.mobileCardDate}>{formatDate(invoice.invoiceDate)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Sort Icon Component
const SortIcon: React.FC<{field: InboxSortField; sortField: InboxSortField; sortDirection: SortDirection}> = ({
  field,
  sortField,
  sortDirection,
}) => {
  if (sortField !== field) {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={styles.sortIconInactive}>
        <path d="M6 2L9 5H3L6 2Z" fill="currentColor" />
        <path d="M6 10L3 7H9L6 10Z" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={styles.sortIcon}>
      {sortDirection === 'asc' ? (
        <path d="M6 2L9 5H3L6 2Z" fill="currentColor" />
      ) : (
        <path d="M6 10L3 7H9L6 10Z" fill="currentColor" />
      )}
    </svg>
  )
}

export default InboxTable
export {InboxTable}
