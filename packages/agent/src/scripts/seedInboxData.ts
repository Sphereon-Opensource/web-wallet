/**
 * Seed script for inbox sample data
 *
 * This script creates sample inboxes, folders, and credentials for testing
 * the eInvoice inbox functionality.
 *
 * Usage: npx tsx src/scripts/seedInboxData.ts
 */

import agent from '../agent'
import { v4 as uuidv4 } from 'uuid'
import {
  CredentialCorrelationType,
  CredentialStateType,
  DocumentType,
  CredentialDocumentFormat,
  type DigitalCredential,
} from '@sphereon/ssi-sdk.credential-store'
import { CredentialRole } from '@sphereon/ssi-types'
import { getDefaultDID } from '../utils'

interface SampleInvoice {
  invoiceId: string
  invoiceDate: string
  dueDate: string
  currencyCode: string
  taxExclusiveAmount: number
  taxAmount: number
  taxInclusiveAmount: number
  invoiceType: string
  supplierName: string
  supplierVat: string
  supplierEmail: string
  supplierStreet: string
  supplierCity: string
  supplierPostalCode: string
  supplierCountry: string
  senderDid: string
  status: 'pending' | 'verified' | 'invalid'
}

const sampleInvoices: SampleInvoice[] = [
  {
    invoiceId: 'INV-2024-00850',
    invoiceDate: '2024-01-18',
    dueDate: '2024-02-18',
    currencyCode: 'EUR',
    taxExclusiveAmount: 5200.0,
    taxAmount: 1092.0,
    taxInclusiveAmount: 6292.0,
    invoiceType: 'Commercial Invoice',
    supplierName: 'Cloud Services B.V.',
    supplierVat: 'NL123456789B01',
    supplierEmail: 'invoices@cloud-services.example.com',
    supplierStreet: 'Techniekweg 15',
    supplierCity: 'Amsterdam',
    supplierPostalCode: '1043 AB',
    supplierCountry: 'Netherlands',
    senderDid: 'did:web:cloud-services.example.com',
    status: 'pending',
  },
  {
    invoiceId: 'INV-2024-00849',
    invoiceDate: '2024-01-17',
    dueDate: '2024-02-17',
    currencyCode: 'EUR',
    taxExclusiveAmount: 1850.0,
    taxAmount: 388.5,
    taxInclusiveAmount: 2238.5,
    invoiceType: 'Credit Note',
    supplierName: 'Office Supplies Ltd',
    supplierVat: 'NL111222333B01',
    supplierEmail: 'billing@office-supplies.example.com',
    supplierStreet: 'Kantoorweg 42',
    supplierCity: 'Rotterdam',
    supplierPostalCode: '3012 JK',
    supplierCountry: 'Netherlands',
    senderDid: 'did:web:office-supplies.example.com',
    status: 'pending',
  },
  {
    invoiceId: 'INV-2024-00848',
    invoiceDate: '2024-01-15',
    dueDate: '2024-02-15',
    currencyCode: 'EUR',
    taxExclusiveAmount: 12500.0,
    taxAmount: 2625.0,
    taxInclusiveAmount: 15125.0,
    invoiceType: 'Commercial Invoice',
    supplierName: 'Tech Solutions GmbH',
    supplierVat: 'DE123456789',
    supplierEmail: 'rechnungen@tech-solutions.example.de',
    supplierStreet: 'Technikstraße 100',
    supplierCity: 'Berlin',
    supplierPostalCode: '10115',
    supplierCountry: 'Germany',
    senderDid: 'did:web:tech-solutions.example.de',
    status: 'pending',
  },
  {
    invoiceId: 'INV-2024-00845',
    invoiceDate: '2024-01-10',
    dueDate: '2024-02-10',
    currencyCode: 'EUR',
    taxExclusiveAmount: 750.0,
    taxAmount: 157.5,
    taxInclusiveAmount: 907.5,
    invoiceType: 'Commercial Invoice',
    supplierName: 'Consulting Partners B.V.',
    supplierVat: 'NL987654321B01',
    supplierEmail: 'finance@consulting-partners.example.com',
    supplierStreet: 'Consultingplein 5',
    supplierCity: 'Utrecht',
    supplierPostalCode: '3511 BA',
    supplierCountry: 'Netherlands',
    senderDid: 'did:web:consulting-partners.example.com',
    status: 'verified',
  },
  {
    invoiceId: 'INV-2024-00840',
    invoiceDate: '2024-01-05',
    dueDate: '2024-02-05',
    currencyCode: 'EUR',
    taxExclusiveAmount: 3200.0,
    taxAmount: 672.0,
    taxInclusiveAmount: 3872.0,
    invoiceType: 'Commercial Invoice',
    supplierName: 'Digital Agency SARL',
    supplierVat: 'FR12345678901',
    supplierEmail: 'comptabilite@digital-agency.example.fr',
    supplierStreet: 'Rue de la Technologie 25',
    supplierCity: 'Paris',
    supplierPostalCode: '75001',
    supplierCountry: 'France',
    senderDid: 'did:web:digital-agency.example.fr',
    status: 'invalid',
  },
]

