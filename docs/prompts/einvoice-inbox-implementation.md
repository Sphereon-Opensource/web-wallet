# eInvoice Inbox Endpoint Implementation

## Jira Tickets

### DEV-29: eInvoice Inbox Implementation Plan (Feature - Parent)
**Status:** Complete

Implement an inbox functionality in the web-wallet that enables receiving e-invoices via OID4VP. The inbox exposes endpoints as DID service endpoints. All eInvoice types (Direct, PEPPOL, PPF-FR) share the same DCQL query since the SD-JWT eInvoice credential schema is identical regardless of delivery channel. Includes UI for UBL upload, evidence file hosting with hash verification, and invoice credential processing.

### VDX-24: Create Inbox Endpoint Infrastructure (Story)
**Status:** Done

- Create inbox HTTP endpoints that can receive OID4VP authorization responses
- Trigger an OID4VP Auth request via POST
- Endpoint pattern:

```
POST /inbox/<inboxName>/<folderName>
```

Where:
- `inboxName` is a named inbox container
- `folderName` is a folder within the inbox, tied to an optional DCQL query

Internally call Universal OID4VP create session endpoint with the folder's configured DCQL query ID. This returns the AuthorizationRequest, which needs to be returned as our response.

**Generic Folder-to-DCQL Mapping:**
- Each folder can be tied to a specific DCQL query, making the inbox system extensible
- For eInvoice: the folder name happens to be the DID service ID, and uses the `einvoice` DCQL query
- For other use cases: folders can use different queries (e.g., `employee`, `kyc`)

**eInvoice Note:** All 3 eInvoice service types (`einv-direct`, `einv-peppol`, `einv-ppf-fr`) use the **same DCQL query** because the actual eInvoice credential (`urn:org:fides:einvoice:1`) has the same schema regardless of delivery channel.

### VDX-25: Define DCQL Queries for eInvoice Credentials (Story)
**Status:** Done

- Create **one** DCQL query for eInvoice credentials (shared by all service types)
- Query requests credentials of type `urn:org:fides:einvoice:1`
- Validates required fields: invoice_id, invoice_date, due_date, currency_code, tax amounts, evidence array
- Query validates presence of evidence array with required fields (id, type, name, digestMultibase)
- Query configuration is externalized for easy modification (has an ID, not hardcoded)
- Documented in Confluence

---

## Schema Clarification

There are **two different schema categories**:

### 1. DID Service Capability Schemas (in DID document)
These describe the eInvoicing **capabilities** of an organization. They go in the DID document's service section:
- `urn:org:fides:einv-direct:1` - Direct eInvoicing capability
- `urn:org:fides:einv-peppol:1` - PEPPOL eInvoicing capability
- `urn:org:fides:einv-ppf-fr:1` - France PPF eInvoicing capability

### 2. eInvoice Credential Schema (presented via OID4VP)
This is the **actual credential** that gets presented to the inbox. It's the **same schema regardless of which channel** was used:
- `urn:org:fides:einvoice:1` - The SD-JWT eInvoice credential

**Therefore: ONE DCQL query is needed**, requesting `urn:org:fides:einvoice:1` credentials.

---

## FIDES Credential Schemas

### eInvoice Credential (`urn:org:fides:einvoice:1`)

