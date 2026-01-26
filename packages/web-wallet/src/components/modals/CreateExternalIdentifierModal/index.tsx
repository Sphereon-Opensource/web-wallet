import React, {FC, ReactElement, useCallback, useEffect, useState} from 'react'
import {HttpError, useCreate, useList, useTranslate} from '@refinedev/core'
import {CredentialRole} from '@sphereon/ssi-types'
import type {Party} from '@sphereon/ssi-sdk.data-store-types'
import {CreateExternalIdentifierData, DataResource} from '@typings'
import {isValidDid, isValidUrl} from '@/src/services/externalIdentifierService'
import style from './index.module.css'

export interface CreateExternalIdentifierModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  /** Pre-selected party ID (optional) */
  preSelectedPartyId?: string
}

type IdentifierType = 'DID' | 'URL'

const CreateExternalIdentifierModal: FC<CreateExternalIdentifierModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preSelectedPartyId,
}): ReactElement | null => {
  const translate = useTranslate()
  const {mutateAsync: createExternalIdentifier, isLoading} = useCreate<any, HttpError, CreateExternalIdentifierData>()

  // Form state
  const [value, setValue] = useState('')
  const [type, setType] = useState<IdentifierType>('DID')
  const [alias, setAlias] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<CredentialRole[]>([])
  const [selectedPartyId, setSelectedPartyId] = useState<string>(preSelectedPartyId || '')
  const [error, setError] = useState<string | null>(null)

  // Fetch contacts/parties for the dropdown (only when no preSelectedPartyId)
  const {data: partiesData} = useList<Party, HttpError>({
    resource: 'CONTACTS',
    queryOptions: {
      enabled: !preSelectedPartyId, // Don't fetch if party is pre-selected
    },
  })

  const parties = partiesData?.data || []

  // Find the pre-selected party name for display
  const preSelectedPartyName = preSelectedPartyId
    ? (parties.find(p => p.id === preSelectedPartyId)?.contact?.displayName || 'Selected contact')
    : undefined

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setValue('')
      setType('DID')
      setAlias('')
      setSelectedRoles([])
      setSelectedPartyId(preSelectedPartyId || '')
      setError(null)
    }
  }, [isOpen, preSelectedPartyId])

  // Validate the value based on type
  const validateValue = useCallback((): boolean => {
    if (!value.trim()) {
      setError(translate('external_identifier_error_value_required', 'Value is required'))
      return false
    }

    if (type === 'DID') {
      if (!isValidDid(value)) {
        setError(translate('external_identifier_error_invalid_did', 'Invalid DID format. Must start with "did:" followed by a method.'))
        return false
      }
    } else if (type === 'URL') {
      if (!isValidUrl(value)) {
        setError(translate('external_identifier_error_invalid_url', 'Invalid URL format. Must be a valid HTTP/HTTPS URL.'))
        return false
      }
    }

    if (!selectedPartyId) {
      setError(translate('external_identifier_error_contact_required', 'Please select a contact'))
      return false
    }

    setError(null)
    return true
  }, [value, type, selectedPartyId, translate])

  // Handle type change
  const handleTypeChange = useCallback((newType: IdentifierType) => {
    setType(newType)
    setError(null)
  }, [])

  // Handle role toggle
  const handleRoleToggle = useCallback((role: CredentialRole) => {
    setSelectedRoles(prev => {
      if (prev.includes(role)) {
        return prev.filter(r => r !== role)
      }
      return [...prev, role]
    })
  }, [])

  // Generate a default alias from the value
  const generateDefaultAlias = useCallback((val: string, identifierType: IdentifierType): string => {
    if (identifierType === 'DID') {
      // Extract method from DID (e.g., "did:web:example.com" -> "web:example.com")
      const parts = val.split(':')
      if (parts.length >= 3) {
        return parts.slice(1).join(':')
      }
      return val
    } else {
      // Use hostname for URL
      try {
        const url = new URL(val)
        return url.hostname
      } catch {
        return val
      }
    }
  }, [])

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!validateValue()) {
      return
    }

    // Use provided alias or generate one from the value (backend requires non-blank alias)
    const finalAlias = alias.trim() || generateDefaultAlias(value.trim(), type)

    try {
      await createExternalIdentifier({
        resource: DataResource.EXTERNAL_IDENTIFIERS,
        values: {
          value: value.trim(),
          type,
          alias: finalAlias,
          roles: selectedRoles.length > 0 ? selectedRoles : undefined,
          partyId: selectedPartyId,
        },
      })
      onSuccess()
    } catch (err) {
      console.error('Failed to create external identifier:', err)
      setError(translate('external_identifier_error_create_failed', 'Failed to create external identifier'))
    }
  }, [value, type, alias, selectedRoles, selectedPartyId, validateValue, createExternalIdentifier, onSuccess, translate, generateDefaultAlias])

  // Handle overlay click
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose()
    }
  }, [onClose, isLoading])

  // Handle escape key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading) {
      onClose()
    }
  }, [onClose, isLoading])

  if (!isOpen) return null

  return (
    <div
      className={style.overlay}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-external-identifier-title"
      tabIndex={-1}
    >
      <div className={style.modal}>
        {/* Header */}
        <div className={style.header}>
          <h2 id="create-external-identifier-title" className={style.title}>
            {translate('external_identifier_create_title', 'Add External Identifier')}
          </h2>
          <button
            type="button"
            className={style.closeButton}
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className={style.body}>
          {/* Type Toggle */}
          <div className={style.formGroup}>
            <label className={style.label}>
              {translate('external_identifier_type_label', 'Type')}
            </label>
            <div className={style.typeToggle}>
              <button
                type="button"
                className={`${style.typeButton} ${type === 'DID' ? style.typeButtonActive : ''}`}
                onClick={() => handleTypeChange('DID')}
              >
                DID
              </button>
              <button
                type="button"
                className={`${style.typeButton} ${type === 'URL' ? style.typeButtonActive : ''}`}
                onClick={() => handleTypeChange('URL')}
              >
                URL
              </button>
            </div>
          </div>

          {/* Value Input */}
          <div className={style.formGroup}>
            <label className={style.label} htmlFor="identifier-value">
              {type === 'DID'
                ? translate('external_identifier_did_label', 'DID Value')
                : translate('external_identifier_url_label', 'URL Value')}
              <span className={style.required}>*</span>
            </label>
            <input
              id="identifier-value"
              type="text"
              className={style.input}
              value={value}
              onChange={e => {
                setValue(e.target.value)
                setError(null)
              }}
              placeholder={
                type === 'DID'
                  ? 'did:web:example.com'
                  : 'https://example.com/issuer'
              }
            />
          </div>

          {/* Alias Input */}
          <div className={style.formGroup}>
            <label className={style.label} htmlFor="identifier-alias">
              {translate('external_identifier_alias_label', 'Alias')}
              <span className={style.optional}>
                {translate('external_identifier_optional', '(optional)')}
              </span>
            </label>
            <input
              id="identifier-alias"
              type="text"
              className={style.input}
              value={alias}
              onChange={e => setAlias(e.target.value)}
              placeholder={translate('external_identifier_alias_placeholder', 'Friendly name for this identifier')}
            />
          </div>

          {/* Contact Select - show dropdown only when not pre-selected */}
          {preSelectedPartyId ? (
            <div className={style.formGroup}>
              <label className={style.label}>
                {translate('external_identifier_contact_label', 'Associate with Contact')}
              </label>
              <div className={style.preSelectedContact}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>{translate('external_identifier_current_contact', 'Current contact')}</span>
              </div>
            </div>
          ) : (
            <div className={style.formGroup}>
              <label className={style.label} htmlFor="identifier-contact">
                {translate('external_identifier_contact_label', 'Associate with Contact')}
                <span className={style.required}>*</span>
              </label>
              <select
                id="identifier-contact"
                className={style.select}
                value={selectedPartyId}
                onChange={e => {
                  setSelectedPartyId(e.target.value)
                  setError(null)
                }}
              >
                <option value="">
                  {translate('external_identifier_select_contact', 'Select a contact...')}
                </option>
                {parties.map(party => (
                  <option key={party.id} value={party.id}>
                    {party.contact?.displayName || (party.contact as any)?.legalName || party.id}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Roles Checkboxes */}
          <div className={style.formGroup}>
            <label className={style.label}>
              {translate('external_identifier_roles_label', 'Roles')}
              <span className={style.optional}>
                {translate('external_identifier_optional', '(optional)')}
              </span>
            </label>
            <div className={style.rolesContainer}>
              <label className={style.roleCheckbox}>
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(CredentialRole.ISSUER)}
                  onChange={() => handleRoleToggle(CredentialRole.ISSUER)}
                />
                <span className={`${style.roleLabel} ${style.issuer}`}>Issuer</span>
              </label>
              <label className={style.roleCheckbox}>
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(CredentialRole.VERIFIER)}
                  onChange={() => handleRoleToggle(CredentialRole.VERIFIER)}
                />
                <span className={`${style.roleLabel} ${style.verifier}`}>Verifier</span>
              </label>
              <label className={style.roleCheckbox}>
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(CredentialRole.HOLDER)}
                  onChange={() => handleRoleToggle(CredentialRole.HOLDER)}
                />
                <span className={`${style.roleLabel} ${style.holder}`}>Holder</span>
              </label>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className={style.errorMessage}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={style.footer}>
          <button
            type="button"
            className={style.cancelButton}
            onClick={onClose}
            disabled={isLoading}
          >
            {translate('action_cancel', 'Cancel')}
          </button>
          <button
            type="button"
            className={style.submitButton}
            onClick={handleSubmit}
            disabled={isLoading || !value.trim() || !selectedPartyId}
          >
            {isLoading ? (
              <>
                <span className={style.spinner} />
                {translate('action_creating', 'Creating...')}
              </>
            ) : (
              translate('action_create', 'Create')
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreateExternalIdentifierModal
