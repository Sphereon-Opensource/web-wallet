import React, {ReactElement, useState} from 'react'
import {CredentialViewItem, JSONDataView} from '@sphereon/ui-components.ssi-react'
import {CredentialStatus} from '@sphereon/ui-components.core'
import styles from './index.module.css'
import StatusBadge, {getStatusVariant} from '@components/badges/StatusBadge'
import AccentCard from '@components/views/AccentCard'
import FieldList, {FieldItem} from '@components/views/AccentCard/FieldList'
import {
  UBLInvoiceDetailViewProps,
  InvoiceDetailTab,
  formatCurrency,
  formatDate,
  truncateHash,
  InvoiceEvidence,
  InvoiceParty,
} from '../types'

/**
 * UBLInvoiceDetailView - Full detail view for eInvoice credentials
 * Displays all invoice information organized in tabs
 */
const UBLInvoiceDetailView: React.FC<UBLInvoiceDetailViewProps> = ({
  invoice,
  initialTab = 'summary',
  onClose,
  onFetchEvidence,
  onDownloadEvidence,
  onViewEvidence,
  onViewContact,
  showActions = false,
  onApprove,
  onReject,
  isProcessing = false,
}): ReactElement => {
  const [activeTab, setActiveTab] = useState<InvoiceDetailTab>(initialTab)
  const [technicalDetailsExpanded, setTechnicalDetailsExpanded] = useState(false)
  const [isFetchingAllEvidence, setIsFetchingAllEvidence] = useState(false)

  // Check if there are any external evidence files that haven't been downloaded
  const externalEvidence = invoice.evidence.filter(e => (e.storageStatus ?? 'external') === 'external')
  const hasExternalEvidence = externalEvidence.length > 0

  // Handler to fetch all external evidence files
  const handleFetchAllEvidence = async () => {
    if (!onFetchEvidence || externalEvidence.length === 0) return

    setIsFetchingAllEvidence(true)
    try {
      // Fetch all external evidence in parallel
      await Promise.all(externalEvidence.map(evidence => onFetchEvidence(evidence)))
    } catch (error) {
      console.error('[UBLInvoiceDetailView] Error fetching evidence:', error)
    } finally {
      setIsFetchingAllEvidence(false)
    }
  }

  const status = invoice.status ?? 'pending'
  const supplierName = invoice.supplier?.name ?? 'Unknown Supplier'
  const isSignatureValid = invoice.credential?.signatureValid ?? true

  const tabs: {id: InvoiceDetailTab; label: string}[] = [
    {id: 'summary', label: 'Summary'},
    {id: 'lineItems', label: 'Line Items'},
    {id: 'parties', label: 'Parties'},
    {id: 'evidence', label: 'Evidence'},
    {id: 'credential', label: 'Credential'},
  ]

  // Calculate tax percentage
  const taxPercent = invoice.taxExclusiveAmount > 0
    ? Math.round((invoice.taxAmount / invoice.taxExclusiveAmount) * 100)
    : 0

  const handleEvidenceClick = (evidence: InvoiceEvidence) => {
    if (onViewEvidence) {
      onViewEvidence(evidence)
    }
  }

  const handleDownloadClick = (e: React.MouseEvent, evidence: InvoiceEvidence) => {
    e.stopPropagation()
    if (onDownloadEvidence) {
      onDownloadEvidence(evidence)
    }
  }

  const handleFetchClick = (e: React.MouseEvent, evidence: InvoiceEvidence) => {
    e.stopPropagation()
    if (onFetchEvidence) {
      onFetchEvidence(evidence)
    }
  }

  const getStorageStatusInfo = (evidence: InvoiceEvidence): {label: string; variant: 'stored' | 'external' | 'fetching'} => {
    const status = evidence.storageStatus ?? 'external'
    switch (status) {
      case 'stored':
        return {label: 'Stored', variant: 'stored'}
      case 'fetching':
        return {label: 'Fetching...', variant: 'fetching'}
      case 'external':
      default:
        return {label: 'Not downloaded', variant: 'external'}
    }
  }

  const getEvidenceFileType = (evidence: InvoiceEvidence): string => {
    if (evidence.mimeType?.includes('xml')) return 'UBL'
    if (evidence.mimeType?.includes('pdf')) return 'PDF'
    if (evidence.mimeType?.includes('json')) return 'JSON'
    if (evidence.name.endsWith('.xml')) return 'UBL'
    if (evidence.name.endsWith('.pdf')) return 'PDF'
    return 'DOC'
  }

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const renderSummaryTab = () => (
    <>
      {/* Error Banner - only shown when validation fails */}
      {!isSignatureValid && (
        <div className={styles.verificationBanner}>
          <div className={styles.verificationIcon}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <div className={styles.verificationText}>
            <div className={styles.verificationTitle}>Credential Validation Failed</div>
            <div className={styles.verificationSubtitle}>
              The credential signature could not be verified
            </div>
          </div>
        </div>
      )}

      {/* Trading Partners - First section */}
      {(invoice.supplier || invoice.customer) && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Trading Partners</div>
          <div className={`${styles.grid} ${styles.gridTwoCol}`}>
            {invoice.supplier && (
              <div className={styles.partyCard}>
                <div className={styles.partyCardTitle}>Supplier</div>
                <div className={styles.partyCardName}>{invoice.supplier.name}</div>
                <div className={styles.partyCardDetail}>
                  {invoice.supplier.vatNumber && <>VAT: {invoice.supplier.vatNumber}<br /></>}
                  {invoice.supplier.address && (
                    <>
                      {invoice.supplier.address.street}<br />
                      {invoice.supplier.address.postalCode} {invoice.supplier.address.city}, {invoice.supplier.address.country}
                    </>
                  )}
                </div>
                {onViewContact && invoice.supplier.contactId && (
                  <button
                    className={styles.viewContactLink}
                    onClick={() => onViewContact(invoice.supplier!)}
                  >
                    View Contact →
                  </button>
                )}
              </div>
            )}
            {invoice.customer && (
              <div className={styles.partyCard}>
                <div className={styles.partyCardTitle}>Customer</div>
                <div className={styles.partyCardName}>{invoice.customer.name}</div>
                <div className={styles.partyCardDetail}>
                  {invoice.customer.vatNumber && <>VAT: {invoice.customer.vatNumber}<br /></>}
                  {invoice.customer.address && (
                    <>
                      {invoice.customer.address.street}<br />
                      {invoice.customer.address.postalCode} {invoice.customer.address.city}, {invoice.customer.address.country}
                    </>
                  )}
                </div>
                {onViewContact && invoice.customer.contactId && (
                  <button
                    className={styles.viewContactLink}
                    onClick={() => onViewContact(invoice.customer!)}
                  >
                    View Contact →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invoice Information */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Invoice Information</div>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Invoice ID</span>
            <span className={`${styles.fieldValue} ${styles.fieldValueHighlight}`}>{invoice.invoiceId}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Invoice Date</span>
            <span className={styles.fieldValue}>{formatDate(invoice.invoiceDate)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Due Date</span>
            <span className={styles.fieldValue}>{formatDate(invoice.dueDate)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Currency</span>
            <span className={styles.fieldValue}>{invoice.currencyCode}</span>
          </div>
          {invoice.invoiceType && (
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Invoice Type</span>
              <span className={styles.fieldValue}>{invoice.invoiceType}</span>
            </div>
          )}
          {invoice.paymentTerms && (
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Payment Terms</span>
              <span className={styles.fieldValue}>{invoice.paymentTerms}</span>
            </div>
          )}
        </div>
      </div>

      {/* Amount Summary */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Amount Summary</div>
        <div className={styles.amountsSummary}>
          <div className={styles.amountsRow}>
            <span className={styles.amountsLabel}>Tax Exclusive Amount</span>
            <span className={styles.amountsValue}>{formatCurrency(invoice.taxExclusiveAmount, invoice.currencyCode)}</span>
          </div>
          <div className={styles.amountsRow}>
            <span className={styles.amountsLabel}>Tax Amount ({taxPercent}% VAT)</span>
            <span className={styles.amountsValue}>{formatCurrency(invoice.taxAmount, invoice.currencyCode)}</span>
          </div>
          <div className={`${styles.amountsRow} ${styles.amountsRowTotal}`}>
            <span className={styles.amountsLabel}>Tax Inclusive Amount</span>
            <span className={styles.amountsValue}>{formatCurrency(invoice.taxInclusiveAmount, invoice.currencyCode)}</span>
          </div>
        </div>
      </div>

      {/* Evidence Documents Preview */}
      {invoice.evidence.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Evidence Documents</div>
          <div className={styles.evidenceList}>
            {invoice.evidence.slice(0, 2).map((evidence, index) => {
              const storageInfo = getStorageStatusInfo(evidence)
              return (
                <div
                  key={evidence.id || index}
                  className={styles.evidenceItem}
                  onClick={() => storageInfo.variant === 'stored' ? handleEvidenceClick(evidence) : undefined}
                >
                  <div className={styles.evidenceIcon}>{getEvidenceFileType(evidence)}</div>
                  <div className={styles.evidenceInfo}>
                    <div className={styles.evidenceName}>{evidence.name}</div>
                    <div className={styles.evidenceMeta}>
                      {evidence.description || evidence.type.join(', ')}
                      {evidence.size && ` - ${formatFileSize(evidence.size)}`}
                    </div>
                  </div>
                  <span className={`${styles.evidenceStatus} ${styles[storageInfo.variant]}`}>
                    {storageInfo.label}
                  </span>
                  <div className={styles.evidenceActions}>
                    {storageInfo.variant === 'external' && onFetchEvidence && (
                      <button
                        className={styles.evidenceActionBtn}
                        onClick={(e) => handleFetchClick(e, evidence)}
                      >
                        Fetch
                      </button>
                    )}
                    {storageInfo.variant === 'stored' && onDownloadEvidence && (
                      <button
                        className={styles.evidenceActionBtn}
                        onClick={(e) => handleDownloadClick(e, evidence)}
                      >
                        Download
                      </button>
                    )}
                    {storageInfo.variant === 'fetching' && (
                      <span className={styles.evidenceSpinner} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )

  const renderLineItemsTab = () => (
    <>
      {invoice.lineItems && invoice.lineItems.length > 0 ? (
        <>
          <table className={styles.lineItemsTable}>
            <thead>
              <tr>
                <th style={{width: '40px'}}>#</th>
                <th>Description</th>
                <th className={styles.textRight} style={{width: '80px'}}>Quantity</th>
                <th className={styles.textRight} style={{width: '100px'}}>Unit Price</th>
                <th className={styles.textRight} style={{width: '80px'}}>VAT %</th>
                <th className={styles.textRight} style={{width: '120px'}}>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item) => (
                <tr key={item.lineNumber}>
                  <td>{item.lineNumber}</td>
                  <td>
                    <div className={styles.lineItemDescription}>{item.description}</div>
                    {item.note && <div className={styles.lineItemNote}>{item.note}</div>}
                  </td>
                  <td className={styles.textRight}>{item.quantity} {item.quantityUnit}</td>
                  <td className={styles.textRight}>{formatCurrency(item.unitPrice, invoice.currencyCode)}</td>
                  <td className={styles.textRight}>{item.vatPercent}%</td>
                  <td className={`${styles.textRight} ${styles.lineItemTotal}`}>
                    {formatCurrency(item.lineTotal, invoice.currencyCode)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className={styles.lineItemsFooter}>
            <div className={`${styles.amountsSummary} ${styles.lineItemsSummary}`}>
              <div className={styles.amountsRow}>
                <span className={styles.amountsLabel}>Subtotal</span>
                <span className={styles.amountsValue}>{formatCurrency(invoice.taxExclusiveAmount, invoice.currencyCode)}</span>
              </div>
              <div className={styles.amountsRow}>
                <span className={styles.amountsLabel}>VAT {taxPercent}%</span>
                <span className={styles.amountsValue}>{formatCurrency(invoice.taxAmount, invoice.currencyCode)}</span>
              </div>
              <div className={`${styles.amountsRow} ${styles.amountsRowTotal}`}>
                <span className={styles.amountsLabel}>Total</span>
                <span className={styles.amountsValue}>{formatCurrency(invoice.taxInclusiveAmount, invoice.currencyCode)}</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className={styles.section}>
          <p style={{color: '#8D9099', textAlign: 'center', padding: '32px'}}>
            No line items available. Line item details are loaded from the UBL evidence document.
          </p>
        </div>
      )}
    </>
  )

  const buildPartyFields = (party: InvoiceParty): FieldItem[] => {
    const fields: FieldItem[] = []
    if (party.vatNumber) {
      fields.push({label: 'VAT Number', value: party.vatNumber})
    }
    if (party.chamberOfCommerce) {
      fields.push({label: 'Chamber of Commerce', value: party.chamberOfCommerce})
    }
    if (party.gln) {
      fields.push({label: 'GLN', value: party.gln})
    }
    if (party.iban) {
      fields.push({label: 'IBAN', value: party.iban})
    }
    if (party.email) {
      fields.push({label: 'Email', value: party.email})
    }
    if (party.address) {
      fields.push({
        label: 'Address',
        value: (
          <>
            {party.address.street}<br />
            {party.address.postalCode} {party.address.city}<br />
            {party.address.country}
          </>
        ),
      })
    }
    if (party.did) {
      fields.push({label: 'DID', value: truncateHash(party.did, 16), mono: true})
    }
    return fields
  }

  const renderPartiesTab = () => (
    <div className={`${styles.grid} ${styles.gridTwoCol}`}>
      <AccentCard title="Supplier" name={invoice.supplier?.name} accentColor="success">
        {invoice.supplier ? (
          <>
            <FieldList fields={buildPartyFields(invoice.supplier)} />
            {onViewContact && invoice.supplier.contactId && (
              <button
                className={styles.viewContactLink}
                onClick={() => onViewContact(invoice.supplier!)}
              >
                View Contact →
              </button>
            )}
          </>
        ) : (
          <div className={styles.emptyText}>No supplier information available</div>
        )}
      </AccentCard>

      <AccentCard title="Customer" name={invoice.customer?.name} accentColor="primary">
        {invoice.customer ? (
          <>
            <FieldList fields={buildPartyFields(invoice.customer)} />
            {onViewContact && invoice.customer.contactId && (
              <button
                className={styles.viewContactLink}
                onClick={() => onViewContact(invoice.customer!)}
              >
                View Contact →
              </button>
            )}
          </>
        ) : (
          <div className={styles.emptyText}>No customer information available</div>
        )}
      </AccentCard>
    </div>
  )

  const renderEvidenceTab = () => (
    <div className={styles.evidenceList}>
      {invoice.evidence.length > 0 ? (
        invoice.evidence.map((evidence, index) => {
          const storageInfo = getStorageStatusInfo(evidence)
          return (
            <div
              key={evidence.id || index}
              className={styles.evidenceItem}
              onClick={() => storageInfo.variant === 'stored' ? handleEvidenceClick(evidence) : undefined}
            >
              <div className={styles.evidenceIcon}>{getEvidenceFileType(evidence)}</div>
              <div className={styles.evidenceInfo}>
                <div className={styles.evidenceName}>{evidence.name}</div>
                <div className={styles.evidenceMeta}>
                  {evidence.description || evidence.type.join(', ')}
                  {evidence.size && ` - ${formatFileSize(evidence.size)}`}
                </div>
              </div>
              <span className={`${styles.evidenceStatus} ${styles[storageInfo.variant]}`}>
                {storageInfo.label}
              </span>
              <div className={styles.evidenceActions}>
                {storageInfo.variant === 'external' && onFetchEvidence && (
                  <button
                    className={styles.evidenceActionBtn}
                    onClick={(e) => handleFetchClick(e, evidence)}
                  >
                    Fetch
                  </button>
                )}
                {storageInfo.variant === 'stored' && onDownloadEvidence && (
                  <button
                    className={styles.evidenceActionBtn}
                    onClick={(e) => handleDownloadClick(e, evidence)}
                  >
                    Download
                  </button>
                )}
                {storageInfo.variant === 'fetching' && (
                  <span className={styles.evidenceSpinner} />
                )}
              </div>
            </div>
          )
        })
      ) : (
        <p style={{color: '#8D9099', textAlign: 'center', padding: '32px'}}>
          No evidence documents attached to this credential.
        </p>
      )}
    </div>
  )

  const getCredentialStatusEnum = (): CredentialStatus => {
    const status = invoice.credential?.status
    if (status === 'revoked') return CredentialStatus.REVOKED
    if (status === 'expired') return CredentialStatus.EXPIRED
    return CredentialStatus.VALID
  }

  const renderCredentialTab = () => (
    <>
      {/* Credential Card using reusable component */}
      <div className={styles.credentialCardContainer}>
        <CredentialViewItem
          credentialStatus={getCredentialStatusEnum()}
          issueDate={invoice.credential?.issuedAt ? new Date(invoice.credential.issuedAt).getTime() : Date.now()}
          expirationDate={invoice.credential?.expiresAt ? new Date(invoice.credential.expiresAt).getTime() : undefined}
          credentialTitle="eInvoice Credential"
          issuerName={invoice.credential?.issuerName ?? supplierName}
          showCard={true}
          credentialBranding={{
            backgroundColor: '#7276F7',
          }}
        />
      </div>

      {/* Credential Claims - using JSONDataView like generic credential details */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Verified Information</div>
        <div className={styles.jsonDataContainer}>
          <JSONDataView
            data={{
              type: invoice.credential?.vct ?? 'urn:org:fides:einvoice:1',
              issuer: {
                name: invoice.credential?.issuerName ?? supplierName,
                did: invoice.credential?.issuerDid,
              },
              invoiceId: invoice.invoiceId,
              invoiceDate: invoice.invoiceDate,
              dueDate: invoice.dueDate,
              currencyCode: invoice.currencyCode,
              taxExclusiveAmount: invoice.taxExclusiveAmount,
              taxAmount: invoice.taxAmount,
              taxInclusiveAmount: invoice.taxInclusiveAmount,
              ...(invoice.supplier && {
                supplier: {
                  name: invoice.supplier.name,
                  ...(invoice.supplier.vatNumber && {vatNumber: invoice.supplier.vatNumber}),
                  ...(invoice.supplier.did && {did: invoice.supplier.did}),
                },
              }),
              ...(invoice.customer && {
                customer: {
                  name: invoice.customer.name,
                  ...(invoice.customer.vatNumber && {vatNumber: invoice.customer.vatNumber}),
                  ...(invoice.customer.did && {did: invoice.customer.did}),
                },
              }),
              evidence: invoice.evidence.map(e => ({
                name: e.name,
                type: e.type,
                digestMultibase: e.digestMultibase,
              })),
            }}
            shouldExpandNodeInitially={true}
          />
        </div>
      </div>

      {/* Technical Details Collapsible */}
      {invoice.credential && (
        <div className={styles.technicalDetails}>
          <div
            className={styles.technicalDetailsHeader}
            onClick={() => setTechnicalDetailsExpanded(!technicalDetailsExpanded)}
          >
            <span className={styles.technicalDetailsTitle}>Technical Details</span>
            <svg
              className={`${styles.technicalDetailsChevron} ${technicalDetailsExpanded ? styles.expanded : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6,9 12,15 18,9" />
            </svg>
          </div>
          <div className={`${styles.technicalDetailsBody} ${!technicalDetailsExpanded ? styles.hidden : ''}`}>
            <div className={styles.technicalGrid}>
              <div className={styles.technicalField}>
                <span className={styles.technicalLabel}>Format</span>
                <span className={styles.technicalValue}>{invoice.credential.format}</span>
              </div>
              <div className={styles.technicalField}>
                <span className={styles.technicalLabel}>Algorithm</span>
                <span className={styles.technicalValue}>{invoice.credential.algorithm ?? 'Unknown'}</span>
              </div>
              <div className={`${styles.technicalField} ${styles.technicalFieldFull}`}>
                <span className={styles.technicalLabel}>Issuer DID</span>
                <span className={styles.technicalValue}>{invoice.credential.issuerDid}</span>
              </div>
              {invoice.credential.keyId && (
                <div className={`${styles.technicalField} ${styles.technicalFieldFull}`}>
                  <span className={styles.technicalLabel}>Key ID</span>
                  <span className={styles.technicalValue}>{invoice.credential.keyId}</span>
                </div>
              )}
              <div className={styles.technicalField}>
                <span className={styles.technicalLabel}>Issued At</span>
                <span className={styles.technicalValue}>{formatDate(invoice.credential.issuedAt)}</span>
              </div>
              {invoice.credential.expiresAt && (
                <div className={styles.technicalField}>
                  <span className={styles.technicalLabel}>Expires At</span>
                  <span className={styles.technicalValue}>{formatDate(invoice.credential.expiresAt)}</span>
                </div>
              )}
              <div className={styles.technicalField}>
                <span className={styles.technicalLabel}>Signature Valid</span>
                <span className={styles.technicalValue}>
                  {invoice.credential.signatureValid ? 'Yes' : 'No'}
                </span>
              </div>
              <div className={styles.technicalField}>
                <span className={styles.technicalLabel}>Status</span>
                <span className={styles.technicalValue}>{invoice.credential.status}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'summary':
        return renderSummaryTab()
      case 'lineItems':
        return renderLineItemsTab()
      case 'parties':
        return renderPartiesTab()
      case 'evidence':
        return renderEvidenceTab()
      case 'credential':
        return renderCredentialTab()
      default:
        return renderSummaryTab()
    }
  }

  return (
    <div className={`${styles.container} ${activeTab === 'lineItems' ? styles.containerWide : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <div className={styles.titleRow}>
            <div className={styles.title}>Invoice #{invoice.invoiceId}</div>
            <StatusBadge
              label={status === 'pending' ? 'Pending' : status === 'verified' ? 'Accepted' : status === 'invalid' ? 'Rejected' : status}
              variant={getStatusVariant(status)}
            />
          </div>
          <div className={styles.subtitle}>
            eInvoice Credential - {invoice.credential?.vct ?? 'urn:org:fides:einvoice:1'}
          </div>
        </div>
        <div className={styles.headerActions}>
          <StatusBadge
            label={isSignatureValid ? 'Verified' : 'Invalid'}
            variant={isSignatureValid ? 'valid' : 'error'}
          />
          {onClose && (
            <button className={styles.closeButton} onClick={onClose} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notice Banner for External Evidence */}
      {hasExternalEvidence && onFetchEvidence && (
        <div className={styles.noticeBanner}>
          <div className={styles.noticeIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </div>
          <div className={styles.noticeText}>
            <div className={styles.noticeTitle}>Evidence files not downloaded</div>
            <div className={styles.noticeSubtitle}>
              Only summary data from the credential is shown. Download {externalEvidence.length} evidence file{externalEvidence.length !== 1 ? 's' : ''} to view full invoice details including line items.
            </div>
          </div>
          <div className={styles.noticeActions}>
            <button
              className={styles.noticeButton}
              onClick={handleFetchAllEvidence}
              disabled={isFetchingAllEvidence}
            >
              {isFetchingAllEvidence && <span className={styles.noticeButtonSpinner} />}
              {isFetchingAllEvidence ? 'Downloading...' : 'Download Evidence'}
            </button>
          </div>
        </div>
      )}

      {/* Body */}
      <div className={styles.body}>
        {renderTabContent()}
      </div>

      {/* Action Buttons Footer */}
      {showActions && (
        <div className={styles.actionsFooter}>
          <button
            className={`${styles.actionButton} ${styles.actionButtonReject}`}
            onClick={() => onReject?.(invoice)}
            disabled={isProcessing}
          >
            {isProcessing ? <span className={styles.actionButtonSpinner} /> : null}
            Reject
          </button>
          <button
            className={`${styles.actionButton} ${styles.actionButtonApprove}`}
            onClick={() => onApprove?.(invoice)}
            disabled={isProcessing}
          >
            {isProcessing ? <span className={styles.actionButtonSpinner} /> : null}
            Approve
          </button>
        </div>
      )}
    </div>
  )
}

export default UBLInvoiceDetailView
