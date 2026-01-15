import React, {FC, ReactElement, useState, useCallback, useMemo} from 'react'
import {useNavigation, useTranslate} from '@refinedev/core'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import InboxSidebar from './InboxSidebar'
import InboxTable from './InboxTable'
import InboxDetailPanel from './InboxDetailPanel'
import {Inbox, InboxEInvoice, InboxContact, StatusFilter, InboxItemStatus} from './types'
import type {InvoiceStatus} from '@components/views/UBLInvoiceView'
import {approveInvoice, rejectInvoice, deleteInboxInvoice} from '@/src/services/inboxService'
import styles from './index.module.css'

/**
 * InboxView Component
 *
 * Main container component for the inbox view that composes:
 * - InboxSidebar (folder navigation)
 * - InboxTable (item list with tabs)
 * - InboxDetailPanel (item details)
 *
 * Manages state for:
 * - Active inbox/folder selection
 * - Status filtering
 * - Item selection and detail view
 * - Row menu state
 *
 * Responsive layout:
 * - Desktop: Three-column layout (sidebar + table + detail panel)
 * - Tablet: Two-column layout (sidebar + table or detail)
 * - Mobile: Single column with navigation overlays
 */

interface Props {
  title?: string
  inboxes: Inbox[]
  invoices: InboxEInvoice[]
  contacts: Record<string, InboxContact>
  onUpdateInvoice?: (invoice: InboxEInvoice) => void
  className?: string
}

// Re-export InvoiceStatus type for use in parent components
export type {InvoiceStatus} from '@components/views/UBLInvoiceView'

