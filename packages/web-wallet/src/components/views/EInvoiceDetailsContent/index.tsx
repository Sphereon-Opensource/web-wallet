import React, {FC, ReactElement, useRef, ChangeEvent, useState} from 'react'
import {useTranslate} from '@refinedev/core'
import {useEInvoiceOutletContext} from '@machines/einvoice/eInvoiceCreateStateNavigation'
import {UBLInvoiceDetailView} from '@components/views/UBLInvoiceView'
import {UBLInvoiceData, InvoiceParty} from '@components/views/UBLInvoiceView/types'
import {
  FormRow,
  FormInput,
  FormNumberInput,
  FormSelect,
  FormSection,
  FormSelectOption,
  StepHeader,
} from '@components/fields'
import style from './index.module.css'

/**
 * EInvoiceDetailsContent - Step 1 of eInvoice wizard
 *
 * This component handles:
 * 1. UBL file upload with parsing
 * 2. Manual form entry for invoice data
 * 3. Form fields become read-only when UBL is uploaded
 */
const EInvoiceDetailsContent: FC = (): ReactElement => {
  const translate = useTranslate()
  const {
    formData,
    onFormDataChange,
    isFormReadOnly,
    ublFile,
    onUblFileUpload,
    onUblFileRemove,
    isParsingUbl,
    ublParseError,
    evidenceFiles,
  } = useEInvoiceOutletContext()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showFullUblView, setShowFullUblView] = useState(false)

  // Find UBL evidence from evidenceFiles (used when loading from draft)
  const ublEvidenceFile = evidenceFiles.find((f) => f.evidenceType === 'UBLInvoice')
  // Has UBL if either ublFile exists or ublEvidenceFile exists (from draft)
  const hasUblSource = !!(ublFile || ublEvidenceFile)

  // Handle file change
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await onUblFileUpload(file)
    }
  }

  // Handle file drop
  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.xml') || file.type.includes('xml'))) {
      await onUblFileUpload(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  // Convert form data to UBLInvoiceData for the detail view
  // Show when we have UBL source (either from file upload or from draft)
  const ublFileName = ublFile?.name || ublEvidenceFile?.filename || 'invoice.xml'
  const invoiceDataForCard: UBLInvoiceData | null = hasUblSource && isFormReadOnly ? {
    invoiceId: formData.invoiceId,
    invoiceDate: formData.invoiceDate,
    dueDate: formData.dueDate || formData.invoiceDate,
    currencyCode: formData.currencyCode,
    taxExclusiveAmount: formData.taxExclusiveAmount,
    taxAmount: formData.taxAmount,
    taxInclusiveAmount: formData.taxInclusiveAmount,
    evidence: [{
      id: 'ubl-xml',
      type: ['UBLInvoice'],
      name: ublFileName,
      digestMultibase: '',
      mimeType: 'application/xml',
      size: ublFile?.size,
    }],
    invoiceType: formData.invoiceTypeCode,
    paymentTerms: formData.paymentTerms,
    supplier: formData.sellerName ? {
      name: formData.sellerName,
      vatNumber: formData.sellerTaxId,
      address: formData.sellerAddress ? {
        street: formData.sellerAddress.street || '',
        city: formData.sellerAddress.city || '',
        postalCode: formData.sellerAddress.postalCode || '',
        country: formData.sellerAddress.countryCode || '',
      } : undefined,
    } as InvoiceParty : undefined,
    customer: formData.buyerName ? {
      name: formData.buyerName,
      vatNumber: formData.buyerTaxId,
      address: formData.buyerAddress ? {
        street: formData.buyerAddress.street || '',
        city: formData.buyerAddress.city || '',
        postalCode: formData.buyerAddress.postalCode || '',
        country: formData.buyerAddress.countryCode || '',
      } : undefined,
    } as InvoiceParty : undefined,
    lineItems: formData.lineItems?.map((item) => ({
      lineNumber: item.lineNumber,
      description: item.description,
      note: item.note,
      quantity: item.quantity,
      quantityUnit: item.quantityUnit,
      unitPrice: item.unitPrice,
      vatPercent: item.vatPercent,
      lineTotal: item.lineTotal,
    })),
    status: 'draft',
  } : null

  // Currency options for select
  const currencyOptions: FormSelectOption[] = [
    {value: 'EUR', label: 'EUR - Euro'},
    {value: 'USD', label: 'USD - US Dollar'},
    {value: 'GBP', label: 'GBP - British Pound'},
    {value: 'CHF', label: 'CHF - Swiss Franc'},
  ]

  // Render manual input form (fields become read-only when UBL is uploaded)
  const renderManualForm = () => (
    <div className={style.manualForm}>
      <FormSection title={translate('einvoice_section_invoice_details', 'Invoice Details') as string}>
        <FormRow>
          <FormInput
            type="text"
            label={translate('einvoice_invoice_id', 'Invoice ID') as string}
            value={formData.invoiceId || ''}
            onChange={(value) => onFormDataChange({invoiceId: value})}
            placeholder="INV-001"
            readOnly={isFormReadOnly}
            required={!isFormReadOnly}
          />
          <FormSelect
            label={translate('einvoice_currency', 'Currency') as string}
            value={formData.currencyCode || 'EUR'}
            options={currencyOptions}
            onChange={(value) => onFormDataChange({currencyCode: value})}
            readOnly={isFormReadOnly}
            required={!isFormReadOnly}
          />
        </FormRow>

        <FormRow>
          <FormInput
            type="date"
            label={translate('einvoice_invoice_date', 'Invoice Date') as string}
            value={formData.invoiceDate || ''}
            onChange={(value) => onFormDataChange({invoiceDate: value})}
            readOnly={isFormReadOnly}
            required={!isFormReadOnly}
          />
          <FormInput
            type="date"
            label={translate('einvoice_due_date', 'Due Date') as string}
            value={formData.dueDate || ''}
            onChange={(value) => onFormDataChange({dueDate: value})}
            readOnly={isFormReadOnly}
          />
        </FormRow>
      </FormSection>

      <FormSection title={translate('einvoice_section_amounts', 'Amounts') as string}>
        <FormRow>
          <FormNumberInput
            label={translate('einvoice_subtotal', 'Subtotal (excl. tax)') as string}
            value={formData.taxExclusiveAmount || null}
            onChange={(value) => onFormDataChange({taxExclusiveAmount: value})}
            step={0.01}
            min={0}
            placeholder="0.00"
            readOnly={isFormReadOnly}
            required={!isFormReadOnly}
          />
          <FormNumberInput
            label={translate('einvoice_tax_amount', 'Tax Amount') as string}
            value={formData.taxAmount || null}
            onChange={(value) => onFormDataChange({taxAmount: value})}
            step={0.01}
            min={0}
            placeholder="0.00"
            readOnly={isFormReadOnly}
            required={!isFormReadOnly}
          />
        </FormRow>

        <FormRow>
          <FormNumberInput
            label={translate('einvoice_total', 'Total (incl. tax)') as string}
            value={(formData.taxExclusiveAmount || 0) + (formData.taxAmount || 0) || null}
            onChange={() => {}}
            step={0.01}
            min={0}
            placeholder="0.00"
            readOnly={true}
          />
          <div />
        </FormRow>
      </FormSection>

      <FormSection title={translate('einvoice_section_seller', 'Seller') as string}>
        <FormRow>
          <FormInput
            type="text"
            label={translate('einvoice_seller_name', 'Name') as string}
            value={formData.sellerName || ''}
            onChange={(value) => onFormDataChange({sellerName: value})}
            placeholder="Your Company Name"
            readOnly={isFormReadOnly}
            required={!isFormReadOnly}
          />
          <FormInput
            type="text"
            label={translate('einvoice_seller_tax_id', 'Tax ID') as string}
            value={formData.sellerTaxId || ''}
            onChange={(value) => onFormDataChange({sellerTaxId: value})}
            placeholder="NL123456789B01"
            readOnly={isFormReadOnly}
          />
        </FormRow>
      </FormSection>

      <FormSection title={translate('einvoice_section_buyer', 'Buyer') as string}>
        <FormRow>
          <FormInput
            type="text"
            label={translate('einvoice_buyer_name', 'Name') as string}
            value={formData.buyerName || ''}
            onChange={(value) => onFormDataChange({buyerName: value})}
            placeholder="Customer Company Name"
            readOnly={isFormReadOnly}
            required={!isFormReadOnly}
          />
          <FormInput
            type="text"
            label={translate('einvoice_buyer_tax_id', 'Tax ID') as string}
            value={formData.buyerTaxId || ''}
            onChange={(value) => onFormDataChange({buyerTaxId: value})}
            placeholder="DE987654321"
            readOnly={isFormReadOnly}
          />
        </FormRow>
      </FormSection>
    </div>
  )

  return (
    <div className={style.container}>
      {/* Full UBL Detail View Modal */}
      {showFullUblView && invoiceDataForCard && (
        <div className={style.modalOverlay} onClick={() => setShowFullUblView(false)}>
          <div className={style.modalContent} onClick={(e) => e.stopPropagation()}>
            <UBLInvoiceDetailView
              invoice={invoiceDataForCard}
              onClose={() => setShowFullUblView(false)}
            />
          </div>
        </div>
      )}

      {/* Header */}
      <StepHeader
        title={translate('einvoice_ubl_upload_title', 'Invoice Data') as string}
        description={
          hasUblSource
            ? (translate('einvoice_ubl_loaded', 'UBL document loaded') as string)
            : (translate('einvoice_ubl_upload_subtitle', 'Upload UBL or enter manually') as string)
        }
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        }
      />

      {/* UBL Upload Area */}
      <div
        className={`${style.uploadAreaCompact} ${hasUblSource ? style.uploadAreaWithFile : ''}`}
        onDrop={handleFileDrop}
        onDragOver={handleDragOver}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xml,application/xml,text/xml"
          onChange={handleFileChange}
          style={{display: 'none'}}
        />
        {hasUblSource ? (
          <div className={style.uploadedFileRow}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span className={style.uploadedFileName}>{ublFileName}</span>
            {/* Only show remove button if we have the actual File object (not from draft) */}
            {ublFile && (
              <button
                className={style.removeFileButton}
                onClick={onUblFileRemove}
                type="button"
                title="Remove file"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
            <button
              className={style.viewDetailsButton}
              onClick={() => setShowFullUblView(true)}
              type="button"
            >
              View Details
            </button>
          </div>
        ) : (
          <>
            <div className={style.uploadIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div className={style.uploadTextRow}>
              <span className={style.uploadText}>
                {translate('einvoice_drop_ubl_short', 'Drop UBL XML here or')}
              </span>
              <button
                className={style.uploadLink}
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsingUbl}
                type="button"
              >
                {isParsingUbl ? translate('einvoice_parsing_label', 'Parsing...') : translate('einvoice_browse', 'browse')}
              </button>
            </div>
          </>
        )}
      </div>

      {ublParseError && (
        <div className={style.errorMessage}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          {ublParseError}
        </div>
      )}

      {/* Manual Form Fields (read-only when UBL is uploaded) */}
      {renderManualForm()}
    </div>
  )
}

export default EInvoiceDetailsContent
