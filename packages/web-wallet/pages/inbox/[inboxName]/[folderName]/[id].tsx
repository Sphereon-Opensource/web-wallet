import React, {useMemo, useCallback, useState, useEffect} from 'react'
import {useParams, useNavigate, useLocation} from 'react-router-dom'
import {useTranslate} from '@refinedev/core'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import UBLInvoiceDetailView from '@components/views/UBLInvoiceView/UBLInvoiceDetailView'
import {InboxEInvoice, InboxEvidence} from '@components/views/InboxView/types'
import {InvoiceEvidence, InvoiceParty, UBLInvoiceData} from '@components/views/UBLInvoiceView/types'
import {fetchInboxInvoiceById, approveInvoice, rejectInvoice, fetchEvidenceFile, updateInboxCredentialParsedData} from '@/src/services/inboxService'
import {staticPropsWithSST} from '@/src/i18n/server'
import styles from './[id].module.css'

/**
 * Inbox Item Detail Page
 *
 * Full-page view for displaying invoice details from the inbox.
 * Uses UBLInvoiceDetailView for the detailed content.
 *
 * Route: /inbox/{inboxName}/{folderName}/{id}
 *
 * Features:
 * - Full invoice details with tabs (Summary, Line Items, Parties, Evidence, Credential)
 * - Back navigation to inbox
 * - Responsive design for all screen sizes
 * - Evidence download functionality
 * - Approval actions shown only for pending invoices accessed from inbox
 */
