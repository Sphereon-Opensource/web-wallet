import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import {
  buildEvidenceReferences,
  buildCredentialSubject,
  EvidenceReference,
} from '../../utils/einvoiceCredentialIssuer'
import { ParsedEInvoice } from '../../utils/ublParser'
import { Asset } from '../../plugins/asset'

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

describe('einvoiceCredentialIssuer', () => {
  describe('buildEvidenceReferences', () => {
    it('should build evidence references from asset files', () => {
      const assets: Asset[] = [
        {
          id: 'uuid-1',
          digestMultibase: 'zQmWvQxTqbG2Z9HPJgG57jmPGdNEDPWaNPCFJyYeLhQQbQ1',
          hashAlgorithm: 'sha256',
          filename: 'invoice.xml',
          contentType: 'application/xml',
          fileSize: 1024,
          storagePath: '/storage/uuid-1/invoice.xml',
          assetType: 'UBLInvoice',
          isPublic: true,
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15'),
        },
        {
          id: 'uuid-2',
          digestMultibase: 'zQmWvQxTqbG2Z9HPJgG57jmPGdNEDPWaNPCFJyYeLhQQbQ2',
          hashAlgorithm: 'sha256',
          filename: 'supporting-doc.pdf',
          contentType: 'application/pdf',
          fileSize: 2048,
          storagePath: '/storage/uuid-2/supporting-doc.pdf',
          assetType: 'SupportingDocument',
          isPublic: true,
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15'),
        },
      ]

      const baseUrl = 'https://wallet.example.com'
      const result = buildEvidenceReferences(assets, baseUrl)

      expect(result).toHaveLength(2)

      expect(result[0].id).toBe('https://wallet.example.com/api/assets/zQmWvQxTqbG2Z9HPJgG57jmPGdNEDPWaNPCFJyYeLhQQbQ1')
      expect(result[0].type).toEqual(['UBLInvoice'])
      expect(result[0].name).toBe('invoice.xml')
      expect(result[0].digestMultibase).toBe('zQmWvQxTqbG2Z9HPJgG57jmPGdNEDPWaNPCFJyYeLhQQbQ1')

      expect(result[1].id).toBe('https://wallet.example.com/api/assets/zQmWvQxTqbG2Z9HPJgG57jmPGdNEDPWaNPCFJyYeLhQQbQ2')
      expect(result[1].type).toEqual(['SupportingDocument'])
      expect(result[1].name).toBe('supporting-doc.pdf')
      expect(result[1].digestMultibase).toBe('zQmWvQxTqbG2Z9HPJgG57jmPGdNEDPWaNPCFJyYeLhQQbQ2')
    })

    it('should handle assets with special character filenames', () => {
      const assets: Asset[] = [
        {
          id: 'uuid-1',
          digestMultibase: 'zQmWvQxTqbG2Z9HPJgG57jmPGdNEDPWaNPCFJyYeLhQQbQ',
          hashAlgorithm: 'sha256',
          filename: 'invoice with spaces & symbols.xml',
          contentType: 'application/xml',
          fileSize: 1024,
          storagePath: '/storage/uuid-1/file.xml',
          assetType: 'UBLInvoice',
          isPublic: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      const result = buildEvidenceReferences(assets, 'https://example.com')

      // URL is based on digestMultibase, not filename
      expect(result[0].id).toBe('https://example.com/api/assets/zQmWvQxTqbG2Z9HPJgG57jmPGdNEDPWaNPCFJyYeLhQQbQ')
      expect(result[0].name).toBe('invoice with spaces & symbols.xml')
    })

    it('should return empty array for empty evidence files', () => {
      const result = buildEvidenceReferences([], 'https://example.com')

      expect(result).toEqual([])
    })
  })

  describe('buildCredentialSubject', () => {
    const fullInvoiceData: ParsedEInvoice = {
      invoice_id: 'INV-2024-001',
      invoice_date: '2024-01-15',
      due_date: '2024-02-15',
      currency_code: 'EUR',
      tax_exclusive_amount: 1000.0,
      tax_amount: 210.0,
      tax_inclusive_amount: 1210.0,
      payable_amount: 1210.0,
      seller_name: 'Seller Company Ltd',
      seller_tax_id: 'NL123456789B01',
      seller_address: {
        street: '123 Business Street',
        city: 'Amsterdam',
        postal_code: '1012 AB',
        country_code: 'NL',
      },
      buyer_name: 'Buyer Corporation',
      buyer_tax_id: 'NL987654321B02',
      buyer_address: {
        street: '456 Customer Avenue',
        city: 'Rotterdam',
        postal_code: '3011 CD',
        country_code: 'NL',
      },
      invoice_type_code: '380',
      note: 'Payment within 30 days',
      payment_terms: 'Net 30 days',
      payment_means_code: '42',
    }

    it('should build credential subject with all fields', () => {
      const result = buildCredentialSubject(fullInvoiceData)

      expect(result.invoice_id).toBe('INV-2024-001')
      expect(result.invoice_date).toBe('2024-01-15')
      expect(result.due_date).toBe('2024-02-15')
      expect(result.currency_code).toBe('EUR')
      expect(result.tax_exclusive_amount).toBe(1000.0)
      expect(result.tax_amount).toBe(210.0)
      expect(result.tax_inclusive_amount).toBe(1210.0)
      expect(result.payable_amount).toBe(1210.0)
      expect(result.seller_name).toBe('Seller Company Ltd')
      expect(result.seller_tax_id).toBe('NL123456789B01')
      expect(result.seller_address).toEqual({
        street: '123 Business Street',
        city: 'Amsterdam',
        postal_code: '1012 AB',
        country_code: 'NL',
      })
      expect(result.buyer_name).toBe('Buyer Corporation')
      expect(result.buyer_tax_id).toBe('NL987654321B02')
      expect(result.buyer_address).toEqual({
        street: '456 Customer Avenue',
        city: 'Rotterdam',
        postal_code: '3011 CD',
        country_code: 'NL',
      })
      expect(result.invoice_type_code).toBe('380')
      expect(result.note).toBe('Payment within 30 days')
      expect(result.payment_terms).toBe('Net 30 days')
      expect(result.payment_means_code).toBe('42')
    })

    it('should add subject DID when provided', () => {
      const result = buildCredentialSubject(fullInvoiceData, 'did:web:buyer.example.com')

      expect(result.id).toBe('did:web:buyer.example.com')
    })

    it('should not include id field when subject DID is not provided', () => {
      const result = buildCredentialSubject(fullInvoiceData)

      expect(result.id).toBeUndefined()
    })

    it('should only include required fields for minimal invoice', () => {
      const minimalInvoice: ParsedEInvoice = {
        invoice_id: 'INV-MIN-001',
        invoice_date: '2024-01-01',
        currency_code: 'USD',
        tax_exclusive_amount: 100,
        tax_amount: 0,
        tax_inclusive_amount: 100,
        payable_amount: 100,
        seller_name: 'Minimal Seller',
        buyer_name: 'Minimal Buyer',
      }

      const result = buildCredentialSubject(minimalInvoice)

      // Required fields should be present
      expect(result.invoice_id).toBe('INV-MIN-001')
      expect(result.invoice_date).toBe('2024-01-01')
      expect(result.currency_code).toBe('USD')
      expect(result.seller_name).toBe('Minimal Seller')
      expect(result.buyer_name).toBe('Minimal Buyer')

      // Optional fields should not be present
      expect(result.due_date).toBeUndefined()
      expect(result.seller_tax_id).toBeUndefined()
      expect(result.seller_address).toBeUndefined()
      expect(result.buyer_tax_id).toBeUndefined()
      expect(result.buyer_address).toBeUndefined()
      expect(result.invoice_type_code).toBeUndefined()
      expect(result.note).toBeUndefined()
      expect(result.payment_terms).toBeUndefined()
      expect(result.payment_means_code).toBeUndefined()
    })

    it('should handle partial optional fields', () => {
      const partialInvoice: ParsedEInvoice = {
        invoice_id: 'INV-001',
        invoice_date: '2024-01-01',
        currency_code: 'EUR',
        tax_exclusive_amount: 100,
        tax_amount: 21,
        tax_inclusive_amount: 121,
        payable_amount: 121,
        seller_name: 'Seller',
        seller_tax_id: 'TAX123',
        // No seller_address
        buyer_name: 'Buyer',
        // No buyer_tax_id
        buyer_address: {
          city: 'City Only',
          // Partial address
        },
        note: 'A note',
        // No payment_terms or payment_means_code
      }

      const result = buildCredentialSubject(partialInvoice)

      expect(result.seller_tax_id).toBe('TAX123')
      expect(result.seller_address).toBeUndefined()
      expect(result.buyer_tax_id).toBeUndefined()
      expect(result.buyer_address).toEqual({ city: 'City Only' })
      expect(result.note).toBe('A note')
      expect(result.payment_terms).toBeUndefined()
    })
  })

  describe('Integration: Evidence in Credential', () => {
    it('should produce valid evidence references for credential payload', () => {
      const assets: Asset[] = [
        {
          id: 'evidence-uuid-1',
          digestMultibase: 'zQmWvQxTqbG2Z9HPJgG57jmPGdNEDPWaNPCFJyYeLhQQbQ',
          hashAlgorithm: 'sha256',
          filename: 'invoice.xml',
          contentType: 'application/xml',
          fileSize: 5000,
          storagePath: '/evidence/evidence-uuid-1/invoice.xml',
          assetType: 'UBLInvoice',
          isPublic: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      const refs = buildEvidenceReferences(assets, 'https://sender-wallet.example.com')

      // Verify the structure matches W3C VC evidence format
      expect(refs[0]).toEqual({
        id: 'https://sender-wallet.example.com/api/assets/zQmWvQxTqbG2Z9HPJgG57jmPGdNEDPWaNPCFJyYeLhQQbQ',
        type: ['UBLInvoice'],
        name: 'invoice.xml',
        digestMultibase: 'zQmWvQxTqbG2Z9HPJgG57jmPGdNEDPWaNPCFJyYeLhQQbQ',
      })
    })
  })
})
