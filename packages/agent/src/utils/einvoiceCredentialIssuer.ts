import { IIdentifier, TAgent } from '@veramo/core'
import { TAgentTypes } from '../types'
import { ASSET_BASE_URI } from '../environment-vars'
import { ParsedEInvoice } from './ublParser'
import { Asset } from '../plugins/asset'

/**
 * Evidence reference for inclusion in the credential.
 */
export interface EvidenceReference {
  id: string // Download URL
  type: string[] // e.g., ['UBLInvoice'], ['SupportingDocument']
  name: string // Original filename
  digestMultibase: string // SHA-256 hash in multibase format
}

/**
 * eInvoice credential subject data.
 * Maps to the urn:org:fides:einvoice:1 credential schema.
 */
export interface EInvoiceCredentialSubject {
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
}

/**
 * Options for issuing an eInvoice credential.
 */
export interface IssueEInvoiceCredentialOptions {
  /** The parsed eInvoice data */
  invoiceData: ParsedEInvoice

  /** Assets (evidence files) to attach to the credential */
  evidenceFiles?: Asset[]

  /** Base URL for evidence download links */
  evidenceBaseUrl?: string

  /** Subject DID (buyer/recipient) - required, this is who the invoice is sent to */
  subjectDid: string

  /** Expiration date for the credential */
  expirationDate?: Date

  /** Additional claims to include */
  additionalClaims?: Record<string, unknown>
}

/**
 * Result of issuing an eInvoice credential.
 */
export interface IssuedEInvoiceCredential {
  /** The issued credential (SD-JWT format) */
  credential: string

  /** The credential hash for reference */
  hash: string

  /** Evidence references included in the credential */
  evidence: EvidenceReference[]
}

/**
 * Disclosure frame for SD-JWT selective disclosure.
 * Defines which claims can be selectively disclosed.
 */
const EINVOICE_DISCLOSURE_FRAME = {
  _sd: [
    'due_date',
    'tax_exclusive_amount',
    'tax_amount',
    'tax_inclusive_amount',
    'seller_tax_id',
    'seller_address',
    'buyer_tax_id',
    'buyer_address',
    'invoice_type_code',
    'note',
    'payment_terms',
    'payment_means_code',
  ],
}

/**
 * Build evidence references from assets.
 * The URL uses the public asset endpoint: /api/assets/{digestMultibase}
 */
export function buildEvidenceReferences(
  assets: Asset[],
  baseUrl: string
): EvidenceReference[] {
  return assets.map((asset) => ({
    id: `${baseUrl}/api/assets/${asset.digestMultibase}`,
    type: [asset.assetType],
    name: asset.filename,
    digestMultibase: asset.digestMultibase,
  }))
}

/**
 * Convert ParsedEInvoice to credential subject.
 */
export function buildCredentialSubject(
  invoiceData: ParsedEInvoice,
  subjectDid: string
): EInvoiceCredentialSubject & { id: string } {
  const subject: EInvoiceCredentialSubject & { id: string } = {
    id: subjectDid,
    // Invoice identification
    invoice_id: invoiceData.invoice_id,
    invoice_date: invoiceData.invoice_date,

    // Currency and amounts
    currency_code: invoiceData.currency_code,
    tax_exclusive_amount: invoiceData.tax_exclusive_amount,
    tax_amount: invoiceData.tax_amount,
    tax_inclusive_amount: invoiceData.tax_inclusive_amount,
    payable_amount: invoiceData.payable_amount,

    // Seller information
    seller_name: invoiceData.seller_name,

    // Buyer information
    buyer_name: invoiceData.buyer_name,
  }

  // Add optional fields if present
  if (invoiceData.due_date) subject.due_date = invoiceData.due_date
  if (invoiceData.seller_tax_id) subject.seller_tax_id = invoiceData.seller_tax_id
  if (invoiceData.seller_address) subject.seller_address = invoiceData.seller_address
  if (invoiceData.buyer_tax_id) subject.buyer_tax_id = invoiceData.buyer_tax_id
  if (invoiceData.buyer_address) subject.buyer_address = invoiceData.buyer_address
  if (invoiceData.invoice_type_code) subject.invoice_type_code = invoiceData.invoice_type_code
  if (invoiceData.note) subject.note = invoiceData.note
  if (invoiceData.payment_terms) subject.payment_terms = invoiceData.payment_terms
  if (invoiceData.payment_means_code) subject.payment_means_code = invoiceData.payment_means_code

  return subject
}

