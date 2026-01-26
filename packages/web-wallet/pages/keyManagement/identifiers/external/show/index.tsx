import React, {FC, ReactElement, useCallback, useMemo, useState} from 'react'
import {useParams, useNavigate} from 'react-router-dom'
import {HttpError, useDelete, useOne, useUpdate, useList, useTranslation} from '@refinedev/core'
import type {Party} from '@sphereon/ssi-sdk.data-store-types'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import {RoleBadges} from '@components/badges'
import ConfirmDeleteModal, {useConfirmDelete} from '@components/modals/ConfirmDeleteModal'
import {staticPropsWithSST} from '@/src/i18n/server'
import {DataResource, ExternalIdentifierItem, UpdateExternalIdentifierData} from '@typings'
import {CredentialRole} from '@sphereon/ssi-types'
import {isValidDid, isValidUrl} from '@/src/services/externalIdentifierService'
import style from './index.module.css'

enum TabRoute {
  OVERVIEW = 'overview',
  ROLES = 'roles',
  CONTACT = 'contact',
}

const ShowExternalIdentifierDetails: FC = (): ReactElement => {
  const {translate} = useTranslation()
  const params = useParams()
  const navigate = useNavigate()
  const {id} = params
  const decodedId = id ? decodeURIComponent(id) : ''

  const [activeTab, setActiveTab] = useState<TabRoute>(TabRoute.OVERVIEW)
  const [isEditingAlias, setIsEditingAlias] = useState(false)
  const [editedAlias, setEditedAlias] = useState('')
  const [isEditingRoles, setIsEditingRoles] = useState(false)
  const [editedRoles, setEditedRoles] = useState<CredentialRole[]>([])
  const [isChangingContact, setIsChangingContact] = useState(false)
  const [selectedContactId, setSelectedContactId] = useState<string>('')

  const {
    isLoading,
    isError,
    data: identifierData,
    refetch,
  } = useOne<ExternalIdentifierItem, HttpError>({
    resource: DataResource.EXTERNAL_IDENTIFIERS,
    id: decodedId,
  })

  const {mutateAsync: updateIdentifier, isLoading: isUpdating} = useUpdate<ExternalIdentifierItem, HttpError, UpdateExternalIdentifierData>()
  const {mutateAsync: deleteIdentifier} = useDelete<ExternalIdentifierItem, HttpError>()

  // Fetch contacts for contact change dropdown
  const {data: partiesData} = useList<Party, HttpError>({
    resource: 'CONTACTS',
  })

  const parties = partiesData?.data || []

  const identifier = identifierData?.data

  // Delete confirmation
  const singleDelete = useConfirmDelete({
    onConfirm: async () => {
      await deleteIdentifier({
        resource: DataResource.EXTERNAL_IDENTIFIERS,
        id: decodedId,
      })
      navigate('/key-management/identifiers')
    },
    onError: (err) => {
      console.error('Failed to delete identifier:', err)
    },
  })

  // Copy to clipboard
  const handleCopyValue = useCallback(() => {
    if (!identifier?.value) return
    navigator.clipboard.writeText(identifier.value)
  }, [identifier?.value])

  // Navigate to contact
  const handleNavigateToContact = useCallback(() => {
    if (!identifier?.partyId) return
    navigate(`/contacts/${identifier.partyId}`)
  }, [identifier?.partyId, navigate])

  // Start editing alias
  const handleStartEditAlias = useCallback(() => {
    if (!identifier) return
    setEditedAlias(identifier.alias || '')
    setIsEditingAlias(true)
  }, [identifier])

  // Save alias
  const handleSaveAlias = useCallback(async () => {
    if (!identifier) return

    try {
      await updateIdentifier({
        resource: DataResource.EXTERNAL_IDENTIFIERS,
        id: decodedId,
        values: {
          alias: editedAlias.trim() || undefined,
        },
      })
      setIsEditingAlias(false)
      await refetch()
    } catch (error) {
      console.error('Failed to update alias:', error)
    }
  }, [identifier, decodedId, editedAlias, updateIdentifier, refetch])

  // Start editing roles
  const handleStartEditRoles = useCallback(() => {
    if (!identifier) return
    setEditedRoles([...(identifier.roles || [])])
    setIsEditingRoles(true)
  }, [identifier])

  // Toggle role in edit mode
  const handleToggleRole = useCallback((role: CredentialRole) => {
    setEditedRoles(prev => {
      if (prev.includes(role)) {
        return prev.filter(r => r !== role)
      }
      return [...prev, role]
    })
  }, [])

  // Save roles
  const handleSaveRoles = useCallback(async () => {
    if (!identifier) return

    try {
      await updateIdentifier({
        resource: DataResource.EXTERNAL_IDENTIFIERS,
        id: decodedId,
        values: {
          roles: editedRoles,
        },
      })
      setIsEditingRoles(false)
      await refetch()
    } catch (error) {
      console.error('Failed to update roles:', error)
    }
  }, [identifier, decodedId, editedRoles, updateIdentifier, refetch])

  // Start changing contact
  const handleStartChangeContact = useCallback(() => {
    if (!identifier) return
    setSelectedContactId(identifier.partyId || '')
    setIsChangingContact(true)
  }, [identifier])

  // Save contact change
  const handleSaveContact = useCallback(async () => {
    if (!identifier || !selectedContactId) return

    try {
      await updateIdentifier({
        resource: DataResource.EXTERNAL_IDENTIFIERS,
        id: decodedId,
        values: {
          partyId: selectedContactId,
        },
      })
      setIsChangingContact(false)
      await refetch()
    } catch (error) {
      console.error('Failed to update contact:', error)
    }
  }, [identifier, decodedId, selectedContactId, updateIdentifier, refetch])

  // Handle delete
  const handleDelete = useCallback(() => {
    if (!identifier) return
    singleDelete.openModal(decodedId, identifier.alias || identifier.method)
  }, [identifier, decodedId, singleDelete])

  // Extract method for display
  const displayMethod = useMemo(() => {
    if (!identifier) return ''
    return identifier.method
  }, [identifier])

  // Build tabs
  const tabs: {id: TabRoute; label: string}[] = [
    {id: TabRoute.OVERVIEW, label: translate('external_identifier_overview_tab', 'Overview') as string},
    {id: TabRoute.ROLES, label: translate('external_identifier_roles_tab', 'Roles') as string},
    {id: TabRoute.CONTACT, label: translate('external_identifier_contact_tab', 'Contact') as string},
  ]

  if (isLoading) {
    return (
      <div className={style.pageContainer}>
        <PageHeaderBar path={translate('external_identifier_path_label', 'Key Management / Identifiers / External')} />
        <div className={style.loadingState}>
          <div className={style.spinner} />
          <span>{translate('data_provider_loading_message', 'Loading...')}</span>
        </div>
      </div>
    )
  }

  if (isError || !identifier) {
    return (
      <div className={style.pageContainer}>
        <PageHeaderBar path={translate('external_identifier_path_label', 'Key Management / Identifiers / External')} />
        <div className={style.errorBanner}>{translate('data_provider_error_message', 'Failed to load data')}</div>
      </div>
    )
  }

  const getOverviewContent = (): ReactElement => {
    return (
      <div className={style.overviewContent}>
        {/* Identifier Card */}
        <div className={style.identifierCard}>
          <div className={style.identifierCardHeader}>
            <div className={style.identifierIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <div className={style.identifierInfo}>
              <span className={style.identifierAlias}>{identifier.alias || displayMethod}</span>
              <span className={style.identifierMethod}>{displayMethod}</span>
            </div>
            <span className={style.typeBadge}>{identifier.type}</span>
          </div>
        </div>

        {/* Metadata Section */}
        <div className={style.metadataSection}>
          <div className={style.metadataBorder} />
          <div className={style.metadataContent}>
            <div className={style.metadataTitle}>{translate('external_identifier_information', 'Information')}</div>
            <div className={style.metadataRow}>
              <span className={style.metadataLabel}>{translate('external_identifier_type', 'Type')}</span>
              <span className={style.metadataValue}>{identifier.type}</span>
            </div>
            <div className={style.metadataRow}>
              <span className={style.metadataLabel}>{translate('external_identifier_method', 'Method')}</span>
              <span className={style.metadataValue}>{displayMethod}</span>
            </div>
            <div className={style.metadataRow}>
              <span className={style.metadataLabel}>{translate('external_identifier_alias', 'Alias')}</span>
              {isEditingAlias ? (
                <div className={style.inlineEdit}>
                  <input
                    type="text"
                    className={style.inlineInput}
                    value={editedAlias}
                    onChange={e => setEditedAlias(e.target.value)}
                    autoFocus
                  />
                  <button className={style.saveButton} onClick={handleSaveAlias} disabled={isUpdating}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                  <button className={style.cancelEditButton} onClick={() => setIsEditingAlias(false)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className={style.editableValue}>
                  <span className={style.metadataValue}>{identifier.alias || '-'}</span>
                  <button className={style.editButton} onClick={handleStartEditAlias}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <div className={style.metadataRow}>
              <span className={style.metadataLabel}>{translate('external_identifier_origin', 'Origin')}</span>
              <span className={`${style.originBadge} ${identifier.origin === 'External' ? style.originExternal : style.originInternal}`}>
                {identifier.origin}
              </span>
            </div>
          </div>
        </div>

        {/* Value Section */}
        <div className={style.valueSection}>
          <div className={style.valueTitle}>
            {identifier.type === 'URL'
              ? translate('external_identifier_url_value', 'URL Value')
              : translate('external_identifier_did_value', 'DID Value')}
          </div>
          <div className={style.valueFullValue}>{identifier.value}</div>
          <button className={style.copyButton} onClick={handleCopyValue}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            {translate('action_copy', 'Copy')}
          </button>
        </div>
      </div>
    )
  }

  const getRolesContent = (): ReactElement => {
    return (
      <div className={style.tabContent}>
        <div className={style.sectionHeader}>
          <h3 className={style.sectionTitle}>{translate('external_identifier_roles_title', 'Roles')}</h3>
          {!isEditingRoles && (
            <button className={style.editButton} onClick={handleStartEditRoles}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
              {translate('action_edit', 'Edit')}
            </button>
          )}
        </div>

        {isEditingRoles ? (
          <div className={style.rolesEditForm}>
            <div className={style.rolesCheckboxGroup}>
              <label className={style.roleCheckbox}>
                <input
                  type="checkbox"
                  checked={editedRoles.includes(CredentialRole.ISSUER)}
                  onChange={() => handleToggleRole(CredentialRole.ISSUER)}
                />
                <span className={`${style.roleLabel} ${style.issuer}`}>Issuer</span>
              </label>
              <label className={style.roleCheckbox}>
                <input
                  type="checkbox"
                  checked={editedRoles.includes(CredentialRole.VERIFIER)}
                  onChange={() => handleToggleRole(CredentialRole.VERIFIER)}
                />
                <span className={`${style.roleLabel} ${style.verifier}`}>Verifier</span>
              </label>
              <label className={style.roleCheckbox}>
                <input
                  type="checkbox"
                  checked={editedRoles.includes(CredentialRole.HOLDER)}
                  onChange={() => handleToggleRole(CredentialRole.HOLDER)}
                />
                <span className={`${style.roleLabel} ${style.holder}`}>Holder</span>
              </label>
            </div>
            <div className={style.formActions}>
              <button className={style.cancelButton} onClick={() => setIsEditingRoles(false)}>
                {translate('action_cancel', 'Cancel')}
              </button>
              <button className={style.saveButton} onClick={handleSaveRoles} disabled={isUpdating}>
                {translate('action_save', 'Save')}
              </button>
            </div>
          </div>
        ) : (
          <div className={style.rolesDisplay}>
            {identifier.roles && identifier.roles.length > 0 ? (
              <RoleBadges roles={identifier.roles} size="default" />
            ) : (
              <div className={style.emptyText}>{translate('external_identifier_no_roles', 'No roles assigned')}</div>
            )}
          </div>
        )}
      </div>
    )
  }

  const getContactContent = (): ReactElement => {
    return (
      <div className={style.tabContent}>
        <div className={style.sectionHeader}>
          <h3 className={style.sectionTitle}>{translate('external_identifier_associated_contact', 'Associated Contact')}</h3>
          {!isChangingContact && (
            <button className={style.editButton} onClick={handleStartChangeContact}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
              {translate('action_change', 'Change')}
            </button>
          )}
        </div>

        {isChangingContact ? (
          <div className={style.contactChangeForm}>
            <label className={style.formLabel}>{translate('external_identifier_select_contact', 'Select Contact')}</label>
            <select
              className={style.formSelect}
              value={selectedContactId}
              onChange={e => setSelectedContactId(e.target.value)}
            >
              <option value="">{translate('external_identifier_no_contact', 'No contact')}</option>
              {parties.map(party => (
                <option key={party.id} value={party.id}>
                  {party.contact?.displayName || (party.contact as any)?.legalName || party.id}
                </option>
              ))}
            </select>
            <div className={style.formActions}>
              <button className={style.cancelButton} onClick={() => setIsChangingContact(false)}>
                {translate('action_cancel', 'Cancel')}
              </button>
              <button
                className={style.saveButton}
                onClick={handleSaveContact}
                disabled={isUpdating || !selectedContactId}
              >
                {translate('action_save', 'Save')}
              </button>
            </div>
          </div>
        ) : identifier.partyName ? (
          <div className={style.contactCard} onClick={handleNavigateToContact}>
            <div className={style.contactCardHeader}>
              <div className={style.contactAvatar}>{identifier.partyName[0].toUpperCase()}</div>
              <div className={style.contactInfo}>
                <span className={style.contactName}>{identifier.partyName}</span>
                <span className={style.contactHint}>{translate('action_click_to_view', 'Click to view')}</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </div>
          </div>
        ) : (
          <div className={style.noContactContainer}>
            <div className={style.noContactIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className={style.noContactText}>
              {translate('external_identifier_no_contact_associated', 'No contact associated')}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderTabContent = (): ReactElement => {
    switch (activeTab) {
      case TabRoute.OVERVIEW:
        return getOverviewContent()
      case TabRoute.ROLES:
        return getRolesContent()
      case TabRoute.CONTACT:
        return getContactContent()
      default:
        return getOverviewContent()
    }
  }

  return (
    <div className={style.pageContainer}>
      <PageHeaderBar path={translate('external_identifier_path_label', 'Key Management / Identifiers / External')} />
      <div className={style.container}>
        {/* Header */}
        <div className={style.header}>
          <div className={style.titleSection}>
            <div className={style.titleRow}>
              <div className={style.title}>{identifier.alias || displayMethod}</div>
              <span className={style.typeBadge}>{identifier.type}</span>
              <span className={`${style.originBadge} ${identifier.origin === 'External' ? style.originExternal : style.originInternal}`}>
                {identifier.origin}
              </span>
            </div>
            <div className={style.subtitle}>{identifier.value}</div>
          </div>
          <div className={style.headerActions}>
            <button className={style.deleteButton} onClick={handleDelete}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              {translate('action_delete', 'Delete')}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={style.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`${style.tab} ${activeTab === tab.id ? style.tabActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className={style.tabLabel}>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className={style.body}>
          {renderTabContent()}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={singleDelete.isOpen}
        title={translate('external_identifier_delete_title', 'Delete External Identifier')}
        message={translate('external_identifier_delete_message', 'Are you sure you want to delete "{name}"? This action cannot be undone.')}
        itemName={singleDelete.itemName || undefined}
        onCancel={singleDelete.closeModal}
        onConfirm={singleDelete.handleConfirm}
        isLoading={singleDelete.isLoading}
        cancelText={translate('action_cancel', 'Cancel')}
        confirmText={translate('action_delete', 'Delete')}
      />
    </div>
  )
}

export const getStaticProps = async ({locale = 'en'}: {locale?: string}) => staticPropsWithSST({locale})

export default ShowExternalIdentifierDetails
