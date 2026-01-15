import React from 'react'
import styles from './index.module.css'

export type StatusBadgeVariant = 'valid' | 'pending' | 'error'

export interface StatusBadgeProps {
  /** The text to display in the badge */
  label: string
  /** The visual variant of the badge */
  variant: StatusBadgeVariant
  /** Optional smaller size for use in tables */
  size?: 'default' | 'small'
  /** Optional additional className */
  className?: string
}

/**
 * StatusBadge - Reusable status indicator badge component
 *
 * Used for displaying status states across the application
 * (invoice status, credential status, etc.)
 */
const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant,
  size = 'default',
  className,
}) => {
  const badgeClasses = [
    styles.statusBadge,
    styles[variant],
    size === 'small' ? styles.small : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <span className={badgeClasses}>
      {label}
    </span>
  )
}

export default StatusBadge

/**
 * Helper function to map invoice/credential status to badge variant
 */
export const getStatusVariant = (status: string): StatusBadgeVariant => {
  switch (status.toLowerCase()) {
    case 'verified':
    case 'paid':
    case 'approved':
    case 'accepted':
    case 'active':
    case 'valid':
      return 'valid'
    case 'pending':
    case 'draft':
      return 'pending'
    case 'invalid':
    case 'rejected':
    case 'overdue':
    case 'expired':
    case 'revoked':
    case 'error':
      return 'error'
    default:
      return 'pending'
  }
}

/**
 * Helper function to get display label for status
 */
export const getStatusLabel = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'verified':
      return 'Accepted'
    case 'invalid':
      return 'Rejected'
    default:
      return status
  }
}
