import React, {useEffect, useState, useCallback} from 'react'
import InboxView, {Inbox, InboxEInvoice, InboxContact} from '@components/views/InboxView'
import {staticPropsWithSST} from '@/src/i18n/server'
import {
  fetchInboxes,
  fetchInboxInvoices,
  approveInvoice,
  rejectInvoice,
} from '@/src/services/inboxService'

/**
 * Inbox Page
 *
 * Main inbox view for receiving credentials (eInvoices, trade documents, etc.).
 * Uses the InboxView component which provides:
 * - Sidebar navigation for inboxes and folders
 * - Table view with status filtering
 * - Detail panel for selected items
 * - Responsive layout for all screen sizes
 *
 * Route structure follows inbox/folder pattern:
 * - /inbox - Main inbox list view
 * - /inbox/{inboxName}/{folderName}/{id} - Specific item detail view
 */
const InboxPage: React.FC = () => {
  const [inboxes, setInboxes] = useState<Inbox[]>([])
  const [invoices, setInvoices] = useState<InboxEInvoice[]>([])
  const [contacts, setContacts] = useState<Record<string, InboxContact>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      // Fetch inboxes and invoices in parallel
      const [fetchedInboxes, fetchedInvoices] = await Promise.all([
        fetchInboxes(),
        fetchInboxInvoices(),
      ])

      setInboxes(fetchedInboxes)
      setInvoices(fetchedInvoices)

      // Build contacts map from invoice senders
      const contactsMap: Record<string, InboxContact> = {}
      fetchedInvoices.forEach((invoice) => {
        if (invoice.senderDid && invoice.supplier && !contactsMap[invoice.senderDid]) {
          contactsMap[invoice.senderDid] = {
            id: invoice.senderDid,
            displayName: invoice.supplier.name,
            did: invoice.senderDid,
            organizationName: invoice.supplier.name,
            email: invoice.supplier.email,
          }
        }
      })
      setContacts(contactsMap)
    } catch (err) {
      console.error('[InboxPage] Error loading data:', err)
      setError('Failed to load inbox data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateInvoice = useCallback(async (invoice: InboxEInvoice): Promise<void> => {
    console.log('[InboxPage] Updating invoice:', invoice.invoiceId, 'New status:', invoice.status)

    let success = false
    if (invoice.status === 'verified') {
      success = await approveInvoice(invoice)
    } else if (invoice.status === 'invalid') {
      success = await rejectInvoice(invoice)
    }

    if (success) {
      // Update local state
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.invoiceId === invoice.invoiceId ? {...inv, status: invoice.status} : inv
        )
      )
    } else {
      console.error('[InboxPage] Failed to update invoice status')
    }
  }, [])

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontFamily: 'Poppins, sans-serif',
        }}
      >
        <div style={{textAlign: 'center'}}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid #E3E3E3',
              borderTopColor: '#7276F7',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <p style={{color: '#8D9099'}}>Loading inbox...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontFamily: 'Poppins, sans-serif',
        }}
      >
        <div style={{textAlign: 'center', padding: '24px'}}>
          <div style={{color: '#D74500', marginBottom: '16px'}}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p style={{color: '#303030', marginBottom: '16px'}}>{error}</p>
          <button
            onClick={loadData}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #7276F7 0%, #7C40E8 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontFamily: 'inherit',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (inboxes.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontFamily: 'Poppins, sans-serif',
        }}
      >
        <div style={{textAlign: 'center', padding: '24px', maxWidth: '400px'}}>
          <div style={{color: '#8D9099', marginBottom: '16px'}}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 12h-6l-2 3h-4l-2-3H2" />
              <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
            </svg>
          </div>
          <h2 style={{color: '#303030', marginBottom: '8px'}}>No Inbox Configured</h2>
          <p style={{color: '#8D9099', fontSize: '14px'}}>
            To receive eInvoice credentials, you need to create an inbox first.
            Make sure the agent is running with <code>IS_INBOX_ENABLED=true</code>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <InboxView
      inboxes={inboxes}
      invoices={invoices}
      contacts={contacts}
      onUpdateInvoice={handleUpdateInvoice}
    />
  )
}

export const getStaticProps = async ({locale = 'en'}: {locale?: string}) => staticPropsWithSST({locale})

export default InboxPage
