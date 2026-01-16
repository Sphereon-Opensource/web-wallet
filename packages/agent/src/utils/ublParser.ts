import * as xml2js from 'xml2js'

/**
 * Parsed eInvoice data from UBL XML.
 * Maps to the urn:org:fides:einvoice:1 credential schema.
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
  line_items?: Array<{
    line_number: number
    description: string
    note?: string
    quantity: number
    quantity_unit: string
    unit_price: number
    vat_percent: number
    line_total: number
  }>
}

/**
 * Get text content from an XML node, handling UBL namespace prefixes.
 */
function getText(node: any): string | undefined {
  if (!node) return undefined
  if (Array.isArray(node)) {
    if (node.length === 0) return undefined
    node = node[0]
  }
  if (typeof node === 'string') return node
  if (typeof node === 'object') {
    // Handle text content with attributes (e.g., { _: 'value', $: { currencyID: 'EUR' } })
    if (node._) return node._
    // Handle simple text content
    if (node['#text']) return node['#text']
  }
  return String(node)
}

/**
 * Get numeric content from an XML node.
 */
function getNumber(node: any): number | undefined {
  const text = getText(node)
  if (!text) return undefined
  const num = parseFloat(text)
  return isNaN(num) ? undefined : num
}

/**
 * Get attribute from an XML node.
 */
function getAttribute(node: any, attr: string): string | undefined {
  if (!node) return undefined
  if (Array.isArray(node)) {
    if (node.length === 0) return undefined
    node = node[0]
  }
  return node?.$?.[attr]
}

/**
 * Parse address from UBL PostalAddress element.
 */
function parseAddress(addressNode: any): ParsedEInvoice['seller_address'] | undefined {
  if (!addressNode) return undefined
  if (Array.isArray(addressNode)) {
    if (addressNode.length === 0) return undefined
    addressNode = addressNode[0]
  }

  return {
    street: getText(addressNode['cbc:StreetName']) || getText(addressNode['StreetName']),
    city: getText(addressNode['cbc:CityName']) || getText(addressNode['CityName']),
    postal_code: getText(addressNode['cbc:PostalZone']) || getText(addressNode['PostalZone']),
    country_code:
      getText(addressNode['cac:Country']?.[0]?.['cbc:IdentificationCode']) ||
      getText(addressNode['Country']?.[0]?.['IdentificationCode']),
  }
}

/**
 * Parse party (seller or buyer) from UBL Party element.
 */
function parseParty(partyNode: any): { name?: string; tax_id?: string; address?: ParsedEInvoice['seller_address'] } {
  if (!partyNode) return {}
  if (Array.isArray(partyNode)) {
    if (partyNode.length === 0) return {}
    partyNode = partyNode[0]
  }

  const partyName =
    getText(partyNode['cac:PartyName']?.[0]?.['cbc:Name']) || getText(partyNode['PartyName']?.[0]?.['Name'])

  const partyLegalEntity = partyNode['cac:PartyLegalEntity']?.[0] || partyNode['PartyLegalEntity']?.[0]
  const registrationName = getText(partyLegalEntity?.['cbc:RegistrationName']) || getText(partyLegalEntity?.['RegistrationName'])

  const partyTaxScheme = partyNode['cac:PartyTaxScheme']?.[0] || partyNode['PartyTaxScheme']?.[0]
  const taxId =
    getText(partyTaxScheme?.['cbc:CompanyID']) ||
    getText(partyTaxScheme?.['CompanyID']) ||
    getText(partyLegalEntity?.['cbc:CompanyID']) ||
    getText(partyLegalEntity?.['CompanyID'])

  const postalAddress = partyNode['cac:PostalAddress']?.[0] || partyNode['PostalAddress']?.[0]

  return {
    name: partyName || registrationName,
    tax_id: taxId,
    address: parseAddress(postalAddress),
  }
}

/**
 * Parse line items from UBL InvoiceLine elements.
 */
