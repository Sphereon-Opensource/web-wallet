import React, {useCallback, useEffect, useMemo, useState, ReactNode} from 'react'
import {useLocation, useNavigate} from 'react-router-dom'
import {useNavigation, useTranslate} from '@refinedev/core'
import {PrimaryButton} from '@sphereon/ui-components.ssi-react'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import {ListPageHeader, TabItem} from '@components/tables'
import {
  fetchSentInvoices,
  fetchSentInvoiceById,
  fetchInboxInvoices,
  SentInvoice,
  SentInvoiceStatus,
  deleteSentInvoice,
  sendDraftInvoice,
  deleteInboxInvoice,
} from '@/src/services/inboxService'
import {InboxEInvoice, InboxContact} from '@components/views/InboxView/types'
import {InboxDetailPanel} from '@components/views/InboxView/InboxDetailPanel'
import StatusBadge from '@components/badges/StatusBadge'
import style from './index.module.css'
import {staticPropsWithSST} from '@/src/i18n/server'

// Tab type
type TabType = 'received' | 'sent'

// Sort types
type SentSortField = 'recipient' | 'invoiceId' | 'amount' | 'date' | 'status'
type ReceivedSortField = 'supplier' | 'invoiceId' | 'amount' | 'date' | 'dueDate'
type SortDirection = 'asc' | 'desc'

// Map SentInvoice to InboxEInvoice format for consistent detail panel display
const mapSentToInboxEInvoice = (sent: SentInvoice): InboxEInvoice => {
  // Map sent status to inbox status (for badge variant coloring)
  const statusMap: Record<SentInvoiceStatus, 'pending' | 'verified' | 'invalid'> = {
    draft: 'pending',
    sending: 'pending',
    sent: 'verified',
    delivered: 'verified',
    failed: 'invalid',
  }

  // Map sent status to display label (for actual label text)
  const statusLabelMap: Record<SentInvoiceStatus, string> = {
    draft: 'Draft',
    sending: 'Sending',
    sent: 'Sent',
    delivered: 'Delivered',
    failed: 'Failed',
  }

  return {
    invoiceId: sent.invoiceId,
    invoiceDate: sent.invoiceDate,
    dueDate: sent.dueDate || '',
    currencyCode: sent.currencyCode,
    taxExclusiveAmount: sent.taxExclusiveAmount,
    taxAmount: sent.taxAmount,
    taxInclusiveAmount: sent.taxInclusiveAmount,
    invoiceType: undefined,
    supplier: {
      name: sent.sellerName,
      vatNumber: sent.sellerTaxId,
    },
    customer: {
      name: sent.buyerName,
      vatNumber: sent.buyerTaxId,
    },
    evidence: sent.evidenceFiles.map((e) => ({
      id: e.digestMultibase || e.id,
      type: [e.evidenceType],
      name: e.filename,
      digestMultibase: e.digestMultibase || '',
      storageStatus: 'stored' as const,
    })),
    credential: undefined,
    status: statusMap[sent.status] || 'pending',
    statusLabel: statusLabelMap[sent.status] || sent.status,
    inboxName: 'sent',
    folderName: 'outbox',
    senderDid: sent.recipientDid || '',
    correlationId: sent.correlationId || '',
    receivedAt: sent.createdAt,
  }
}

