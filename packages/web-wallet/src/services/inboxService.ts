/**
 * Inbox Service
 *
 * Provides API functions for interacting with the inbox backend.
 * Handles fetching, approving, and rejecting inbox items.
 */

import {getAgent} from '@agent'
import {getAgentBaseUrl} from '@agent/environment'
import {CredentialStateType, type DigitalCredential} from '@sphereon/ssi-sdk.data-store-types'
import {CredentialRole} from '@sphereon/ssi-types'
import {Inbox, InboxFolder, InboxEInvoice, InboxEvidence, InboxItemStatus} from '@components/views/InboxView/types'
import {InvoiceParty, InvoiceLineItem, CredentialInfo} from '@components/views/UBLInvoiceView/types'

// Backend API types from inboxPlugin
interface BackendInbox {
  id: string
  tenantId?: string
  name: string
  did: string
  description?: string
  createdAt: string
  updatedAt: string
}

interface BackendInboxFolder {
  id: string
  inboxId: string
  name: string
  dcqlQueryId?: string
  description?: string
  createdAt: string
  updatedAt: string
}

interface BackendInboxCredential {
  id: string
  inboxId: string
  folderId: string
  credentialId: string
  clientId: string
  clientIdPrefix?: string
  correlationId: string
  receivedAt: string
  parsedData?: Record<string, unknown>
  evidenceFetchedAt?: string
}

// eInvoice credential subject structure
interface EInvoiceCredentialSubject {
  vct?: string
  invoice_id: string
  invoice_date: string
  due_date?: string
  currency_code: string
  tax_exclusive_amount: number
  tax_amount: number
  tax_inclusive_amount: number
  payable_amount?: number
  invoice_type?: string
  invoice_type_code?: string

  // Flat format (FIDES schema) - seller/buyer fields at root level
  seller_name?: string
  seller_tax_id?: string
  seller_address?: {
    street?: string
    city?: string
    postal_code?: string
    country_code?: string
  }
  buyer_name?: string
  buyer_tax_id?: string
  buyer_address?: {
    street?: string
    city?: string
    postal_code?: string
    country_code?: string
  }

  // Nested format (alternative schema) - supplier/customer objects
  supplier?: {
    name: string
    vat_number?: string
    chamber_of_commerce?: string
    gln?: string
    iban?: string
    email?: string
    address?: {
      street: string
      city: string
      postal_code: string
      country: string
    }
  }
  customer?: {
    name: string
    vat_number?: string
    chamber_of_commerce?: string
    email?: string
    address?: {
      street: string
      city: string
      postal_code: string
      country: string
    }
  }
}

interface EInvoiceEvidence {
  id: string
  type: string[]
  name: string
  digestMultibase: string
  mimeType?: string
}

/**
 * Fetch all inboxes with their folders
 */
export async function fetchInboxes(): Promise<Inbox[]> {
  try {
    const agent = getAgent()

    // Get all inboxes
    const backendInboxes: BackendInbox[] = await agent.inboxGetAll()

    // For each inbox, get its folders and resolve service types from DID document
    const inboxes: Inbox[] = await Promise.all(
      backendInboxes.map(async (inbox) => {
        const backendFolders: BackendInboxFolder[] = await agent.inboxFolderGetByInbox({
          inboxName: inbox.name,
        })

        // Try to resolve the DID document to get service types
        let didServices: Array<{id?: string; type?: string}> = []
        try {
          const didResult = await agent.resolveDid({didUrl: inbox.did})
          if (didResult?.didDocument?.service) {
            didServices = didResult.didDocument.service
          }
        } catch (err) {
          console.warn('[InboxService] Could not resolve DID for service types:', inbox.did, err)
        }

        const folders: InboxFolder[] = backendFolders.map((folder) => {
          // Look up service from DID document by matching folder name to service ID
          const matchingService = didServices.find((svc) => {
            // Service ID in DID doc may be full URI (did:web:...#peppol) or just the fragment (peppol)
            const svcId = svc.id || ''
            const fragment = svcId.includes('#') ? svcId.split('#').pop() : svcId
            return fragment === folder.name
          }) as {id?: string; type?: string; eInvoiceMethod?: string} | undefined

          // Determine service type (eInvoiceMethod) from DID document or infer from folder name
          // New format: type="eInvoice", eInvoiceMethod="Direct"|"Peppol"|"PPF-FR"
          let serviceType: 'Direct' | 'Peppol' | 'PPF-FR' = 'Direct'
          if (matchingService?.type === 'eInvoice' && matchingService.eInvoiceMethod) {
            // New format with eInvoiceMethod
            const eInvoiceMethod = matchingService.eInvoiceMethod
            if (eInvoiceMethod === 'Peppol') {
              serviceType = 'Peppol'
            } else if (eInvoiceMethod === 'PPF-FR') {
              serviceType = 'PPF-FR'
            } else {
              serviceType = 'Direct'
            }
          } else if (folder.name.toLowerCase().includes('peppol')) {
            // Fallback: infer from folder name
            serviceType = 'Peppol'
          } else if (folder.name.toLowerCase().includes('ppf')) {
            serviceType = 'PPF-FR'
          }

          return {
            id: folder.id,
            name: folder.name,
            serviceId: folder.name, // Use folder name as serviceId (matches DID service ID)
            dcqlQueryId: folder.dcqlQueryId,
            serviceType,
            description: folder.description,
          }
        })

        return {
          id: inbox.id,
          name: inbox.name,
          displayName: formatDisplayName(inbox.name),
          description: inbox.description,
          folders,
        }
      })
    )

    return inboxes
  } catch (error) {
    console.error('[InboxService] Error fetching inboxes:', error)
    return []
  }
}

/**
 * Fetch all inbox credentials (invoices) for a given inbox
 */
