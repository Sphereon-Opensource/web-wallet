import React, {FC, ReactElement} from 'react'
import {useTranslate} from '@refinedev/core'
import {UBLInvoiceCard} from '@components/views/UBLInvoiceView'
import {InboxEInvoice, InboxEvidence, InboxContact, formatDateTime, formatFileSize} from '../types'
import {CloseIcon, ExternalLinkIcon, DocumentIcon, FileIcon, CheckIcon, ClockIcon, PeppolIcon} from '../icons'
import styles from './index.module.css'

/**
 * InboxDetailPanel Component
 *
 * Displays detailed information about a selected inbox item:
 * - Invoice card preview
 * - Sender contact information
 * - Evidence files list
 * - Inbox metadata
 * - Action buttons (Approve/Reject)
 *
 * Responsive behavior:
 * - Side panel on desktop
 * - Full-screen modal on mobile
 */

interface Props {
  invoice: InboxEInvoice
  contact?: InboxContact
  processingId?: string
  onClose: () => void
  onViewFullInvoice?: () => void
  onViewContact?: (contactId: string) => void
  onApprove?: (invoice: InboxEInvoice) => Promise<void>
  onReject?: (invoice: InboxEInvoice) => Promise<void>
  /** For outbox items: callback to send/resend the invoice */
  onSend?: (invoice: InboxEInvoice) => Promise<void>
  /** For outbox items: callback to delete a draft invoice */
  onDelete?: (invoice: InboxEInvoice) => Promise<void>
  /** For outbox items: callback to edit a draft invoice */
  onEdit?: (invoice: InboxEInvoice) => void
  className?: string
}

