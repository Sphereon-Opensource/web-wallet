import React, {FC, ReactElement, useMemo, useState} from 'react'
import {useTranslate} from '@refinedev/core'
import {useEInvoiceOutletContext} from '@machines/einvoice/eInvoiceCreateStateNavigation'
import {UBLInvoiceCard, UBLInvoiceDetailView} from '@components/views/UBLInvoiceView'
import {UBLInvoiceData, InvoiceParty, InvoiceEvidence, InvoiceLineItem} from '@components/views/UBLInvoiceView/types'
import {getServiceTypeLabel} from '@/src/services/recipientService'
import style from './index.module.css'

const EInvoiceReviewContent: FC = (): ReactElement => {
  const translate = useTranslate()
  const {formData, ublFile, evidenceFiles, recipient, isSending, sendError} = useEInvoiceOutletContext()

  // State for showing full detail view modal
  const [showFullView, setShowFullView] = useState(false)

  // Get the selected endpoint
  const selectedEndpoint = recipient?.endpoints?.find((e) => e.id === recipient.selectedEndpointId)

  // Helper to extract URL from serviceEndpoint
  const getEndpointUrl = (serviceEndpoint: string | Record<string, unknown>): string => {
    if (typeof serviceEndpoint === 'string') return serviceEndpoint
    if (serviceEndpoint && typeof serviceEndpoint === 'object' && 'url' in serviceEndpoint) {
      return serviceEndpoint.url as string
    }
    return ''
  }

  // Convert form data to UBLInvoiceData for the card
  const invoiceData: UBLInvoiceData = useMemo(() => {
    // Build evidence array
    const evidence: InvoiceEvidence[] = evidenceFiles.map((ef, index) => ({
      id: ef.id || `evidence-${index}`,
      type: ef.evidenceType === 'UBLInvoice' ? ['UBLInvoice'] : ['SupportingDocument'],
      name: ef.filename,
      digestMultibase: '',
      mimeType: ef.contentType,
      size: ef.file?.size,
      storageStatus: 'stored' as const,
    }))

    // Build supplier party
    const supplier: InvoiceParty | undefined = formData.sellerName ? {
      name: formData.sellerName,
      vatNumber: formData.sellerTaxId,
      address: formData.sellerAddress ? {
        street: formData.sellerAddress.street || '',
        city: formData.sellerAddress.city || '',
        postalCode: formData.sellerAddress.postalCode || '',
        country: formData.sellerAddress.countryCode || '',
      } : undefined,
    } : undefined

    // Build customer party
    const customer: InvoiceParty | undefined = formData.buyerName ? {
      name: formData.buyerName,
      vatNumber: formData.buyerTaxId,
      address: formData.buyerAddress ? {
        street: formData.buyerAddress.street || '',
        city: formData.buyerAddress.city || '',
        postalCode: formData.buyerAddress.postalCode || '',
        country: formData.buyerAddress.countryCode || '',
      } : undefined,
    } : undefined

    // Build line items
    const lineItems: InvoiceLineItem[] | undefined = formData.lineItems?.map((item) => ({
      lineNumber: item.lineNumber,
      description: item.description,
      note: item.note,
      quantity: item.quantity,
      quantityUnit: item.quantityUnit,
      unitPrice: item.unitPrice,
      vatPercent: item.vatPercent,
      lineTotal: item.lineTotal,
    }))

    return {
      invoiceId: formData.invoiceId,
      invoiceDate: formData.invoiceDate,
      dueDate: formData.dueDate || formData.invoiceDate,
      currencyCode: formData.currencyCode,
      taxExclusiveAmount: formData.taxExclusiveAmount,
      taxAmount: formData.taxAmount,
      taxInclusiveAmount: formData.taxInclusiveAmount,
      evidence,
      invoiceType: formData.invoiceTypeCode,
      paymentTerms: formData.paymentTerms,
      supplier,
      customer,
      lineItems,
      status: 'draft',
    }
  }, [formData, evidenceFiles])

  return (
    <div className={style.container}>
      {/* Full UBL Detail View Modal */}
      {showFullView && (
        <div className={style.modalOverlay} onClick={() => setShowFullView(false)}>
          <div className={style.modalContent} onClick={(e) => e.stopPropagation()}>
            <UBLInvoiceDetailView
              invoice={invoiceData}
              onClose={() => setShowFullView(false)}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {sendError && (
        <div className={style.errorMessage}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className={style.errorContent}>
            <span className={style.errorTitle}>{translate('einvoice_send_error', 'Failed to Send eInvoice')}</span>
            <span className={style.errorText}>{sendError}</span>
          </div>
        </div>
      )}

      {/* Invoice Card - Reusing the same component as list views */}
      <div className={style.invoiceCardContainer}>
        <UBLInvoiceCard
          invoice={invoiceData}
          showActions={true}
          onViewDetails={() => setShowFullView(true)}
        />
      </div>

      {/* Delivery Information Card */}
      <div className={style.deliveryCard}>
        <div className={style.deliveryHeader}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" />
          </svg>
          <span className={style.deliveryTitle}>{translate('einvoice_delivery_title', 'Delivery Information')}</span>
        </div>
        {recipient ? (
          <div className={style.deliveryContent}>
            <div className={style.deliveryRow}>
              <span className={style.deliveryLabel}>{translate('einvoice_recipient_label', 'Recipient')}</span>
              <div className={style.deliveryValue}>
                <span className={style.recipientName}>{recipient.name || recipient.organizationName}</span>
                <span className={style.recipientDid}>{recipient.did}</span>
              </div>
            </div>
            {selectedEndpoint && (
              <div className={style.deliveryRow}>
                <span className={style.deliveryLabel}>{translate('einvoice_delivery_method_label', 'Delivery Method')}</span>
                <div className={style.deliveryValue}>
                  <span className={style.endpointBadge}>{getServiceTypeLabel(selectedEndpoint.serviceType as any)}</span>
                  {selectedEndpoint.entityName && <span className={style.endpointEntity}>{selectedEndpoint.entityName}</span>}
                  <span className={style.endpointUrl}>{getEndpointUrl(selectedEndpoint.serviceEndpoint as string | Record<string, unknown>)}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={style.warningBox}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>{translate('einvoice_no_recipient', 'No recipient selected. Please go back and select a recipient.')}</span>
          </div>
        )}
      </div>

      {/* Sending Indicator */}
      {isSending && (
        <div className={style.sendingIndicator}>
          <div className={style.spinner} />
          <span>{translate('einvoice_sending', 'Sending eInvoice credential...')}</span>
        </div>
      )}

      {/* Info Box */}
      <div className={style.infoBox}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <div className={style.infoContent}>
          <span className={style.infoTitle}>{translate('einvoice_what_happens_title', 'What happens next?')}</span>
          <span className={style.infoText}>
            {translate(
              'einvoice_review_info',
              'Clicking "Send eInvoice" will create a verifiable eInvoice credential and deliver it to the recipient via the selected delivery method. The invoice will be stored in your sent items for tracking.'
            )}
          </span>
        </div>
      </div>
    </div>
  )
}

export default EInvoiceReviewContent
