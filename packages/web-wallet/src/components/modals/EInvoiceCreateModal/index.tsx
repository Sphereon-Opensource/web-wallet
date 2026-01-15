import React, {FC, ReactElement, useCallback, useEffect, useState} from 'react'
import {HttpError, useList, useTranslate} from '@refinedev/core'
import {PrimaryButton, SecondaryButton} from '@sphereon/ui-components.ssi-react'
import CrossIcon from '@components/assets/icons/CrossIcon'
import DragAndDropBox from '@components/fields/DragAndDropBox'
import FileSelectionField from '@components/fields/FileSelectionField'
import DropDownList from '@components/lists/DropDownList'
import SelectionField from '@components/fields/SelectionField'
import {UBLInvoiceCard} from '@components/views/UBLInvoiceView'
import type {UBLInvoiceData, InvoiceParty} from '@components/views/UBLInvoiceView'
import type {Party} from '@sphereon/ssi-sdk.data-store-types'
import {PartyTypeType} from '@sphereon/ssi-sdk.data-store-types'
import style from './index.module.css'

/**
 * Parsed invoice data from UBL XML (matches agent's ublParser output)
 */
interface ParsedEInvoice {
  invoice_id: string
  invoice_date: string
  due_date?: string
  currency_code: string
  tax_exclusive_amount: number
  tax_amount: number
  tax_inclusive_amount: number
  payable_amount: number
  seller_name: string
  seller_tax_id?: string
  seller_address?: {
    street?: string
    city?: string
    postal_code?: string
    country_code?: string
  }
  buyer_name: string
  buyer_tax_id?: string
  buyer_address?: {
    street?: string
    city?: string
    postal_code?: string
    country_code?: string
  }
  invoice_type_code?: string
  note?: string
  payment_terms?: string
}

type Props = {
  onClose: () => void | Promise<void>
  onSubmit: (data: EInvoiceCreateData) => void | Promise<void>
}

export interface EInvoiceCreateData {
  ublFile: File
  parsedInvoice: ParsedEInvoice
  recipient: Party
}

type RecipientSelection = {
  value: Party
  label: string
}

/**
 * Parse UBL XML content (simplified client-side parser)
 */
