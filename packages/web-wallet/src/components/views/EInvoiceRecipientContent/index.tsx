import React, {FC, ReactElement, useState, useEffect, useCallback} from 'react'
import {useTranslate} from '@refinedev/core'
import {useEInvoiceOutletContext, EInvoiceRecipient} from '@machines/einvoice/eInvoiceCreateStateNavigation'
import {
  fetchContacts,
  resolveRecipient,
  matchContactByName,
  getServiceTypeLabel,
  ContactParty,
  ResolvedRecipient,
} from '@/src/services/recipientService'
import style from './index.module.css'

const EInvoiceRecipientContent: FC = (): ReactElement => {
  const translate = useTranslate()
  const {
    recipient,
    onRecipientChange,
    onSelectEndpoint,
    isResolvingRecipient,
    setIsResolvingRecipient,
    recipientError,
    setRecipientError,
    formData,
  } = useEInvoiceOutletContext()

  // Local state
  const [contacts, setContacts] = useState<ContactParty[]>([])
  const [isLoadingContacts, setIsLoadingContacts] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [resolvedRecipient, setResolvedRecipient] = useState<ResolvedRecipient | null>(null)
  const [autoMatchAttempted, setAutoMatchAttempted] = useState(false)

  // Load contacts on mount
  useEffect(() => {
    const loadContacts = async () => {
      setIsLoadingContacts(true)
      try {
        const contactList = await fetchContacts()
        setContacts(contactList)
      } catch (error) {
        console.error('Failed to load contacts:', error)
      } finally {
        setIsLoadingContacts(false)
      }
    }
    loadContacts()
  }, [])

  // Auto-match contact based on buyer name from UBL (only once)
  useEffect(() => {
    const tryAutoMatch = async () => {
      if (autoMatchAttempted || recipient || !formData.buyerName || contacts.length === 0) {
        return
      }
      setAutoMatchAttempted(true)

      try {
        const matchedContact = await matchContactByName(formData.buyerName)
        if (matchedContact) {
          await handleSelectContact(matchedContact)
        }
      } catch (error) {
        console.error('Auto-match failed:', error)
      }
    }
    tryAutoMatch()
  }, [formData.buyerName, contacts, autoMatchAttempted, recipient])

  // Handle contact selection
  const handleSelectContact = useCallback(
    async (contact: ContactParty) => {
      setShowDropdown(false)
      setSearchQuery(contact.displayName || contact.organizationName || '')
      setIsResolvingRecipient(true)
      setRecipientError(undefined)

      try {
        const resolved = await resolveRecipient(contact)
        setResolvedRecipient(resolved)

        if (resolved.error) {
          setRecipientError(resolved.error)
          onRecipientChange(undefined)
          return
        }

        // Create recipient object with endpoints
        const newRecipient: EInvoiceRecipient = {
          did: resolved.did,
          name: contact.displayName,
          organizationName: contact.organizationName,
          contactId: contact.id,
          endpoints: resolved.endpoints.map((ep) => ({
            id: ep.id,
            serviceType: ep.serviceType,
            serviceEndpoint: ep.serviceEndpoint,
            description: ep.description,
            entityName: ep.entityName,
            country: ep.country,
          })),
          selectedEndpointId: resolved.selectedEndpointId,
          inboxEndpoint: resolved.endpoints.find((e) => e.id === resolved.selectedEndpointId)?.serviceEndpoint,
        }

        onRecipientChange(newRecipient)
      } catch (error) {
        console.error('Failed to resolve recipient:', error)
        setRecipientError('Failed to resolve recipient DID')
        onRecipientChange(undefined)
      } finally {
        setIsResolvingRecipient(false)
      }
    },
    [onRecipientChange, setIsResolvingRecipient, setRecipientError]
  )

  // Handle clearing recipient
  const handleClear = useCallback(() => {
    setSearchQuery('')
    setResolvedRecipient(null)
    onRecipientChange(undefined)
    setRecipientError(undefined)
  }, [onRecipientChange, setRecipientError])

  // Filter contacts based on search query
  const filteredContacts = contacts.filter((contact) => {
    const query = searchQuery.toLowerCase()
    return (
      contact.displayName?.toLowerCase().includes(query) ||
      contact.organizationName?.toLowerCase().includes(query) ||
      contact.legalName?.toLowerCase().includes(query) ||
      contact.email?.toLowerCase().includes(query)
    )
  })

  // Render contact dropdown item
  const renderContactItem = (contact: ContactParty) => (
    <button key={contact.id} className={style.contactItem} onClick={() => handleSelectContact(contact)} type="button">
      <div className={style.contactAvatar}>{(contact.displayName || contact.organizationName || '?')[0].toUpperCase()}</div>
      <div className={style.contactInfo}>
        <span className={style.contactName}>{contact.displayName || contact.organizationName || 'Unknown'}</span>
        {contact.organizationName && contact.displayName !== contact.organizationName && (
          <span className={style.contactOrg}>{contact.organizationName}</span>
        )}
        {contact.did && <span className={style.contactDid}>{contact.did}</span>}
      </div>
    </button>
  )

  // Helper to extract URL from serviceEndpoint (can be string or object)
  const getEndpointUrl = (serviceEndpoint: string | Record<string, unknown>): string => {
    if (typeof serviceEndpoint === 'string') return serviceEndpoint
    if (serviceEndpoint && typeof serviceEndpoint === 'object' && 'url' in serviceEndpoint) {
      return serviceEndpoint.url as string
    }
    return ''
  }

  // Render endpoint selection
  const renderEndpointSelection = () => {
    if (!recipient || recipient.endpoints.length === 0) return null

    return (
      <div className={style.endpointSection}>
        <h4 className={style.endpointTitle}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          {translate('einvoice_select_endpoint', 'Select Delivery Method')}
        </h4>
        <p className={style.endpointDescription}>
          {recipient.endpoints.length === 1
            ? translate('einvoice_single_endpoint', 'This contact has one eInvoicing endpoint available.')
            : translate('einvoice_multiple_endpoints', 'This contact has multiple eInvoicing endpoints. Select your preferred delivery method.')}
        </p>
        <div className={style.endpointList}>
          {recipient.endpoints.map((endpoint) => {
            const isSelected = recipient.selectedEndpointId === endpoint.id
            const url = getEndpointUrl(endpoint.serviceEndpoint as string | Record<string, unknown>)
            return (
              <button
                key={endpoint.id}
                className={`${style.endpointCard} ${isSelected ? style.endpointCardSelected : ''}`}
                onClick={() => onSelectEndpoint(endpoint.id)}
                type="button">
                <div className={style.endpointHeader}>
                  <div className={style.endpointTypeBadge}>{getServiceTypeLabel(endpoint.serviceType as any)}</div>
                  {isSelected && (
                    <div className={style.selectedBadge}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {translate('action_selected_label', 'Selected')}
                    </div>
                  )}
                </div>
                <div className={style.endpointDetails}>
                  {endpoint.entityName && <span className={style.endpointEntity}>{endpoint.entityName}</span>}
                  {endpoint.country && <span className={style.endpointCountry}>{endpoint.country}</span>}
                  {url && <span className={style.endpointUrl}>{url}</span>}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className={style.container}>
      <div className={style.header}>
        <h3 className={style.sectionTitle}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
          {translate('einvoice_recipient_title', 'Select Recipient')}
        </h3>
        <p className={style.description}>
          {translate(
            'einvoice_recipient_description',
            'Select a contact from your address book to send the eInvoice. The system will verify their eInvoicing capabilities.'
          )}
        </p>
      </div>

      {/* Info Box */}
      <div className={style.infoBox}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>
          {translate(
            'einvoice_recipient_info',
            'The recipient must have eInvoicing services configured in their DID document. Contacts without eInvoicing capabilities cannot receive invoices through this system.'
          )}
        </span>
      </div>

      {/* Contact Search/Selection */}
      {!recipient && (
        <div className={style.searchSection}>
          <label className={style.searchLabel}>{translate('einvoice_search_contacts', 'Search Contacts')}</label>
          <div className={style.searchContainer}>
            <div className={style.searchInputWrapper}>
              <svg className={style.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className={style.searchInput}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setShowDropdown(true)
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder={translate('einvoice_search_placeholder', 'Search by name, organization, or email...')}
                disabled={isResolvingRecipient || isLoadingContacts}
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  className={style.clearSearchButton}
                  onClick={() => {
                    setSearchQuery('')
                    setShowDropdown(false)
                  }}
                  type="button">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            {/* Contact Dropdown */}
            {showDropdown && !isResolvingRecipient && (
              <div className={style.dropdown}>
                {isLoadingContacts ? (
                  <div className={style.dropdownLoading}>
                    <div className={style.spinner} />
                    <span>{translate('einvoice_loading_contacts', 'Loading contacts...')}</span>
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className={style.dropdownEmpty}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="8" y1="15" x2="16" y2="15" />
                      <line x1="9" y1="9" x2="9.01" y2="9" />
                      <line x1="15" y1="9" x2="15.01" y2="9" />
                    </svg>
                    <span>
                      {searchQuery
                        ? translate('einvoice_no_matching_contacts', 'No contacts match your search')
                        : translate('einvoice_no_contacts', 'No contacts with DIDs found')}
                    </span>
                  </div>
                ) : (
                  <div className={style.contactList}>{filteredContacts.slice(0, 10).map(renderContactItem)}</div>
                )}
              </div>
            )}
          </div>

          {/* Click outside to close dropdown */}
          {showDropdown && <div className={style.dropdownBackdrop} onClick={() => setShowDropdown(false)} />}
        </div>
      )}

      {/* Loading State */}
      {isResolvingRecipient && (
        <div className={style.loadingIndicator}>
          <div className={style.spinner} />
          <span>{translate('einvoice_resolving_did', 'Resolving DID and discovering eInvoicing endpoints...')}</span>
        </div>
      )}

      {/* Warning/Error Message when DID resolution fails or no endpoints */}
      {recipientError && (
        <div className={style.warningCard}>
          <div className={style.warningIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className={style.warningContent}>
            <span className={style.warningTitle}>{translate('einvoice_recipient_warning', 'Cannot Send to This Recipient')}</span>
            <span className={style.warningText}>{recipientError}</span>
          </div>
          <button className={style.warningAction} onClick={handleClear} type="button">
            {translate('action_try_another', 'Select Different Contact')}
          </button>
        </div>
      )}

      {/* Selected Recipient Card */}
      {recipient && !recipientError && (
        <div className={style.recipientCard}>
          <div className={style.recipientHeader}>
            <div className={style.recipientBadge}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              {translate('einvoice_recipient_verified', 'Recipient Verified')}
            </div>
            <button className={style.clearButton} onClick={handleClear} type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              {translate('action_change_label', 'Change')}
            </button>
          </div>

          <div className={style.recipientBody}>
            <div className={style.recipientAvatar}>{(recipient.name || recipient.organizationName || '?')[0].toUpperCase()}</div>
            <div className={style.recipientDetails}>
              <span className={style.recipientName}>{recipient.name || recipient.organizationName}</span>
              {recipient.organizationName && recipient.name !== recipient.organizationName && (
                <span className={style.recipientOrg}>{recipient.organizationName}</span>
              )}
              <span className={style.recipientDid}>{recipient.did}</span>
            </div>
          </div>

          {/* Endpoint count summary */}
          <div className={style.recipientEndpointSummary}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <span>
              {recipient.endpoints.length === 1
                ? translate('einvoice_one_endpoint_available', '1 eInvoicing endpoint available')
                : translate('einvoice_endpoints_available', '{count} eInvoicing endpoints available').replace(
                    '{count}',
                    String(recipient.endpoints.length)
                  )}
            </span>
          </div>
        </div>
      )}

      {/* Endpoint Selection */}
      {renderEndpointSelection()}
    </div>
  )
}

export default EInvoiceRecipientContent