function parseLineItems(invoiceLines: any[]): ParsedEInvoice['line_items'] {
  if (!invoiceLines || !Array.isArray(invoiceLines)) return undefined

  return invoiceLines.map((line, index) => {
    const itemNode = line['cac:Item']?.[0] || line['Item']?.[0]
    const priceNode = line['cac:Price']?.[0] || line['Price']?.[0]

    // Get line ID/number
    const lineId = getText(line['cbc:ID']) || getText(line['ID'])
    const lineNumber = lineId ? parseInt(lineId, 10) : index + 1

    // Get item name and description (Name is primary, Description is note if different)
    const itemName = getText(itemNode?.['cbc:Name']) || getText(itemNode?.['Name'])
    const itemDescription = getText(itemNode?.['cbc:Description']) || getText(itemNode?.['Description'])
    const description = itemName || itemDescription || 'Unknown Item'
    const note = itemDescription && itemDescription !== description ? itemDescription : undefined

    // Get quantity and unit code
    const quantity = getNumber(line['cbc:InvoicedQuantity']) || getNumber(line['InvoicedQuantity']) || 0
    const quantityUnit =
      getAttribute(line['cbc:InvoicedQuantity'], 'unitCode') ||
      getAttribute(line['InvoicedQuantity'], 'unitCode') ||
      'EA'

    // Get price
    const unitPrice = getNumber(priceNode?.['cbc:PriceAmount']) || getNumber(priceNode?.['PriceAmount']) || 0

    // Get line total
    const lineTotal = getNumber(line['cbc:LineExtensionAmount']) || getNumber(line['LineExtensionAmount']) || 0

    // Get VAT percent from ClassifiedTaxCategory
    let vatPercent = 0
    if (itemNode) {
      const taxCategoryNode = itemNode['cac:ClassifiedTaxCategory']?.[0] || itemNode['ClassifiedTaxCategory']?.[0]
      if (taxCategoryNode) {
        vatPercent = getNumber(taxCategoryNode['cbc:Percent']) || getNumber(taxCategoryNode['Percent']) || 0
      }
    }

    return {
      line_number: isNaN(lineNumber) ? index + 1 : lineNumber,
      description,
      note,
      quantity,
      quantity_unit: quantityUnit,
      unit_price: unitPrice,
      vat_percent: vatPercent,
      line_total: lineTotal,
    }
  })
}

/**
 * Parse UBL Invoice XML and extract eInvoice data.
 *
 * Supports UBL 2.1 Invoice format with common namespace prefixes (cbc:, cac:).
 *
 * @param xmlContent - The UBL XML content as a string or Buffer
 * @returns Parsed eInvoice data
 * @throws Error if parsing fails or required fields are missing
 */
