/**
 * Client-side UBL Invoice XML parser.
 * Uses native DOMParser for browser compatibility without external dependencies.
 */

/**
 * Invoice line item from UBL document.
 */
export interface ParsedLineItem {
  line_number: number
  description: string
  note?: string
  quantity: number
  quantity_unit: string
  unit_price: number
  vat_percent: number
  line_total: number
}

/**
 * Parsed eInvoice data from UBL XML.
 */
export interface ParsedEInvoice {
  // Invoice identification
  invoice_id: string
  invoice_date: string
  due_date?: string

  // Currency and amounts
  currency_code: string
  tax_exclusive_amount: number
  tax_amount: number
  tax_inclusive_amount: number
  payable_amount: number

  // Seller information
  seller_name: string
  seller_tax_id?: string
  seller_address?: {
    street?: string
    city?: string
    postal_code?: string
    country_code?: string
  }

  // Buyer information
  buyer_name: string
  buyer_tax_id?: string
  buyer_address?: {
    street?: string
    city?: string
    postal_code?: string
    country_code?: string
  }

  // Optional fields
  invoice_type_code?: string
  note?: string
  payment_terms?: string
  payment_means_code?: string

  // Line items
  line_items?: ParsedLineItem[]
}

/**
 * Get text content from an element, trying multiple tag names (with and without namespace prefix).
 */
function getElementText(parent: Element, ...tagNames: string[]): string | undefined {
  for (const tagName of tagNames) {
    // Try with namespace prefix
    const elements = parent.getElementsByTagName(tagName)
    if (elements.length > 0 && elements[0].textContent) {
      return elements[0].textContent.trim()
    }
    // Try without prefix
    const simpleName = tagName.replace(/^[a-z]+:/i, '')
    const simpleElements = parent.getElementsByTagName(simpleName)
    if (simpleElements.length > 0 && simpleElements[0].textContent) {
      return simpleElements[0].textContent.trim()
    }
  }
  return undefined
}

/**
 * Get numeric content from an element.
 */
function getElementNumber(parent: Element, ...tagNames: string[]): number | undefined {
  const text = getElementText(parent, ...tagNames)
  if (!text) return undefined
  const num = parseFloat(text)
  return isNaN(num) ? undefined : num
}

/**
 * Find first matching element by tag names.
 */
function findElement(parent: Element, ...tagNames: string[]): Element | null {
  for (const tagName of tagNames) {
    const elements = parent.getElementsByTagName(tagName)
    if (elements.length > 0) {
      return elements[0]
    }
    // Try without prefix
    const simpleName = tagName.replace(/^[a-z]+:/i, '')
    const simpleElements = parent.getElementsByTagName(simpleName)
    if (simpleElements.length > 0) {
      return simpleElements[0]
    }
  }
  return null
}

/**
 * Parse address from UBL PostalAddress element.
 */
function parseAddress(addressNode: Element | null): ParsedEInvoice['seller_address'] | undefined {
  if (!addressNode) return undefined

  const countryNode = findElement(addressNode, 'cac:Country', 'Country')

  return {
    street: getElementText(addressNode, 'cbc:StreetName', 'StreetName'),
    city: getElementText(addressNode, 'cbc:CityName', 'CityName'),
    postal_code: getElementText(addressNode, 'cbc:PostalZone', 'PostalZone'),
    country_code: countryNode
      ? getElementText(countryNode, 'cbc:IdentificationCode', 'IdentificationCode')
      : undefined,
  }
}

/**
 * Find all matching elements by tag names.
 */
function findAllElements(parent: Element, ...tagNames: string[]): Element[] {
  for (const tagName of tagNames) {
    const elements = parent.getElementsByTagName(tagName)
    if (elements.length > 0) {
      return Array.from(elements)
    }
    // Try without prefix
    const simpleName = tagName.replace(/^[a-z]+:/i, '')
    const simpleElements = parent.getElementsByTagName(simpleName)
    if (simpleElements.length > 0) {
      return Array.from(simpleElements)
    }
  }
  return []
}

/**
 * Parse line items from UBL InvoiceLine elements.
 */