const EInvoiceListPage: React.FC = () => {
  const translate = useTranslate()
  const {push} = useNavigation()
  const location = useLocation()
  const navigate = useNavigate()

  // Get tab from URL query parameter
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const tabFromQuery = searchParams.get('tab') as TabType | null

  // Tab state - default to 'received', will be updated from URL
  const [activeTab, setActiveTab] = useState<TabType>(tabFromQuery === 'sent' ? 'sent' : 'received')

  // Sync tab state with URL query parameter when it changes
  useEffect(() => {
    if (tabFromQuery === 'sent' || tabFromQuery === 'received') {
      setActiveTab(tabFromQuery)
    }
  }, [tabFromQuery])

  // Handle tab change - update both state and URL
  const handleTabChange = useCallback(
    (tab: TabType) => {
      setActiveTab(tab)
      navigate(`/einvoice?tab=${tab}`, {replace: true})
    },
    [navigate],
  )

  // Sent invoices state - simple list of all sent invoices
  const [sentInvoices, setSentInvoices] = useState<SentInvoice[]>([])
  const [selectedSentInvoice, setSelectedSentInvoice] = useState<SentInvoice | null>(null)
  const [selectedSentIds, setSelectedSentIds] = useState<Set<string>>(new Set())

  // Received invoices state (only verified/approved invoices shown here)
  const [receivedInvoices, setReceivedInvoices] = useState<InboxEInvoice[]>([])
  const [selectedReceivedInvoice, setSelectedReceivedInvoice] = useState<InboxEInvoice | null>(null)
  const [selectedReceivedIds, setSelectedReceivedIds] = useState<Set<string>>(new Set())

  // Pending inbox count for indicator
  const [pendingInboxCount, setPendingInboxCount] = useState<number>(0)

  // Menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{top: number; left: number} | null>(null)

  // Loading state
  const [isLoading, setIsLoading] = useState(true)

  // Sort state for sent invoices
  const [sentSortField, setSentSortField] = useState<SentSortField>('date')
  const [sentSortDirection, setSentSortDirection] = useState<SortDirection>('desc')

  // Sort state for received invoices
  const [receivedSortField, setReceivedSortField] = useState<ReceivedSortField>('date')
  const [receivedSortDirection, setReceivedSortDirection] = useState<SortDirection>('desc')

  // Fetch sent invoices on mount and when tab changes to sent
  useEffect(() => {
    const loadSentInvoices = async () => {
      if (activeTab !== 'sent') return
      setIsLoading(true)
      try {
        const invoices = await fetchSentInvoices()
        setSentInvoices(invoices)
      } catch (error) {
        console.error('Error loading sent invoices:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadSentInvoices()
  }, [activeTab])

  // Fetch received invoices on mount
  useEffect(() => {
    const loadReceivedInvoices = async () => {
      setIsLoading(true)
      try {
        const allReceived = await fetchInboxInvoices()

        // Only show verified/approved invoices in the eInvoice list
        // Pending and rejected invoices are only visible in the inbox
        const verifiedInvoices = allReceived.filter((inv) => inv.status === 'verified')
        setReceivedInvoices(verifiedInvoices)

        // Track pending count for inbox indicator
        const pendingCount = allReceived.filter((inv) => inv.status === 'pending').length
        setPendingInboxCount(pendingCount)
      } catch (error) {
        console.error('Error loading invoices:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadReceivedInvoices()
  }, [])

  // Refresh sent invoices list
  const refreshSentInvoices = useCallback(async () => {
    try {
      const invoices = await fetchSentInvoices()
      setSentInvoices(invoices)
    } catch (error) {
      console.error('Error refreshing sent invoices:', error)
    }
  }, [])

  // Selection handlers for sent invoices
  const handleToggleSentSelection = useCallback((id: string, e: React.MouseEvent): void => {
    e.stopPropagation()
    setSelectedSentIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleSelectAllSent = useCallback(
    (selectAll: boolean): void => {
      if (selectAll) {
        const allIds = new Set(sentInvoices.map((inv) => inv.id))
        setSelectedSentIds(allIds)
      } else {
        setSelectedSentIds(new Set())
      }
    },
    [sentInvoices]
  )

  const handleDeleteSelectedSent = useCallback(async (): Promise<void> => {
    if (selectedSentIds.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedSentIds.size} invoice(s)?`)) return

    const idsToDelete = Array.from(selectedSentIds)
    for (const id of idsToDelete) {
      try {
        const deleted = await deleteSentInvoice(id)
        if (deleted) {
          setSentInvoices((prev) => prev.filter((inv) => inv.id !== id))
          if (selectedSentInvoice?.id === id) {
            setSelectedSentInvoice(null)
          }
        }
      } catch (error) {
        console.error('[EInvoice] Error deleting sent invoice:', id, error)
      }
    }
    setSelectedSentIds(new Set())
    // Refresh folder counts after deletion
    refreshSentInvoices()
  }, [selectedSentIds, selectedSentInvoice, refreshSentInvoices])

  // Selection handlers for received invoices
  const handleToggleReceivedSelection = useCallback((correlationId: string, e: React.MouseEvent): void => {
    e.stopPropagation()
    setSelectedReceivedIds((prev) => {
      const next = new Set(prev)
      if (next.has(correlationId)) {
        next.delete(correlationId)
      } else {
        next.add(correlationId)
      }
      return next
    })
  }, [])

  const handleSelectAllReceived = useCallback(
    (selectAll: boolean): void => {
      if (selectAll) {
        const allIds = new Set(receivedInvoices.map((inv) => inv.correlationId))
        setSelectedReceivedIds(allIds)
      } else {
        setSelectedReceivedIds(new Set())
      }
    },
    [receivedInvoices]
  )

  const handleDeleteSelectedReceived = useCallback(async (): Promise<void> => {
    if (selectedReceivedIds.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedReceivedIds.size} invoice(s)?`)) return

    const idsToDelete = Array.from(selectedReceivedIds)
    for (const correlationId of idsToDelete) {
      const invoice = receivedInvoices.find((inv) => inv.correlationId === correlationId)
      if (invoice) {
        try {
          const deleted = await deleteInboxInvoice(invoice)
          if (deleted) {
            setReceivedInvoices((prev) => prev.filter((inv) => inv.correlationId !== correlationId))
            if (selectedReceivedInvoice?.correlationId === correlationId) {
              setSelectedReceivedInvoice(null)
            }
          }
        } catch (error) {
          console.error('[EInvoice] Error deleting received invoice:', correlationId, error)
        }
      }
    }
    setSelectedReceivedIds(new Set())
  }, [selectedReceivedIds, receivedInvoices, selectedReceivedInvoice])

  // Current selection count based on active tab for ListPageHeader
  const currentSelectionCount = activeTab === 'sent' ? selectedSentIds.size : selectedReceivedIds.size
  const handleClearSelection = useCallback(() => {
    if (activeTab === 'sent') {
      setSelectedSentIds(new Set())
    } else {
      setSelectedReceivedIds(new Set())
    }
  }, [activeTab])

  const handleDeleteCurrentSelection = useCallback(async () => {
    if (activeTab === 'sent') {
      await handleDeleteSelectedSent()
    } else {
      await handleDeleteSelectedReceived()
    }
  }, [activeTab, handleDeleteSelectedSent, handleDeleteSelectedReceived])

  // Build tabs for ListPageHeader
  const headerTabs: TabItem[] = useMemo(() => {
    return [
      {
        id: 'received',
        label: translate('einvoice_tab_received', 'Received') as string,
        count: receivedInvoices.length,
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
        ),
      },
      {
        id: 'sent',
        label: translate('einvoice_tab_sent', 'Sent') as string,
        count: sentInvoices.length,
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" />
          </svg>
        ),
      },
    ]
  }, [translate, receivedInvoices.length, sentInvoices.length])

  // Format currency
  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(amount)
  }

  // Format date
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  // Handle sort for sent invoices
  const handleSentSort = useCallback(
    (field: SentSortField) => {
      if (sentSortField === field) {
        setSentSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      } else {
        setSentSortField(field)
        setSentSortDirection('asc')
      }
    },
    [sentSortField]
  )

  // Handle sort for received invoices
  const handleReceivedSort = useCallback(
    (field: ReceivedSortField) => {
      if (receivedSortField === field) {
        setReceivedSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      } else {
        setReceivedSortField(field)
        setReceivedSortDirection('asc')
      }
    },
    [receivedSortField]
  )

  // Sorted sent invoices
  const sortedSentInvoices = useMemo(() => {
    return [...sentInvoices].sort((a, b) => {
      let comparison = 0
      switch (sentSortField) {
        case 'recipient':
          comparison = (a.recipientName || a.buyerName || '').localeCompare(b.recipientName || b.buyerName || '')
          break
        case 'invoiceId':
          comparison = a.invoiceId.localeCompare(b.invoiceId)
          break
        case 'amount':
          comparison = a.payableAmount - b.payableAmount
          break
        case 'date':
          comparison = new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime()
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
      }
      return sentSortDirection === 'asc' ? comparison : -comparison
    })
  }, [sentInvoices, sentSortField, sentSortDirection])

  // Sorted received invoices
  const sortedReceivedInvoices = useMemo(() => {
    return [...receivedInvoices].sort((a, b) => {
      let comparison = 0
      switch (receivedSortField) {
        case 'supplier':
          comparison = (a.supplier?.name || '').localeCompare(b.supplier?.name || '')
          break
        case 'invoiceId':
          comparison = a.invoiceId.localeCompare(b.invoiceId)
          break
        case 'amount':
          comparison = a.taxInclusiveAmount - b.taxInclusiveAmount
          break
        case 'date':
          comparison = new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime()
          break
        case 'dueDate':
          comparison = new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime()
          break
      }
      return receivedSortDirection === 'asc' ? comparison : -comparison
    })
  }, [receivedInvoices, receivedSortField, receivedSortDirection])

  // Handle menu toggle
  const handleToggleMenu = useCallback((id: string, e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation()
    e.preventDefault()

    const button = e.currentTarget
    const rect = button.getBoundingClientRect()

    setOpenMenuId((prev) => {
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

  const handleCloseMenu = useCallback((): void => {
    setOpenMenuId(null)
    setMenuPosition(null)
  }, [])

  // Handle sent invoice actions
  const handleSentAction = useCallback(
    async (action: string, invoice: SentInvoice, e: React.MouseEvent): Promise<void> => {
      e.stopPropagation()
      handleCloseMenu()

      switch (action) {
        case 'details':
          setSelectedSentInvoice(invoice)
          break
        case 'resend':
          // TODO: Implement resend
          console.log('Resend invoice:', invoice.invoiceId)
          break
        case 'delete':
          const deleted = await deleteSentInvoice(invoice.id)
          if (deleted) {
            setSentInvoices((prev) => prev.filter((inv) => inv.id !== invoice.id))
            if (selectedSentInvoice?.id === invoice.id) {
              setSelectedSentInvoice(null)
            }
            refreshSentInvoices()
          }
          break
      }
    },
    [handleCloseMenu, selectedSentInvoice, refreshSentInvoices]
  )

  // Handle received invoice actions
  const handleReceivedAction = useCallback(
    async (action: string, invoice: InboxEInvoice, e: React.MouseEvent): Promise<void> => {
      e.stopPropagation()
      handleCloseMenu()

      switch (action) {
        case 'details':
          setSelectedReceivedInvoice(invoice)
          break
        case 'showInvoice':
          push(`/inbox/${invoice.inboxName}/${invoice.folderName}/${invoice.correlationId}`)
          break
        case 'delete':
          const deleted = await deleteInboxInvoice(invoice)
          if (deleted) {
            setReceivedInvoices((prev) => prev.filter((inv) => inv.correlationId !== invoice.correlationId))
            if (selectedReceivedInvoice?.correlationId === invoice.correlationId) {
              setSelectedReceivedInvoice(null)
            }
          }
          break
      }
    },
    [handleCloseMenu, push, selectedReceivedInvoice]
  )

  // Navigate to create
  const handleCreateInvoice = useCallback(async (): Promise<void> => {
    push('/einvoice/create/details')
  }, [push])

  // Get status badge props (uses StatusBadgeVariant: 'valid' | 'pending' | 'error')
  const getSentStatusBadge = (status: SentInvoiceStatus) => {
    switch (status) {
      case 'draft':
        return {label: 'Draft', variant: 'pending' as const}
      case 'sending':
        return {label: 'Sending', variant: 'pending' as const}
      case 'sent':
        return {label: 'Sent', variant: 'valid' as const}
      case 'delivered':
        return {label: 'Delivered', variant: 'valid' as const}
      case 'failed':
        return {label: 'Failed', variant: 'error' as const}
      default:
        return {label: status, variant: 'pending' as const}
    }
  }


  // Render meatballs icon
  const renderMeatballsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  )

  // Render menu for sent invoices
  const renderSentMenu = (invoice: SentInvoice) => {
    if (openMenuId !== invoice.id || !menuPosition) return null

    return (
      <>
        <div className={style.menuBackdrop} onClick={handleCloseMenu} />
        <div className={style.menuDropdown} style={{top: menuPosition.top, left: menuPosition.left}}>
          <button className={style.menuItem} onClick={(e) => handleSentAction('details', invoice, e)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            {translate('action_details_label', 'Details')}
          </button>
          {(invoice.status === 'failed' || invoice.status === 'draft') && (
            <button className={style.menuItem} onClick={(e) => handleSentAction('resend', invoice, e)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
              {translate('action_resend_label', 'Resend')}
            </button>
          )}
          <div className={style.menuDivider} />
          <button
            className={`${style.menuItem} ${style.menuItemDanger}`}
            onClick={(e) => handleSentAction('delete', invoice, e)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            {translate('action_delete_label', 'Delete')}
          </button>
        </div>
      </>
    )
  }

  // Render menu for received invoices
  const renderReceivedMenu = (invoice: InboxEInvoice) => {
    if (openMenuId !== invoice.correlationId || !menuPosition) return null

    return (
      <>
        <div className={style.menuBackdrop} onClick={handleCloseMenu} />
        <div className={style.menuDropdown} style={{top: menuPosition.top, left: menuPosition.left}}>
          <button className={style.menuItem} onClick={(e) => handleReceivedAction('details', invoice, e)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            {translate('action_details_label', 'Details')}
          </button>
          <button className={style.menuItem} onClick={(e) => handleReceivedAction('showInvoice', invoice, e)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            {translate('action_show_invoice_label', 'Show Invoice')}
          </button>
          <div className={style.menuDivider} />
          <button
            className={`${style.menuItem} ${style.menuItemDanger}`}
            onClick={(e) => handleReceivedAction('delete', invoice, e)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            {translate('action_delete_label', 'Delete')}
          </button>
        </div>
      </>
    )
  }

  // Render sent invoices table
  const renderSentTable = () => (
    <div className={style.tableContainer}>
      {/* Table */}
      {sentInvoices.length === 0 ? (
        <div className={style.emptyState}>
          <div className={style.emptyStateIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </div>
          <div className={style.emptyStateTitle}>
            {translate('einvoice_empty_sent_title', 'No Sent Invoices')}
          </div>
          <div className={style.emptyStateDescription}>
            {translate('einvoice_empty_sent_description', 'Invoices you send will appear here. Create a new invoice to get started.')}
          </div>
          <div className={style.emptyStateAction}>
            <PrimaryButton
              caption={translate('einvoice_action_send', 'Send eInvoice')}
              onClick={handleCreateInvoice}
            />
          </div>
        </div>
      ) : (
        <div className={`${style.table} ${selectedSentIds.size > 0 ? style.tableWithSelections : ''}`}>
          <div className={style.tableHeader}>
            <div className={style.checkboxCell}>
              <input
                type="checkbox"
                className={style.checkbox}
                checked={sentInvoices.length > 0 && selectedSentIds.size === sentInvoices.length}
                ref={(input) => {
                  if (input) {
                    input.indeterminate = selectedSentIds.size > 0 && selectedSentIds.size < sentInvoices.length
                  }
                }}
                onChange={(e) => handleSelectAllSent(e.target.checked)}
                aria-label="Select all"
              />
            </div>
            <div
              className={`${style.headerCell} ${style.headerCellSortable} ${style.cellTo} ${sentSortField === 'recipient' ? style.headerCellSorted : ''}`}
              onClick={() => handleSentSort('recipient')}
            >
              {translate('einvoice_column_to', 'To')}
              <SentSortIconComponent field="recipient" sortField={sentSortField} sortDirection={sentSortDirection} />
            </div>
            <div
              className={`${style.headerCell} ${style.headerCellSortable} ${style.cellInvoice} ${sentSortField === 'invoiceId' ? style.headerCellSorted : ''}`}
              onClick={() => handleSentSort('invoiceId')}
            >
              {translate('einvoice_column_invoice_id', 'Invoice')}
              <SentSortIconComponent field="invoiceId" sortField={sentSortField} sortDirection={sentSortDirection} />
            </div>
            <div
              className={`${style.headerCell} ${style.headerCellSortable} ${style.cellAmount} ${sentSortField === 'amount' ? style.headerCellSorted : ''}`}
              onClick={() => handleSentSort('amount')}
            >
              {translate('einvoice_column_amount', 'Amount')}
              <SentSortIconComponent field="amount" sortField={sentSortField} sortDirection={sentSortDirection} />
            </div>
            <div
              className={`${style.headerCell} ${style.headerCellSortable} ${style.cellDate} ${sentSortField === 'date' ? style.headerCellSorted : ''}`}
              onClick={() => handleSentSort('date')}
            >
              {translate('einvoice_column_date', 'Date')}
              <SentSortIconComponent field="date" sortField={sentSortField} sortDirection={sentSortDirection} />
            </div>
            <div
              className={`${style.headerCell} ${style.headerCellSortable} ${style.cellStatus} ${sentSortField === 'status' ? style.headerCellSorted : ''}`}
              onClick={() => handleSentSort('status')}
            >
              {translate('einvoice_column_status', 'Status')}
              <SentSortIconComponent field="status" sortField={sentSortField} sortDirection={sentSortDirection} />
            </div>
            <div className={`${style.headerCell} ${style.cellActions}`} />
          </div>

          {sortedSentInvoices.map((invoice) => {
            const statusBadge = getSentStatusBadge(invoice.status)
            return (
              <div
                key={invoice.id}
                className={`${style.tableRow} ${selectedSentInvoice?.id === invoice.id ? style.selected : ''}`}
                onClick={() => setSelectedSentInvoice(invoice)}
                onDoubleClick={() => push(`/einvoice/sent/${invoice.id}`)}
                role="row"
                tabIndex={0}
              >
                <div className={style.checkboxCell}>
                  <input
                    type="checkbox"
                    checked={selectedSentIds.has(invoice.id)}
                    onChange={() => {}}
                    onClick={(e) => handleToggleSentSelection(invoice.id, e)}
                    className={style.checkbox}
                    aria-label={`Select ${invoice.invoiceId}`}
                  />
                </div>
                <div className={`${style.cell} ${style.cellTo}`}>
                  <div className={style.partyInfo}>
                    <span className={style.partyName}>{invoice.recipientName || invoice.buyerName}</span>
                    <span className={style.partyDid}>{invoice.recipientDid}</span>
                  </div>
                </div>
                <div className={`${style.cell} ${style.cellInvoice}`}>
                  <span className={style.invoiceId}>{invoice.invoiceId}</span>
                </div>
                <div className={`${style.cell} ${style.cellAmount}`}>
                  <span className={style.amount}>{formatCurrency(invoice.payableAmount, invoice.currencyCode)}</span>
                </div>
                <div className={`${style.cell} ${style.cellDate}`}>{formatDate(invoice.invoiceDate)}</div>
                <div className={`${style.cell} ${style.cellStatus}`}>
                  <StatusBadge label={statusBadge.label} variant={statusBadge.variant} size="small" />
                </div>
                <div className={`${style.cell} ${style.cellActions}`}>
                  <div className={style.menuContainer}>
                    <button
                      type="button"
                      className={style.meatballsButton}
                      onClick={(e) => handleToggleMenu(invoice.id, e)}
                      onMouseDown={(e) => e.stopPropagation()}
                      aria-label="Open menu"
                    >
                      {renderMeatballsIcon()}
                    </button>
                    {renderSentMenu(invoice)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  // Render received invoices table (only shows verified/approved invoices)
  const renderReceivedTable = () => (
    <div className={style.tableContainer}>
      {/* Table - no status tabs since all received invoices here are approved */}
      {receivedInvoices.length === 0 ? (
        <div className={style.emptyState}>
          <div className={style.emptyStateIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
          </div>
          <div className={style.emptyStateTitle}>{translate('einvoice_empty_received_title', 'No Accepted Invoices')}</div>
          <div className={style.emptyStateDescription}>
            {translate('einvoice_empty_received_description', 'Invoices you accept in your inbox will appear here.')}
          </div>
          {pendingInboxCount > 0 && (
            <button className={style.emptyStateButton} onClick={() => push('/inbox')}>
              {translate('einvoice_view_inbox', 'View Inbox')} ({pendingInboxCount} {translate('einvoice_pending', 'pending')})
            </button>
          )}
        </div>
      ) : (
        <div className={`${style.table} ${selectedReceivedIds.size > 0 ? style.tableWithSelections : ''}`}>
          <div className={style.tableHeader}>
            <div className={style.checkboxCell}>
              <input
                type="checkbox"
                className={style.checkbox}
                checked={receivedInvoices.length > 0 && selectedReceivedIds.size === receivedInvoices.length}
                ref={(input) => {
                  if (input) {
                    input.indeterminate = selectedReceivedIds.size > 0 && selectedReceivedIds.size < receivedInvoices.length
                  }
                }}
                onChange={(e) => handleSelectAllReceived(e.target.checked)}
                aria-label="Select all"
              />
            </div>
            <div
              className={`${style.headerCell} ${style.headerCellSortable} ${style.cellFrom} ${receivedSortField === 'supplier' ? style.headerCellSorted : ''}`}
              onClick={() => handleReceivedSort('supplier')}
            >
              {translate('einvoice_column_from', 'From')}
              <ReceivedSortIconComponent field="supplier" sortField={receivedSortField} sortDirection={receivedSortDirection} />
            </div>
            <div
              className={`${style.headerCell} ${style.headerCellSortable} ${style.cellInvoice} ${receivedSortField === 'invoiceId' ? style.headerCellSorted : ''}`}
              onClick={() => handleReceivedSort('invoiceId')}
            >
              {translate('einvoice_column_invoice_id', 'Invoice')}
              <ReceivedSortIconComponent field="invoiceId" sortField={receivedSortField} sortDirection={receivedSortDirection} />
            </div>
            <div
              className={`${style.headerCell} ${style.headerCellSortable} ${style.cellAmount} ${receivedSortField === 'amount' ? style.headerCellSorted : ''}`}
              onClick={() => handleReceivedSort('amount')}
            >
              {translate('einvoice_column_amount', 'Amount')}
              <ReceivedSortIconComponent field="amount" sortField={receivedSortField} sortDirection={receivedSortDirection} />
            </div>
            <div
              className={`${style.headerCell} ${style.headerCellSortable} ${style.cellDate} ${receivedSortField === 'date' ? style.headerCellSorted : ''}`}
              onClick={() => handleReceivedSort('date')}
            >
              {translate('einvoice_column_date', 'Date')}
              <ReceivedSortIconComponent field="date" sortField={receivedSortField} sortDirection={receivedSortDirection} />
            </div>
            <div
              className={`${style.headerCell} ${style.headerCellSortable} ${style.cellDue} ${receivedSortField === 'dueDate' ? style.headerCellSorted : ''}`}
              onClick={() => handleReceivedSort('dueDate')}
            >
              {translate('einvoice_column_due', 'Due')}
              <ReceivedSortIconComponent field="dueDate" sortField={receivedSortField} sortDirection={receivedSortDirection} />
            </div>
            <div className={`${style.headerCell} ${style.cellActions}`} />
          </div>

          {sortedReceivedInvoices.map((invoice) => (
            <div
              key={invoice.correlationId}
              className={`${style.tableRow} ${selectedReceivedInvoice?.correlationId === invoice.correlationId ? style.selected : ''}`}
              onClick={() => setSelectedReceivedInvoice(invoice)}
              onDoubleClick={() => push(`/inbox/${invoice.inboxName}/${invoice.folderName}/${invoice.correlationId}`)}
              role="row"
              tabIndex={0}
            >
              <div className={style.checkboxCell}>
                <input
                  type="checkbox"
                  checked={selectedReceivedIds.has(invoice.correlationId)}
                  onChange={() => {}}
                  onClick={(e) => handleToggleReceivedSelection(invoice.correlationId, e)}
                  className={style.checkbox}
                  aria-label={`Select ${invoice.invoiceId}`}
                />
              </div>
              <div className={`${style.cell} ${style.cellFrom}`}>
                <div className={style.partyInfo}>
                  <span className={style.partyName}>{invoice.supplier?.name || 'Unknown'}</span>
                  {invoice.supplier?.email && <span className={style.partyEmail}>{invoice.supplier.email}</span>}
                </div>
              </div>
              <div className={`${style.cell} ${style.cellInvoice}`}>
                <span className={style.invoiceId}>{invoice.invoiceId}</span>
              </div>
              <div className={`${style.cell} ${style.cellAmount}`}>
                <span className={style.amount}>{formatCurrency(invoice.taxInclusiveAmount, invoice.currencyCode)}</span>
              </div>
              <div className={`${style.cell} ${style.cellDate}`}>{formatDate(invoice.invoiceDate)}</div>
              <div className={`${style.cell} ${style.cellDue}`}>{formatDate(invoice.dueDate)}</div>
              <div className={`${style.cell} ${style.cellActions}`}>
                <div className={style.menuContainer}>
                  <button
                    type="button"
                    className={style.meatballsButton}
                    onClick={(e) => handleToggleMenu(invoice.correlationId, e)}
                    onMouseDown={(e) => e.stopPropagation()}
                    aria-label="Open menu"
                  >
                    {renderMeatballsIcon()}
                  </button>
                  {renderReceivedMenu(invoice)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // Get contact info for selected invoice (for InboxDetailPanel)
  const getContactForInvoice = useCallback((invoice: InboxEInvoice): InboxContact | undefined => {
    if (!invoice.supplier?.name) return undefined
    return {
      id: invoice.senderDid || '',
      displayName: invoice.supplier.name,
      did: invoice.senderDid || '',
      organizationName: invoice.supplier.name,
      email: invoice.supplier.email,
    }
  }, [])

  // Handle view full invoice from detail panel (received invoices)
  const handleViewFullInvoice = useCallback(() => {
    if (selectedReceivedInvoice) {
      push(`/inbox/${selectedReceivedInvoice.inboxName}/${selectedReceivedInvoice.folderName}/${selectedReceivedInvoice.correlationId}`)
    }
  }, [selectedReceivedInvoice, push])

  // Handle view full invoice from detail panel (sent invoices)
  const handleViewFullSentInvoice = useCallback(() => {
    if (selectedSentInvoice) {
      push(`/einvoice/sent/${selectedSentInvoice.id}`)
    }
  }, [selectedSentInvoice, push])

  // Handle view contact from detail panel
  const handleViewContact = useCallback((contactId: string) => {
    push(`/contacts/${contactId}`)
  }, [push])

  // No-op handlers for approve/reject (not needed for already verified invoices)
  const handleApprove = useCallback(async (_invoice: InboxEInvoice): Promise<void> => {
    // Already verified invoices don't need approval
  }, [])

  const handleReject = useCallback(async (_invoice: InboxEInvoice): Promise<void> => {
    // Already verified invoices don't need rejection
  }, [])

  // Handle send/resend for draft or failed sent invoices
  const handleSendInvoice = useCallback(
    async (_invoice: InboxEInvoice): Promise<void> => {
      // Use the selected sent invoice directly (not finding by invoiceId which isn't unique)
      if (!selectedSentInvoice) {
        console.error('[EInvoice] No sent invoice selected')
        return
      }

      // Re-fetch to get current status (prevents double-send issues)
      const currentInvoice = await fetchSentInvoiceById(selectedSentInvoice.id)
      if (!currentInvoice) {
        console.error('[EInvoice] Invoice no longer exists:', selectedSentInvoice.id)
        await refreshSentInvoices()
        setSelectedSentInvoice(null)
        return
      }

      // Check if still in sendable state
      if (currentInvoice.status !== 'draft' && currentInvoice.status !== 'failed') {
        console.warn('[EInvoice] Invoice is no longer sendable, status:', currentInvoice.status)
        await refreshSentInvoices()
        return
      }

      try {
        // Send the draft invoice directly
        const updated = await sendDraftInvoice(currentInvoice)
        // Update local state with the new status
        setSentInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)))
        setSelectedSentInvoice(updated)
      } catch (error: any) {
        console.error('[EInvoice] Failed to send invoice:', error)
        // Refresh to get the updated (failed) status
        await refreshSentInvoices()
      }
    },
    [selectedSentInvoice, refreshSentInvoices]
  )

  // Handle delete for draft sent invoices
  const handleDeleteSentInvoice = useCallback(
    async (_invoice: InboxEInvoice): Promise<void> => {
      // Use the selected sent invoice directly (not finding by invoiceId which isn't unique)
      if (!selectedSentInvoice) {
        console.error('[EInvoice] No sent invoice selected')
        return
      }

      const deleted = await deleteSentInvoice(selectedSentInvoice.id)
      if (deleted) {
        setSentInvoices((prev) => prev.filter((inv) => inv.id !== selectedSentInvoice.id))
        setSelectedSentInvoice(null)
        refreshSentInvoices()
      }
    },
    [selectedSentInvoice, refreshSentInvoices]
  )

  // Handle edit for draft sent invoices - navigate to wizard with draft ID
  const handleEditSentInvoice = useCallback(
    (_invoice: InboxEInvoice): void => {
      // Use the selected sent invoice directly (not finding by invoiceId which isn't unique)
      if (!selectedSentInvoice) {
        console.error('[EInvoice] No sent invoice selected')
        return
      }

      // Navigate to the wizard with the draft ID as a query param
      push(`/einvoice/create/details?draftId=${selectedSentInvoice.id}`)
    },
    [selectedSentInvoice, push]
  )

  return (
    <div className={style.container}>
      <AppHeaderBar title={translate('einvoice_overview_title', 'eInvoices')} />

      {/* Inbox indicator when there are pending invoices */}
      {pendingInboxCount > 0 && (
        <div className={style.inboxIndicator}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
          <span>
            {pendingInboxCount} {pendingInboxCount === 1 ? translate('einvoice_invoice', 'invoice') : translate('einvoice_invoices', 'invoices')}{' '}
            {translate('einvoice_awaiting_acceptance', 'awaiting acceptance')}
          </span>
          <button type="button" className={style.inboxIndicatorLink} onClick={() => push('/inbox')}>
            {translate('einvoice_go_to_inbox', 'Go to Inbox')}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      <div className={style.mainLayout}>
        {/* Content Area */}
        <div
          className={`${style.contentArea} ${selectedSentInvoice || selectedReceivedInvoice ? style.contentAreaWithDetail : ''}`}
        >
          {/* Header with tabs, selection overlay */}
          <ListPageHeader
            tabs={headerTabs}
            activeTab={activeTab}
            onTabChange={(tabId) => handleTabChange(tabId as TabType)}
            selectionCount={currentSelectionCount}
            onClearSelection={handleClearSelection}
            onDeleteSelected={handleDeleteCurrentSelection}
            selectionLabel={{singular: 'invoice', plural: 'invoices'}}
            actions={
              <PrimaryButton
                caption={translate('einvoice_action_send', 'Send eInvoice')}
                onClick={handleCreateInvoice}
              />
            }
          />

          {/* Tab Content */}
          {isLoading ? (
            <div className={style.loadingState}>
              <div className={style.spinner} />
              <span>{translate('loading', 'Loading...')}</span>
            </div>
          ) : (
            <>
              {activeTab === 'received' && renderReceivedTable()}
              {activeTab === 'sent' && renderSentTable()}
            </>
          )}
        </div>

        {/* Detail Panel - consistent for both sent and received */}
        {activeTab === 'sent' && selectedSentInvoice && (
          <InboxDetailPanel
            invoice={mapSentToInboxEInvoice(selectedSentInvoice)}
            contact={{
              id: selectedSentInvoice.recipientDid,
              displayName: selectedSentInvoice.recipientName || selectedSentInvoice.buyerName,
              did: selectedSentInvoice.recipientDid,
              organizationName: selectedSentInvoice.recipientName || selectedSentInvoice.buyerName,
            }}
            onClose={() => setSelectedSentInvoice(null)}
            onViewFullInvoice={handleViewFullSentInvoice}
            onSend={handleSendInvoice}
            onDelete={handleDeleteSentInvoice}
            onEdit={handleEditSentInvoice}
            className={style.detailPanel}
          />
        )}
        {activeTab === 'received' && selectedReceivedInvoice && (
          <InboxDetailPanel
            invoice={selectedReceivedInvoice}
            contact={getContactForInvoice(selectedReceivedInvoice)}
            onClose={() => setSelectedReceivedInvoice(null)}
            onViewFullInvoice={handleViewFullInvoice}
            onViewContact={handleViewContact}
            onApprove={handleApprove}
            onReject={handleReject}
            className={style.detailPanel}
          />
        )}
      </div>
    </div>
  )
}

// Sort Icon Component for Sent Invoices
const SentSortIconComponent: React.FC<{
  field: SentSortField
  sortField: SentSortField
  sortDirection: SortDirection
}> = ({field, sortField, sortDirection}) => {
  if (sortField !== field) {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={style.sortIconInactive}>
        <path d="M6 2L9 5H3L6 2Z" fill="currentColor" />
        <path d="M6 10L3 7H9L6 10Z" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={style.sortIcon}>
      {sortDirection === 'asc' ? (
        <path d="M6 2L9 5H3L6 2Z" fill="currentColor" />
      ) : (
        <path d="M6 10L3 7H9L6 10Z" fill="currentColor" />
      )}
    </svg>
  )
}

// Sort Icon Component for Received Invoices
const ReceivedSortIconComponent: React.FC<{
  field: ReceivedSortField
  sortField: ReceivedSortField
  sortDirection: SortDirection
}> = ({field, sortField, sortDirection}) => {
  if (sortField !== field) {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={style.sortIconInactive}>
        <path d="M6 2L9 5H3L6 2Z" fill="currentColor" />
        <path d="M6 10L3 7H9L6 10Z" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={style.sortIcon}>
      {sortDirection === 'asc' ? (
        <path d="M6 2L9 5H3L6 2Z" fill="currentColor" />
      ) : (
        <path d="M6 10L3 7H9L6 10Z" fill="currentColor" />
      )}
    </svg>
  )
}

export const getStaticProps = async ({locale = 'en'}: {locale?: string}) => staticPropsWithSST({locale})

export default EInvoiceListPage