function createCredentialSubject(invoice: SampleInvoice): object {
  return {
    vct: 'urn:org:fides:einvoice:1',
    invoice_id: invoice.invoiceId,
    invoice_date: invoice.invoiceDate,
    due_date: invoice.dueDate,
    currency_code: invoice.currencyCode,
    tax_exclusive_amount: invoice.taxExclusiveAmount,
    tax_amount: invoice.taxAmount,
    tax_inclusive_amount: invoice.taxInclusiveAmount,
    invoice_type: invoice.invoiceType,
    supplier: {
      name: invoice.supplierName,
      vat_number: invoice.supplierVat,
      email: invoice.supplierEmail,
      address: {
        street: invoice.supplierStreet,
        city: invoice.supplierCity,
        postal_code: invoice.supplierPostalCode,
        country: invoice.supplierCountry,
      },
    },
  }
}

function createSampleCredential(invoice: SampleInvoice): object {
  return {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiableCredential', 'EInvoiceCredential'],
    issuer: {
      id: invoice.senderDid,
      name: invoice.supplierName,
    },
    issuanceDate: new Date(invoice.invoiceDate).toISOString(),
    credentialSubject: createCredentialSubject(invoice),
    evidence: [
      {
        id: `https://${invoice.senderDid.replace('did:web:', '')}/evidence/${invoice.invoiceId.toLowerCase()}/invoice.xml`,
        type: ['UBLInvoice'],
        name: 'invoice.xml',
        digestMultibase: 'z' + Buffer.from(invoice.invoiceId).toString('base64').replace(/[+/=]/g, ''),
      },
    ],
  }
}