export async function parseUblInvoice(xmlContent: string | Buffer): Promise<ParsedEInvoice> {
  const parser = new xml2js.Parser({
    explicitArray: true,
    ignoreAttrs: false,
    mergeAttrs: false,
  })

  const xml = typeof xmlContent === 'string' ? xmlContent : xmlContent.toString('utf-8')

  let result: any
  try {
    result = await parser.parseStringPromise(xml)
  } catch (error: any) {
    throw new Error(`Failed to parse UBL XML: ${error.message}`)
  }

  // Find the Invoice root element (with or without namespace prefix)
  let invoice = result.Invoice || result['ubl:Invoice'] || result['Invoice21']
  if (!invoice) {
    // Try to find it in any namespace
    const keys = Object.keys(result)
    const invoiceKey = keys.find((k) => k.includes('Invoice'))
    if (invoiceKey) {
      invoice = result[invoiceKey]
    }
  }

  if (!invoice) {
    throw new Error('UBL Invoice root element not found')
  }

  // Handle array wrapper if present
  if (Array.isArray(invoice)) {
    invoice = invoice[0]
  }

  // Extract invoice ID
  const invoiceId = getText(invoice['cbc:ID']) || getText(invoice['ID'])
  if (!invoiceId) {
    throw new Error('Invoice ID (cbc:ID) is required')
  }

  // Extract invoice date
  const invoiceDate = getText(invoice['cbc:IssueDate']) || getText(invoice['IssueDate'])
  if (!invoiceDate) {
    throw new Error('Invoice date (cbc:IssueDate) is required')
  }

  // Extract due date
  const dueDate = getText(invoice['cbc:DueDate']) || getText(invoice['DueDate'])

  // Extract invoice type code
  const invoiceTypeCode = getText(invoice['cbc:InvoiceTypeCode']) || getText(invoice['InvoiceTypeCode'])

  // Extract note
  const note = getText(invoice['cbc:Note']) || getText(invoice['Note'])

  // Extract monetary totals
  const legalMonetaryTotal =
    invoice['cac:LegalMonetaryTotal']?.[0] || invoice['LegalMonetaryTotal']?.[0] || {}

  const currencyCode =
    getAttribute(legalMonetaryTotal['cbc:TaxExclusiveAmount'], 'currencyID') ||
    getAttribute(legalMonetaryTotal['TaxExclusiveAmount'], 'currencyID') ||
    getAttribute(invoice['cbc:DocumentCurrencyCode'], 'listID') ||
    getText(invoice['cbc:DocumentCurrencyCode']) ||
    getText(invoice['DocumentCurrencyCode']) ||
    'EUR'

  const taxExclusiveAmount =
    getNumber(legalMonetaryTotal['cbc:TaxExclusiveAmount']) ||
    getNumber(legalMonetaryTotal['TaxExclusiveAmount']) ||
    0

  const taxInclusiveAmount =
    getNumber(legalMonetaryTotal['cbc:TaxInclusiveAmount']) ||
    getNumber(legalMonetaryTotal['TaxInclusiveAmount']) ||
    0

  const payableAmount =
    getNumber(legalMonetaryTotal['cbc:PayableAmount']) ||
    getNumber(legalMonetaryTotal['PayableAmount']) ||
    taxInclusiveAmount

  // Extract tax totals
  const taxTotal = invoice['cac:TaxTotal']?.[0] || invoice['TaxTotal']?.[0] || {}
  const taxAmount =
    getNumber(taxTotal['cbc:TaxAmount']) || getNumber(taxTotal['TaxAmount']) || taxInclusiveAmount - taxExclusiveAmount

  // Extract seller (AccountingSupplierParty)
  const supplierParty =
    invoice['cac:AccountingSupplierParty']?.[0]?.['cac:Party']?.[0] ||
    invoice['AccountingSupplierParty']?.[0]?.['Party']?.[0] ||
    invoice['cac:AccountingSupplierParty']?.[0] ||
    invoice['AccountingSupplierParty']?.[0]
  const seller = parseParty(supplierParty)

  if (!seller.name) {
    throw new Error('Seller name is required')
  }

  // Extract buyer (AccountingCustomerParty)
  const customerParty =
    invoice['cac:AccountingCustomerParty']?.[0]?.['cac:Party']?.[0] ||
    invoice['AccountingCustomerParty']?.[0]?.['Party']?.[0] ||
    invoice['cac:AccountingCustomerParty']?.[0] ||
    invoice['AccountingCustomerParty']?.[0]
  const buyer = parseParty(customerParty)

  if (!buyer.name) {
    throw new Error('Buyer name is required')
  }

  // Extract payment terms
  const paymentTerms =
    getText(invoice['cac:PaymentTerms']?.[0]?.['cbc:Note']) ||
    getText(invoice['PaymentTerms']?.[0]?.['Note'])

  // Extract payment means
  const paymentMeansCode =
    getText(invoice['cac:PaymentMeans']?.[0]?.['cbc:PaymentMeansCode']) ||
    getText(invoice['PaymentMeans']?.[0]?.['PaymentMeansCode'])

  // Extract line items
  const invoiceLines = invoice['cac:InvoiceLine'] || invoice['InvoiceLine']
  const lineItems = parseLineItems(invoiceLines)

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
    line_items: lineItems,
  }
}

/**
 * Validate that a parsed eInvoice has all required fields for the credential.
 */
export function validateParsedEInvoice(invoice: ParsedEInvoice): string[] {
  const errors: string[] = []

  if (!invoice.invoice_id) errors.push('invoice_id is required')
  if (!invoice.invoice_date) errors.push('invoice_date is required')
  if (!invoice.currency_code) errors.push('currency_code is required')
  if (invoice.payable_amount === undefined) errors.push('payable_amount is required')
  if (!invoice.seller_name) errors.push('seller_name is required')
  if (!invoice.buyer_name) errors.push('buyer_name is required')

  return errors
}