function parseLineItems(invoice: Element): ParsedLineItem[] {
  const lineElements = findAllElements(invoice, 'cac:InvoiceLine', 'InvoiceLine')

  return lineElements.map((line, index) => {
    // Get line ID/number
    const lineId = getElementText(line, 'cbc:ID', 'ID')
    const lineNumber = lineId ? parseInt(lineId, 10) : index + 1

    // Get quantity and unit
    const quantityText = getElementText(line, 'cbc:InvoicedQuantity', 'InvoicedQuantity')
    const quantity = quantityText ? parseFloat(quantityText) : 0

    // Get unit code from quantity attribute
    const quantityElement = findElement(line, 'cbc:InvoicedQuantity', 'InvoicedQuantity')
    const quantityUnit = quantityElement?.getAttribute('unitCode') || 'EA'

    // Get line extension amount (line total)
    const lineTotal = getElementNumber(line, 'cbc:LineExtensionAmount', 'LineExtensionAmount') || 0

    // Get item details
    const itemNode = findElement(line, 'cac:Item', 'Item')
    const description = itemNode
      ? getElementText(itemNode, 'cbc:Name', 'Name') || getElementText(itemNode, 'cbc:Description', 'Description') || 'Unknown Item'
      : 'Unknown Item'
    const note = itemNode ? getElementText(itemNode, 'cbc:Description', 'Description') : undefined

    // Get price
    const priceNode = findElement(line, 'cac:Price', 'Price')
    const unitPrice = priceNode
      ? getElementNumber(priceNode, 'cbc:PriceAmount', 'PriceAmount') || 0
      : 0

    // Get VAT percent from ClassifiedTaxCategory
    let vatPercent = 0
    if (itemNode) {
      const taxCategoryNode = findElement(itemNode, 'cac:ClassifiedTaxCategory', 'ClassifiedTaxCategory')
      if (taxCategoryNode) {
        vatPercent = getElementNumber(taxCategoryNode, 'cbc:Percent', 'Percent') || 0
      }
    }

    return {
      line_number: isNaN(lineNumber) ? index + 1 : lineNumber,
      description,
      note: note !== description ? note : undefined,
      quantity,
      quantity_unit: quantityUnit,
      unit_price: unitPrice,
      vat_percent: vatPercent,
      line_total: lineTotal,
    }
  })
}

/**
 * Parse party (seller or buyer) from UBL Party element.
 */
function parseParty(partyNode: Element | null): {
  name?: string
  tax_id?: string
  address?: ParsedEInvoice['seller_address']
} {
  if (!partyNode) return {}

  // Get party name
  const partyNameNode = findElement(partyNode, 'cac:PartyName', 'PartyName')
  const partyName = partyNameNode
    ? getElementText(partyNameNode, 'cbc:Name', 'Name')
    : undefined

  // Get legal entity registration name as fallback
  const legalEntityNode = findElement(partyNode, 'cac:PartyLegalEntity', 'PartyLegalEntity')
  const registrationName = legalEntityNode
    ? getElementText(legalEntityNode, 'cbc:RegistrationName', 'RegistrationName')
    : undefined

  // Get tax ID from PartyTaxScheme or PartyLegalEntity
  const taxSchemeNode = findElement(partyNode, 'cac:PartyTaxScheme', 'PartyTaxScheme')
  let taxId = taxSchemeNode
    ? getElementText(taxSchemeNode, 'cbc:CompanyID', 'CompanyID')
    : undefined
  if (!taxId && legalEntityNode) {
    taxId = getElementText(legalEntityNode, 'cbc:CompanyID', 'CompanyID')
  }

  // Get postal address
  const postalAddressNode = findElement(partyNode, 'cac:PostalAddress', 'PostalAddress')

  return {
    name: partyName || registrationName,
    tax_id: taxId,
    address: parseAddress(postalAddressNode),
  }
}

/**
 * Parse UBL Invoice XML and extract eInvoice data.
 *
 * Supports UBL 2.0/2.1 Invoice format with common namespace prefixes (cbc:, cac:).
 *
 * @param xmlContent - The UBL XML content as a string
 * @returns Parsed eInvoice data
 * @throws Error if parsing fails or required fields are missing
 */