async function seedInboxData(): Promise<void> {
  console.log('[Seed] Starting inbox data seeding...')
  console.log('[Seed] Using agent...')

  const now = new Date()

  // Get the default DID from agent configuration
  // This ensures we use the actual DID that was imported from config files
  let ownerDid = await getDefaultDID().catch(() => undefined)

  // Fallback: Try to get any DID from the agent
  if (!ownerDid) {
    const managedDids = await agent.didManagerFind()
    if (managedDids && managedDids.length > 0) {
      ownerDid = managedDids[0].did
      console.log(`[Seed] Using first available DID: ${ownerDid}`)
    }
  }

  if (!ownerDid) {
    console.error('[Seed] ERROR: No DIDs found in agent. Please ensure DID config files exist in conf/dids/')
    console.error('[Seed] DIDs are imported from config files on agent startup.')
    console.error('[Seed] Check IDENTIFIER_OPTIONS_PATH environment variable and ensure files exist.')
    process.exit(1)
  }

  console.log(`[Seed] Using owner DID: ${ownerDid}`)

  // Check if inbox already exists
  try {
    const existingInboxes = await agent.inboxGetAll()
    const existingInbox = existingInboxes.find((inbox: { name: string }) => inbox.name === 'invoices')
    if (existingInbox) {
      console.log('[Seed] Inbox "invoices" already exists. Skipping creation.')
      console.log('[Seed] To reset, delete the inbox first or use pnpm db:drop')
      process.exit(0)
    }
  } catch (error) {
    console.log('[Seed] No existing inboxes found, proceeding with creation...')
  }

  // Create the main inbox using the actual DID from agent configuration
  console.log('[Seed] Creating inbox: invoices')
  const inbox = await agent.inboxCreate({
    name: 'invoices',
    did: ownerDid,
    description: 'eInvoice credentials inbox',
  })
  console.log(`[Seed] Created inbox: ${inbox.name} (${inbox.id})`)

  // Create folders
  console.log('[Seed] Creating folder: direct-inbox')
  const directFolder = await agent.inboxFolderCreate({
    inboxName: inbox.name,
    name: 'direct-inbox',
    dcqlQueryId: 'einvoice',
    description: 'Direct eInvoice channel endpoint',
  })
  console.log(`[Seed] Created folder: ${directFolder.name} (${directFolder.id})`)

  console.log('[Seed] Creating folder: peppol-inbox')
  const peppolFolder = await agent.inboxFolderCreate({
    inboxName: inbox.name,
    name: 'peppol-inbox',
    dcqlQueryId: 'einvoice',
    description: 'PEPPOL network eInvoice endpoint',
  })
  console.log(`[Seed] Created folder: ${peppolFolder.name} (${peppolFolder.id})`)

  // Create sample credentials and link them to the inbox
  for (const invoice of sampleInvoices) {
    const correlationId = uuidv4()
    const credentialRaw = createSampleCredential(invoice)

    // Create the digital credential using the agent's credential store
    // Note: isIssuerSigned: true indicates the credential was signed by an external issuer (not us)
    // This avoids requiring kmsKeyRef/identifierMethod for sample data
    const credentialToStore: Partial<DigitalCredential> = {
      documentType: DocumentType.VC,
      documentFormat: CredentialDocumentFormat.SD_JWT,
      rawDocument: JSON.stringify(credentialRaw),
      hash: 'sha256-' + uuidv4().substring(0, 16),
      issuerCorrelationId: invoice.senderDid,
      issuerCorrelationType: CredentialCorrelationType.DID,
      subjectCorrelationId: ownerDid,
      subjectCorrelationType: CredentialCorrelationType.DID,
      credentialRole: CredentialRole.HOLDER,
      isIssuerSigned: true,
      // CredentialStateType enum: REVOKED, VERIFIED, EXPIRED (null/undefined = pending/unverified)
      verifiedState: invoice.status === 'verified' ? CredentialStateType.VERIFIED : invoice.status === 'invalid' ? CredentialStateType.REVOKED : undefined,
      createdAt: now,
      lastUpdatedAt: now,
      validFrom: new Date(invoice.invoiceDate),
    }

    console.log(`[Seed] Creating credential for invoice: ${invoice.invoiceId}`)
    const savedCredential = await agent.crsAddCredential({
      credential: credentialToStore as DigitalCredential,
    })
    console.log(`[Seed] Created credential: ${savedCredential.id}`)

    // Link the credential to the inbox folder
    const folderName =
      invoice.invoiceId.includes('848') || invoice.invoiceId.includes('840') ? peppolFolder.name : directFolder.name

    console.log(`[Seed] Linking credential to folder: ${folderName}`)
    await agent.inboxCredentialLink({
      inboxName: inbox.name,
      folderName: folderName,
      credentialId: savedCredential.id!,
      clientId: invoice.senderDid,
      clientIdPrefix: 'decentralized_identifier',
      correlationId: correlationId,
    })
    console.log(`[Seed] Linked credential ${invoice.invoiceId} to inbox folder ${folderName}`)
  }

  console.log('')
  console.log('[Seed] =============================================')
  console.log('[Seed] Inbox data seeding completed successfully!')
  console.log(`[Seed] Created ${sampleInvoices.length} sample invoices`)
  console.log('[Seed] =============================================')
  process.exit(0)
}

// Run the seed function
seedInboxData().catch((error) => {
  console.error('[Seed] Error:', error)
  process.exit(1)
})
