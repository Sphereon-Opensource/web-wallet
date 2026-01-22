/**
 * Evidence file attached to credentials or invoices.
 * Shared type between credential issuance and eInvoice flows.
 */
export interface EvidenceFile {
  id?: string
  file?: File
  filename: string
  contentType: string
  evidenceType: 'UBLInvoice' | 'SupportingDocument' | 'CredentialEvidence'
  uploaded: boolean
  uploadedId?: string
  /** Content-addressable digest from Asset store (multibase encoded) */
  digestMultibase?: string
}

/**
 * Uploaded evidence file metadata returned from asset store.
 */
export interface UploadedEvidenceFile {
  id: string
  digestMultibase: string
  filename: string
  contentType: string
  evidenceType: EvidenceFile['evidenceType']
}
