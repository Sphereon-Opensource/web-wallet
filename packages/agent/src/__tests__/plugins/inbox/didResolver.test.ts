/**
 * Tests for inbox DID resolution utilities.
 */

import { findInboxServiceEndpoint } from '../../../plugins/inbox/utils/didResolver'

describe('findInboxServiceEndpoint', () => {
  describe('service array handling', () => {
    it('should return null when DID document has no service property', () => {
      const didDocument = {
        id: 'did:web:example.com',
        verificationMethod: [],
      }

      const result = findInboxServiceEndpoint(didDocument, 'EInvoiceInbox')
      expect(result).toBeNull()
    })

    it('should return null when service is not an array', () => {
      const didDocument = {
        id: 'did:web:example.com',
        service: 'not-an-array',
      }

      const result = findInboxServiceEndpoint(didDocument, 'EInvoiceInbox')
      expect(result).toBeNull()
    })

    it('should return null when service array is empty', () => {
      const didDocument = {
        id: 'did:web:example.com',
        service: [],
      }

      const result = findInboxServiceEndpoint(didDocument, 'EInvoiceInbox')
      expect(result).toBeNull()
    })
  })

  describe('service type matching', () => {
    it('should find service with exact type match', () => {
      const didDocument = {
        id: 'did:web:example.com',
        service: [
          {
            id: '#inbox',
            type: 'EInvoiceInbox',
            serviceEndpoint: 'https://example.com/inbox',
          },
        ],
      }

      const result = findInboxServiceEndpoint(didDocument, 'EInvoiceInbox')
      expect(result).toEqual({
        inboxUrl: 'https://example.com/inbox',
        vct: undefined,
      })
    })

    it('should find service with new format (type: eInvoice, eInvoiceMethod: Direct)', () => {
      const didDocument = {
        id: 'did:web:example.com',
        service: [
          {
            id: '#einvoice-direct',
            type: 'eInvoice',
            eInvoiceMethod: 'Direct',
            serviceEndpoint: 'https://example.com/inbox',
            eInvoice: [{
              entityName: 'Test Corp',
              country: 'NL',
            }],
          },
        ],
      }

      const result = findInboxServiceEndpoint(didDocument, 'eInvoice')
      expect(result).toEqual({
        inboxUrl: 'https://example.com/inbox',
        vct: undefined,
      })
    })

    it('should find service with new format (type: eInvoice, eInvoiceMethod: Peppol)', () => {
      const didDocument = {
        id: 'did:web:example.com',
        service: [
          {
            id: '#einvoice-peppol',
            type: 'eInvoice',
            eInvoiceMethod: 'Peppol',
            serviceEndpoint: 'https://example.com/as4',
            eInvoice: [{
              entityName: 'Test Corp',
              country: 'NL',
              peppolParticipantId: 'iso6523-actorid-upis::0106:123456789',
            }],
          },
        ],
      }

      const result = findInboxServiceEndpoint(didDocument, 'eInvoice')
      expect(result).toEqual({
        inboxUrl: 'https://example.com/as4',
        vct: undefined,
      })
    })

    it('should find service with new format (type: eInvoice, eInvoiceMethod: PPF-FR)', () => {
      const didDocument = {
        id: 'did:web:example.com',
        service: [
          {
            id: '#einvoice-ppf',
            type: 'eInvoice',
            eInvoiceMethod: 'PPF-FR',
            serviceEndpoint: 'https://example.com/ppf',
            eInvoice: [{
              entityName: 'Test Corp',
              country: 'FR',
              ppfPlatformId: 'fr-ppf:pdp:provider-123',
            }],
          },
        ],
      }

      const result = findInboxServiceEndpoint(didDocument, 'eInvoice')
      expect(result).toEqual({
        inboxUrl: 'https://example.com/ppf',
        vct: undefined,
      })
    })

    it('should find service with mapped short name (einv-direct)', () => {
      const didDocument = {
        id: 'did:web:example.com',
        service: [
          {
            id: '#inbox',
            type: 'urn:org:fides:einv-direct:1',
            serviceEndpoint: 'https://example.com/inbox',
          },
        ],
      }

      // Using short name should match the URN
      const result = findInboxServiceEndpoint(didDocument, 'einv-direct')
      expect(result).toEqual({
        inboxUrl: 'https://example.com/inbox',
        vct: undefined,
      })
    })

    it('should find service with mapped short name (einv-peppol)', () => {
      const didDocument = {
        id: 'did:web:example.com',
        service: [
          {
            id: '#inbox',
            type: 'urn:org:fides:einv-peppol:1',
            serviceEndpoint: 'https://example.com/inbox',
          },
        ],
      }

      const result = findInboxServiceEndpoint(didDocument, 'einv-peppol')
      expect(result).toEqual({
        inboxUrl: 'https://example.com/inbox',
        vct: undefined,
      })
    })

    it('should find service with mapped short name (einv-ppf-fr)', () => {
      const didDocument = {
        id: 'did:web:example.com',
        service: [
          {
            id: '#inbox',
            type: 'urn:org:fides:einv-ppf-fr:1',
            serviceEndpoint: 'https://example.com/inbox',
          },
        ],
      }

      const result = findInboxServiceEndpoint(didDocument, 'einv-ppf-fr')
      expect(result).toEqual({
        inboxUrl: 'https://example.com/inbox',
        vct: undefined,
      })
    })

    it('should find service with FIDES URN type regardless of serviceType param', () => {
      const didDocument = {
        id: 'did:web:example.com',
        service: [
          {
            id: '#inbox',
            type: 'urn:org:fides:einv-direct:1',
            serviceEndpoint: 'https://example.com/inbox',
          },
        ],
      }

      // Even with a different serviceType, FIDES types should be found
      const result = findInboxServiceEndpoint(didDocument, 'SomeOtherType')
      expect(result).toEqual({
        inboxUrl: 'https://example.com/inbox',
        vct: undefined,
      })
    })

    it('should find service with type containing "inbox" (case insensitive)', () => {
      const didDocument = {
        id: 'did:web:example.com',
        service: [
          {
            id: '#inbox',
            type: 'MyCustomInboxService',
            serviceEndpoint: 'https://example.com/inbox',
          },
        ],
      }

      const result = findInboxServiceEndpoint(didDocument, 'SomeOtherType')
      expect(result).toEqual({
        inboxUrl: 'https://example.com/inbox',
        vct: undefined,
      })
    })

    it('should find service with type containing "einvoice" (case insensitive)', () => {
      const didDocument = {
        id: 'did:web:example.com',
        service: [
          {
            id: '#inbox',
            type: 'EInvoiceService',
            serviceEndpoint: 'https://example.com/inbox',
          },
        ],
      }

      const result = findInboxServiceEndpoint(didDocument, 'SomeOtherType')
      expect(result).toEqual({
        inboxUrl: 'https://example.com/inbox',
        vct: undefined,
      })
    })

    it('should handle service with array of types', () => {
      const didDocument = {
        id: 'did:web:example.com',
        service: [
          {
            id: '#inbox',
            type: ['LinkedDomains', 'EInvoiceInbox'],
            serviceEndpoint: 'https://example.com/inbox',
          },
        ],
      }

      const result = findInboxServiceEndpoint(didDocument, 'EInvoiceInbox')
      expect(result).toEqual({
        inboxUrl: 'https://example.com/inbox',
        vct: undefined,
      })
    })

    it('should return null when no matching service type', () => {
      const didDocument = {
        id: 'did:web:example.com',
        service: [
          {
            id: '#website',
            type: 'LinkedDomains',
            serviceEndpoint: 'https://example.com',
          },
        ],
      }

      const result = findInboxServiceEndpoint(didDocument, 'EInvoiceInbox')
      expect(result).toBeNull()
    })
  })

  describe('service endpoint extraction', () => {
    it('should extract string endpoint', () => {
      const didDocument = {
        id: 'did:web:example.com',
        service: [
          {
            id: '#inbox',
            type: 'EInvoiceInbox',
            serviceEndpoint: 'https://example.com/inbox',
          },
        ],
      }

      const result = findInboxServiceEndpoint(didDocument, 'EInvoiceInbox')
      expect(result?.inboxUrl).toBe('https://example.com/inbox')
    })

    it('should extract endpoint with uri property', () => {
      const didDocument = {
        id: 'did:web:example.com',
        service: [
          {
            id: '#inbox',
            type: 'EInvoiceInbox',
            serviceEndpoint: {
              uri: 'https://example.com/inbox',
            },
          },
        ],
      }

      const result = findInboxServiceEndpoint(didDocument, 'EInvoiceInbox')
      expect(result?.inboxUrl).toBe('https://example.com/inbox')
    })

    it('should extract endpoint with url property', () => {
      const didDocument = {
        id: 'did:web:example.com',
        service: [
          {
            id: '#inbox',
            type: 'EInvoiceInbox',
            serviceEndpoint: {
              url: 'https://example.com/inbox',
            },
          },
        ],
      }

      const result = findInboxServiceEndpoint(didDocument, 'EInvoiceInbox')
      expect(result?.inboxUrl).toBe('https://example.com/inbox')
    })

    it('should extract endpoint with inboxUrl property', () => {
      const didDocument = {
        id: 'did:web:example.com',
        service: [
          {
            id: '#inbox',
            type: 'EInvoiceInbox',
            serviceEndpoint: {
              inboxUrl: 'https://example.com/inbox',
            },
          },
        ],
      }

      const result = findInboxServiceEndpoint(didDocument, 'EInvoiceInbox')
      expect(result?.inboxUrl).toBe('https://example.com/inbox')
    })

    it('should prefer uri over url over inboxUrl', () => {
      const didDocument = {
        id: 'did:web:example.com',
        service: [
          {
            id: '#inbox',
            type: 'EInvoiceInbox',
            serviceEndpoint: {
              uri: 'https://example.com/uri',
              url: 'https://example.com/url',
              inboxUrl: 'https://example.com/inboxUrl',
            },
          },
        ],
      }

      const result = findInboxServiceEndpoint(didDocument, 'EInvoiceInbox')
      expect(result?.inboxUrl).toBe('https://example.com/uri')
    })

    it('should return null when endpoint has no url fields', () => {
      const didDocument = {
        id: 'did:web:example.com',
        service: [
          {
            id: '#inbox',
            type: 'EInvoiceInbox',
            serviceEndpoint: {
              description: 'My inbox',
            },
          },
        ],
      }

      const result = findInboxServiceEndpoint(didDocument, 'EInvoiceInbox')
      expect(result).toBeNull()
    })

    it('should return null when endpoint is null', () => {
      const didDocument = {
        id: 'did:web:example.com',
        service: [
          {
            id: '#inbox',
            type: 'EInvoiceInbox',
            serviceEndpoint: null,
          },
        ],
      }

      const result = findInboxServiceEndpoint(didDocument, 'EInvoiceInbox')
      expect(result).toBeNull()
    })
  })

  describe('additional endpoint properties', () => {
    it('should not extract folder from DID document (folder is internal metadata)', () => {
      const didDocument = {
        id: 'did:web:example.com',
        service: [
          {
            id: '#inbox',
            type: 'EInvoiceInbox',
            serviceEndpoint: 'https://example.com/inbox',
            folder: 'invoices', // This should be ignored - folder is internal
          },
        ],
      }

      const result = findInboxServiceEndpoint(didDocument, 'EInvoiceInbox')
      // folder should not be in the result - it's internal metadata
      expect(result).toEqual({
        inboxUrl: 'https://example.com/inbox',
        vct: undefined,
      })
    })

    it('should extract vct array from einvoice property at service level', () => {
      const didDocument = {
        id: 'did:web:example.com',
        service: [
          {
            id: '#inbox',
            type: 'EInvoiceInbox',
            serviceEndpoint: 'https://example.com/inbox',
            einvoice: {
              vct: ['urn:org:fides:einvoice:1', 'urn:org:fides:einvoice:2'],
            },
          },
        ],
      }

      const result = findInboxServiceEndpoint(didDocument, 'EInvoiceInbox')
      expect(result).toEqual({
        inboxUrl: 'https://example.com/inbox',
        vct: ['urn:org:fides:einvoice:1', 'urn:org:fides:einvoice:2'],
      })
    })

    it('should extract vct from einvoice but ignore folder (internal metadata)', () => {
      const didDocument = {
        id: 'did:web:example.com',
        service: [
          {
            id: '#inbox',
            type: 'EInvoiceInbox',
            serviceEndpoint: 'https://example.com/inbox',
            folder: 'einvoices', // This should be ignored - internal metadata
            einvoice: {
              vct: ['urn:org:fides:einvoice:1'],
              entityName: 'Example Corp',
              country: 'NL',
            },
          },
        ],
      }

      const result = findInboxServiceEndpoint(didDocument, 'EInvoiceInbox')
      // Only inboxUrl and vct should be extracted, not folder
      expect(result).toEqual({
        inboxUrl: 'https://example.com/inbox',
        vct: ['urn:org:fides:einvoice:1'],
      })
    })

    it('should not include additional properties when endpoint is a string', () => {
      const didDocument = {
        id: 'did:web:example.com',
        service: [
          {
            id: '#inbox',
            type: 'EInvoiceInbox',
            serviceEndpoint: 'https://example.com/inbox',
          },
        ],
      }

      const result = findInboxServiceEndpoint(didDocument, 'EInvoiceInbox')
      expect(result).toEqual({
        inboxUrl: 'https://example.com/inbox',
        vct: undefined,
      })
    })
  })

  describe('multiple services', () => {
    it('should find first matching service', () => {
      const didDocument = {
        id: 'did:web:example.com',
        service: [
          {
            id: '#website',
            type: 'LinkedDomains',
            serviceEndpoint: 'https://example.com',
          },
          {
            id: '#inbox',
            type: 'EInvoiceInbox',
            serviceEndpoint: 'https://example.com/inbox',
          },
          {
            id: '#inbox2',
            type: 'EInvoiceInbox',
            serviceEndpoint: 'https://example.com/inbox2',
          },
        ],
      }

      const result = findInboxServiceEndpoint(didDocument, 'EInvoiceInbox')
      expect(result?.inboxUrl).toBe('https://example.com/inbox')
    })

    it('should skip non-matching services', () => {
      const didDocument = {
        id: 'did:web:example.com',
        service: [
          {
            id: '#website',
            type: 'LinkedDomains',
            serviceEndpoint: 'https://example.com',
          },
          {
            id: '#messaging',
            type: 'DIDCommMessaging',
            serviceEndpoint: 'https://example.com/didcomm',
          },
        ],
      }

      const result = findInboxServiceEndpoint(didDocument, 'EInvoiceInbox')
      expect(result).toBeNull()
    })
  })
})