async function parseUblXml(content: string): Promise<ParsedEInvoice> {
  // Simple XML parsing using DOMParser
  const parser = new DOMParser()
  const doc = parser.parseFromString(content, 'text/xml')

  const parserError = doc.querySelector('parsererror')
  if (parserError) {
    throw new Error('Invalid XML format')
  }

  // Helper to get text content from element
  const getText = (parent: Element | Document, ...selectors: string[]): string | undefined => {
    for (const selector of selectors) {
      const el = parent.querySelector(selector)
      if (el?.textContent) return el.textContent.trim()
    }
    return undefined
  }

  // Helper to get number
  const getNumber = (parent: Element | Document, ...selectors: string[]): number => {
    const text = getText(parent, ...selectors)
    return text ? parseFloat(text) : 0
  }

  // Find invoice root
  const invoice = doc.querySelector('Invoice') || doc.documentElement
  if (!invoice) {
    throw new Error('Invoice element not found')
  }

  // Extract invoice ID
  const invoiceId = getText(invoice, 'cbc\\:ID', 'ID')
  if (!invoiceId) {
    throw new Error('Invoice ID is required')
  }

  // Extract invoice date
  const invoiceDate = getText(invoice, 'cbc\\:IssueDate', 'IssueDate')
  if (!invoiceDate) {
    throw new Error('Invoice date is required')
  }

  // Extract due date
  const dueDate = getText(invoice, 'cbc\\:DueDate', 'DueDate')

  // Extract currency and amounts
  const legalMonetaryTotal = invoice.querySelector('cac\\:LegalMonetaryTotal, LegalMonetaryTotal')
  const taxExclusiveEl = legalMonetaryTotal?.querySelector('cbc\\:TaxExclusiveAmount, TaxExclusiveAmount')
  const currencyCode = taxExclusiveEl?.getAttribute('currencyID') || getText(invoice, 'cbc\\:DocumentCurrencyCode', 'DocumentCurrencyCode') || 'EUR'

  const taxExclusiveAmount = getNumber(legalMonetaryTotal || invoice, 'cbc\\:TaxExclusiveAmount', 'TaxExclusiveAmount')
  const taxInclusiveAmount = getNumber(legalMonetaryTotal || invoice, 'cbc\\:TaxInclusiveAmount', 'TaxInclusiveAmount')
  const payableAmount = getNumber(legalMonetaryTotal || invoice, 'cbc\\:PayableAmount', 'PayableAmount') || taxInclusiveAmount

  // Extract tax amount
  const taxTotal = invoice.querySelector('cac\\:TaxTotal, TaxTotal')
  const taxAmount = getNumber(taxTotal || invoice, 'cbc\\:TaxAmount', 'TaxAmount') || (taxInclusiveAmount - taxExclusiveAmount)

  // Extract seller
  const supplierParty = invoice.querySelector('cac\\:AccountingSupplierParty cac\\:Party, AccountingSupplierParty Party')
  const sellerName = getText(supplierParty || invoice, 'cac\\:PartyName cbc\\:Name', 'PartyName Name', 'cac\\:PartyLegalEntity cbc\\:RegistrationName', 'PartyLegalEntity RegistrationName')
  if (!sellerName) {
    throw new Error('Seller name is required')
  }

  const sellerTaxScheme = supplierParty?.querySelector('cac\\:PartyTaxScheme, PartyTaxScheme')
  const sellerTaxId = getText(sellerTaxScheme || supplierParty || invoice, 'cbc\\:CompanyID', 'CompanyID')

  const sellerAddress = supplierParty?.querySelector('cac\\:PostalAddress, PostalAddress')
  const sellerAddressData = sellerAddress
    ? {
        street: getText(sellerAddress, 'cbc\\:StreetName', 'StreetName'),
        city: getText(sellerAddress, 'cbc\\:CityName', 'CityName'),
        postal_code: getText(sellerAddress, 'cbc\\:PostalZone', 'PostalZone'),
        country_code: getText(sellerAddress, 'cac\\:Country cbc\\:IdentificationCode', 'Country IdentificationCode'),
      }
    : undefined

  // Extract buyer
  const customerParty = invoice.querySelector('cac\\:AccountingCustomerParty cac\\:Party, AccountingCustomerParty Party')
  const buyerName = getText(customerParty || invoice, 'cac\\:PartyName cbc\\:Name', 'PartyName Name', 'cac\\:PartyLegalEntity cbc\\:RegistrationName', 'PartyLegalEntity RegistrationName')
  if (!buyerName) {
    throw new Error('Buyer name is required')
  }

  const buyerTaxScheme = customerParty?.querySelector('cac\\:PartyTaxScheme, PartyTaxScheme')
  const buyerTaxId = getText(buyerTaxScheme || customerParty || invoice, 'cbc\\:CompanyID', 'CompanyID')

  const buyerAddress = customerParty?.querySelector('cac\\:PostalAddress, PostalAddress')
  const buyerAddressData = buyerAddress
    ? {
        street: getText(buyerAddress, 'cbc\\:StreetName', 'StreetName'),
        city: getText(buyerAddress, 'cbc\\:CityName', 'CityName'),
        postal_code: getText(buyerAddress, 'cbc\\:PostalZone', 'PostalZone'),
        country_code: getText(buyerAddress, 'cac\\:Country cbc\\:IdentificationCode', 'Country IdentificationCode'),
      }
    : undefined

  // Extract optional fields
  const invoiceTypeCode = getText(invoice, 'cbc\\:InvoiceTypeCode', 'InvoiceTypeCode')
  const note = getText(invoice, 'cbc\\:Note', 'Note')
  const paymentTerms = getText(invoice, 'cac\\:PaymentTerms cbc\\:Note', 'PaymentTerms Note')

  return {
    invoice_id: invoiceId,
    invoice_date: invoiceDate,
    due_date: dueDate,
    currency_code: currencyCode,
    tax_exclusive_amount: taxExclusiveAmount,
    tax_amount: taxAmount,
    tax_inclusive_amount: taxInclusiveAmount,
    payable_amount: payableAmount,
    seller_name: sellerName,
    seller_tax_id: sellerTaxId,
    seller_address: sellerAddressData,
    buyer_name: buyerName,
    buyer_tax_id: buyerTaxId,
    buyer_address: buyerAddressData,
    invoice_type_code: invoiceTypeCode,
    note,
    payment_terms: paymentTerms,
  }
}

