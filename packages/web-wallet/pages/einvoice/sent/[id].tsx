import React, {useMemo, useCallback, useState, useEffect} from 'react'
import {useParams, useNavigate, useLocation} from 'react-router-dom'
import {useTranslate} from '@refinedev/core'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import UBLInvoiceDetailView from '@components/views/UBLInvoiceView/UBLInvoiceDetailView'
import {InboxEInvoice, InboxEvidence} from '@components/views/InboxView/types'
import {InvoiceEvidence, InvoiceParty} from '@components/views/UBLInvoiceView/types'
import {fetchSentInvoiceById, SentInvoice, SentInvoiceStatus} from '@/src/services/inboxService'
import {staticPropsWithSST} from '@/src/i18n/server'
import styles from './[id].module.css'

/**
 * Sent Invoice Detail Page
 *
 * Full-page view for displaying sent invoice details.
 * Uses UBLInvoiceDetailView for the detailed content.
 *
 * Route: /einvoice/sent/{id}
 *
 * Features:
 * - Full invoice details with tabs (Summary, Line Items, Parties, Evidence)
 * - Back navigation to sent invoices list
 * - Responsive design for all screen sizes
 * - Evidence download functionality
 */

// Map SentInvoice to InboxEInvoice format for the detail view
const mapSentToInboxEInvoice = (sent: SentInvoice): InboxEInvoice => {
  // Map sent status to inbox status (for badge variant coloring)
  const statusMap: Record<SentInvoiceStatus, 'pending' | 'verified' | 'invalid'> = {
    draft: 'pending',
    sending: 'pending',
    sent: 'verified',
    delivered: 'verified',
    failed: 'invalid',
  }

  // Map sent status to display label
  const statusLabelMap: Record<SentInvoiceStatus, string> = {
    draft: 'Draft',
    sending: 'Sending',
    sent: 'Sent',
    delivered: 'Delivered',
    failed: 'Failed',
  }

  // Use full supplier/customer info if available, otherwise fall back to basic fields
  const supplier: InvoiceParty = sent.supplier || {
    name: sent.sellerName,
    vatNumber: sent.sellerTaxId,
  }
  const customer: InvoiceParty = sent.customer || {
    name: sent.buyerName,
    vatNumber: sent.buyerTaxId,
  }

  return {
    invoiceId: sent.invoiceId,
    invoiceDate: sent.invoiceDate,
    dueDate: sent.dueDate || '',
    currencyCode: sent.currencyCode,
    taxExclusiveAmount: sent.taxExclusiveAmount,
    taxAmount: sent.taxAmount,
    taxInclusiveAmount: sent.taxInclusiveAmount,
    invoiceType: sent.invoiceTypeCode,
    paymentTerms: sent.paymentTerms,
    supplier,
    customer,
    lineItems: sent.lineItems,
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

const SentInvoiceDetailPage: React.FC = () => {
  const {id} = useParams<{id: string}>()
  const navigate = useNavigate()
  const location = useLocation()
  const translate = useTranslate()
  const [isLoading, setIsLoading] = useState(true)
  const [invoice, setInvoice] = useState<InboxEInvoice | null>(null)

  // Fetch invoice from localStorage
  useEffect(() => {
    const loadInvoice = async () => {
      if (!id) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        console.log('[SentInvoiceDetailPage] Fetching sent invoice:', id)
        const sentInvoice = await fetchSentInvoiceById(id)
        if (sentInvoice) {
          const mappedInvoice = mapSentToInboxEInvoice(sentInvoice)
          console.log('[SentInvoiceDetailPage] Mapped invoice:', mappedInvoice)
          setInvoice(mappedInvoice)
        } else {
          setInvoice(null)
        }
      } catch (error) {
        console.error('[SentInvoiceDetailPage] Error fetching invoice:', error)
        setInvoice(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadInvoice()
  }, [id])

  // Build the back path
  const getBackPath = useCallback((): string => {
    const state = location.state as {from?: string} | null
    if (state?.from) {
      return state.from
    }
    return '/einvoice?tab=sent'
  }, [location])

  // Handle back navigation
  const handleBack = useCallback(async (): Promise<void> => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(getBackPath())
    }
  }, [navigate, getBackPath])

  // Handle close (same as back)
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
    if (evidence.id && evidence.id.startsWith('http')) {
      window.open(evidence.id, '_blank')
    }
  }, [])

  // Handle view contact
  const handleViewContact = useCallback((party: InvoiceParty) => {
    if (party.contactId) {
      navigate(`/contacts/${party.contactId}`)
    }
  }, [navigate])

  // Build breadcrumb path
  const getBreadcrumbPath = useCallback((invoiceId?: string): string => {
    const parts = [translate('nav_einvoices', 'eInvoices'), translate('einvoice_tab_sent', 'Sent')]
    if (invoiceId) {
      parts.push(invoiceId)
    } else {
      parts.push(translate('einvoice_not_found', 'Not Found'))
    }
    return parts.join(' / ')
  }, [translate])

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
            {translate('einvoice_show_back_to_sent', 'Back to Sent Invoices')}
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
            onDownloadEvidence={handleDownloadEvidence}
            onViewEvidence={handleViewEvidence}
            onViewContact={handleViewContact}
            showActions={false}
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

export default SentInvoiceDetailPage