const InboxDetailPanel: FC<Props> = (props: Props): ReactElement => {
  const {invoice, contact, processingId, onClose, onViewFullInvoice, onViewContact, onApprove, onReject, onSend, onDelete, onEdit, className} = props
  const translate = useTranslate()

  // Determine if this is an outbox (sent) item vs inbox (received) item
  const isOutbox = invoice.folderName === 'outbox'
  // For outbox items, check if it's a draft or failed status (can be sent/resent)
  const canSend = isOutbox && (invoice.statusLabel === 'Draft' || invoice.statusLabel === 'Failed')

  const isProcessing = processingId === invoice.invoiceId

  const renderEvidenceStatus = (evidence: InboxEvidence): ReactElement => {
    switch (evidence.storageStatus) {
      case 'stored':
        return (
          <div className={`${styles.evidenceStatus} ${styles.evidenceStored}`} title={translate('einvoice_evidence_stored', 'Stored locally')}>
            <CheckIcon size={12} />
            {translate('einvoice_evidence_stored_label', 'Stored')}
          </div>
        )
      case 'fetching':
        return (
          <div className={`${styles.evidenceStatus} ${styles.evidenceFetching}`} title={translate('einvoice_evidence_fetching', 'Fetching...')}>
            <ClockIcon size={12} />
            {translate('einvoice_evidence_fetching_label', 'Fetching')}
          </div>
        )
      default:
        return (
          <div className={`${styles.evidenceStatus} ${styles.evidenceExternal}`} title={translate('einvoice_evidence_external', 'External')}>
            <PeppolIcon size={12} />
            {translate('einvoice_evidence_external_label', 'External')}
          </div>
        )
    }
  }

  const renderEvidenceIcon = (name: string): ReactElement => {
    if (name.endsWith('.xml')) {
      return <DocumentIcon size={18} />
    }
    return <FileIcon size={18} />
  }

  return (
    <aside className={`${styles.panel} ${className || ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>{translate('einvoice_detail_title', 'Invoice Details')}</h3>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label={translate('action_close', 'Close')}
        >
          <CloseIcon size={20} />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className={styles.body}>
        {/* Invoice Card */}
        <UBLInvoiceCard invoice={invoice} selected={false} showActions={false} onViewDetails={onViewFullInvoice} />

        {/* Contact Card - Sender for inbox, Recipient for outbox */}
        {contact && (
          <button
            type="button"
            className={styles.contactCard}
            onClick={() => onViewContact?.(contact.id)}
            aria-label={isOutbox ? translate('einvoice_detail_view_recipient', 'View recipient details') : translate('einvoice_detail_view_sender', 'View sender details')}
          >
            <div className={styles.contactCardBorder} />
            <div className={styles.contactCardContent}>
              <div className={styles.contactCardHeader}>
                <span className={styles.contactCardLabel}>
                  {isOutbox ? translate('einvoice_detail_recipient', 'Recipient') : translate('einvoice_detail_sender', 'Sender')}
                </span>
                <ExternalLinkIcon size={16} />
              </div>
              <div className={styles.contactCardName}>{contact.displayName}</div>
              {contact.email && <div className={styles.contactCardEmail}>{contact.email}</div>}
            </div>
          </button>
        )}

        {/* Evidence Files Section */}
        {invoice.evidence && invoice.evidence.length > 0 && (
          <section className={styles.evidenceSection}>
            <div className={styles.evidenceHeader}>
              {translate('einvoice_detail_evidence', 'Evidence Files')}
              <span className={styles.evidenceCount}>{invoice.evidence.length}</span>
            </div>
            <div className={styles.evidenceList}>
              {(invoice.evidence as InboxEvidence[]).map((evidence, index) => (
                <div key={index} className={styles.evidenceItem}>
                  <div className={styles.evidenceIcon}>{renderEvidenceIcon(evidence.name)}</div>
                  <div className={styles.evidenceInfo}>
                    <span className={styles.evidenceName}>{evidence.name}</span>
                    <span className={styles.evidenceType}>{evidence.type[0]}</span>
                    {evidence.size && <span className={styles.evidenceSize}>{formatFileSize(evidence.size)}</span>}
                  </div>
                  {renderEvidenceStatus(evidence)}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* View Full Invoice Button */}
        <button type="button" className={styles.viewFullButton} onClick={onViewFullInvoice}>
          {translate('einvoice_detail_view_full', 'View Full Invoice')}
          <ExternalLinkIcon size={16} />
        </button>

        {/* Metadata Section */}
        <section className={styles.metadata}>
          <div className={styles.metadataTitle}>
            {isOutbox ? translate('einvoice_detail_sent_info', 'Sent Information') : translate('einvoice_detail_received_info', 'Received Information')}
          </div>
          <div className={styles.metadataRow}>
            <span className={styles.metadataLabel}>
              {isOutbox ? translate('einvoice_detail_created_at', 'Created') : translate('einvoice_detail_received_at', 'Received')}
            </span>
            <span className={styles.metadataValue}>{formatDateTime(invoice.receivedAt)}</span>
          </div>
          {!isOutbox && (
            <div className={styles.metadataRow}>
              <span className={styles.metadataLabel}>{translate('einvoice_detail_folder', 'Folder')}</span>
              <span className={styles.metadataValue}>{invoice.folderName}</span>
            </div>
          )}
          {invoice.correlationId && (
            <div className={styles.metadataRow}>
              <span className={styles.metadataLabel}>{translate('einvoice_detail_correlation', 'Correlation ID')}</span>
              <span className={styles.metadataValueMono}>{invoice.correlationId}</span>
            </div>
          )}
        </section>

      </div>

      {/* Footer Actions */}
      {/* Outbox: Show Send (full width), then Edit/Delete side by side */}
      {canSend && (onSend || onEdit || onDelete) && (
        <div className={styles.footer}>
          {onSend && (
            <button
              type="button"
              className={styles.sendButtonFull}
              onClick={() => onSend(invoice)}
              disabled={isProcessing}
            >
              {invoice.statusLabel === 'Failed' ? translate('action_resend_label', 'Resend') : translate('action_send_label', 'Send')}
            </button>
          )}
          <div className={styles.footerSecondaryRow}>
            {onEdit && (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => onEdit(invoice)}
                disabled={isProcessing}
              >
                {translate('action_edit_label', 'Edit')}
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className={styles.deleteButtonSmall}
                onClick={() => onDelete(invoice)}
                disabled={isProcessing}
              >
                {translate('action_delete_label', 'Delete')}
              </button>
            )}
          </div>
        </div>
      )}
      {/* Inbox: Show Accept/Reject for pending items */}
      {!isOutbox && invoice.status === 'pending' && onApprove && onReject && (
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.rejectButton}
            onClick={() => onReject(invoice)}
            disabled={isProcessing}
          >
            {translate('action_reject_label', 'Reject')}
          </button>
          <button
            type="button"
            className={styles.approveButton}
            onClick={() => onApprove(invoice)}
            disabled={isProcessing}
          >
            {translate('action_accept_label', 'Accept')}
          </button>
        </div>
      )}
    </aside>
  )
}

export default InboxDetailPanel
export {InboxDetailPanel}