export async function fetchInboxInvoices(inboxName?: string, folderName?: string): Promise<InboxEInvoice[]> {
  try {
    const agent = getAgent()

    // If no inbox specified, get all inboxes and fetch from all
    let inboxNames: string[] = []
    if (inboxName) {
      inboxNames = [inboxName]
    } else {
      const inboxes: BackendInbox[] = await agent.inboxGetAll()
      inboxNames = inboxes.map((i) => i.name)
    }

    const allInvoices: InboxEInvoice[] = []

    for (const name of inboxNames) {
      const credentials: BackendInboxCredential[] = await agent.inboxCredentialList({
        inboxName: name,
        folderName,
      })

      // Get folder info for each credential
      const folders: BackendInboxFolder[] = await agent.inboxFolderGetByInbox({inboxName: name})
      const folderMap = new Map(folders.map((f) => [f.id, f]))

      // For each credential, fetch the actual credential data
      for (const cred of credentials) {
        try {
          const digitalCredential = await agent.crsGetUniqueCredentialByIdOrHash({
            credentialRole: CredentialRole.VERIFIER,
            idOrHash: cred.credentialId,
          })

          if (digitalCredential?.digitalCredential) {
            const invoice = parseCredentialToInvoice(
              digitalCredential.digitalCredential,
              cred,
              name,
              folderMap.get(cred.folderId)?.name ?? 'unknown',
              cred.parsedData
            )
            if (invoice) {
              allInvoices.push(invoice)
            }
          }
        } catch (err) {
          console.error(`[InboxService] Error fetching credential ${cred.credentialId}:`, err)
        }
      }
    }

    // Sort by received date (newest first)
    return allInvoices.sort(
      (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
    )
  } catch (error) {
    console.error('[InboxService] Error fetching inbox invoices:', error)
    return []
  }
}

/**
 * Fetch a single inbox invoice by correlation ID (unique identifier)
 */
export async function fetchInboxInvoiceById(
  inboxName: string,
  folderName: string,
  correlationId: string
): Promise<InboxEInvoice | null> {
  try {
    const invoices = await fetchInboxInvoices(inboxName, folderName)
    return invoices.find((inv) => inv.correlationId === correlationId) ?? null
  } catch (error) {
    console.error('[InboxService] Error fetching invoice by ID:', error)
    return null
  }
}

/**
 * Approve an inbox invoice (updates credential state to VERIFIED)
 */
export async function approveInvoice(invoice: InboxEInvoice): Promise<boolean> {
  console.log('[InboxService] approveInvoice called with:', {
    invoiceId: invoice.invoiceId,
    correlationId: invoice.correlationId,
    inboxName: invoice.inboxName,
    folderName: invoice.folderName,
  })
  try {
    const agent = getAgent()
    console.log('[InboxService] Got agent, calling inboxCredentialList...')

    // Find the credential by invoice ID (don't filter by folder to avoid mismatch)
    const credentials = await agent.inboxCredentialList({
      inboxName: invoice.inboxName,
    })
    console.log('[InboxService] inboxCredentialList returned', credentials.length, 'credentials')
    console.log('[InboxService] credentials:', credentials.map((c: BackendInboxCredential) => ({
      id: c.id,
      correlationId: c.correlationId,
      credentialId: c.credentialId,
    })))

    const inboxCred = credentials.find((c: BackendInboxCredential) => {
      // Match by inbox credential ID (now stored in invoice.correlationId for uniqueness)
      return c.id === invoice.correlationId
    })
    console.log('[InboxService] Found matching credential:', inboxCred)

    if (!inboxCred) {
      console.error('[InboxService] Could not find inbox credential for invoice:', invoice.invoiceId, 'looking for id:', invoice.correlationId)
      return false
    }

    // First fetch the actual credential to get its UUID (credentialId in inbox is the hash)
    const digitalCredentialResult = await agent.crsGetUniqueCredentialByIdOrHash({
      credentialRole: CredentialRole.VERIFIER,
      idOrHash: inboxCred.credentialId,
    })

    if (!digitalCredentialResult?.digitalCredential?.id) {
      console.error('[InboxService] Could not find digital credential for hash:', inboxCred.credentialId)
      return false
    }

    const credentialUuid = digitalCredentialResult.digitalCredential.id
    console.log('[InboxService] Found credential UUID:', credentialUuid)

    // Update the credential state to VERIFIED
    console.log('[InboxService] Calling crsUpdateCredentialState with id:', credentialUuid)
    await agent.crsUpdateCredentialState({
      id: credentialUuid,
      verifiedState: CredentialStateType.VERIFIED,
      verifiedAt: new Date(),
    })

    console.log('[InboxService] Invoice approved:', invoice.invoiceId)
    return true
  } catch (error) {
    console.error('[InboxService] Error approving invoice:', error)
    return false
  }
}

/**
 * Reject an inbox invoice (updates credential state to INVALID)
 */
export async function rejectInvoice(invoice: InboxEInvoice): Promise<boolean> {
  try {
    const agent = getAgent()

    // Find the credential by correlation ID
    const credentials = await agent.inboxCredentialList({
      inboxName: invoice.inboxName,
      folderName: invoice.folderName,
    })

    const inboxCred = credentials.find((c: BackendInboxCredential) => {
      // Match by inbox credential ID (now stored in invoice.correlationId for uniqueness)
      return c.id === invoice.correlationId
    })

    if (!inboxCred) {
      console.error('[InboxService] Could not find inbox credential for invoice:', invoice.invoiceId, 'looking for id:', invoice.correlationId)
      return false
    }

    // First fetch the actual credential to get its UUID (credentialId in inbox is the hash)
    const digitalCredentialResult = await agent.crsGetUniqueCredentialByIdOrHash({
      credentialRole: CredentialRole.VERIFIER,
      idOrHash: inboxCred.credentialId,
    })

    if (!digitalCredentialResult?.digitalCredential?.id) {
      console.error('[InboxService] Could not find digital credential for hash:', inboxCred.credentialId)
      return false
    }

    const credentialUuid = digitalCredentialResult.digitalCredential.id

    // Update the credential state to REVOKED (reject = revoked in the DB schema)
    await agent.crsUpdateCredentialState({
      id: credentialUuid,
      verifiedState: CredentialStateType.REVOKED,
      revokedAt: new Date(),
    })

    console.log('[InboxService] Invoice rejected:', invoice.invoiceId)
    return true
  } catch (error) {
    console.error('[InboxService] Error rejecting invoice:', error)
    return false
  }
}

/**
 * Delete an inbox invoice (removes inbox credential and the underlying credential)
 */
export async function deleteInboxInvoice(invoice: InboxEInvoice): Promise<boolean> {
  try {
    const agent = getAgent()

    // Find the credential by inbox credential ID (stored in invoice.correlationId)
    const credentials = await agent.inboxCredentialList({
      inboxName: invoice.inboxName,
    })

    const inboxCred = credentials.find((c: BackendInboxCredential) => {
      // Match by inbox credential ID (now stored in invoice.correlationId for uniqueness)
      return c.id === invoice.correlationId
    })

    if (!inboxCred) {
      console.error('[InboxService] Could not find inbox credential for invoice:', invoice.invoiceId, 'looking for id:', invoice.correlationId)
      return false
    }

    // Delete the inbox_credential record first
    try {
      await agent.inboxCredentialDelete({id: inboxCred.id})
      console.log('[InboxService] Deleted inbox_credential record:', inboxCred.id)
    } catch (inboxErr) {
      console.error('[InboxService] Failed to delete inbox_credential record:', inboxErr)
      return false
    }

    // Then delete the underlying credential from CRS
    try {
      const digitalCredentialResult = await agent.crsGetUniqueCredentialByIdOrHash({
        credentialRole: CredentialRole.VERIFIER,
        idOrHash: inboxCred.credentialId,
      })

      if (digitalCredentialResult?.digitalCredential?.id) {
        await agent.crsDeleteCredential({
          id: digitalCredentialResult.digitalCredential.id,
        })
        console.log('[InboxService] Deleted credential from CRS:', digitalCredentialResult.digitalCredential.id)
      }
    } catch (credErr) {
      // Credential might already be deleted or not exist, continue
      console.warn('[InboxService] Could not delete underlying credential:', credErr)
    }

    console.log('[InboxService] Inbox invoice deleted:', invoice.invoiceId, '(id:', invoice.correlationId, ')')
    return true
  } catch (error) {
    console.error('[InboxService] Error deleting inbox invoice:', error)
    return false
  }
}

// ===== Helper Functions =====

function formatDisplayName(name: string): string {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Decode the payload from an SD-JWT string (base64url decode the second part)
 */
function decodeJwtPayload(jwt: string): any | null {
  try {
    // SD-JWT format: header.payload.signature~disclosure1~disclosure2...
    // We need the payload part (second segment before any ~)
    const mainJwt = jwt.split('~')[0]
    const parts = mainJwt.split('.')
    if (parts.length < 2) return null

    // Base64url decode the payload
    const payload = parts[1]
    // Convert base64url to base64
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    // Add padding if needed
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const decoded = atob(padded)
    return JSON.parse(decoded)
  } catch (e) {
    console.warn('[InboxService] Failed to decode JWT payload:', e)
    return null
  }
}

function parseCredentialToInvoice(
  credential: DigitalCredential,
  inboxCredential: BackendInboxCredential,
  inboxName: string,
  folderName: string,
  parsedData?: Record<string, unknown>
): InboxEInvoice | null {
  try {
    console.log('[InboxService] Parsing credential, keys:', Object.keys(credential))
    console.log('[InboxService] documentFormat:', credential.documentFormat)
    console.log('[InboxService] has uniformDocument:', !!credential.uniformDocument)

    // Parse the credential document
    // For SD-JWT credentials, use uniformDocument (decoded form)
    // For JSON-LD credentials, use rawDocument
    let rawDoc: any
    let sdJwtPayload: any = null // Keep original SD-JWT payload for evidence

    // Check for uniformDocument first (contains decoded SD-JWT data)
    const uniformDoc = (credential as any).uniformDocument
    if (uniformDoc) {
      console.log('[InboxService] Using uniformDocument')
      rawDoc = typeof uniformDoc === 'string' ? JSON.parse(uniformDoc) : uniformDoc

      // For SD-JWT credentials, also decode the rawDocument to get evidence
      // The uniformDocument may not include evidence field
      if (credential.rawDocument && typeof credential.rawDocument === 'string' && credential.rawDocument.startsWith('ey')) {
        sdJwtPayload = decodeJwtPayload(credential.rawDocument)
        console.log('[InboxService] Decoded SD-JWT payload, has evidence:', !!sdJwtPayload?.evidence)
      }
    } else if (credential.rawDocument) {
      // Try rawDocument - may be JSON or JWT string
      if (typeof credential.rawDocument === 'string' && credential.rawDocument.startsWith('ey')) {
        // JWT/SD-JWT string - try to decode it
        sdJwtPayload = decodeJwtPayload(credential.rawDocument)
        if (sdJwtPayload) {
          console.log('[InboxService] Using decoded SD-JWT payload')
          rawDoc = sdJwtPayload
        } else {
          console.warn('[InboxService] SD-JWT credential could not be decoded')
          return null
        }
      } else {
        console.log('[InboxService] Using rawDocument')
        rawDoc = typeof credential.rawDocument === 'string'
          ? JSON.parse(credential.rawDocument)
          : credential.rawDocument
      }
    } else {
      console.warn('[InboxService] No document data in credential')
      return null
    }

    // Extract credential subject (may be nested or direct)
    let subject: EInvoiceCredentialSubject | undefined
    if (rawDoc.credentialSubject) {
      subject = rawDoc.credentialSubject
    } else if (rawDoc.vc?.credentialSubject) {
      subject = rawDoc.vc.credentialSubject
    } else {
      // Try to find invoice fields directly (SD-JWT decoded)
      subject = rawDoc
    }

    if (!subject?.invoice_id) {
      console.warn('[InboxService] No invoice_id in credential subject')
      return null
    }

    // Map credential verified_state to inbox status
    const status = mapVerifiedStateToStatus(credential.verifiedState)

    // Parse supplier info - support both flat format (seller_name) and nested format (supplier.name)
    // Check multiple sources: subject, sdJwtPayload
    const data = sdJwtPayload || subject
    const supplierData = data.supplier || subject.supplier
    let supplier: InvoiceParty | undefined

    if (supplierData) {
      // Nested format: supplier object with name, vat_number, etc.
      supplier = {
        name: supplierData.name,
        vatNumber: supplierData.vat_number,
        chamberOfCommerce: supplierData.chamber_of_commerce,
        gln: supplierData.gln,
        iban: supplierData.iban,
        email: supplierData.email,
        address: supplierData.address
          ? {
              street: supplierData.address.street,
              city: supplierData.address.city,
              postalCode: supplierData.address.postal_code,
              country: supplierData.address.country,
            }
          : undefined,
        did: inboxCredential.clientId,
      }
    } else if (data.seller_name || subject.seller_name) {
      // Flat format: seller_name, seller_tax_id, seller_address at root level
      const sellerName = data.seller_name || subject.seller_name
      const sellerTaxId = data.seller_tax_id || subject.seller_tax_id
      const sellerAddress = data.seller_address || subject.seller_address
      supplier = {
        name: sellerName,
        vatNumber: sellerTaxId,
        address: sellerAddress
          ? {
              street: sellerAddress.street,
              city: sellerAddress.city,
              postalCode: sellerAddress.postal_code,
              country: sellerAddress.country_code || sellerAddress.country,
            }
          : undefined,
        did: inboxCredential.clientId,
      }
    }

    // Parse customer info - support both flat format (buyer_name) and nested format (customer.name)
    const customerData = data.customer || subject.customer
    let customer: InvoiceParty | undefined

    if (customerData) {
      // Nested format: customer object
      customer = {
        name: customerData.name,
        vatNumber: customerData.vat_number,
        chamberOfCommerce: customerData.chamber_of_commerce,
        email: customerData.email,
        address: customerData.address
          ? {
              street: customerData.address.street,
              city: customerData.address.city,
              postalCode: customerData.address.postal_code,
              country: customerData.address.country,
            }
          : undefined,
      }
    } else if (data.buyer_name || subject.buyer_name) {
      // Flat format: buyer_name, buyer_tax_id, buyer_address at root level
      const buyerName = data.buyer_name || subject.buyer_name
      const buyerTaxId = data.buyer_tax_id || subject.buyer_tax_id
      const buyerAddress = data.buyer_address || subject.buyer_address
      customer = {
        name: buyerName,
        vatNumber: buyerTaxId,
        address: buyerAddress
          ? {
              street: buyerAddress.street,
              city: buyerAddress.city,
              postalCode: buyerAddress.postal_code,
              country: buyerAddress.country_code || buyerAddress.country,
            }
          : undefined,
      }
    }

    // Parse evidence - check multiple locations:
    // 1. rawDoc.evidence (W3C VC format)
    // 2. sdJwtPayload.evidence (decoded SD-JWT payload)
    console.log('[InboxService] rawDoc keys:', Object.keys(rawDoc))
    console.log('[InboxService] rawDoc.evidence:', rawDoc.evidence)
    console.log('[InboxService] sdJwtPayload?.evidence:', sdJwtPayload?.evidence)

    // Prefer SD-JWT payload evidence if available (more complete), then fall back to rawDoc
    const rawEvidence: EInvoiceEvidence[] = sdJwtPayload?.evidence || rawDoc.evidence || []
    console.log('[InboxService] Parsed evidence count:', rawEvidence.length)
    const evidence: InboxEvidence[] = rawEvidence.map((e: EInvoiceEvidence) => ({
      id: e.id,
      type: e.type,
      name: e.name,
      digestMultibase: e.digestMultibase,
      storageStatus: 'external' as const,
    }))

    // Build credential info
    const credentialInfo: CredentialInfo = {
      vct: subject.vct ?? 'urn:org:fides:einvoice:1',
      format: credential.documentFormat ?? 'vc+sd-jwt',
      issuerDid: credential.issuerCorrelationId ?? inboxCredential.clientId,
      issuerName: supplier?.name ?? 'Unknown Issuer',
      issuedAt: credential.createdAt?.toString() ?? new Date().toISOString(),
      expiresAt: credential.validUntil?.toString(),
      status: status === 'verified' ? 'active' : status === 'invalid' ? 'revoked' : 'active',
      signatureValid: status !== 'invalid',
    }

    // Build base invoice
    const invoice: InboxEInvoice = {
      invoiceId: subject.invoice_id,
      invoiceDate: subject.invoice_date,
      dueDate: subject.due_date || '',
      currencyCode: subject.currency_code,
      taxExclusiveAmount: subject.tax_exclusive_amount,
      taxAmount: subject.tax_amount,
      taxInclusiveAmount: subject.tax_inclusive_amount,
      invoiceType: subject.invoice_type,
      supplier,
      customer,
      evidence,
      credential: credentialInfo,
      status,
      inboxName,
      folderName,
      senderDid: inboxCredential.clientId,
      // Use inboxCredential.id (primary key UUID) for unique identification
      // Note: inboxCredential.correlationId is from OID4VP flow and is NOT guaranteed unique
      correlationId: inboxCredential.id,
      receivedAt: inboxCredential.receivedAt,
    }

    // Apply persisted parsed data if available (from backend)
    if (parsedData) {
      console.log('[InboxService] Applying persisted parsed data:', Object.keys(parsedData))

      // Apply line items
      if (parsedData.lineItems && Array.isArray(parsedData.lineItems)) {
        invoice.lineItems = parsedData.lineItems as InvoiceLineItem[]
      }

      // Apply enhanced supplier info (merge with existing)
      if (parsedData.supplier && typeof parsedData.supplier === 'object') {
        const savedSupplier = parsedData.supplier as Record<string, unknown>
        invoice.supplier = {
          ...invoice.supplier,
          name: (savedSupplier.name as string) || invoice.supplier?.name || '',
          vatNumber: (savedSupplier.vatNumber as string) || invoice.supplier?.vatNumber,
          address: (savedSupplier.address as InvoiceParty['address']) || invoice.supplier?.address,
          email: (savedSupplier.email as string) || invoice.supplier?.email,
          gln: (savedSupplier.gln as string) || invoice.supplier?.gln,
        }
      }

      // Apply enhanced customer info (merge with existing)
      if (parsedData.customer && typeof parsedData.customer === 'object') {
        const savedCustomer = parsedData.customer as Record<string, unknown>
        invoice.customer = {
          ...invoice.customer,
          name: (savedCustomer.name as string) || invoice.customer?.name || '',
          vatNumber: (savedCustomer.vatNumber as string) || invoice.customer?.vatNumber,
          address: (savedCustomer.address as InvoiceParty['address']) || invoice.customer?.address,
          email: (savedCustomer.email as string) || invoice.customer?.email,
        }
      }

      // Apply invoice type
      if (parsedData.invoiceType && typeof parsedData.invoiceType === 'string') {
        invoice.invoiceType = parsedData.invoiceType
      }

      // Apply payment terms
      if (parsedData.paymentTerms && typeof parsedData.paymentTerms === 'string') {
        invoice.paymentTerms = parsedData.paymentTerms
      }

      // Apply evidence status updates
      if (parsedData.evidenceStatus && typeof parsedData.evidenceStatus === 'object') {
        const statusMap = parsedData.evidenceStatus as Record<string, {
          storageStatus?: 'external' | 'stored' | 'fetching'
          mimeType?: string
          size?: number
        }>
        invoice.evidence = invoice.evidence.map(ev => {
          const savedStatus = statusMap[ev.id]
          if (savedStatus) {
            return {
              ...ev,
              storageStatus: savedStatus.storageStatus || ev.storageStatus,
              mimeType: savedStatus.mimeType || ev.mimeType,
              size: savedStatus.size || ev.size,
            }
          }
          return ev
        })
      }
    }

    return invoice
  } catch (error) {
    console.error('[InboxService] Error parsing credential:', error)
    return null
  }
}

function mapVerifiedStateToStatus(verifiedState?: string): InboxItemStatus {
  switch (verifiedState?.toUpperCase()) {
    case 'VERIFIED':
      return 'verified'
    case 'INVALID':
    case 'REVOKED':
      return 'invalid'
    default:
      return 'pending'
  }
}

// ===== Sent Invoice Types =====

export type SentInvoiceStatus = 'draft' | 'sending' | 'sent' | 'delivered' | 'failed'

/** Metadata for an evidence file attached to a sent invoice */
export interface SentInvoiceEvidence {
  id: string
  digestMultibase: string
  filename: string
  contentType: string
  evidenceType: 'UBLInvoice' | 'SupportingDocument'
}

export interface SentInvoice {
  id: string
  invoiceId: string
  invoiceDate: string
  dueDate?: string
  currencyCode: string
  taxExclusiveAmount: number
  taxAmount: number
  taxInclusiveAmount: number
  payableAmount: number
  sellerName: string
  sellerTaxId?: string
  buyerName: string
  buyerTaxId?: string
  /** Full supplier party info (optional, from UBL) */
  supplier?: InvoiceParty
  /** Full customer party info (optional, from UBL) */
  customer?: InvoiceParty
  /** Line items from UBL */
  lineItems?: InvoiceLineItem[]
  /** Invoice type code (e.g., 380 for commercial invoice) */
  invoiceTypeCode?: string
  /** General note */
  note?: string
  /** Payment terms */
  paymentTerms?: string
  /** Payment means code */
  paymentMeansCode?: string
  recipientDid: string
  recipientName?: string
  recipientEndpointId?: string
  recipientEndpointType?: string
  /** The actual service endpoint URL for sending */
  recipientEndpoint?: string
  /** Evidence files with metadata */
  evidenceFiles: SentInvoiceEvidence[]
  /** Whether the invoice was created from UBL (form should be read-only) */
  hasUblSource?: boolean
  ublXmlHash?: string
  status: SentInvoiceStatus
  sentAt?: string
  deliveredAt?: string
  errorMessage?: string
  credentialId?: string
  correlationId?: string
  createdAt: string
  updatedAt: string
}

export interface CreateSentInvoiceParams {
  invoiceData: {
    invoiceId: string
    invoiceDate: string
    dueDate?: string
    currencyCode: string
    taxExclusiveAmount: number
    taxAmount: number
    taxInclusiveAmount: number
    payableAmount: number
    sellerName: string
    sellerTaxId?: string
    buyerName: string
    buyerTaxId?: string
    /** Full supplier party info (optional, from UBL) */
    supplier?: InvoiceParty
    /** Full customer party info (optional, from UBL) */
    customer?: InvoiceParty
    /** Line items from UBL */
    lineItems?: InvoiceLineItem[]
    /** Invoice type code */
    invoiceTypeCode?: string
    /** General note */
    note?: string
    /** Payment terms */
    paymentTerms?: string
    /** Payment means code */
    paymentMeansCode?: string
  }
  recipientDid: string
  recipientName?: string
  recipientEndpointId?: string
  recipientEndpointType?: string
  /** The actual service endpoint URL for sending */
  recipientEndpoint?: string
  /** Evidence files with metadata */
  evidenceFiles: SentInvoiceEvidence[]
  /** Whether the invoice was created from UBL (form should be read-only) */
  hasUblSource?: boolean
  ublXmlHash?: string
}

// ===== Outbox API Functions =====

/**
 * Backend outbox item structure
 */
interface BackendOutboxItem {
  id: string
  tenantId?: string
  status: 'draft' | 'sending' | 'sent' | 'failed'
  invoiceId: string
  invoiceDate: string
  dueDate?: string
  currencyCode: string
  taxExclusiveAmount?: number
  taxAmount?: number
  taxInclusiveAmount?: number
  payableAmount?: number
  sellerData?: {
    name: string
    vatNumber?: string
    chamberOfCommerce?: string
    gln?: string
    iban?: string
    email?: string
    address?: {
      street: string
      city: string
      postalCode: string
      country: string
    }
  }
  buyerData?: {
    name: string
    vatNumber?: string
    chamberOfCommerce?: string
    gln?: string
    iban?: string
    email?: string
    address?: {
      street: string
      city: string
      postalCode: string
      country: string
    }
  }
  lineItems?: Array<{
    lineNumber: number
    description: string
    note?: string
    quantity: number
    quantityUnit?: string
    unitPrice: number
    vatPercent: number
    lineTotal: number
  }>
  evidenceFiles: Array<{
    id: string
    digestMultibase: string
    filename: string
    contentType: string
    evidenceType: 'UBLInvoice' | 'SupportingDocument'
  }>
  recipientDid: string
  recipientName?: string
  recipientEndpoint?: string
  recipientEndpointId?: string
  recipientEndpointType?: string
  hasUblSource: boolean
  ublXmlHash?: string
  credentialId?: string
  correlationId?: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
  sentAt?: string
  deliveredAt?: string
}

/**
 * Map backend outbox item to frontend SentInvoice
 */
function mapOutboxItemToSentInvoice(item: BackendOutboxItem): SentInvoice {
  return {
    id: item.id,
    invoiceId: item.invoiceId,
    invoiceDate: item.invoiceDate,
    dueDate: item.dueDate,
    currencyCode: item.currencyCode,
    taxExclusiveAmount: item.taxExclusiveAmount ?? 0,
    taxAmount: item.taxAmount ?? 0,
    taxInclusiveAmount: item.taxInclusiveAmount ?? 0,
    payableAmount: item.payableAmount ?? 0,
    sellerName: item.sellerData?.name ?? 'Unknown Seller',
    sellerTaxId: item.sellerData?.vatNumber,
    buyerName: item.buyerData?.name ?? 'Unknown Buyer',
    buyerTaxId: item.buyerData?.vatNumber,
    supplier: item.sellerData ? {
      name: item.sellerData.name,
      vatNumber: item.sellerData.vatNumber,
      chamberOfCommerce: item.sellerData.chamberOfCommerce,
      gln: item.sellerData.gln,
      iban: item.sellerData.iban,
      email: item.sellerData.email,
      address: item.sellerData.address ? {
        street: item.sellerData.address.street,
        city: item.sellerData.address.city,
        postalCode: item.sellerData.address.postalCode,
        country: item.sellerData.address.country,
      } : undefined,
    } : undefined,
    customer: item.buyerData ? {
      name: item.buyerData.name,
      vatNumber: item.buyerData.vatNumber,
      chamberOfCommerce: item.buyerData.chamberOfCommerce,
      gln: item.buyerData.gln,
      iban: item.buyerData.iban,
      email: item.buyerData.email,
      address: item.buyerData.address ? {
        street: item.buyerData.address.street,
        city: item.buyerData.address.city,
        postalCode: item.buyerData.address.postalCode,
        country: item.buyerData.address.country,
      } : undefined,
    } : undefined,
    lineItems: item.lineItems?.map(li => ({
      lineNumber: li.lineNumber,
      description: li.description,
      note: li.note,
      quantity: li.quantity,
      quantityUnit: li.quantityUnit ?? 'EA',
      unitPrice: li.unitPrice,
      vatPercent: li.vatPercent,
      lineTotal: li.lineTotal,
    })),
    recipientDid: item.recipientDid,
    recipientName: item.recipientName,
    recipientEndpointId: item.recipientEndpointId,
    recipientEndpointType: item.recipientEndpointType,
    recipientEndpoint: item.recipientEndpoint,
    evidenceFiles: item.evidenceFiles,
    hasUblSource: item.hasUblSource,
    ublXmlHash: item.ublXmlHash,
    status: item.status === 'sent' ? 'sent' : item.status,
    sentAt: item.sentAt,
    deliveredAt: item.deliveredAt,
    errorMessage: item.errorMessage,
    credentialId: item.credentialId,
    correlationId: item.correlationId,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

/**
 * Map frontend CreateSentInvoiceParams to backend outbox create request
 */
function mapParamsToOutboxCreate(params: CreateSentInvoiceParams): Record<string, unknown> {
  return {
    invoiceId: params.invoiceData.invoiceId,
    invoiceDate: params.invoiceData.invoiceDate,
    dueDate: params.invoiceData.dueDate,
    currencyCode: params.invoiceData.currencyCode,
    taxExclusiveAmount: params.invoiceData.taxExclusiveAmount,
    taxAmount: params.invoiceData.taxAmount,
    taxInclusiveAmount: params.invoiceData.taxInclusiveAmount,
    payableAmount: params.invoiceData.payableAmount,
    sellerData: params.invoiceData.supplier ? {
      name: params.invoiceData.supplier.name || params.invoiceData.sellerName,
      vatNumber: params.invoiceData.supplier.vatNumber || params.invoiceData.sellerTaxId,
      chamberOfCommerce: params.invoiceData.supplier.chamberOfCommerce,
      gln: params.invoiceData.supplier.gln,
      iban: params.invoiceData.supplier.iban,
      email: params.invoiceData.supplier.email,
      address: params.invoiceData.supplier.address ? {
        street: params.invoiceData.supplier.address.street,
        city: params.invoiceData.supplier.address.city,
        postalCode: params.invoiceData.supplier.address.postalCode,
        country: params.invoiceData.supplier.address.country,
      } : undefined,
    } : {
      name: params.invoiceData.sellerName,
      vatNumber: params.invoiceData.sellerTaxId,
    },
    buyerData: params.invoiceData.customer ? {
      name: params.invoiceData.customer.name || params.invoiceData.buyerName,
      vatNumber: params.invoiceData.customer.vatNumber || params.invoiceData.buyerTaxId,
      chamberOfCommerce: params.invoiceData.customer.chamberOfCommerce,
      gln: params.invoiceData.customer.gln,
      iban: params.invoiceData.customer.iban,
      email: params.invoiceData.customer.email,
      address: params.invoiceData.customer.address ? {
        street: params.invoiceData.customer.address.street,
        city: params.invoiceData.customer.address.city,
        postalCode: params.invoiceData.customer.address.postalCode,
        country: params.invoiceData.customer.address.country,
      } : undefined,
    } : {
      name: params.invoiceData.buyerName,
      vatNumber: params.invoiceData.buyerTaxId,
    },
    lineItems: params.invoiceData.lineItems?.map((li, idx) => ({
      lineNumber: li.lineNumber ?? idx + 1,
      description: li.description,
      note: li.note,
      quantity: li.quantity,
      quantityUnit: li.quantityUnit,
      unitPrice: li.unitPrice,
      vatPercent: li.vatPercent,
      lineTotal: li.lineTotal,
    })),
    evidenceFiles: params.evidenceFiles,
    recipientDid: params.recipientDid,
    recipientName: params.recipientName,
    recipientEndpoint: params.recipientEndpoint,
    recipientEndpointId: params.recipientEndpointId,
    recipientEndpointType: params.recipientEndpointType,
    hasUblSource: params.hasUblSource ?? false,
    ublXmlHash: params.ublXmlHash,
  }
}

/**
 * Save a sent invoice to the outbox backend
 */
export async function saveSentInvoice(params: CreateSentInvoiceParams): Promise<SentInvoice> {
  const baseUrl = getAgentBaseUrl()
  const createData = mapParamsToOutboxCreate(params)

  const response = await fetch(`${baseUrl}/outbox`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createData),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(`Failed to save sent invoice: ${error.error || response.statusText}`)
  }

  const item: BackendOutboxItem = await response.json()
  console.log('[InboxService] Saved sent invoice:', item.id)
  return mapOutboxItemToSentInvoice(item)
}

/**
 * Update a sent invoice status via the outbox backend
 */
export async function updateSentInvoiceStatus(
  id: string,
  status: SentInvoiceStatus,
  extra?: Partial<SentInvoice>
): Promise<SentInvoice | null> {
  const baseUrl = getAgentBaseUrl()

  // Build update payload
  const updateData: Record<string, unknown> = {
    status,
  }

  if (extra?.errorMessage !== undefined) {
    updateData.errorMessage = extra.errorMessage
  }
  if (extra?.credentialId !== undefined) {
    updateData.credentialId = extra.credentialId
  }
  if (extra?.correlationId !== undefined) {
    updateData.correlationId = extra.correlationId
  }

  const response = await fetch(`${baseUrl}/outbox/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData),
  })

  if (!response.ok) {
    if (response.status === 404) {
      console.error('[InboxService] Sent invoice not found:', id)
      return null
    }
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(`Failed to update sent invoice: ${error.error || response.statusText}`)
  }

  const item: BackendOutboxItem = await response.json()
  console.log('[InboxService] Updated sent invoice:', id, 'status:', status)
  return mapOutboxItemToSentInvoice(item)
}

/** Outbox folder type */
export type OutboxFolder = 'drafts' | 'outbox' | 'sent'

/**
 * Fetch sent invoices from the outbox backend with optional folder filter
 * @param folder - Optional folder filter: 'drafts' (draft/failed), 'outbox' (sending), 'sent' (sent)
 */
export async function fetchSentInvoices(folder?: OutboxFolder): Promise<SentInvoice[]> {
  const baseUrl = getAgentBaseUrl()

  const url = new URL(`${baseUrl}/outbox`)
  if (folder) {
    url.searchParams.set('folder', folder)
  }

  const response = await fetch(url.toString())

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(`Failed to fetch sent invoices: ${error.error || response.statusText}`)
  }

  const items: BackendOutboxItem[] = await response.json()
  // Sort by created date (newest first)
  return items
    .map(mapOutboxItemToSentInvoice)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

/**
 * Fetch invoices from the drafts folder (draft and failed status)
 */
export async function fetchDraftInvoices(): Promise<SentInvoice[]> {
  return fetchSentInvoices('drafts')
}

/**
 * Fetch invoices from the outbox folder (sending status)
 */
export async function fetchOutboxInvoices(): Promise<SentInvoice[]> {
  return fetchSentInvoices('outbox')
}

/**
 * Fetch invoices from the sent folder (sent status)
 */
export async function fetchSentFolderInvoices(): Promise<SentInvoice[]> {
  return fetchSentInvoices('sent')
}

/**
 * Fetch a single sent invoice by ID from the outbox backend
 */
export async function fetchSentInvoiceById(id: string): Promise<SentInvoice | null> {
  const baseUrl = getAgentBaseUrl()

  const response = await fetch(`${baseUrl}/outbox/${id}`)

  if (!response.ok) {
    if (response.status === 404) {
      return null
    }
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(`Failed to fetch sent invoice: ${error.error || response.statusText}`)
  }

  const item: BackendOutboxItem = await response.json()
  return mapOutboxItemToSentInvoice(item)
}

/**
 * Delete a sent invoice from the outbox backend
 */
export async function deleteSentInvoice(id: string): Promise<boolean> {
  const baseUrl = getAgentBaseUrl()

  const response = await fetch(`${baseUrl}/outbox/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    if (response.status === 404) {
      return false
    }
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(`Failed to delete sent invoice: ${error.error || response.statusText}`)
  }

  console.log('[InboxService] Deleted sent invoice:', id)
  return true
}

/**
 * Send an outbox item to its recipient
 * This triggers the actual credential creation and OID4VP flow
 */
export async function sendOutboxItem(id: string): Promise<{
  success: boolean
  credentialId?: string
  correlationId?: string
  error?: string
}> {
  const baseUrl = getAgentBaseUrl()

  const response = await fetch(`${baseUrl}/outbox/${id}/send`, {
    method: 'POST',
  })

  const result = await response.json()

  if (!response.ok) {
    console.error('[InboxService] Failed to send outbox item:', id, result.error)
    return {
      success: false,
      error: result.error || response.statusText,
    }
  }

  console.log('[InboxService] Sent outbox item:', id, 'credentialId:', result.credentialId)
  return {
    success: result.success,
    credentialId: result.credentialId,
    correlationId: result.correlationId,
  }
}

// ===== Evidence Fetching =====

/**
 * Parsed UBL data extracted from an evidence file
 */
export interface ParsedUBLData {
  lineItems?: InvoiceLineItem[]
  supplier?: InvoiceParty
  customer?: InvoiceParty
  invoiceType?: string
  paymentTerms?: string
  note?: string
}

/**
 * Result of fetching an evidence file
 */
export interface FetchedEvidence {
  /** Updated evidence with storage status */
  evidence: InboxEvidence
  /** Parsed UBL data if the evidence was a UBL XML */
  ublData?: ParsedUBLData
  /** Raw content (for non-XML files) */
  content?: ArrayBuffer
}

/**
 * Fetch an evidence file from its external URL and parse it if it's a UBL XML.
 * Returns the parsed data which can be used to enrich the invoice view.
 */
export async function fetchEvidenceFile(evidence: InboxEvidence): Promise<FetchedEvidence> {
  console.log('[InboxService] Fetching evidence file:', evidence.name, 'from:', evidence.id)

  // The evidence.id is expected to be a URL when storageStatus is 'external'
  if (!evidence.id || !evidence.id.startsWith('http')) {
    console.warn('[InboxService] Evidence ID is not a valid URL:', evidence.id)
    throw new Error(`Evidence URL is not valid: ${evidence.id}. The evidence may not have been uploaded to an asset store.`)
  }

  try {
    // Use the download proxy to avoid CORS issues with external URLs
    const registerResponse = await fetch('/api/assets/download', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        url: evidence.id,
        filename: evidence.name,
      }),
    })

    if (!registerResponse.ok) {
      const err = await registerResponse.json().catch(() => ({error: registerResponse.statusText}))
      throw new Error(`Failed to register evidence download: ${err.error || registerResponse.statusText}`)
    }

    const {key} = await registerResponse.json()

    const response = await fetch(`/api/assets/download?key=${encodeURIComponent(key)}`)
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Evidence file not found at ${evidence.id}. The file may not have been uploaded to the asset store, or the URL is incorrect.`)
      }
      throw new Error(`Failed to fetch evidence from ${evidence.id}: ${response.status} ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type') || ''
    const isXml = contentType.includes('xml') || evidence.name.endsWith('.xml')

    if (isXml) {
      // Parse XML content
      const xmlText = await response.text()
      console.log('[InboxService] Fetched XML content, length:', xmlText.length)

      // Parse UBL XML to extract invoice details
      const ublData = parseUBLXml(xmlText)

      return {
        evidence: {
          ...evidence,
          storageStatus: 'stored',
          mimeType: contentType || 'application/xml',
        },
        ublData,
      }
    } else {
      // Binary content (PDF, etc.)
      const content = await response.arrayBuffer()
      console.log('[InboxService] Fetched binary content, size:', content.byteLength)

      return {
        evidence: {
          ...evidence,
          storageStatus: 'stored',
          mimeType: contentType,
          size: content.byteLength,
        },
        content,
      }
    }
  } catch (error) {
    console.error('[InboxService] Error fetching evidence:', error)
    throw error
  }
}