const InboxView: FC<Props> = (props: Props): ReactElement => {
  const {title, inboxes, invoices: initialInvoices, contacts, onUpdateInvoice, className} = props

  const translate = useTranslate()
  const {show, push} = useNavigation()

  // State
  const [invoices, setInvoices] = useState<InboxEInvoice[]>(initialInvoices)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [processingId, setProcessingId] = useState<string | undefined>()
  const [activeInbox, setActiveInbox] = useState<string>(inboxes[0]?.name || '')
  const [activeFolder, setActiveFolder] = useState<string>(inboxes[0]?.folders[0]?.name || '')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [selectedInvoice, setSelectedInvoice] = useState<InboxEInvoice | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{top: number; left: number} | null>(null)
  const [mobileShowSidebar, setMobileShowSidebar] = useState(false)

  // Filtered invoices based on active inbox, folder, and status
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesInbox = inv.inboxName === activeInbox
      const matchesFolder = inv.folderName === activeFolder
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter
      return matchesInbox && matchesFolder && matchesStatus
    })
  }, [invoices, activeInbox, activeFolder, statusFilter])

  // Get pending count for a status
  const getStatusCount = useCallback(
    (status: InboxItemStatus): number => {
      return invoices.filter(
        inv => inv.inboxName === activeInbox && inv.folderName === activeFolder && inv.status === status,
      ).length
    },
    [invoices, activeInbox, activeFolder],
  )

  // Get sender contact
  const getSenderContact = useCallback(
    (senderDid: string): InboxContact | undefined => {
      return contacts[senderDid]
    },
    [contacts],
  )

  // Handlers
  const handleSelectInbox = useCallback(
    (inboxName: string, firstFolderName?: string): void => {
      setActiveInbox(inboxName)
      if (firstFolderName) {
        setActiveFolder(firstFolderName)
      }
      setStatusFilter('pending')
      setSelectedInvoice(null)
      setMobileShowSidebar(false)
    },
    [],
  )

  const handleSelectFolder = useCallback((folderName: string): void => {
    setActiveFolder(folderName)
    setStatusFilter('pending')
    setSelectedInvoice(null)
  }, [])

  const handleStatusFilterChange = useCallback((status: StatusFilter): void => {
    setStatusFilter(status)
  }, [])

  const handleRowClick = useCallback((invoice: InboxEInvoice): void => {
    setSelectedInvoice(invoice)
  }, [])

  // Toggle selection uses correlationId as the unique identifier
  const handleToggleSelection = useCallback((correlationId: string, e: React.MouseEvent): void => {
    e.stopPropagation()
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(correlationId)) {
        next.delete(correlationId)
      } else {
        next.add(correlationId)
      }
      return next
    })
  }, [])

  // Toggle menu uses correlationId as the unique identifier
  const handleToggleMenu = useCallback((correlationId: string, e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation()
    e.preventDefault()

    // Capture button position before async state update (event may be recycled)
    const button = e.currentTarget
    const rect = button.getBoundingClientRect()

    setOpenMenuId(prev => {
      if (prev === correlationId) {
        setMenuPosition(null)
        return null
      }
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 180,
      })
      return correlationId
    })
  }, [])

  const handleCloseMenu = useCallback((): void => {
    setOpenMenuId(null)
    setMenuPosition(null)
  }, [])

  const handleMenuAction = useCallback(
    (action: string, invoice: InboxEInvoice, e: React.MouseEvent): void => {
      e.stopPropagation()
      handleCloseMenu()

      switch (action) {
        case 'details':
          setSelectedInvoice(invoice)
          break
        case 'showInvoice':
          // Navigate to inbox item detail page using correlationId (unique identifier)
          push(`/inbox/${invoice.inboxName}/${invoice.folderName}/${invoice.correlationId}`)
          break
        case 'approve':
          handleApprove(invoice)
          break
        case 'reject':
          handleReject(invoice)
          break
        case 'delete':
          handleDelete(invoice)
          break
      }
    },
    [push, handleCloseMenu],
  )

  const handleApprove = useCallback(
    async (invoice: InboxEInvoice): Promise<void> => {
      console.log('[InboxView] handleApprove called for invoice:', invoice.invoiceId, invoice.correlationId)
      setProcessingId(invoice.correlationId)
      try {
        // Call the backend service to update credential state
        console.log('[InboxView] Calling approveInvoice service...')
        const success = await approveInvoice(invoice)
        console.log('[InboxView] approveInvoice returned:', success)
        if (!success) {
          console.error('[InboxView] Failed to approve invoice:', invoice.invoiceId)
          return
        }

        const updatedInvoice = {...invoice, status: 'verified' as InvoiceStatus}
        // Use correlationId for unique identification
        setInvoices(prev => prev.map(inv => (inv.correlationId === invoice.correlationId ? updatedInvoice : inv)))
        if (selectedInvoice?.correlationId === invoice.correlationId) {
          setSelectedInvoice(updatedInvoice)
        }
        setSelectedIds(prev => {
          const next = new Set(prev)
          next.delete(invoice.correlationId)
          return next
        })
        onUpdateInvoice?.(updatedInvoice)
      } finally {
        setProcessingId(undefined)
      }
    },
    [selectedInvoice, onUpdateInvoice],
  )

  const handleReject = useCallback(
    async (invoice: InboxEInvoice): Promise<void> => {
      setProcessingId(invoice.correlationId)
      try {
        // Call the backend service to update credential state
        const success = await rejectInvoice(invoice)
        if (!success) {
          console.error('[InboxView] Failed to reject invoice:', invoice.invoiceId)
          return
        }

        const updatedInvoice = {...invoice, status: 'invalid' as InvoiceStatus}
        // Use correlationId for unique identification
        setInvoices(prev => prev.map(inv => (inv.correlationId === invoice.correlationId ? updatedInvoice : inv)))
        if (selectedInvoice?.correlationId === invoice.correlationId) {
          setSelectedInvoice(updatedInvoice)
        }
        setSelectedIds(prev => {
          const next = new Set(prev)
          next.delete(invoice.correlationId)
          return next
        })
        onUpdateInvoice?.(updatedInvoice)
      } finally {
        setProcessingId(undefined)
      }
    },
    [selectedInvoice, onUpdateInvoice],
  )

  const handleDelete = useCallback(
    async (invoice: InboxEInvoice): Promise<void> => {
      setProcessingId(invoice.correlationId)
      try {
        // Call the backend service to delete the inbox credential
        const success = await deleteInboxInvoice(invoice)
        if (!success) {
          console.error('[InboxView] Failed to delete invoice:', invoice.invoiceId)
          return
        }

        // Remove from local state using correlationId for unique identification
        setInvoices(prev => prev.filter(inv => inv.correlationId !== invoice.correlationId))
        if (selectedInvoice?.correlationId === invoice.correlationId) {
          setSelectedInvoice(null)
        }
        setSelectedIds(prev => {
          const next = new Set(prev)
          next.delete(invoice.correlationId)
          return next
        })
      } finally {
        setProcessingId(undefined)
      }
    },
    [selectedInvoice],
  )

  const handleCloseDetail = useCallback((): void => {
    setSelectedInvoice(null)
  }, [])

  const handleViewFullInvoice = useCallback((): void => {
    if (selectedInvoice) {
      // Navigate to inbox item detail page using correlationId (unique identifier)
      push(`/inbox/${selectedInvoice.inboxName}/${selectedInvoice.folderName}/${selectedInvoice.correlationId}`)
    }
  }, [selectedInvoice, push])

  const handleViewContact = useCallback(
    (contactId: string): void => {
      push(`/contacts/show?id=${contactId}`)
    },
    [push],
  )

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <AppHeaderBar title={title || translate('einvoice_inbox_title', 'Inbox')} />

      <div className={styles.mainLayout}>
        {/* Mobile sidebar toggle button */}
        <button
          type="button"
          className={styles.mobileMenuButton}
          onClick={() => setMobileShowSidebar(!mobileShowSidebar)}
          aria-label={translate('action_toggle_sidebar', 'Toggle sidebar')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Sidebar */}
        <InboxSidebar
          inboxes={inboxes}
          invoices={invoices}
          activeInbox={activeInbox}
          activeFolder={activeFolder}
          onSelectInbox={handleSelectInbox}
          onSelectFolder={handleSelectFolder}
          className={mobileShowSidebar ? styles.sidebarMobileVisible : ''}
        />

        {/* Mobile sidebar backdrop */}
        {mobileShowSidebar && (
          <div className={styles.mobileBackdrop} onClick={() => setMobileShowSidebar(false)} aria-hidden="true" />
        )}

        {/* Content Area */}
        <div className={styles.contentArea}>
          {/* Table Section */}
          <div className={`${styles.tableSection} ${selectedInvoice ? styles.tableSectionWithDetail : ''}`}>
            <InboxTable
              invoices={filteredInvoices}
              statusFilter={statusFilter}
              selectedIds={selectedIds}
              selectedCorrelationId={selectedInvoice?.correlationId}
              openMenuId={openMenuId}
              menuPosition={menuPosition}
              onStatusFilterChange={handleStatusFilterChange}
              onRowClick={handleRowClick}
              onToggleSelection={handleToggleSelection}
              onToggleMenu={handleToggleMenu}
              onCloseMenu={handleCloseMenu}
              onMenuAction={handleMenuAction}
              getStatusCount={getStatusCount}
            />
          </div>

          {/* Detail Panel */}
          {selectedInvoice && (
            <InboxDetailPanel
              invoice={selectedInvoice}
              contact={getSenderContact(selectedInvoice.senderDid)}
              processingId={processingId}
              onClose={handleCloseDetail}
              onViewFullInvoice={handleViewFullInvoice}
              onViewContact={handleViewContact}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default InboxView

// Re-export sub-components and types
export {InboxSidebar} from './InboxSidebar'
export {InboxTable} from './InboxTable'
export {InboxDetailPanel} from './InboxDetailPanel'
export * from './types'
export * from './icons'