/**
 * Convert ParsedEInvoice to UBLInvoiceData for display
 */
function toUBLInvoiceData(parsed: ParsedEInvoice, file: File): UBLInvoiceData {
  const supplier: InvoiceParty = {
    name: parsed.seller_name,
    vatNumber: parsed.seller_tax_id,
    address: parsed.seller_address
      ? {
          street: parsed.seller_address.street || '',
          city: parsed.seller_address.city || '',
          postalCode: parsed.seller_address.postal_code || '',
          country: parsed.seller_address.country_code || '',
        }
      : undefined,
  }

  const customer: InvoiceParty = {
    name: parsed.buyer_name,
    vatNumber: parsed.buyer_tax_id,
    address: parsed.buyer_address
      ? {
          street: parsed.buyer_address.street || '',
          city: parsed.buyer_address.city || '',
          postalCode: parsed.buyer_address.postal_code || '',
          country: parsed.buyer_address.country_code || '',
        }
      : undefined,
  }

  return {
    invoiceId: parsed.invoice_id,
    invoiceDate: parsed.invoice_date,
    dueDate: parsed.due_date || parsed.invoice_date,
    currencyCode: parsed.currency_code,
    taxExclusiveAmount: parsed.tax_exclusive_amount,
    taxAmount: parsed.tax_amount,
    taxInclusiveAmount: parsed.tax_inclusive_amount,
    invoiceType: parsed.invoice_type_code,
    paymentTerms: parsed.payment_terms,
    supplier,
    customer,
    evidence: [
      {
        id: `local:${file.name}`,
        type: ['UBLInvoice'],
        name: file.name,
        digestMultibase: 'pending',
        mimeType: 'application/xml',
        size: file.size,
      },
    ],
    status: 'pending',
  }
}

/**
 * Find best matching contact based on buyer name
 */
function findMatchingContact(buyerName: string, contacts: Party[]): Party | undefined {
  const normalizedBuyerName = buyerName.toLowerCase().trim()

  // First try exact match
  let match = contacts.find(
    contact => contact.contact.displayName.toLowerCase().trim() === normalizedBuyerName ||
      ('legalName' in contact.contact && (contact.contact as any).legalName?.toLowerCase().trim() === normalizedBuyerName)
  )
  if (match) return match

  // Then try partial match
  match = contacts.find(
    contact =>
      contact.contact.displayName.toLowerCase().includes(normalizedBuyerName) ||
      normalizedBuyerName.includes(contact.contact.displayName.toLowerCase()) ||
      ('legalName' in contact.contact &&
        ((contact.contact as any).legalName?.toLowerCase().includes(normalizedBuyerName) ||
          normalizedBuyerName.includes((contact.contact as any).legalName?.toLowerCase() || '')))
  )

  return match
}