/**
 * Parse UBL XML and extract invoice line items and party details.
 * This is a client-side parser for basic UBL extraction.
 */
function parseUBLXml(xmlText: string): ParsedUBLData {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlText, 'text/xml')

    // Check for parse errors
    const parseError = doc.querySelector('parsererror')
    if (parseError) {
      console.warn('[InboxService] XML parse error:', parseError.textContent)
      return {}
    }

    const result: ParsedUBLData = {}

    // Helper to get text content from an element
    const getText = (parent: Element | Document, selector: string): string | undefined => {
      // Try with namespace-aware approach first
      const el = parent.querySelector(selector)
      return el?.textContent?.trim() || undefined
    }

    // Helper to get text from various namespace prefixes
    const getTextNS = (parent: Element | Document, localName: string): string | undefined => {
      // First try by local name (most reliable for namespaced XML)
      const elements = parent.getElementsByTagName('*')
      for (let i = 0; i < elements.length; i++) {
        if (elements[i].localName === localName) {
          return elements[i].textContent?.trim() || undefined
        }
      }
      // Fallback: try querySelector with escaped namespace prefixes
      // Colons in CSS selectors must be escaped with backslash
      const prefixes = ['', 'cbc\\:', 'cac\\:', 'ubl\\:', 'inv\\:']
      for (const prefix of prefixes) {
        try {
          const el = parent.querySelector(prefix + localName)
          if (el?.textContent?.trim()) {
            return el.textContent.trim()
          }
        } catch {
          // Ignore selector errors
        }
      }
      return undefined
    }

    // Get all elements with a specific local name (ignoring namespace)
    const getElementsByLocalName = (parent: Element | Document, localName: string): Element[] => {
      const result: Element[] = []
      const elements = parent.getElementsByTagName('*')
      for (let i = 0; i < elements.length; i++) {
        if (elements[i].localName === localName) {
          result.push(elements[i])
        }
      }
      return result
    }

    // Parse invoice type
    result.invoiceType = getTextNS(doc, 'InvoiceTypeCode')

    // Parse note
    result.note = getTextNS(doc, 'Note')

    // Parse payment terms
    const paymentTermsEl = getElementsByLocalName(doc, 'PaymentTerms')[0]
    if (paymentTermsEl) {
      result.paymentTerms = getTextNS(paymentTermsEl, 'Note')
    }

    // Parse supplier (AccountingSupplierParty)
    const supplierParty = getElementsByLocalName(doc, 'AccountingSupplierParty')[0]
    if (supplierParty) {
      const party = getElementsByLocalName(supplierParty, 'Party')[0]
      if (party) {
        result.supplier = parseParty(party, getElementsByLocalName, getTextNS)
      }
    }

    // Parse customer (AccountingCustomerParty)
    const customerParty = getElementsByLocalName(doc, 'AccountingCustomerParty')[0]
    if (customerParty) {
      const party = getElementsByLocalName(customerParty, 'Party')[0]
      if (party) {
        result.customer = parseParty(party, getElementsByLocalName, getTextNS)
      }
    }

    // Parse line items (InvoiceLine)
    const lineItems = getElementsByLocalName(doc, 'InvoiceLine')
    if (lineItems.length > 0) {
      result.lineItems = lineItems.map((line, index) => {
        const lineNumber = parseInt(getTextNS(line, 'ID') || String(index + 1), 10)
        const quantity = parseFloat(getTextNS(line, 'InvoicedQuantity') || '0')
        const unitCode = getElementsByLocalName(line, 'InvoicedQuantity')[0]?.getAttribute('unitCode') || 'EA'
        const lineTotal = parseFloat(getTextNS(line, 'LineExtensionAmount') || '0')

        // Get item details
        const item = getElementsByLocalName(line, 'Item')[0]
        const description = item ? getTextNS(item, 'Name') || '' : ''
        const note = item ? getTextNS(item, 'Description') : undefined

        // Get price
        const price = getElementsByLocalName(line, 'Price')[0]
        const unitPrice = price ? parseFloat(getTextNS(price, 'PriceAmount') || '0') : 0

        // Get VAT percent
        let vatPercent = 0
        const taxCategory = item ? getElementsByLocalName(item, 'ClassifiedTaxCategory')[0] : undefined
        if (taxCategory) {
          vatPercent = parseFloat(getTextNS(taxCategory, 'Percent') || '0')
        }

        return {
          lineNumber,
          description,
          note,
          quantity,
          quantityUnit: unitCode,
          unitPrice,
          vatPercent,
          lineTotal,
        }
      })
    }

    console.log('[InboxService] Parsed UBL data:', {
      lineItemCount: result.lineItems?.length,
      hasSupplier: !!result.supplier,
      hasCustomer: !!result.customer,
      invoiceType: result.invoiceType,
    })

    return result
  } catch (error) {
    console.error('[InboxService] Error parsing UBL XML:', error)
    return {}
  }
}