/**
 * Issue an eInvoice credential as a self-asserted SD-JWT VC.
 *
 * This creates a credential signed by the sender wallet containing the
 * invoice data from the parsed UBL document, with evidence references
 * to the original UBL file and any supporting documents.
 *
 * @param agent - The Veramo agent instance
 * @param issuer - The issuer identifier (sender wallet DID)
 * @param options - Options for issuing the credential
 * @returns The issued credential and metadata
 */
export async function issueEInvoiceCredential(
  agent: TAgent<TAgentTypes>,
  issuer: IIdentifier,
  options: IssueEInvoiceCredentialOptions
): Promise<IssuedEInvoiceCredential> {
  const { invoiceData, evidenceFiles = [], evidenceBaseUrl, subjectDid, expirationDate, additionalClaims } = options

  // Build evidence references using ASSET_BASE_URI as default
  const baseUrl = evidenceBaseUrl || ASSET_BASE_URI
  const evidenceRefs = buildEvidenceReferences(evidenceFiles, baseUrl)

  // Build credential subject
  const credentialSubject = buildCredentialSubject(invoiceData, subjectDid)

  // Create the credential payload for SD-JWT
  // SD-JWT uses flat claims with vct instead of nested credentialSubject
  // Note: 'sub' claim is important for holder binding - it identifies the credential holder (recipient)
  const credentialPayload: Record<string, unknown> = {
    vct: 'urn:org:fides:einvoice:1',
    iss: issuer.did,
    sub: subjectDid,
    iat: Math.floor(Date.now() / 1000),
    ...credentialSubject,
    ...additionalClaims,
  }

  // Add expiration if provided
  if (expirationDate) {
    credentialPayload.exp = Math.floor(expirationDate.getTime() / 1000)
  }

  // Add evidence array if there are evidence files
  if (evidenceRefs.length > 0) {
    credentialPayload.evidence = evidenceRefs
  }

  // Issue the SD-JWT credential using the agent's SD-JWT plugin
  // The plugin auto-resolves the issuer DID to find the signing key
  const result = await agent.createSdJwtVc({
    credentialPayload: credentialPayload as any,
    disclosureFrame: EINVOICE_DISCLOSURE_FRAME,
  })

  // Compute credential hash for reference
  const crypto = await import('crypto')
  const credentialString = result.credential
  const hash = crypto.createHash('sha256').update(credentialString).digest('hex')

  return {
    credential: credentialString,
    hash: `f${hash}`, // multibase format with 'f' prefix for base16
    evidence: evidenceRefs,
  }
}

/**
 * Issue an eInvoice credential directly from UBL XML content.
 *
 * This is a convenience function that parses the UBL XML and issues
 * a credential in one step.
 *
 * @param agent - The Veramo agent instance
 * @param issuer - The issuer identifier (sender wallet DID)
 * @param ublXml - The UBL XML content as string or Buffer
 * @param options - Additional options (evidenceFiles, etc.) - subjectDid is required
 * @returns The issued credential and metadata
 */
export async function issueEInvoiceCredentialFromUbl(
  agent: TAgent<TAgentTypes>,
  issuer: IIdentifier,
  ublXml: string | Buffer,
  options: Omit<IssueEInvoiceCredentialOptions, 'invoiceData'>
): Promise<IssuedEInvoiceCredential> {
  const { parseUblInvoice, validateParsedEInvoice } = await import('./ublParser')

  // Parse the UBL XML
  const invoiceData = await parseUblInvoice(ublXml)

  // Validate required fields
  const errors = validateParsedEInvoice(invoiceData)
  if (errors.length > 0) {
    throw new Error(`Invalid eInvoice data: ${errors.join(', ')}`)
  }

  // Issue the credential
  return issueEInvoiceCredential(agent, issuer, {
    ...options,
    invoiceData,
  })
}
