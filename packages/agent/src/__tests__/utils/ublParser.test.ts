import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { parseUblInvoice, validateParsedEInvoice, ParsedEInvoice } from '../../utils/ublParser'

// Mock console methods to avoid noise in tests
const originalConsoleLog = console.log
const originalConsoleWarn = console.warn
const originalConsoleError = console.error

beforeAll(() => {
  console.log = jest.fn()
  console.warn = jest.fn()
  console.error = jest.fn()
})

afterAll(() => {
  console.log = originalConsoleLog
  console.warn = originalConsoleWarn
  console.error = originalConsoleError
})

// Sample UBL Invoice XML with namespace prefixes
const SAMPLE_UBL_INVOICE = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
  <cbc:ID>INV-2024-001</cbc:ID>
  <cbc:IssueDate>2024-01-15</cbc:IssueDate>
  <cbc:DueDate>2024-02-15</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:Note>Payment within 30 days</cbc:Note>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>

  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>Seller Company Ltd</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>123 Business Street</cbc:StreetName>
        <cbc:CityName>Amsterdam</cbc:CityName>
        <cbc:PostalZone>1012 AB</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>NL</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>NL123456789B01</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>Buyer Corporation</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>456 Customer Avenue</cbc:StreetName>
        <cbc:CityName>Rotterdam</cbc:CityName>
        <cbc:PostalZone>3011 CD</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>NL</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>NL987654321B02</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <cac:PaymentTerms>
    <cbc:Note>Net 30 days</cbc:Note>
  </cac:PaymentTerms>

  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>42</cbc:PaymentMeansCode>
  </cac:PaymentMeans>

  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="EUR">210.00</cbc:TaxAmount>
  </cac:TaxTotal>

  <cac:LegalMonetaryTotal>
    <cbc:TaxExclusiveAmount currencyID="EUR">1000.00</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">1210.00</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="EUR">1210.00</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="EA">10</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="EUR">500.00</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>Widget A</cbc:Name>
      <cbc:Description>High quality widget</cbc:Description>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="EUR">50.00</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>

  <cac:InvoiceLine>
    <cbc:ID>2</cbc:ID>
    <cbc:InvoicedQuantity unitCode="EA">5</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="EUR">500.00</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>Widget B</cbc:Name>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="EUR">100.00</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>
</Invoice>`

// Minimal UBL Invoice XML
const MINIMAL_UBL_INVOICE = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
  <cbc:ID>INV-MIN-001</cbc:ID>
  <cbc:IssueDate>2024-01-01</cbc:IssueDate>
  <cbc:DocumentCurrencyCode>USD</cbc:DocumentCurrencyCode>

  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>Minimal Seller</cbc:Name>
      </cac:PartyName>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>Minimal Buyer</cbc:Name>
      </cac:PartyName>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <cac:LegalMonetaryTotal>
    <cbc:TaxExclusiveAmount currencyID="USD">100.00</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="USD">100.00</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="USD">100.00</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`