const EInvoiceCreateModal: FC<Props> = (props: Props): ReactElement => {
  const {onClose, onSubmit} = props
  const translate = useTranslate()

  const [ublFile, setUblFile] = useState<File | undefined>()
  const [parsedInvoice, setParsedInvoice] = useState<ParsedEInvoice | undefined>()
  const [invoiceData, setInvoiceData] = useState<UBLInvoiceData | undefined>()
  const [parseError, setParseError] = useState<string | undefined>()
  const [selectedRecipient, setSelectedRecipient] = useState<Party | undefined>()
  const [autoMatchedRecipient, setAutoMatchedRecipient] = useState<Party | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch organization contacts
  const partiesData = useList<Party, HttpError>({resource: 'parties'})
  const parties: Party[] = partiesData.data?.data ?? []
  const organizationContacts = parties.filter(party => party.partyType.type === PartyTypeType.ORGANIZATION)

  const recipientOptions: RecipientSelection[] = organizationContacts.map(party => ({
    value: party,
    label: party.contact.displayName,
  }))

  // Handle file upload
  const onChangeFile = useCallback(async (file: File): Promise<void> => {
    setUblFile(file)
    setParseError(undefined)
    setParsedInvoice(undefined)
    setInvoiceData(undefined)
    setAutoMatchedRecipient(undefined)

    try {
      const content = await file.text()
      const parsed = await parseUblXml(content)
      setParsedInvoice(parsed)
      setInvoiceData(toUBLInvoiceData(parsed, file))

      // Auto-match recipient from buyer name
      const match = findMatchingContact(parsed.buyer_name, organizationContacts)
      if (match) {
        setAutoMatchedRecipient(match)
        setSelectedRecipient(match)
      }
    } catch (error: any) {
      setParseError(error.message || 'Failed to parse UBL file')
    }
  }, [organizationContacts])

  // Handle recipient selection
  const onRecipientSelect = async (selection: RecipientSelection): Promise<void> => {
    setSelectedRecipient(selection.value)
  }

  const onRecipientRemove = async (): Promise<void> => {
    setSelectedRecipient(undefined)
  }

  // Handle submit
  const handleSubmit = async (): Promise<void> => {
    if (!ublFile || !parsedInvoice || !selectedRecipient) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        ublFile,
        parsedInvoice,
        recipient: selectedRecipient,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = ublFile && parsedInvoice && selectedRecipient && !parseError

  return (
    <div className={style.overlay} onClick={onClose}>
      <div className={style.container} onClick={(event: React.MouseEvent<HTMLDivElement, MouseEvent>) => event.stopPropagation()}>
        <div className={style.headerContainer}>
          <div className={style.headerCaptionContainer}>
            <div className={style.titleCaption}>{translate('einvoice_create_modal_title', 'Send eInvoice')}</div>
            <div className={style.subTitleCaption}>{translate('einvoice_create_modal_subtitle', 'Upload a UBL invoice and select the recipient')}</div>
          </div>
          <div className={style.headerCloseContainer}>
            <div className={style.closeButton} onClick={onClose}>
              <CrossIcon />
            </div>
          </div>
        </div>

        <div className={style.contentContainer}>
          {/* UBL Upload Section */}
          <div className={style.section}>
            <div className={style.sectionTitle}>{translate('einvoice_create_ubl_section_title', 'Invoice Document')}</div>
            {!ublFile && (
              <DragAndDropBox
                caption={translate('einvoice_create_ubl_upload_caption', 'Drop UBL invoice file here or click to browse')}
                description={translate('einvoice_create_ubl_upload_description', 'Supports UBL 2.1 XML format')}
                onChangeFile={onChangeFile}
              />
            )}
            {ublFile && <FileSelectionField file={ublFile} />}
            {parseError && <div className={style.errorCaption}>{parseError}</div>}
          </div>

          {/* Invoice Preview */}
          {invoiceData && (
            <div className={style.section}>
              <div className={style.sectionTitle}>{translate('einvoice_create_preview_title', 'Invoice Preview')}</div>
              <UBLInvoiceCard invoice={invoiceData} showActions={false} />
            </div>
          )}

          {/* Recipient Selection Section */}
          <div className={style.section}>
            <div className={style.sectionTitle}>{translate('einvoice_create_recipient_section_title', 'Recipient')}</div>
            {autoMatchedRecipient && selectedRecipient === autoMatchedRecipient && (
              <div className={style.autoMatchNotice}>
                {translate('einvoice_create_auto_matched_notice', `Auto-matched from invoice buyer: ${parsedInvoice?.buyer_name || ''}`)}
              </div>
            )}
            {!selectedRecipient && (
              <DropDownList<RecipientSelection>
                onChange={onRecipientSelect}
                options={recipientOptions}
                placeholder={translate('einvoice_create_recipient_placeholder', 'Select recipient organization')}
                noOptionsMessage={translate('einvoice_create_no_recipients', 'No organizations found')}
              />
            )}
            {selectedRecipient && (
              <SelectionField
                value={selectedRecipient.contact.displayName}
                details={[
                  {
                    title: translate('contact_id_label', 'Contact ID'),
                    value: selectedRecipient.id,
                  },
                ]}
                onRemove={onRecipientRemove}
              />
            )}
          </div>

          {/* Action Buttons */}
          <div className={style.actionsContainer}>
            <SecondaryButton
              caption={translate('action_cancel_label', 'Cancel')}
              onClick={async () => { await onClose() }}
            />
            <PrimaryButton
              caption={isSubmitting ? translate('action_sending_label', 'Sending...') : translate('action_send_invoice_label', 'Send Invoice')}
              disabled={!canSubmit || isSubmitting}
              onClick={handleSubmit}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default EInvoiceCreateModal