const InboxItemDetailPage: React.FC = () => {
  const {inboxName, folderName, id} = useParams<{inboxName: string; folderName: string; id: string}>()
  const navigate = useNavigate()
  const location = useLocation()
  const translate = useTranslate()
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [invoice, setInvoice] = useState<InboxEInvoice | null>(null)

  // Fetch invoice from backend (includes persisted parsed data if available)
  useEffect(() => {
    const loadInvoice = async () => {
      if (!inboxName || !folderName || !id) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        console.log('[InboxDetailPage] Fetching invoice:', {inboxName, folderName, id})
        const fetchedInvoice = await fetchInboxInvoiceById(inboxName, folderName, id)
        console.log('[InboxDetailPage] Fetched invoice:', fetchedInvoice)
        setInvoice(fetchedInvoice)
      } catch (error) {
        console.error('[InboxDetailPage] Error fetching invoice:', error)
        setInvoice(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadInvoice()
  }, [inboxName, folderName, id])

  // Determine if we're coming from inbox (show action buttons)
  const isFromInbox = useMemo(() => {
    return location.pathname.includes('/inbox/')
  }, [location.pathname])

  // Build the back path using inbox/folder from route params
  const getBackPath = useCallback((): string => {
    // Check if we have history state with a return path
    const state = location.state as {from?: string} | null
    if (state?.from) {
      return state.from
    }
    // Default to main inbox list
    return '/inbox'
  }, [location])

  // Handle back navigation - uses browser history when available
  const handleBack = useCallback(async (): Promise<void> => {
    // Try to go back in history first if there's history
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(getBackPath())
    }
  }, [navigate, getBackPath])

  // Handle close (same as back for this view)
  const handleClose = useCallback(() => {
    handleBack()
  }, [handleBack])

  // Handle evidence download
  const handleDownloadEvidence = useCallback((evidence: InvoiceEvidence) => {
    console.log('Downloading evidence:', evidence.name)
    // Open evidence URL in new tab if available
    if (evidence.id && evidence.id.startsWith('http')) {
      window.open(evidence.id, '_blank')
    }
  }, [])

  // Handle evidence view
  const handleViewEvidence = useCallback((evidence: InvoiceEvidence) => {
    console.log('Viewing evidence:', evidence.name)
    // Open evidence URL in new tab if available
    if (evidence.id && evidence.id.startsWith('http')) {
      window.open(evidence.id, '_blank')
    }
  }, [])

  // Handle fetch evidence - downloads external evidence and parses UBL data
  const handleFetchEvidence = useCallback(async (evidence: InvoiceEvidence): Promise<void> => {
    if (!invoice) return

    console.log('[InboxDetailPage] Fetching evidence:', evidence.name)

    // Convert InvoiceEvidence to InboxEvidence for the service function
    const inboxEvidence: InboxEvidence = {
      id: evidence.id,
      type: evidence.type,
      name: evidence.name,
      digestMultibase: evidence.digestMultibase,
      storageStatus: evidence.storageStatus ?? 'external',
    }

    try {
      // Update evidence status to fetching
      setInvoice(prev => {
        if (!prev) return prev
        return {
          ...prev,
          evidence: prev.evidence.map(e =>
            e.id === evidence.id ? {...e, storageStatus: 'fetching' as const} : e
          ),
        }
      })

      // Fetch and parse the evidence file
      const result = await fetchEvidenceFile(inboxEvidence)
      console.log('[InboxDetailPage] Evidence fetched:', result)

      // Build the updates object first so we can persist it
      const updatedEvidenceItem = {
        storageStatus: 'stored' as const,
        mimeType: result.evidence.mimeType,
        size: result.evidence.size,
      }

      // Build parsed data for persistence
      const parsedDataToSave: Record<string, unknown> = {}

      // Build evidence status map for persistence - MERGE with existing statuses
      // This ensures previously fetched evidence statuses are not lost
      const evidenceStatus: Record<string, {
        storageStatus: 'external' | 'stored' | 'fetching'
        mimeType?: string
        size?: number
      }> = {}

      // First, add all existing evidence statuses from the current invoice state
      for (const ev of invoice.evidence) {
        if (ev.storageStatus && ev.storageStatus !== 'external') {
          evidenceStatus[ev.id] = {
            storageStatus: ev.storageStatus,
            mimeType: ev.mimeType,
            size: ev.size,
          }
        }
      }

      // Then add/update the current evidence item
      evidenceStatus[evidence.id] = updatedEvidenceItem

      parsedDataToSave.evidenceStatus = evidenceStatus

      // Add UBL data if available
      if (result.ublData) {
        if (result.ublData.lineItems && result.ublData.lineItems.length > 0) {
          parsedDataToSave.lineItems = result.ublData.lineItems
        }
        if (result.ublData.supplier) {
          parsedDataToSave.supplier = result.ublData.supplier
        }
        if (result.ublData.customer) {
          parsedDataToSave.customer = result.ublData.customer
        }
        if (result.ublData.invoiceType) {
          parsedDataToSave.invoiceType = result.ublData.invoiceType
        }
        if (result.ublData.paymentTerms) {
          parsedDataToSave.paymentTerms = result.ublData.paymentTerms
        }
      }

      // Update invoice state with fetched evidence and parsed UBL data
      setInvoice(prev => {
        if (!prev) return prev

        // Update the evidence item with stored status
        const updatedEvidence = prev.evidence.map(e =>
          e.id === evidence.id ? {
            ...e,
            ...updatedEvidenceItem,
          } : e
        )

        // Merge UBL data if available
        const updates: Partial<InboxEInvoice> = {
          evidence: updatedEvidence,
        }

        if (result.ublData) {
          // Update with parsed UBL data - prefer UBL data over existing if available
          if (result.ublData.lineItems && result.ublData.lineItems.length > 0) {
            updates.lineItems = result.ublData.lineItems
          }
          if (result.ublData.supplier) {
            // Merge with existing supplier data (preserve DID, contactId)
            updates.supplier = {
              ...prev.supplier,
              ...result.ublData.supplier,
              did: prev.supplier?.did,
              contactId: prev.supplier?.contactId,
            }
          }
          if (result.ublData.customer) {
            // Merge with existing customer data (preserve DID, contactId)
            updates.customer = {
              ...prev.customer,
              ...result.ublData.customer,
              did: prev.customer?.did,
              contactId: prev.customer?.contactId,
            }
          }
          if (result.ublData.invoiceType) {
            updates.invoiceType = result.ublData.invoiceType
          }
          if (result.ublData.paymentTerms) {
            updates.paymentTerms = result.ublData.paymentTerms
          }
        }

        return {...prev, ...updates}
      })

      // Persist parsed data to backend
      try {
        await updateInboxCredentialParsedData(invoice.correlationId, parsedDataToSave)
        console.log('[InboxDetailPage] Parsed data persisted to backend')
      } catch (persistError) {
        console.warn('[InboxDetailPage] Failed to persist parsed data (non-fatal):', persistError)
        // Don't throw - the local state is already updated
      }

      console.log('[InboxDetailPage] Invoice state updated with evidence data')
    } catch (error: any) {
      console.error('[InboxDetailPage] Error fetching evidence:', error)

      // Revert evidence status to external on error
      setInvoice(prev => {
        if (!prev) return prev
        return {
          ...prev,
          evidence: prev.evidence.map(e =>
            e.id === evidence.id ? {...e, storageStatus: 'external' as const} : e
          ),
        }
      })

      // Show user-friendly error message
      const errorMessage = error?.message || 'Failed to fetch evidence file'
      alert(`Could not download evidence: ${errorMessage}`)
    }
  }, [invoice])

  // Handle approve action
  const handleApprove = useCallback(async (invoiceData: UBLInvoiceData) => {
    if (!invoice) return
    console.log('[InboxDetailPage] Approving invoice:', invoiceData.invoiceId)
    setIsProcessing(true)
    try {
      const success = await approveInvoice(invoice)
      if (success) {
        console.log('[InboxDetailPage] Invoice approved successfully')
        navigate(getBackPath())
      } else {
        console.error('[InboxDetailPage] Failed to approve invoice')
      }
    } catch (error) {
      console.error('[InboxDetailPage] Error approving invoice:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [invoice, navigate, getBackPath])

  // Handle reject action
  const handleReject = useCallback(async (invoiceData: UBLInvoiceData) => {
    if (!invoice) return
    console.log('[InboxDetailPage] Rejecting invoice:', invoiceData.invoiceId)
    setIsProcessing(true)
    try {
      const success = await rejectInvoice(invoice)
      if (success) {
        console.log('[InboxDetailPage] Invoice rejected successfully')
        navigate(getBackPath())
      } else {
        console.error('[InboxDetailPage] Failed to reject invoice')
      }
    } catch (error) {
      console.error('[InboxDetailPage] Error rejecting invoice:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [invoice, navigate, getBackPath])

  // Handle view contact - navigates to contact details page
  const handleViewContact = useCallback((party: InvoiceParty) => {
    if (party.contactId) {
      navigate(`/contacts/${party.contactId}`)
    }
  }, [navigate])

  // Determine if approval actions should be shown
  // Only show when from inbox AND invoice is in pending state
  const showApprovalActions = useMemo(() => {
    return isFromInbox && invoice?.status === 'pending'
  }, [isFromInbox, invoice?.status])

  // Build breadcrumb path based on route params
  const getBreadcrumbPath = useCallback((invoiceId?: string): string => {
    const parts = [translate('nav_inbox', 'Inbox')]

    if (inboxName) {
      // Capitalize first letter of inbox name for display
      parts.push(inboxName.charAt(0).toUpperCase() + inboxName.slice(1))
    }

    if (folderName) {
      // Format folder name (replace hyphens with spaces, title case)
      const folderDisplay = folderName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      parts.push(folderDisplay)
    }

    if (invoiceId) {
      parts.push(invoiceId)
    } else {
      parts.push(translate('einvoice_not_found', 'Not Found'))
    }

    return parts.join(' / ')
  }, [inboxName, folderName, translate])

  // Show loading state
  if (isLoading) {
    return (
      <div className={styles.container}>
        <PageHeaderBar
          title={translate('einvoice_show_title', 'Invoice Details')}
          path={getBreadcrumbPath()}
          onBack={handleBack}
        />
        <div className={styles.loading}>
          <div className={styles.loadingSpinner} />
          <p>{translate('loading', 'Loading...')}</p>
        </div>
      </div>
    )
  }

  // Show not found state
  if (!invoice) {
    return (
      <div className={styles.container}>
        <PageHeaderBar
          title={translate('einvoice_show_title', 'Invoice Details')}
          path={getBreadcrumbPath()}
          onBack={handleBack}
        />
        <div className={styles.notFound}>
          <div className={styles.notFoundIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className={styles.notFoundTitle}>
            {translate('einvoice_show_not_found_title', 'Invoice Not Found')}
          </h2>
          <p className={styles.notFoundDescription}>
            {translate('einvoice_show_not_found_description', 'The invoice you are looking for could not be found.')}
          </p>
          <button className={styles.notFoundButton} onClick={handleBack}>
            {translate('einvoice_show_back_to_inbox', 'Back to Inbox')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <PageHeaderBar
        title={translate('einvoice_show_title', 'Invoice Details')}
        path={getBreadcrumbPath(invoice.invoiceId)}
        onBack={handleBack}
      />
      <main className={styles.main}>
        <div className={styles.content}>
          <UBLInvoiceDetailView
            invoice={invoice}
            onClose={handleClose}
            onFetchEvidence={handleFetchEvidence}
            onDownloadEvidence={handleDownloadEvidence}
            onViewEvidence={handleViewEvidence}
            onViewContact={handleViewContact}
            showActions={showApprovalActions}
            onApprove={handleApprove}
            onReject={handleReject}
            isProcessing={isProcessing}
          />
        </div>
      </main>
    </div>
  )
}

export const getStaticProps = async ({locale = 'en'}: {locale?: string}) => staticPropsWithSST({locale})

export const getStaticPaths = () => ({
  paths: [],
  fallback: 'blocking',
})

export default InboxItemDetailPage
