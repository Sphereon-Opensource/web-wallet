import React, {FC, ReactElement, useMemo} from 'react'
import {useTranslate} from '@refinedev/core'
import {UBLInvoiceCard} from '@components/views/UBLInvoiceView'
import {
  BaseDetailPanel,
  PanelHeader,
  PanelBody,
  PanelFooter,
  PanelSection,
  MetadataList,
  MetadataItem,
  ContactCard,
  ActionButton,
} from '@components/panels'
import {InboxEInvoice, InboxEvidence, InboxContact, formatDateTime, formatFileSize} from '../types'
import {ExternalLinkIcon, DocumentIcon, FileIcon, CheckIcon, ClockIcon, PeppolIcon} from '../icons'
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
 *
 * Uses reusable components from @components/panels:
 * - BaseDetailPanel, PanelHeader, PanelBody, PanelFooter
 * - PanelSection, MetadataList, ContactCard, ActionButton
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

  // Build metadata items for MetadataList
  const metadataItems = useMemo((): MetadataItem[] => {
    const items: MetadataItem[] = [
      {
        label: isOutbox
          ? (translate('einvoice_detail_created_at', 'Created') as string)
          : (translate('einvoice_detail_received_at', 'Received') as string),
        value: formatDateTime(invoice.receivedAt),
      },
    ]
    if (!isOutbox) {
      items.push({
        label: translate('einvoice_detail_folder', 'Folder') as string,
        value: invoice.folderName,
      })
    }
    if (invoice.correlationId) {
      items.push({
        label: translate('einvoice_detail_correlation', 'Correlation ID') as string,
        value: invoice.correlationId,
        mono: true,
      })
    }
    return items
  }, [invoice, isOutbox, translate])

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

  // Contact label based on inbox/outbox
  const contactLabel = isOutbox
    ? (translate('einvoice_detail_recipient', 'Recipient') as string)
    : (translate('einvoice_detail_sender', 'Sender') as string)

  return (
    <BaseDetailPanel className={className}>
      <PanelHeader
        title={translate('einvoice_detail_title', 'Invoice Details') as string}
        onClose={onClose}
        closeLabel={translate('action_close', 'Close') as string}
      />

      <PanelBody>
        {/* Invoice Card */}
        <UBLInvoiceCard invoice={invoice} selected={false} showActions={false} onViewDetails={onViewFullInvoice} />

        {/* Contact Card - Sender for inbox, Recipient for outbox */}
        {contact && (
          <ContactCard
            label={contactLabel}
            name={contact.displayName}
            email={contact.email}
            onClick={onViewContact ? () => onViewContact(contact.id) : undefined}
          />
        )}

        {/* Evidence Files Section */}
        {invoice.evidence && invoice.evidence.length > 0 && (
          <PanelSection
            title={translate('einvoice_detail_evidence', 'Evidence Files') as string}
            count={invoice.evidence.length}
          >
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
          </PanelSection>
        )}

        {/* View Full Invoice Button */}
        <button type="button" className={styles.viewFullButton} onClick={onViewFullInvoice}>
          {translate('einvoice_detail_view_full', 'View Full Invoice')}
          <ExternalLinkIcon size={16} />
        </button>

        {/* Metadata Section */}
        <PanelSection
          title={isOutbox
            ? (translate('einvoice_detail_sent_info', 'Sent Information') as string)
            : (translate('einvoice_detail_received_info', 'Received Information') as string)
          }
          separator
        >
          <MetadataList items={metadataItems} />
        </PanelSection>
      </PanelBody>

      {/* Footer Actions */}
      {/* Outbox: Show Send (full width), then Edit/Delete side by side */}
      {canSend && (onSend || onEdit || onDelete) && (
        <PanelFooter layout="column">
          {onSend && (
            <ActionButton
              variant="success"
              fullWidth
              onClick={() => onSend(invoice)}
              disabled={isProcessing}
              loading={isProcessing}
            >
              {invoice.statusLabel === 'Failed' ? translate('action_resend_label', 'Resend') : translate('action_send_label', 'Send')}
            </ActionButton>
          )}
          <div className={styles.footerSecondaryRow}>
            {onEdit && (
              <ActionButton
                variant="secondary"
                onClick={() => onEdit(invoice)}
                disabled={isProcessing}
              >
                {translate('action_edit_label', 'Edit')}
              </ActionButton>
            )}
            {onDelete && (
              <ActionButton
                variant="danger"
                onClick={() => onDelete(invoice)}
                disabled={isProcessing}
              >
                {translate('action_delete_label', 'Delete')}
              </ActionButton>
            )}
          </div>
        </PanelFooter>
      )}
      {/* Inbox: Show Accept/Reject for pending items */}
      {!isOutbox && invoice.status === 'pending' && onApprove && onReject && (
        <PanelFooter>
          <ActionButton
            variant="danger"
            onClick={() => onReject(invoice)}
            disabled={isProcessing}
            loading={isProcessing}
          >
            {translate('action_reject_label', 'Reject')}
          </ActionButton>
          <ActionButton
            variant="success"
            onClick={() => onApprove(invoice)}
            disabled={isProcessing}
            loading={isProcessing}
          >
            {translate('action_accept_label', 'Accept')}
          </ActionButton>
        </PanelFooter>
      )}
      {/* Inbox: Show Delete for non-pending (accepted/rejected) items */}
      {!isOutbox && invoice.status !== 'pending' && onDelete && (
        <PanelFooter>
          <ActionButton
            variant="danger"
            onClick={() => onDelete(invoice)}
            disabled={isProcessing}
            loading={isProcessing}
          >
            {translate('action_delete_label', 'Delete')}
          </ActionButton>
        </PanelFooter>
      )}
    </BaseDetailPanel>
  )
}

export default InboxDetailPanel
export {InboxDetailPanel}