describe('ublParser', () => {
  describe('parseUblInvoice', () => {
    it('should parse a complete UBL invoice', async () => {
      const result = await parseUblInvoice(SAMPLE_UBL_INVOICE)

      expect(result.invoice_id).toBe('INV-2024-001')
      expect(result.invoice_date).toBe('2024-01-15')
      expect(result.due_date).toBe('2024-02-15')
      expect(result.currency_code).toBe('EUR')
      expect(result.tax_exclusive_amount).toBe(1000.0)
      expect(result.tax_amount).toBe(210.0)
      expect(result.tax_inclusive_amount).toBe(1210.0)
      expect(result.payable_amount).toBe(1210.0)
    })

    it('should parse seller information correctly', async () => {
      const result = await parseUblInvoice(SAMPLE_UBL_INVOICE)

      expect(result.seller_name).toBe('Seller Company Ltd')
      expect(result.seller_tax_id).toBe('NL123456789B01')
      expect(result.seller_address).toBeDefined()
      expect(result.seller_address?.street).toBe('123 Business Street')
      expect(result.seller_address?.city).toBe('Amsterdam')
      expect(result.seller_address?.postal_code).toBe('1012 AB')
      expect(result.seller_address?.country_code).toBe('NL')
    })

    it('should parse buyer information correctly', async () => {
      const result = await parseUblInvoice(SAMPLE_UBL_INVOICE)

      expect(result.buyer_name).toBe('Buyer Corporation')
      expect(result.buyer_tax_id).toBe('NL987654321B02')
      expect(result.buyer_address).toBeDefined()
      expect(result.buyer_address?.street).toBe('456 Customer Avenue')
      expect(result.buyer_address?.city).toBe('Rotterdam')
      expect(result.buyer_address?.postal_code).toBe('3011 CD')
      expect(result.buyer_address?.country_code).toBe('NL')
    })

    it('should parse optional fields correctly', async () => {
      const result = await parseUblInvoice(SAMPLE_UBL_INVOICE)

      expect(result.invoice_type_code).toBe('380')
      expect(result.note).toBe('Payment within 30 days')
      expect(result.payment_terms).toBe('Net 30 days')
      expect(result.payment_means_code).toBe('42')
    })

    it('should parse line items correctly', async () => {
      const result = await parseUblInvoice(SAMPLE_UBL_INVOICE)

      expect(result.line_items).toBeDefined()
      expect(result.line_items).toHaveLength(2)

      const line1 = result.line_items![0]
      expect(line1.id).toBe('1')
      expect(line1.quantity).toBe(10)
      expect(line1.unit_code).toBe('EA')
      expect(line1.unit_price).toBe(50.0)
      expect(line1.line_extension_amount).toBe(500.0)
      expect(line1.description).toBe('High quality widget')

      const line2 = result.line_items![1]
      expect(line2.id).toBe('2')
      expect(line2.quantity).toBe(5)
      expect(line2.description).toBe('Widget B')
    })

    it('should parse a minimal UBL invoice', async () => {
      const result = await parseUblInvoice(MINIMAL_UBL_INVOICE)

      expect(result.invoice_id).toBe('INV-MIN-001')
      expect(result.invoice_date).toBe('2024-01-01')
      expect(result.seller_name).toBe('Minimal Seller')
      expect(result.buyer_name).toBe('Minimal Buyer')
      expect(result.currency_code).toBe('USD')
      expect(result.payable_amount).toBe(100.0)

      // Optional fields should be undefined
      expect(result.due_date).toBeUndefined()
      expect(result.note).toBeUndefined()
      expect(result.seller_tax_id).toBeUndefined()
    })

    it('should accept Buffer input', async () => {
      const buffer = Buffer.from(MINIMAL_UBL_INVOICE, 'utf-8')
      const result = await parseUblInvoice(buffer)

      expect(result.invoice_id).toBe('INV-MIN-001')
    })

    it('should throw error for invalid XML', async () => {
      const invalidXml = '<Invoice><Invalid XML'

      await expect(parseUblInvoice(invalidXml)).rejects.toThrow('Failed to parse UBL XML')
    })

    it('should throw error when Invoice root element is not found', async () => {
      const noInvoiceXml = '<?xml version="1.0"?><NotAnInvoice></NotAnInvoice>'

      await expect(parseUblInvoice(noInvoiceXml)).rejects.toThrow('UBL Invoice root element not found')
    })

    it('should throw error when invoice ID is missing', async () => {
      const noIdXml = `<?xml version="1.0"?>
<Invoice xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
  <cbc:IssueDate>2024-01-01</cbc:IssueDate>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>Seller</cbc:Name></cac:PartyName>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>Buyer</cbc:Name></cac:PartyName>
    </cac:Party>
  </cac:AccountingCustomerParty>
</Invoice>`

      await expect(parseUblInvoice(noIdXml)).rejects.toThrow('Invoice ID (cbc:ID) is required')
    })

    it('should throw error when seller name is missing', async () => {
      const noSellerXml = `<?xml version="1.0"?>
<Invoice xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
  <cbc:ID>INV-001</cbc:ID>
  <cbc:IssueDate>2024-01-01</cbc:IssueDate>
  <cac:AccountingSupplierParty>
    <cac:Party></cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>Buyer</cbc:Name></cac:PartyName>
    </cac:Party>
  </cac:AccountingCustomerParty>
</Invoice>`

      await expect(parseUblInvoice(noSellerXml)).rejects.toThrow('Seller name is required')
    })

    it('should throw error when buyer name is missing', async () => {
      const noBuyerXml = `<?xml version="1.0"?>
<Invoice xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
  <cbc:ID>INV-001</cbc:ID>
  <cbc:IssueDate>2024-01-01</cbc:IssueDate>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>Seller</cbc:Name></cac:PartyName>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party></cac:Party>
  </cac:AccountingCustomerParty>
</Invoice>`

      await expect(parseUblInvoice(noBuyerXml)).rejects.toThrow('Buyer name is required')
    })
  })

  describe('validateParsedEInvoice', () => {
    it('should return no errors for valid invoice', async () => {
      const invoice = await parseUblInvoice(SAMPLE_UBL_INVOICE)
      const errors = validateParsedEInvoice(invoice)

      expect(errors).toHaveLength(0)
    })

    it('should return error when invoice_id is missing', () => {
      const invoice: ParsedEInvoice = {
        invoice_id: '',
        invoice_date: '2024-01-01',
        currency_code: 'EUR',
        tax_exclusive_amount: 100,
        tax_amount: 21,
        tax_inclusive_amount: 121,
        payable_amount: 121,
        seller_name: 'Seller',
        buyer_name: 'Buyer',
      }

      const errors = validateParsedEInvoice(invoice)

      expect(errors).toContain('invoice_id is required')
    })

    it('should return error when invoice_date is missing', () => {
      const invoice: ParsedEInvoice = {
        invoice_id: 'INV-001',
        invoice_date: '',
        currency_code: 'EUR',
        tax_exclusive_amount: 100,
        tax_amount: 21,
        tax_inclusive_amount: 121,
        payable_amount: 121,
        seller_name: 'Seller',
        buyer_name: 'Buyer',
      }

      const errors = validateParsedEInvoice(invoice)

      expect(errors).toContain('invoice_date is required')
    })

    it('should return error when currency_code is missing', () => {
      const invoice: ParsedEInvoice = {
        invoice_id: 'INV-001',
        invoice_date: '2024-01-01',
        currency_code: '',
        tax_exclusive_amount: 100,
        tax_amount: 21,
        tax_inclusive_amount: 121,
        payable_amount: 121,
        seller_name: 'Seller',
        buyer_name: 'Buyer',
      }

      const errors = validateParsedEInvoice(invoice)

      expect(errors).toContain('currency_code is required')
    })

    it('should return error when seller_name is missing', () => {
      const invoice: ParsedEInvoice = {
        invoice_id: 'INV-001',
        invoice_date: '2024-01-01',
        currency_code: 'EUR',
        tax_exclusive_amount: 100,
        tax_amount: 21,
        tax_inclusive_amount: 121,
        payable_amount: 121,
        seller_name: '',
        buyer_name: 'Buyer',
      }

      const errors = validateParsedEInvoice(invoice)

      expect(errors).toContain('seller_name is required')
    })

    it('should return error when buyer_name is missing', () => {
      const invoice: ParsedEInvoice = {
        invoice_id: 'INV-001',
        invoice_date: '2024-01-01',
        currency_code: 'EUR',
        tax_exclusive_amount: 100,
        tax_amount: 21,
        tax_inclusive_amount: 121,
        payable_amount: 121,
        seller_name: 'Seller',
        buyer_name: '',
      }

      const errors = validateParsedEInvoice(invoice)

      expect(errors).toContain('buyer_name is required')
    })

    it('should return multiple errors for multiple missing fields', () => {
      const invoice: ParsedEInvoice = {
        invoice_id: '',
        invoice_date: '',
        currency_code: '',
        tax_exclusive_amount: 100,
        tax_amount: 21,
        tax_inclusive_amount: 121,
        payable_amount: 121,
        seller_name: '',
        buyer_name: '',
      }

      const errors = validateParsedEInvoice(invoice)

      expect(errors).toHaveLength(5)
      expect(errors).toContain('invoice_id is required')
      expect(errors).toContain('invoice_date is required')
      expect(errors).toContain('currency_code is required')
      expect(errors).toContain('seller_name is required')
      expect(errors).toContain('buyer_name is required')
    })
  })
})