export function parseUblInvoice(xmlContent: string): ParsedEInvoice {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlContent, 'text/xml')

  // Check for parsing errors
  const parserError = doc.querySelector('parsererror')
  if (parserError) {
    throw new Error(`Invalid XML: ${parserError.textContent}`)
  }

  // Find the Invoice root element
  let invoice = doc.querySelector('Invoice')
  if (!invoice) {
    // Try with namespace
    invoice = doc.getElementsByTagNameNS('*', 'Invoice')[0] as Element
  }
  if (!invoice) {
    throw new Error('UBL Invoice root element not found')
  }

  // Extract invoice ID
  const invoiceId = getElementText(invoice, 'cbc:ID', 'ID')
  if (!invoiceId) {
    throw new Error('Invoice ID (cbc:ID) is required')
  }

  // Extract invoice date
  const invoiceDate = getElementText(invoice, 'cbc:IssueDate', 'IssueDate')
  if (!invoiceDate) {
    throw new Error('Invoice date (cbc:IssueDate) is required')
  }

  // Extract due date
  const dueDate = getElementText(invoice, 'cbc:DueDate', 'DueDate')

  // Extract invoice type code
  const invoiceTypeCode = getElementText(invoice, 'cbc:InvoiceTypeCode', 'InvoiceTypeCode')

  // Extract note
  const note = getElementText(invoice, 'cbc:Note', 'Note')

  // Extract currency code
  const currencyCode =
    getElementText(invoice, 'cbc:DocumentCurrencyCode', 'DocumentCurrencyCode') || 'EUR'

  // Extract monetary totals
  const monetaryTotalNode = findElement(invoice, 'cac:LegalMonetaryTotal', 'LegalMonetaryTotal')

  let taxExclusiveAmount = 0
  let taxInclusiveAmount = 0
  let payableAmount = 0

  if (monetaryTotalNode) {
    taxExclusiveAmount =
      getElementNumber(monetaryTotalNode, 'cbc:TaxExclusiveAmount', 'TaxExclusiveAmount') || 0
    taxInclusiveAmount =
      getElementNumber(monetaryTotalNode, 'cbc:TaxInclusiveAmount', 'TaxInclusiveAmount') || 0
    payableAmount =
      getElementNumber(monetaryTotalNode, 'cbc:PayableAmount', 'PayableAmount') || taxInclusiveAmount
  }

  // Extract tax totals
  const taxTotalNode = findElement(invoice, 'cac:TaxTotal', 'TaxTotal')
  const taxAmount = taxTotalNode
    ? getElementNumber(taxTotalNode, 'cbc:TaxAmount', 'TaxAmount') ||
      taxInclusiveAmount - taxExclusiveAmount
    : taxInclusiveAmount - taxExclusiveAmount

  // Extract seller (AccountingSupplierParty)
  const supplierPartyNode = findElement(
    invoice,
    'cac:AccountingSupplierParty',
    'AccountingSupplierParty'
  )
  const supplierParty = supplierPartyNode
    ? findElement(supplierPartyNode, 'cac:Party', 'Party')
    : null
  const seller = parseParty(supplierParty || supplierPartyNode)

  if (!seller.name) {
    throw new Error('Seller name is required')
  }

  // Extract buyer (AccountingCustomerParty)
  const customerPartyNode = findElement(
    invoice,
    'cac:AccountingCustomerParty',
    'AccountingCustomerParty'
  )
  const customerParty = customerPartyNode
    ? findElement(customerPartyNode, 'cac:Party', 'Party')
    : null
  const buyer = parseParty(customerParty || customerPartyNode)

  if (!buyer.name) {
    throw new Error('Buyer name is required')
  }

  // Extract payment terms
  const paymentTermsNode = findElement(invoice, 'cac:PaymentTerms', 'PaymentTerms')
  const paymentTerms = paymentTermsNode
    ? getElementText(paymentTermsNode, 'cbc:Note', 'Note')
    : undefined

  // Extract payment means
  const paymentMeansNode = findElement(invoice, 'cac:PaymentMeans', 'PaymentMeans')
  const paymentMeansCode = paymentMeansNode
    ? getElementText(paymentMeansNode, 'cbc:PaymentMeansCode', 'PaymentMeansCode')
    : undefined

  // Extract line items
  const lineItems = parseLineItems(invoice)

  return {
    invoice_id: invoiceId,
    invoice_date: invoiceDate,
    due_date: dueDate,
    currency_code: currencyCode,
    tax_exclusive_amount: taxExclusiveAmount,
    tax_amount: taxAmount,
    tax_inclusive_amount: taxInclusiveAmount,
    payable_amount: payableAmount,
    seller_name: seller.name,
    seller_tax_id: seller.tax_id,
    seller_address: seller.address,
    buyer_name: buyer.name,
    buyer_tax_id: buyer.tax_id,
    buyer_address: buyer.address,
    invoice_type_code: invoiceTypeCode,
    note,
    payment_terms: paymentTerms,
    payment_means_code: paymentMeansCode,
    line_items: lineItems.length > 0 ? lineItems : undefined,
  }
}
