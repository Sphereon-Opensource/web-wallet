import React, {ReactElement} from 'react'
import styles from './index.module.css'
import StatusBadge, {getStatusVariant} from '@components/badges/StatusBadge'
import {
  UBLInvoiceCardProps,
  formatCurrency,
  formatDate,
} from '../types'

/**
 * UBLInvoiceCard - Summary card view for eInvoice credentials
 * Displays key credential fields for quick scanning in lists
 */
const UBLInvoiceCard: React.FC<UBLInvoiceCardProps> = ({
  invoice,
  onViewDetails,
  onViewEvidence,
  onSelect,
  onRemove,
  selected = false,
  showActions = true,
}): ReactElement => {
  const status = invoice.status ?? 'draft'
  const supplierName = invoice.supplier?.name ?? 'Unknown Supplier'

  const handleClick = () => {
    if (onSelect) {
      onSelect(invoice)
    }
  }

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onViewDetails) {
      onViewDetails()
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onRemove) {
      onRemove()
    }
  }

  // Calculate tax percentage for display
  const taxPercent = invoice.taxExclusiveAmount > 0
    ? Math.round((invoice.taxAmount / invoice.taxExclusiveAmount) * 100)
    : 0

  return (
    <div
      className={`${styles.container} ${selected ? styles.selected : ''}`}
      onClick={handleClick}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <div className={`${styles.accent} ${styles[status]}`} />
      <div className={styles.content}>
        {/* Header with title and status */}
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <div className={styles.title}>Invoice #{invoice.invoiceId}</div>
            <div className={styles.subtitle}>{supplierName}</div>
          </div>
          <StatusBadge
            label={invoice.statusLabel ?? (status === 'pending' ? 'Pending' : status === 'verified' ? 'Accepted' : status === 'invalid' ? 'Rejected' : status)}
            variant={getStatusVariant(status)}
          />
        </div>

        {/* Date and currency row */}
        <div className={styles.row}>
          <div className={styles.field}>
            <span className={styles.label}>Invoice Date</span>
            <span className={styles.value}>{formatDate(invoice.invoiceDate)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Due Date</span>
            <span className={styles.value}>{formatDate(invoice.dueDate)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Currency</span>
            <span className={styles.value}>{invoice.currencyCode}</span>
          </div>
        </div>

        <div className={styles.divider} />

        {/* Amounts row */}
        <div className={styles.row}>
          <div className={styles.field}>
            <span className={styles.label}>Subtotal</span>
            <span className={styles.value}>
              {formatCurrency(invoice.taxExclusiveAmount, invoice.currencyCode)}
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Tax ({taxPercent}%)</span>
            <span className={styles.value}>
              {formatCurrency(invoice.taxAmount, invoice.currencyCode)}
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Total</span>
            <span className={styles.valueAmount}>
              {formatCurrency(invoice.taxInclusiveAmount, invoice.currencyCode)}
            </span>
          </div>
        </div>

        {/* Footer with evidence count and actions */}
        <div className={styles.footer}>
          <button
            className={styles.evidence}
            onClick={(e) => {
              e.stopPropagation()
              if (onViewEvidence) {
                onViewEvidence()
              }
            }}
            type="button"
          >
            <svg
              className={styles.evidenceIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
            </svg>
            {invoice.evidence.length} evidence file{invoice.evidence.length !== 1 ? 's' : ''}
          </button>
          {(showActions || onRemove) && (
            <div className={styles.actions}>
              {onViewDetails && (
                <button
                  className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
                  onClick={handleViewDetails}
                >
                  View Details
                </button>
              )}
              {onRemove && (
                <button
                  className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                  onClick={handleRemove}
                >
                  Remove
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UBLInvoiceCard
