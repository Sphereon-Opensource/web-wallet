import {UBLInvoiceData} from '@components/views/UBLInvoiceView'
import {formatFileSize as formatFileSizeUtil} from '@helpers/formatUtils'

/**
 * Inbox View Types
 *
 * Shared type definitions for all inbox-related components.
 * These types define the data structures used across the inbox UI.
 */

// Evidence file storage status
export type EvidenceFileStatus = 'external' | 'fetching' | 'stored'

// Evidence file attached to an inbox item
export interface InboxEvidence {
  id: string
  type: string[]
  name: string
  digestMultibase: string
  storageStatus: EvidenceFileStatus
  localPath?: string
  size?: number
  mimeType?: string
}

// Status type for inbox items
export type InboxItemStatus = 'pending' | 'verified' | 'invalid'

// Service type for inbox folders
export type InboxServiceType = 'einv-direct' | 'einv-peppol' | 'einv-ppf-fr'

// Inbox folder configuration
export interface InboxFolder {
  id: string
  name: string
  serviceId: string
  dcqlQueryId?: string
  serviceType?: InboxServiceType
  description?: string
}

// Inbox container configuration
export interface Inbox {
  id: string
  name: string
  displayName: string
  description?: string
  folders: InboxFolder[]
}

// Contact information for sender display
export interface InboxContact {
  id: string
  displayName: string
  did: string
  organizationName?: string
  email?: string
}

// Extended invoice type with inbox metadata
export interface InboxEInvoice extends UBLInvoiceData {
  inboxName: string
  folderName: string
  senderDid: string
  correlationId: string
  receivedAt: string
  /** Whether the sender is a known/approved contact */
  isApprovedSender?: boolean
}

// Status filter options (including 'all')
export type StatusFilter = InboxItemStatus | 'all'

// Menu action types
export type InboxMenuAction = 'details' | 'showInvoice' | 'approve' | 'reject'

// Props for status tab configuration
export interface StatusTabConfig {
  status: StatusFilter
  labelKey: string
  defaultLabel: string
}

// Default status tab configuration
export const STATUS_TABS: StatusTabConfig[] = [
  {status: 'pending', labelKey: 'einvoice_inbox_status_pending', defaultLabel: 'Pending'},
  {status: 'verified', labelKey: 'einvoice_inbox_status_accepted', defaultLabel: 'Accepted'},
  {status: 'invalid', labelKey: 'einvoice_inbox_status_rejected', defaultLabel: 'Rejected'},
  {status: 'all', labelKey: 'einvoice_inbox_status_all', defaultLabel: 'All'},
]

// Helper to get channel type label from serviceType
export const getChannelTypeLabel = (serviceType?: InboxServiceType): string | null => {
  switch (serviceType) {
    case 'einv-direct':
      return 'Direct'
    case 'einv-peppol':
      return 'PEPPOL'
    case 'einv-ppf-fr':
      return 'PPF-FR'
    default:
      return null
  }
}

// Helper to truncate serviceId if too long
export const formatServiceId = (serviceId: string, maxLength: number = 30): string => {
  if (serviceId.length <= maxLength) return serviceId
  return serviceId.substring(0, maxLength - 3) + '...'
}

// Format currency amount
export const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

// Format date string
export const formatDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// Format datetime string
export const formatDateTime = (dateStr: string | undefined | null): string => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Format file size - re-export from shared helper
export const formatFileSize = formatFileSizeUtil