**This is the credential presented to the inbox - same for all channels.**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://raw.githubusercontent.com/FIDEScommunity/FIDES-credential-schemas/refs/heads/main/vct-schemas/einvoice/1/FIDES.invoice.schema.json",
  "title": "FIDES eInvoice Attestation (SD-JWT VC, flat schema)",
  "description": "SD-JWT based Verifiable Credential for eInvoice attestation based on UBL attributes",
  "type": "object",
  "properties": {
    "vct": {
      "type": "string",
      "const": "urn:org:fides:einvoice:1"
    },
    "invoice_id": {
      "description": "The id of the invoice",
      "type": "string"
    },
    "invoice_date": {
      "description": "The invoice date",
      "type": "string",
      "format": "date"
    },
    "due_date": {
      "description": "Due date of the invoice",
      "type": "string",
      "format": "date"
    },
    "currency_code": {
      "description": "Currency code of the invoice, as defined in ISO 4217:2015",
      "type": "string",
      "minLength": 3,
      "maxLength": 3
    },
    "tax_exclusive_amount": {
      "description": "Amount of the invoice excluding taxes",
      "type": "number"
    },
    "tax_amount": {
      "description": "Tax amount of the invoice",
      "type": "number"
    },
    "tax_inclusive_amount": {
      "description": "Amount of the invoice including taxes",
      "type": "number"
    },
    "evidence": {
      "description": "The original evidence documents, such as the UBL 2.0 invoice",
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "description": "The uri to the original document",
            "type": "string",
            "format": "uri"
          },
          "type": {
            "description": "The type of document",
            "type": "array",
            "items": { "type": "string" }
          },
          "name": {
            "description": "The name of the document",
            "type": "string"
          },
          "description": {
            "description": "Description of the document",
            "type": "string"
          },
          "digestMultibase": {
            "description": "Digest of the document",
            "type": "string"
          }
        },
        "required": ["id", "type", "name", "digestMultibase"]
      }
    }
  },
  "required": [
    "invoice_id",
    "invoice_date",
    "due_date",
    "currency_code",
    "tax_exclusive_amount",
    "tax_amount",
    "tax_inclusive_amount",
    "evidence"
  ]
}
```

### DID Service Capability Schemas

These are used in the DID document service section to advertise eInvoicing capabilities:

#### Direct eInvoicing Capability (`urn:org:fides:einv-direct:1`)

```json
{
  "title": "Direct eInvoicing Capability",
  "properties": {
    "vct": { "const": "urn:org:fides:einv-direct:1" },
    "entityName": { "type": "string" },
    "country": { "type": "string", "minLength": 2, "maxLength": 2 },
    "documentIdentifiers": { "type": "array", "items": { "type": "string" } },
    "processIdentifiers": { "type": "array", "items": { "type": "string" } },
    "endpoint": { "type": "string" },
    "transportType": { "enum": ["HTTP", "SMTP", "SFTP", "Portal"] }
  },
  "required": ["vct", "entityName", "country", "documentIdentifiers", "processIdentifiers", "endpoint"]
}
```

#### PEPPOL eInvoicing Capability (`urn:org:fides:einv-peppol:1`)

```json
{
  "title": "PEPPOL eInvoicing Capability",
  "properties": {
    "vct": { "const": "urn:org:fides:einv-peppol:1" },
    "entityName": { "type": "string" },
    "country": { "type": "string", "minLength": 2, "maxLength": 2 },
    "peppolParticipantId": { "type": "string" },
    "peppolSmpUrl": { "type": "string" },
    "peppolAs4Endpoint": { "type": "string" },
    "documentIdentifiers": { "type": "array" },
    "processIdentifiers": { "type": "array" },
    "transportType": { "enum": ["PEPPOL"] }
  },
  "required": ["vct", "entityName", "country", "peppolParticipantId", "documentIdentifiers", "processIdentifiers"]
}
```

#### France PPF eInvoicing Capability (`urn:org:fides:einv-ppf-fr:1`)

```json
{
  "title": "National eInvoicing – France PPF Capability",
  "properties": {
    "vct": { "const": "urn:org:fides:einv-ppf-fr:1" },
    "entityName": { "type": "string" },
    "country": { "type": "string", "minLength": 2, "maxLength": 2 },
    "ppfPlatformId": { "type": "string" },
    "ppfRecipientIds": { "type": "array", "items": { "type": "string" } },
    "ppfMode": { "enum": ["pdp", "direct", "via-pdp"] },
    "ppfApiEndpoint": { "type": "string" },
    "documentIdentifiers": { "type": "array" },
    "processIdentifiers": { "type": "array" },
    "transportType": { "enum": ["PPF"] }
  },
  "required": ["vct", "entityName", "country", "ppfPlatformId", "ppfRecipientIds", "ppfMode", "documentIdentifiers", "processIdentifiers"]
}
```

---

## Completed Work

### 1. Backend - Inbox Infrastructure (VDX-24 - Done)

#### Database Migrations
Created TypeORM migrations for PostgreSQL:
- `1736780400000-CreateInbox.ts` - Creates `inbox`, `inbox_folder`, and `inbox_credential` tables
- `1736780700000-CreateAsset.ts` - Creates `asset` table for content-addressable document storage

**Inbox Table Schema:**
```sql
CREATE TABLE "inbox" (
  "id" UUID PRIMARY KEY,
  "name" VARCHAR UNIQUE NOT NULL,
  "did" VARCHAR NOT NULL,
  "description" VARCHAR,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
)
```

**InboxFolder Table Schema:**
```sql
CREATE TABLE "inbox_folder" (
  "id" UUID PRIMARY KEY,
  "inbox_id" UUID REFERENCES "inbox"(id),
  "name" VARCHAR NOT NULL,
  "dcql_query_id" VARCHAR,
  "description" VARCHAR,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW(),
  UNIQUE("inbox_id", "name")
)
```

**InboxCredential Table Schema:**
```sql
CREATE TABLE "inbox_credential" (
  "id" UUID PRIMARY KEY,
  "inbox_id" UUID REFERENCES "inbox"(id),
  "folder_id" UUID REFERENCES "inbox_folder"(id),
  "correlation_id" VARCHAR NOT NULL,
  "credential_hash" VARCHAR NOT NULL,
  "sender_did" VARCHAR,
  "status" VARCHAR DEFAULT 'pending',
  "parsed_data" JSONB,                    -- Persisted parsed invoice data
  "evidence_fetched_at" TIMESTAMP,        -- When evidence was last fetched
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
)
```

**Asset Table Schema:**
```sql
CREATE TABLE "asset" (
  "id" UUID PRIMARY KEY,
  "tenant_id" VARCHAR,
  "digest_multibase" VARCHAR UNIQUE NOT NULL,  -- Content-addressable key (z-prefixed base58btc SHA-256)
  "hash_algorithm" VARCHAR DEFAULT 'sha256',
  "filename" VARCHAR NOT NULL,
  "original_filename" VARCHAR,
  "content_type" VARCHAR NOT NULL,
  "file_size" BIGINT DEFAULT 0,
  "storage_path" VARCHAR NOT NULL,
  "asset_type" VARCHAR DEFAULT 'Document',     -- UBLInvoice, SupportingDocument, etc.
  "description" VARCHAR,
  "is_public" BOOLEAN DEFAULT false,
  "available_from" TIMESTAMP WITH TIME ZONE,
  "available_until" TIMESTAMP WITH TIME ZONE,
  "credential_id" VARCHAR,
  "metadata" JSONB,
  "deleted_at" TIMESTAMP WITH TIME ZONE,       -- Soft-delete support
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

#### Inbox Plugin (`packages/agent/src/plugins/inboxPlugin.ts`)
Veramo plugin providing inbox management methods:
- `inboxCreate(args)` - Create new inbox
- `inboxGetAll()` - List all inboxes
- `inboxGetByName(name)` - Get inbox by name
- `inboxFolderCreate(args)` - Create folder within inbox
- `inboxFolderGetByInbox(inboxName)` - List folders in inbox
- `inboxCredentialLink(args)` - Link credential to inbox folder
- `inboxCredentialList(args)` - List credentials in folder
- `inboxCredentialGet(args)` - Get single credential by ID
- `inboxCredentialUpdateParsedData(args)` - Update parsed data for credential persistence
- `inboxCredentialUpdateStatus(args)` - Update credential status (pending/verified/rejected)
- `inboxSendToRecipient(args)` - Send credential to recipient via OID4VP

#### Asset Plugin (`packages/agent/src/plugins/assetPlugin.ts`)
Veramo plugin for content-addressable document storage:
- `assetStore(args)` - Upload file, compute SHA-256 digest, store with multibase encoding
- `assetGetById(args)` - Get asset by UUID
- `assetGetByDigest(args)` - Get asset by multibase digest (primary access method)
- `assetList(args)` - List assets with filters (type, public, credential)
- `assetCount(args)` - Count assets matching filters
- `assetUpdate(args)` - Update asset metadata (filename, contentType, description, etc.)
- `assetDelete(args)` - Soft-delete or hard-delete asset
- `assetPublish(args)` - Make asset public with optional availability window
- `assetUnpublish(args)` - Make asset private
- `assetLinkCredential(args)` - Associate asset with credential
- `assetRestore(args)` - Restore soft-deleted asset
- `assetGetFile(args)` - Get file path with availability check for serving

**Content-Addressable Storage:**
- Files hashed with SHA-256 and encoded as multibase (z-prefixed base58btc)
- Same content always produces same digest (deduplication)
- Digest serves as public URL identifier
- Files stored in `asset-files/<uuid>/<filename>` directory structure

#### Inbox API Server (`packages/agent/src/api/inboxApiServer.ts`)
REST API endpoints:
- `POST /inbox/:inboxName/:folderName` - Receive credentials via OID4VP (initiates authorization request)
- `GET /inbox` - List all inboxes
- `POST /inbox` - Create inbox
- `GET /inbox/:inboxName/folders` - List folders
- `POST /inbox/:inboxName/folders` - Create folder
- `GET /inbox/:inboxName/:folderName/credentials` - List credentials in folder
- `GET /inbox/:inboxName/:folderName/credentials/:id` - Get single credential
- `PUT /inbox/:inboxName/:folderName/credentials/:id/status` - Update credential status
- `PUT /inbox/:inboxName/:folderName/credentials/:id/parsed-data` - Update parsed data
- `DELETE /inbox/:inboxName/:folderName/credentials/:id` - Delete credential

#### Asset API Server (`packages/agent/src/api/assetApiServer.ts`)
REST API for asset/document management:

**Public Endpoints (no authentication):**
- `GET /api/assets/:digestMultibase` - Download public asset by multibase digest
  - Returns file with proper Content-Type and Content-Disposition headers
  - Checks availability window (availableFrom, availableUntil)
  - Returns 404 if not public, 410 if deleted/expired, 425 if not yet available

**Management Endpoints (authenticated):**
- `GET /assets` - List all assets with filters
- `POST /assets` - Upload new asset (multipart/form-data)
- `GET /assets/:id` - Get asset metadata by UUID
- `PUT /assets/:id` - Update asset metadata
- `DELETE /assets/:id` - Delete asset (soft-delete by default, `?hardDelete=true` for permanent)
- `POST /assets/:id/publish` - Make asset public with availability window
- `POST /assets/:id/unpublish` - Make asset private
- `POST /assets/:id/restore` - Restore soft-deleted asset

#### eInvoice API Server (`packages/agent/src/api/einvoiceApiServer.ts`)
REST API for eInvoice operations:
- `POST /api/einvoice/send` - Send eInvoice credential to recipient via OID4VP
  - Validates invoice data
  - Fetches and publishes assets (evidence files) with 7-year default availability
  - Issues SD-JWT eInvoice credential
  - Initiates OID4VP flow with recipient's inbox
  - Completes VP token presentation

### 2. Frontend - Inbox UI

#### Inbox List Page (`packages/web-wallet/pages/inbox/index.tsx`)
Main inbox view with:
- Folder tabs (einvoice, direct-inbox, peppol-inbox) with underline-style active indicator
- Invoice credential list with status badges (pending, verified, rejected)
- Click-through to invoice detail view
- Detail panel sidebar (`InboxDetailPanel`) showing selected invoice
- Meatball menu with actions: Details, Show Invoice, Delete
- Approve/Reject workflow for pending invoices

#### InboxView Component (`packages/web-wallet/src/components/views/InboxView/`)
Reusable inbox view component:
- `InboxDetailPanel` - Side panel for invoice details with approve/reject/send actions
- Displays credentials as invoice cards
- Status filtering
- Amount formatting with currency
- Date display

#### Inbox Item Detail Page (`packages/web-wallet/pages/inbox/[inboxName]/[folderName]/[id].tsx`)
Full-page detail view for individual inbox items:
- Full invoice information display with tabbed interface (Summary, Line Items, Parties, Evidence, Credential)
- Evidence file list with fetch/download functionality
- Evidence status persisted to backend (survives page reload)
- Sender DID information with contact linking
- Credential verification status
- Approval actions (Approve/Reject) shown only for pending invoices

**Evidence Persistence:**
- When evidence is fetched, status is saved to `inbox_credential.parsed_data`
- Includes: storageStatus, mimeType, size for each evidence item
- Merged with existing evidence statuses (doesn't overwrite previous)
- Parsed UBL data (line items, parties) also persisted

#### Inbox Service (`packages/web-wallet/src/services/inboxService.ts`)
Frontend service for inbox API calls:
- `fetchInboxes()` - Get all inboxes
- `fetchInboxFolders(inboxName)` - Get folders
- `fetchInboxCredentials(inboxName, folderName)` - Get credentials
- `fetchInboxInvoiceById(inboxName, folderName, id)` - Get single invoice with evidence
- `fetchInboxInvoices()` - Get all inbox invoices
- `fetchSentInvoices()` - Get sent invoices
- `fetchSentInvoiceById(id)` - Get single sent invoice
- `saveSentInvoice(data)` - Save sent invoice
- `deleteSentInvoice(id)` - Delete sent invoice
- `deleteInboxInvoice(invoice)` - Delete inbox invoice
- `approveInvoice(invoice)` - Approve pending invoice
- `rejectInvoice(invoice)` - Reject pending invoice
- `fetchEvidenceFile(evidence)` - Fetch and parse external evidence file
- `updateInboxCredentialParsedData(id, parsedData)` - Persist parsed data to backend

### 3. Frontend - eInvoice List View

#### eInvoice List Page (`packages/web-wallet/pages/einvoice/index.tsx`)
Main eInvoice overview with tabbed interface:
- **Received tab**: Shows verified/accepted invoices from inbox
- **Sent tab**: Shows sent invoices with status filtering (Draft, Sent, Delivered, Failed, All)
- Tab navigation with icons matching left sidebar navigation
- Underline-style active tab indicator (consistent with rest of app)
- "Send eInvoice" action button using `PrimaryButton` component with ADD icon
- Inbox indicator banner when pending invoices exist
- Detail panel sidebar (`InboxDetailPanel`) for selected invoice

**Features:**
- Custom table implementation with sortable columns
- Status badges for sent invoices (Draft, Sending, Sent, Delivered, Failed)
- Meatball menu with context actions:
  - Received: Details, Show Invoice, Delete
  - Sent: Details, Resend (for failed/draft), Delete
- Party info display (name, DID/email)
- Currency formatting
- Empty states with call-to-action buttons
- Responsive design with mobile-friendly fixed action button

**URL Query Parameter Sync:**
- Tab state synced with URL (`?tab=received` or `?tab=sent`)
- Uses react-router-dom (`useLocation`, `useNavigate`) for routing consistency
- Left sidebar menu items link directly to tabs

### 4. Frontend - eInvoice Creation Wizard

#### 3-Step Wizard Flow
Restructured from 4 steps to 3 steps:

**Step 1: Invoice & Recipient** (`EInvoiceDetailsContent`)
- UBL XML file upload with drag-and-drop
- Client-side UBL parsing using native DOMParser
- Invoice preview using `UBLInvoiceCard` component
- Recipient selection from contacts with DIDs
- Auto-match recipient based on UBL buyer name
- DID resolution to discover eInvoicing endpoints
- Endpoint selection (Direct, PEPPOL, PPF-FR)

**Step 2: Evidence Files** (`EInvoiceEvidenceContent`)
- Attach supporting documents (uploads to Asset store)
- File type validation
- Evidence type selection (UBLInvoice, SupportingDocument)
- Displays uploaded evidence with size and type

**Step 3: Review & Send** (`EInvoiceReviewContent`)
- Summary of invoice details
- Selected recipient and endpoint
- Evidence files list with public URLs
- Send button to submit credential via OID4VP

#### State Machine (`packages/web-wallet/src/machines/einvoice/eInvoiceCreateStateNavigation.tsx`)
XState-based navigation with context:
- Form data management
- UBL parsing state
- Evidence files array (asset IDs)
- Recipient with endpoints
- Sending state and error handling

#### UBL Parser (`packages/web-wallet/src/utils/ublParser.ts`)
Client-side UBL 2.0/2.1 XML parsing:
- Extracts invoice ID, dates, amounts
- Parses seller and buyer information
- Handles namespaced XML elements
- Parses line items and payment terms

#### Recipient Service (`packages/web-wallet/src/services/recipientService.ts`)
Contact and DID resolution:
- `fetchContacts()` - Get contacts with DIDs (uses `/parties` REST API)
- `resolveEInvoicingEndpoints(did)` - Resolve DID and extract eInvoicing services
- `resolveRecipient(contact)` - Full recipient resolution
- `matchContactByName(buyerName)` - Auto-match UBL buyer to contact

### 5. Backend - eInvoice Credential Issuance

#### eInvoice Credential Issuer (`packages/agent/src/utils/einvoiceCredentialIssuer.ts`)
Creates and signs SD-JWT eInvoice credentials:
- Maps parsed invoice data to FIDES credential schema
- Includes evidence array with public asset URLs
- Signs with sender's DID key
- Returns issued credential with hash

#### Inbox Credential Handler (`packages/agent/src/utils/inboxCredentialHandler.ts`)
Processes received credentials:
- Validates VP token signatures
- Extracts credential claims
- Links credential to inbox folder
- Triggers verification workflow

#### Inbox Verification Handler (`packages/agent/src/utils/inboxVerificationHandler.ts`)
Verifies received credentials:
- Signature verification
- Issuer trust validation
- Evidence hash verification
- Updates credential status

### 6. Contact Fixtures with DIDs

Updated `packages/agent/src/database/demo-data/rws/contact-fixtures.ts`:
- Added "Acme Corporation B.V." organization with `did:web:localhost:acme`
- All contacts now have proper DID identities with `origin: PartyOrigin.INTERNAL`
- 7 total contacts with DIDs for testing

### 7. DID Service Types

Implemented in web-wallet UI:
- `einv-direct` - Direct eInvoicing capability
- `einv-peppol` - PEPPOL eInvoicing capability
- `einv-ppf-fr` - France PPF eInvoicing capability

Service metadata stored via `ServiceMetadataPlugin`.

### 8. Routing Configuration

Updated routing in:
- `packages/web-wallet/src/router/AppRouter.tsx` - Added eInvoice and inbox routes
- `packages/web-wallet/src/types/route/index.ts` - Route type definitions
- `packages/web-wallet/src/config/roleConfig.ts` - Menu configuration for HOLDER role

Routes:
- `/einvoice` - eInvoice list page (with `?tab=received` or `?tab=sent` query params)
- `/einvoice/create` - 3-step creation wizard
- `/einvoice/create/details` - Step 1
- `/einvoice/create/evidence` - Step 2
- `/einvoice/create/review` - Step 3
- `/inbox` - Inbox list
- `/inbox/:inboxName/:folderName/:id` - Inbox item detail

### 9. Left Navigation (Sidebar) Configuration

#### HOLDER Role Navigation Structure (`roleConfig.ts`)
```
├── Inbox (top-level, no category)
├── Document store
│   ├── Credentials
│   └── Assets              <-- Asset management page
├── eInvoices
│   ├── Received → /einvoice?tab=received
│   └── Sent → /einvoice?tab=sent
└── Contacts
    └── Overview
```

#### Navigation Features
- **Top-level items**: Items with `topLevel: true` prop align with category labels (no indent)
- **Query-aware active states**: `SideNavigationItem` uses custom logic to match URL query parameters
- **Custom icons**: Added `inbox`, `received`, `sent`, `asset` icon types with inline SVG

#### SideNavigationItem Enhancements
- Uses `react-router-dom` `NavLink` with custom `isActiveWithQuery` logic
- Handles both path-only and path+query matching for menu highlighting
- `topLevel` prop controls left margin alignment

#### MenuItem Type Extension (`types/component/index.ts`)
```typescript
export type MenuItem = {
  type: 'item'
  label: string
  icon: MenuIcon
  path: string
  end?: boolean
  topLevel?: boolean  // Aligns item with category labels
}

export type MenuIcon =
  | 'contact' | 'notification' | 'activity' | 'credential'
  | 'issuedCredential' | 'issueCredential' | 'contactOverview'
  | 'addContact' | 'identifier' | 'management' | 'key' | 'design'
  | 'inbox' | 'received' | 'sent' | 'asset'
```

---

## OID4VP Flow - Inbox Extension

The inbox endpoint is an **extension to standard OID4VP** that kickstarts the credential presentation flow. This extension enables wallet-to-wallet credential exchange by exposing an inbox POST endpoint.

### Sequence Diagram

```mermaid
sequenceDiagram
    participant SW as Sender Wallet
    participant DR as DID Resolver
    participant IB as Receiver Inbox
    participant RW as Receiver Wallet

    Note over SW,RW: Phase 1 - Inbox Discovery via DID Service
    SW->>DR: Resolve Receiver DID (did:web:receiver.com)
    DR-->>SW: DID Document with service endpoints

    Note over SW,RW: Phase 2 - Inbox Initiation (Extension)
    SW->>IB: POST /inbox {client_id, optional wallet_nonce?}
    IB->>IB: Validate sender, generate session
    IB-->>SW: 201 Created {request_uri, client_id with decentralized_identifier prefix}

    Note over SW,RW: Phase 3 - Standard OID4VP Cross-Device Flow with direct_post
    SW->>IB: GET {request_uri}
    IB-->>SW: Request Object JWT (dcql_query, response_uri, nonce, state)
    SW->>SW: Parse query, select credentials, create VP Token
    SW->>IB: POST {response_uri} (vp_token, presentation_submission, state)
    IB->>IB: Verify VP Token signature, trust validation etc
    IB-->>SW: 200 OK

    Note over SW,RW: Phase 4 - Credential Processing
    IB->>RW: Store received credentials, notify receiver
```

### Phase 2: The Inbox Extension

**This is the key addition.** Phase 2 extends OID4VP by allowing a sender wallet to initiate the flow by POSTing to the receiver's inbox endpoint (discovered from the DID document).

**POST Request from Sender:**
```json
{
  "client_id": "did:web:sender.example.com"
}
```

**Response from Inbox (201 Created):**
```json
{
  "request_uri": "https://wallet.receiver.com/siop/queries/einvoice/auth-requests/{correlationId}",
  "client_id": "decentralized_identifier:did:web:receiver.example.com"
}
```

**Key Points:**
- The `client_id` in the response uses the `decentralized_identifier` prefix per OID4VP spec
- The `request_uri` points to the standard OID4VP authorization request endpoint
- The inbox validates the sender's `client_id` for filtering unknown senders (future enhancement)

---

## File Structure

### Agent Package (`packages/agent/`)
```
src/
├── api/
│   ├── inboxApiServer.ts          # Inbox REST endpoints
│   ├── assetApiServer.ts          # Asset/document store REST endpoints
│   └── einvoiceApiServer.ts       # eInvoice sending endpoint
├── database/
│   ├── migrations/
│   │   └── postgres/
│   │       ├── 1736780400000-CreateInbox.ts      # inbox, inbox_folder, inbox_credential
│   │       └── 1736780700000-CreateAsset.ts      # asset table
│   └── demo-data/
│       └── rws/
│           └── contact-fixtures.ts  # Updated with DIDs
├── plugins/
│   ├── inboxPlugin.ts              # Inbox Veramo plugin
│   └── assetPlugin.ts              # Asset/document store plugin
├── scripts/
│   └── seedInboxData.ts            # Sample data seeding
└── utils/
    ├── einvoiceCredentialIssuer.ts # Credential creation
    ├── inboxCredentialHandler.ts   # Credential processing
    ├── inboxVerificationHandler.ts # Credential verification
    └── ublParser.ts                # Server-side UBL parsing
```

### Web Wallet Package (`packages/web-wallet/`)
```
pages/
├── assets/
│   ├── index.tsx                   # Asset management page
│   └── index.module.css            # Asset page styles
├── einvoice/
│   ├── index.tsx                   # eInvoice list page (Received/Sent tabs)
│   ├── index.module.css            # eInvoice list styles
│   └── create/
│       ├── index.tsx               # Create wizard container
│       └── index.module.css
└── inbox/
    ├── index.tsx                   # Inbox list page
    ├── index.module.css            # Inbox list styles
    └── [inboxName]/
        └── [folderName]/
            ├── [id].tsx            # Item detail page
            └── [id].module.css

src/
├── components/
│   ├── badges/
│   │   └── StatusBadge/            # Reusable status badge component
│   ├── bars/
│   │   └── SideNavigationBar/
│   │       ├── index.tsx           # Main navigation bar
│   │       ├── index.module.css
│   │       └── SideNavigationItem/
│   │           ├── index.tsx       # Nav item with query-aware active state
│   │           └── index.module.css # Includes topLevel styling
│   └── views/
│       ├── EInvoiceDetailsContent/ # Step 1 - Invoice & Recipient
│       ├── EInvoiceEvidenceContent/# Step 2 - Evidence files
│       ├── EInvoiceReviewContent/  # Step 3 - Review & Send
│       ├── InboxView/
│       │   ├── index.tsx           # Inbox list component
│       │   ├── InboxDetailPanel.tsx # Detail sidebar panel
│       │   └── types.ts            # InboxEInvoice, InboxEvidence types
│       └── UBLInvoiceView/         # Invoice display components
│           ├── UBLInvoiceCard.tsx      # Compact invoice card
│           ├── UBLInvoiceDetailView.tsx # Full detail with tabs
│           ├── UBLSummaryTab.tsx       # Summary tab content
│           ├── UBLLineItemsTab.tsx     # Line items tab content
│           ├── UBLPartiesTab.tsx       # Parties (seller/buyer) tab
│           ├── UBLEvidenceTab.tsx      # Evidence files tab
│           ├── UBLCredentialTab.tsx    # Raw credential tab
│           └── types.ts                # UBLInvoiceData, InvoiceParty types
├── config/
│   └── roleConfig.ts               # Role-based navigation (HOLDER has Inbox/eInvoices/Assets)
├── machines/einvoice/
│   └── eInvoiceCreateStateNavigation.tsx  # Wizard state machine
├── services/
│   ├── assetService.ts             # Asset API client
│   ├── inboxService.ts             # Inbox/Sent invoice API client
│   └── recipientService.ts         # Contact/DID resolution
├── types/
│   └── component/
│       └── index.ts                # MenuItem, MenuIcon types (inbox, received, sent, asset)
├── utils/
│   └── ublParser.ts                # Client-side UBL parsing
└── constants/
    └── eInvoicingDefaults.ts       # Service type constants
```

---

## Environment Configuration

### Agent Environment Variables
```bash
# Enable inbox functionality
IS_INBOX_ENABLED=true

# Asset storage configuration
ASSET_STORAGE_PATH=./asset-files           # Directory for asset files
ASSET_BASE_URI=http://localhost:5010       # Base URI for public asset URLs
ASSET_API_BASE_PATH=                       # API path prefix (empty = root)
ASSET_DEFAULT_AVAILABILITY_YEARS=7         # Default availability window for eInvoice evidence

# Database (PostgreSQL)
DB_TYPE=postgres
DB_URL=postgresql://user:pass@localhost:5432/wallet

# DID configuration
DEFAULT_DID=did:web:localhost
IDENTIFIER_OPTIONS_PATH=./conf/examples/dids
```

### Running the Stack
```bash
# Start agent
cd packages/agent
pnpm start:dev

# Start web-wallet (separate terminal)
cd packages/web-wallet
pnpm dev

# Seed inbox data (if needed)
cd packages/agent
RUN_MODE=cli npx tsx src/scripts/seedInboxData.ts

# Initialize demo data (contacts, etc.)
cd packages/agent
pnpm demo:init
```

---

## Testing the Flow

1. **Access Inbox**: Navigate to `http://localhost:3001/inbox`
   - Should show inbox folders (einvoice, direct-inbox, peppol-inbox)
   - Should display sample invoices with status badges
   - Click invoice to see detail panel
   - Click "Details" to open full-page detail view

2. **View Invoice Details**: Navigate to `/inbox/:inboxName/:folderName/:id`
   - Tabbed interface: Summary, Line Items, Parties, Evidence, Credential
   - Evidence tab shows evidence files with fetch button
   - Fetching downloads external evidence and parses UBL data
   - Evidence status persists to backend (survives page reload)

3. **Create eInvoice**: Navigate to `http://localhost:3001/einvoice/create`
   - Upload a UBL XML file (drag-and-drop or browse)
   - Invoice details should auto-populate
   - Select recipient from contacts dropdown
   - Should show eInvoicing endpoints after DID resolution
   - Add evidence files in Step 2
   - Review and send in Step 3

4. **Access Assets**: Navigate to `http://localhost:3001/assets`
   - View uploaded assets with metadata
   - Upload new assets
   - Publish/unpublish assets
   - Set availability windows

5. **Public Asset Access**: `http://localhost:5010/api/assets/<digestMultibase>`
   - Downloads public assets with proper Content-Type
   - Returns 404 if not public or not available

6. **Verify Contacts**: Contacts should appear in dropdown
   - All contacts should have DIDs
   - DID resolution should find eInvoicing endpoints

---

## Architecture Notes

### Content-Addressable Asset Storage

Assets use SHA-256 hashing with multibase encoding (z-prefixed base58btc) for content-addressable access:

```
File Content → SHA-256 Hash → Base58btc Encode → Add 'z' prefix
                                                   ↓
                                           digestMultibase (e.g., z3E7...)
```

**Benefits:**
- Same content always produces same URL
- Deduplication: uploading same file returns existing asset
- Integrity verification: hash proves content hasn't changed
- Deterministic: recipients can verify evidence matches credential

### Evidence Persistence Flow

When a user fetches evidence in the inbox detail view:

1. Frontend calls `fetchEvidenceFile(evidence)` service
2. Agent downloads file from public URL
3. Agent verifies hash matches `digestMultibase`
4. Agent stores file locally and returns parsed UBL data
5. Frontend updates local state with evidence status and UBL data
6. Frontend calls `updateInboxCredentialParsedData(id, parsedData)` to persist
7. On page reload, persisted data is loaded from `inbox_credential.parsed_data`

**Persisted data includes:**
- `evidenceStatus`: Map of evidence IDs to status (storageStatus, mimeType, size)
- `lineItems`: Parsed UBL line items
- `supplier`: Parsed supplier party info
- `customer`: Parsed customer party info
- `invoiceType`: Invoice type code
- `paymentTerms`: Payment terms from UBL

### eInvoice Sending Flow

When sending an eInvoice:

1. Frontend uploads evidence files to Asset store (Step 2)
2. Frontend submits send request with invoice data, evidence IDs, recipient info
3. Backend publishes assets with 7-year availability window
4. Backend issues SD-JWT eInvoice credential with evidence URLs
5. Backend initiates OID4VP flow with recipient's inbox
6. Backend completes VP token presentation
7. Recipient inbox receives and stores credential

**Evidence URLs in credential:**
```json
{
  "evidence": [
    {
      "id": "https://wallet.example.com/api/assets/z3E7...",
      "type": ["UBLInvoice"],
      "name": "invoice.xml",
      "digestMultibase": "z3E7..."
    }
  ]
}
```

### Soft-Delete Pattern

Assets support soft-delete for safety:
- `DELETE /assets/:id` sets `deleted_at` timestamp
- Asset remains in database and file system
- Public access returns 410 Gone (not 404)
- Can be restored with `POST /assets/:id/restore`
- Hard delete with `DELETE /assets/:id?hardDelete=true`

### Auto-Restore on Re-Store

When storing an asset with content that matches a soft-deleted asset:
- System detects existing asset by digest
- Automatically restores the soft-deleted asset
- Updates metadata if provided
- Returns restored asset (no duplication)

---

## Remaining Work (Future Enhancements)

### Backend
1. **Sender Filtering**: Whitelist/blacklist for inbox senders
2. **Notification System**: Real-time notifications for new inbox items
3. **Evidence Expiration**: Cleanup of expired assets

### Frontend
1. **Bulk Actions**: Select multiple invoices for approve/reject/delete
2. **Search/Filter**: Search inbox by invoice ID, sender, date range
3. **Export**: Export invoices to CSV/PDF

### Testing
1. End-to-end test: Send eInvoice from wallet A to wallet B
2. Verify OID4VP flow completes successfully
3. Test all 3 service types (Direct, PEPPOL, PPF-FR)
4. Test evidence persistence across browser sessions