/**
 * Parse a UBL Party element
 */
function parseParty(
  party: Element,
  getElementsByLocalName: (parent: Element | Document, localName: string) => Element[],
  getTextNS: (parent: Element | Document, localName: string) => string | undefined
): InvoiceParty {
  // Get party name from PartyName/Name or PartyLegalEntity/RegistrationName
  let name = ''
  const partyName = getElementsByLocalName(party, 'PartyName')[0]
  if (partyName) {
    name = getTextNS(partyName, 'Name') || ''
  }
  if (!name) {
    const legalEntity = getElementsByLocalName(party, 'PartyLegalEntity')[0]
    if (legalEntity) {
      name = getTextNS(legalEntity, 'RegistrationName') || ''
    }
  }

  // Get VAT number from PartyTaxScheme/CompanyID
  let vatNumber: string | undefined
  const taxScheme = getElementsByLocalName(party, 'PartyTaxScheme')[0]
  if (taxScheme) {
    vatNumber = getTextNS(taxScheme, 'CompanyID')
  }

  // Get address from PostalAddress
  let address: InvoiceParty['address']
  const postalAddress = getElementsByLocalName(party, 'PostalAddress')[0]
  if (postalAddress) {
    address = {
      street: getTextNS(postalAddress, 'StreetName') || '',
      city: getTextNS(postalAddress, 'CityName') || '',
      postalCode: getTextNS(postalAddress, 'PostalZone') || '',
      country: '',
    }
    const country = getElementsByLocalName(postalAddress, 'Country')[0]
    if (country) {
      address.country = getTextNS(country, 'IdentificationCode') || getTextNS(country, 'Name') || ''
    }
  }

  // Get email from Contact/ElectronicMail
  let email: string | undefined
  const contact = getElementsByLocalName(party, 'Contact')[0]
  if (contact) {
    email = getTextNS(contact, 'ElectronicMail')
  }

  // Get GLN from PartyIdentification with schemeID="0088"
  let gln: string | undefined
  const partyIds = getElementsByLocalName(party, 'PartyIdentification')
  for (const pid of partyIds) {
    const idEl = getElementsByLocalName(pid, 'ID')[0]
    if (idEl?.getAttribute('schemeID') === '0088') {
      gln = idEl.textContent?.trim()
      break
    }
  }

  return {
    name,
    vatNumber,
    address,
    email,
    gln,
  }
}

/**
 * Update the parsed evidence data for an inbox credential.
 * This persists the parsed UBL data so it doesn't need to be re-fetched.
 */
export async function updateInboxCredentialParsedData(
  correlationId: string,
  parsedData: Record<string, unknown>
): Promise<void> {
  console.log('[InboxService] Updating parsed data for credential:', correlationId)

  const baseUrl = getAgentBaseUrl()
  const url = `${baseUrl}/inbox/credentials/${correlationId}/parsed-data`

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ parsedData }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[InboxService] Failed to update parsed data:', response.status, errorText)
      throw new Error(`Failed to update parsed data: ${response.status}`)
    }

    console.log('[InboxService] Successfully updated parsed data for:', correlationId)
  } catch (error) {
    console.error('[InboxService] Error updating parsed data:', error)
    throw error
  }
}

/**
 * Send a draft invoice directly (used when clicking Send on a draft from the list)
 * Returns the updated SentInvoice on success, or throws on failure
 */
export async function sendDraftInvoice(invoice: SentInvoice): Promise<SentInvoice> {
  if (invoice.status !== 'draft' && invoice.status !== 'failed') {
    throw new Error(`Cannot send invoice with status: ${invoice.status}`)
  }

  if (!invoice.recipientEndpoint) {
    throw new Error('Invoice is missing recipient endpoint URL. Please edit and reselect the recipient.')
  }

  console.log('[InboxService] Sending draft invoice via outbox:', invoice.id)

  // Use the outbox send endpoint which handles everything
  const sendResult = await sendOutboxItem(invoice.id)

  if (!sendResult.success) {
    throw new Error(sendResult.error || 'Failed to send eInvoice')
  }

  // Fetch the updated invoice from backend
  const updated = await fetchSentInvoiceById(invoice.id)
  if (!updated) {
    throw new Error('Failed to fetch updated invoice after sending')
  }

  console.log('[InboxService] Successfully sent draft invoice:', invoice.id)
  return updated
}
