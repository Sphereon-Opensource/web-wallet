import React, {useCallback, useMemo, useState} from 'react'
import {HttpError, useList, useOne, useTranslate, useUpdate, useDelete} from '@refinedev/core'
import {useNavigate, useParams} from 'react-router-dom'
import KeyIcon from '@sphereon/ui-components.ssi-react/dist/components/assets/icons/Key'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import {staticPropsWithSST} from '@/src/i18n/server'
import {DataProvider, DataResource, KeyManagementRoute, MainRoute} from '@typings'
import {IIdentifier, ManagedKeyInfo} from '@veramo/core'
import style from './index.module.css'

// Simple hex to base64url conversion for JWK
const hexToBase64url = (hex: string): string => {
  const bytes = hex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
  const base64 = btoa(String.fromCharCode(...bytes))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// Convert public key hex to JWK based on key type
const publicKeyHexToJwk = (publicKeyHex: string, keyType: string): Record<string, unknown> | null => {
  try {
    const hexLength = publicKeyHex.length

    switch (keyType) {
      case 'Secp256k1': {
        // secp256k1 public keys:
        // - 130 hex chars (65 bytes): 04 prefix + 32 bytes x + 32 bytes y (uncompressed)
        // - 128 hex chars (64 bytes): 32 bytes x + 32 bytes y (uncompressed without prefix)
        // - 66 hex chars (33 bytes): 02/03 prefix + 32 bytes x (compressed)
        let xHex: string
        let yHex: string

        if (hexLength === 130 && publicKeyHex.startsWith('04')) {
          // Uncompressed with 04 prefix
          xHex = publicKeyHex.slice(2, 66)
          yHex = publicKeyHex.slice(66, 130)
        } else if (hexLength === 128) {
          // Uncompressed without prefix
          xHex = publicKeyHex.slice(0, 64)
          yHex = publicKeyHex.slice(64, 128)
        } else if (hexLength === 66 && (publicKeyHex.startsWith('02') || publicKeyHex.startsWith('03'))) {
          // Compressed - only x coordinate available
          xHex = publicKeyHex.slice(2, 66)
          return {
            kty: 'EC',
            crv: 'secp256k1',
            x: hexToBase64url(xHex),
            // Note: y would need to be computed from curve equation for compressed keys
          }
        } else {
          // Assume it's just x+y without prefix
          xHex = publicKeyHex.slice(0, 64)
          yHex = publicKeyHex.slice(64)
        }

        return {
          kty: 'EC',
          crv: 'secp256k1',
          x: hexToBase64url(xHex),
          y: hexToBase64url(yHex),
        }
      }
      case 'Secp256r1':
      case 'P-256': {
        let xHex: string
        let yHex: string

        if (hexLength === 130 && publicKeyHex.startsWith('04')) {
          xHex = publicKeyHex.slice(2, 66)
          yHex = publicKeyHex.slice(66, 130)
        } else if (hexLength === 128) {
          xHex = publicKeyHex.slice(0, 64)
          yHex = publicKeyHex.slice(64, 128)
        } else if (hexLength === 66 && (publicKeyHex.startsWith('02') || publicKeyHex.startsWith('03'))) {
          xHex = publicKeyHex.slice(2, 66)
          return {
            kty: 'EC',
            crv: 'P-256',
            x: hexToBase64url(xHex),
          }
        } else {
          xHex = publicKeyHex.slice(0, 64)
          yHex = publicKeyHex.slice(64)
        }

        return {
          kty: 'EC',
          crv: 'P-256',
          x: hexToBase64url(xHex),
          y: hexToBase64url(yHex),
        }
      }
      case 'Ed25519':
      case 'X25519': {
        // Ed25519/X25519 public keys are 32 bytes (64 hex chars)
        return {
          kty: 'OKP',
          crv: keyType,
          x: hexToBase64url(publicKeyHex),
        }
      }
      case 'RSA': {
        // RSA keys are more complex, return basic structure
        return {
          kty: 'RSA',
          n: hexToBase64url(publicKeyHex),
          e: 'AQAB', // Common exponent 65537
        }
      }
      default:
        // For unknown types, return a generic structure
        return {
          kty: 'oct',
          k: hexToBase64url(publicKeyHex),
        }
    }
  } catch (error) {
    console.error('Failed to convert key to JWK:', error)
    return null
  }
}

interface KeyAssociation {
  did: string
  alias: string
  purposes: string[]
}

interface KeyWithAssociations extends ManagedKeyInfo {
  associations: KeyAssociation[]
}

const VM_RELATIONSHIPS = [
  {id: 'authentication', label: 'Authentication'},
  {id: 'assertionMethod', label: 'Assertion Method'},
  {id: 'capabilityInvocation', label: 'Capability Invocation'},
  {id: 'capabilityDelegation', label: 'Capability Delegation'},
  {id: 'keyAgreement', label: 'Key Agreement'},
]

type TabId = 'info' | 'jwk'

const KeyShowPage: React.FC = () => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const {id: kid} = useParams<{id: string}>()

  const [activeTab, setActiveTab] = useState<TabId>('info')
  const [editingAssociation, setEditingAssociation] = useState<string | null>(null)
  const [editPurposes, setEditPurposes] = useState<string[]>([])
  const [showAddDidModal, setShowAddDidModal] = useState(false)
  const [selectedDid, setSelectedDid] = useState<string>('')
  const [newPurposes, setNewPurposes] = useState<string[]>(['authentication', 'assertionMethod'])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showRemoveDidConfirm, setShowRemoveDidConfirm] = useState<string | null>(null)

  const {data: keyData, isLoading, isError, refetch} = useOne<KeyWithAssociations, HttpError>({
    resource: DataResource.KEYS,
    id: kid || '',
    queryOptions: {enabled: !!kid},
    meta: {dataProviderName: DataProvider.KEYS},
  })

  const {data: identifiersData} = useList<IIdentifier, HttpError>({
    resource: DataResource.IDENTIFIERS,
    meta: {dataProviderName: DataProvider.IDENTIFIERS},
  })

  const {mutate: updateKey} = useUpdate()
  const {mutate: deleteKey} = useDelete()

  const key = keyData?.data

  // Convert key to JWK format
  const jwk = useMemo(() => {
    if (!key?.publicKeyHex || !key?.type) return null
    return publicKeyHexToJwk(key.publicKeyHex, key.type)
  }, [key?.publicKeyHex, key?.type])

  const jwkString = useMemo(() => {
    if (!jwk) return ''
    return JSON.stringify(jwk, null, 2)
  }, [jwk])

  // Get identifiers that this key is NOT associated with
  const availableIdentifiers = useMemo(() => {
    if (!identifiersData?.data || !key?.associations) return []
    const associatedDids = new Set(key.associations.map(a => a.did))
    return identifiersData.data.filter(id => !associatedDids.has(id.did))
  }, [identifiersData?.data, key?.associations])

  const handleBack = useCallback(() => {
    navigate(`${MainRoute.KEY_MANAGEMENT}/${KeyManagementRoute.KEYS}`)
  }, [navigate])

  const handleStartEditPurposes = useCallback((association: KeyAssociation) => {
    setEditingAssociation(association.did)
    setEditPurposes([...association.purposes])
  }, [])

  const handleCancelEditPurposes = useCallback(() => {
    setEditingAssociation(null)
    setEditPurposes([])
  }, [])

  const handleSavePurposes = useCallback(async (did: string) => {
    if (!kid) return

    updateKey(
      {
        resource: DataResource.KEYS,
        id: kid,
        values: {updatePurposes: {did, purposes: editPurposes}},
        meta: {dataProviderName: DataProvider.KEYS},
      },
      {
        onSuccess: () => {
          setEditingAssociation(null)
          setEditPurposes([])
          refetch()
        },
        onError: (error) => {
          console.error('Failed to update purposes:', error)
        },
      },
    )
  }, [kid, editPurposes, updateKey, refetch])

  const handleToggleEditPurpose = useCallback((purpose: string) => {
    setEditPurposes(prev =>
      prev.includes(purpose)
        ? prev.filter(p => p !== purpose)
        : [...prev, purpose],
    )
  }, [])

  const handleAddToDid = useCallback(async () => {
    if (!kid || !selectedDid) return

    updateKey(
      {
        resource: DataResource.KEYS,
        id: kid,
        values: {addToDid: {did: selectedDid, purposes: newPurposes}},
        meta: {dataProviderName: DataProvider.KEYS},
      },
      {
        onSuccess: () => {
          setShowAddDidModal(false)
          setSelectedDid('')
          setNewPurposes(['authentication', 'assertionMethod'])
          refetch()
        },
        onError: (error) => {
          console.error('Failed to add key to DID:', error)
        },
      },
    )
  }, [kid, selectedDid, newPurposes, updateKey, refetch])

  const handleRemoveFromDid = useCallback(async (did: string) => {
    if (!kid) return

    console.log('[KeyShowPage] Removing key from DID:', {kid, did})

    updateKey(
      {
        resource: DataResource.KEYS,
        id: kid,
        values: {removeFromDid: did},
        meta: {dataProviderName: DataProvider.KEYS},
      },
      {
        onSuccess: () => {
          console.log('[KeyShowPage] Successfully removed key from DID')
          setShowRemoveDidConfirm(null)
          refetch()
        },
        onError: (error) => {
          console.error('[KeyShowPage] Failed to remove key from DID:', error)
        },
      },
    )
  }, [kid, updateKey, refetch])

  const handleDeleteKey = useCallback(async () => {
    if (!kid) return

    deleteKey(
      {
        resource: DataResource.KEYS,
        id: kid,
        meta: {dataProviderName: DataProvider.KEYS},
      },
      {
        onSuccess: () => {
          navigate(`${MainRoute.KEY_MANAGEMENT}/${KeyManagementRoute.KEYS}`)
        },
        onError: (error) => {
          console.error('Failed to delete key:', error)
        },
      },
    )
  }, [kid, deleteKey, navigate])

  const handleToggleNewPurpose = useCallback((purpose: string) => {
    setNewPurposes(prev =>
      prev.includes(purpose)
        ? prev.filter(p => p !== purpose)
        : [...prev, purpose],
    )
  }, [])

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
  }, [])

  if (isLoading) {
    return (
      <div className={style.container}>
        <div className={style.headerContainer}>
          <div className={style.pathCaption}>{translate('key_management_path_label')}</div>
          <div className={style.currentPathCaption}>{translate('key_details_path_label', 'Key Details')}</div>
        </div>
        <AppHeaderBar title={translate('key_details_title', 'Key Details')} />
        <div className={style.loadingState}>
          <div className={style.spinner} />
          <span>{translate('data_provider_loading_message', 'Loading...')}</span>
        </div>
      </div>
    )
  }

  if (isError || !key) {
    return (
      <div className={style.container}>
        <div className={style.headerContainer}>
          <div className={style.pathCaption}>{translate('key_management_path_label')}</div>
          <div className={style.currentPathCaption}>{translate('key_details_path_label', 'Key Details')}</div>
        </div>
        <AppHeaderBar title={translate('key_details_title', 'Key Details')} />
        <div className={style.errorBanner}>{translate('data_provider_error_message', 'Failed to load data')}</div>
      </div>
    )
  }

  const tabs = [
    {id: 'info' as TabId, label: translate('key_details_tab_info', 'Information')},
    {id: 'jwk' as TabId, label: translate('key_details_tab_jwk', 'JWK')},
  ]

  return (
    <div className={style.container}>
      <div className={style.headerContainer}>
        <button className={style.backButton} onClick={handleBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className={style.pathCaption}>{translate('key_management_path_label')}</div>
        <div className={style.currentPathCaption}>{translate('key_details_path_label', 'Key Details')}</div>
      </div>
      <AppHeaderBar title={key.meta?.alias || translate('key_details_title', 'Key Details')} />

      <div className={style.content}>
        {/* Key Overview Card */}
        <div className={style.overviewCard}>
          <div className={style.keyIconLarge}>
            <KeyIcon size={32} />
          </div>
          <div className={style.keyOverview}>
            <h2 className={style.keyName}>{key.meta?.alias || key.type}</h2>
            <span className={style.typeBadge}>{key.type}</span>
          </div>
          <div className={style.overviewActions}>
            <button className={style.dangerButton} onClick={() => setShowDeleteConfirm(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              {translate('action_delete_label', 'Delete')}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={style.tabsContainer}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`${style.tab} ${activeTab === tab.id ? style.tabActive : ''}`}
              onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Info Tab */}
        {activeTab === 'info' && (
          <>
            {/* Key Details Section */}
            <section className={style.section}>
              <h3 className={style.sectionTitle}>{translate('key_details_info', 'Key Information')}</h3>
              <div className={style.detailsGrid}>
                <div className={style.detailItem}>
                  <span className={style.detailLabel}>{translate('key_fields_alias', 'Alias')}</span>
                  <span className={style.detailValue}>{key.meta?.alias || '-'}</span>
                </div>
                <div className={style.detailItem}>
                  <span className={style.detailLabel}>{translate('key_fields_type', 'Key Type')}</span>
                  <span className={style.detailValue}>{key.type}</span>
                </div>
                <div className={style.detailItem}>
                  <span className={style.detailLabel}>{translate('key_fields_kms', 'KMS')}</span>
                  <span className={style.kmsBadge}>{key.kms || '-'}</span>
                </div>
              </div>

              {/* Key ID */}
              <div className={style.kidSection}>
                <div className={style.kidHeader}>
                  <span className={style.kidLabel}>{translate('key_fields_kid', 'Key ID (KID)')}</span>
                  <button className={style.copyButton} onClick={() => copyToClipboard(key.kid)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    {translate('action_copy', 'Copy')}
                  </button>
                </div>
                <code className={style.kidValue}>{key.kid}</code>
              </div>

              {/* Public Key if available */}
              {key.publicKeyHex && (
                <div className={style.kidSection}>
                  <div className={style.kidHeader}>
                    <span className={style.kidLabel}>{translate('key_fields_public_key', 'Public Key (Hex)')}</span>
                    <button className={style.copyButton} onClick={() => copyToClipboard(key.publicKeyHex!)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      {translate('action_copy', 'Copy')}
                    </button>
                  </div>
                  <code className={style.kidValue}>{key.publicKeyHex}</code>
                </div>
              )}
            </section>

            {/* DID Associations Section */}
            <section className={style.section}>
              <div className={style.sectionHeader}>
                <h3 className={style.sectionTitle}>{translate('key_details_associations', 'DID Associations')}</h3>
                {availableIdentifiers.length > 0 && (
                  <button className={style.addButton} onClick={() => setShowAddDidModal(true)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    {translate('key_details_add_to_did', 'Add to DID')}
                  </button>
                )}
              </div>

              {key.associations && key.associations.length > 0 ? (
                <div className={style.associationsList}>
                  {key.associations.map((association) => (
                    <div key={association.did} className={style.associationCard}>
                      <div className={style.associationHeader}>
                        <div className={style.associationInfo}>
                          <span className={style.associationAlias}>{association.alias || 'No Alias'}</span>
                          <span
                            className={style.associationDidClickable}
                            onClick={() => navigate(`/key-management/identifiers/show/${encodeURIComponent(association.did)}`)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && navigate(`/key-management/identifiers/show/${encodeURIComponent(association.did)}`)}
                            title={translate('action_view_identifier', 'View Identifier') as string}
                          >
                            <span className={style.associationDidText}>{association.did}</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={style.associationDidIcon}>
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                          </span>
                        </div>
                        <div className={style.associationActions}>
                          {editingAssociation !== association.did && (
                            <>
                              <button
                                className={style.iconButton}
                                onClick={() => handleStartEditPurposes(association)}
                                title={translate('action_edit_label', 'Edit')}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              <button
                                className={`${style.iconButton} ${style.iconButtonDanger}`}
                                onClick={() => setShowRemoveDidConfirm(association.did)}
                                title={translate('action_remove_label', 'Remove')}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className={style.purposesSection}>
                        <span className={style.purposesLabel}>{translate('key_details_vm_relationships', 'VM Relationships')}</span>
                        {editingAssociation === association.did ? (
                          <div className={style.editPurposes}>
                            <div className={style.checkboxGrid}>
                              {VM_RELATIONSHIPS.map(vm => (
                                <label key={vm.id} className={style.checkboxLabel}>
                                  <input
                                    type="checkbox"
                                    className={style.checkbox}
                                    checked={editPurposes.includes(vm.id)}
                                    onChange={() => handleToggleEditPurpose(vm.id)}
                                  />
                                  <span>{vm.label}</span>
                                </label>
                              ))}
                            </div>
                            <div className={style.editActions}>
                              <button className={style.cancelButton} onClick={handleCancelEditPurposes}>
                                {translate('action_cancel', 'Cancel')}
                              </button>
                              <button className={style.saveButton} onClick={() => handleSavePurposes(association.did)}>
                                {translate('action_save', 'Save')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className={style.purposesList}>
                            {association.purposes && association.purposes.length > 0 ? (
                              association.purposes.map(purpose => (
                                <span key={purpose} className={style.purposeBadge}>
                                  {VM_RELATIONSHIPS.find(vm => vm.id === purpose)?.label || purpose}
                                </span>
                              ))
                            ) : (
                              <span className={style.noPurposes}>{translate('key_details_no_purposes', 'No VM relationships')}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={style.emptyAssociations}>
                  <div className={style.emptyIcon}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  </div>
                  <span className={style.emptyText}>{translate('key_details_no_associations', 'This key is not associated with any DID')}</span>
                  {availableIdentifiers.length > 0 && (
                    <button className={style.addButton} onClick={() => setShowAddDidModal(true)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      {translate('key_details_add_to_did', 'Add to DID')}
                    </button>
                  )}
                </div>
              )}
            </section>
          </>
        )}

        {/* JWK Tab */}
        {activeTab === 'jwk' && (
          <section className={style.section}>
            <div className={style.sectionHeader}>
              <h3 className={style.sectionTitle}>{translate('key_details_jwk', 'JSON Web Key (JWK)')}</h3>
              {jwkString && (
                <button className={style.copyButton} onClick={() => copyToClipboard(jwkString)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  {translate('action_copy_jwk', 'Copy JWK')}
                </button>
              )}
            </div>
            {jwk ? (
              <div className={style.jwkContainer}>
                <pre className={style.jwkCode}>{jwkString}</pre>
              </div>
            ) : (
              <div className={style.emptyAssociations}>
                <div className={style.emptyIcon}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <span className={style.emptyText}>{translate('key_details_jwk_unavailable', 'JWK format not available for this key type')}</span>
              </div>
            )}
          </section>
        )}
      </div>

      {/* Add to DID Modal */}
      {showAddDidModal && (
        <div className={style.modalOverlay} onClick={() => setShowAddDidModal(false)}>
          <div className={style.modal} onClick={(e) => e.stopPropagation()}>
            <div className={style.modalHeader}>
              <h3 className={style.modalTitle}>{translate('key_details_add_to_did', 'Add Key to DID')}</h3>
              <button className={style.modalClose} onClick={() => setShowAddDidModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className={style.modalBody}>
              <div className={style.formGroup}>
                <label className={style.formLabel}>{translate('key_details_select_did', 'Select DID')}</label>
                <select
                  className={style.formSelect}
                  value={selectedDid}
                  onChange={(e) => setSelectedDid(e.target.value)}>
                  <option value="">{translate('key_details_select_did_placeholder', 'Select a DID...')}</option>
                  {availableIdentifiers.map(id => (
                    <option key={id.did} value={id.did}>
                      {id.alias || id.did}
                    </option>
                  ))}
                </select>
              </div>

              <div className={style.formGroup}>
                <label className={style.formLabel}>{translate('key_details_vm_relationships', 'VM Relationships')}</label>
                <div className={style.checkboxGrid}>
                  {VM_RELATIONSHIPS.map(vm => (
                    <label key={vm.id} className={style.checkboxLabel}>
                      <input
                        type="checkbox"
                        className={style.checkbox}
                        checked={newPurposes.includes(vm.id)}
                        onChange={() => handleToggleNewPurpose(vm.id)}
                      />
                      <span>{vm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className={style.modalFooter}>
              <button className={style.cancelButton} onClick={() => setShowAddDidModal(false)}>
                {translate('action_cancel', 'Cancel')}
              </button>
              <button
                className={style.primaryButton}
                onClick={handleAddToDid}
                disabled={!selectedDid || newPurposes.length === 0}>
                {translate('key_details_add_to_did', 'Add to DID')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className={style.modalOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div className={style.modal} onClick={(e) => e.stopPropagation()}>
            <div className={style.modalHeader}>
              <h3 className={style.modalTitle}>{translate('key_details_delete_confirm_title', 'Delete Key')}</h3>
              <button className={style.modalClose} onClick={() => setShowDeleteConfirm(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className={style.modalBody}>
              <p className={style.confirmText}>
                {translate(
                  'key_details_delete_confirm_message',
                  'Are you sure you want to delete this key? This action cannot be undone.',
                )}
              </p>
              {key.associations && key.associations.length > 0 && (
                <div className={style.warningBox}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>
                    {translate(
                      'key_details_delete_warning',
                      'This key is associated with {count} DID(s). Deleting it will remove it from all DIDs.',
                    ).replace('{count}', String(key.associations.length))}
                  </span>
                </div>
              )}
            </div>
            <div className={style.modalFooter}>
              <button className={style.cancelButton} onClick={() => setShowDeleteConfirm(false)}>
                {translate('action_cancel', 'Cancel')}
              </button>
              <button className={style.dangerButton} onClick={handleDeleteKey}>
                {translate('action_delete_label', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove from DID Confirmation Modal */}
      {showRemoveDidConfirm && (
        <div className={style.modalOverlay} onClick={() => setShowRemoveDidConfirm(null)}>
          <div className={style.modal} onClick={(e) => e.stopPropagation()}>
            <div className={style.modalHeader}>
              <h3 className={style.modalTitle}>{translate('key_details_remove_confirm_title', 'Remove from DID')}</h3>
              <button className={style.modalClose} onClick={() => setShowRemoveDidConfirm(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className={style.modalBody}>
              <p className={style.confirmText}>
                {translate(
                  'key_details_remove_confirm_message',
                  'Are you sure you want to remove this key from the DID? The key will still exist in the key manager.',
                )}
              </p>
            </div>
            <div className={style.modalFooter}>
              <button className={style.cancelButton} onClick={() => setShowRemoveDidConfirm(null)}>
                {translate('action_cancel', 'Cancel')}
              </button>
              <button className={style.dangerButton} onClick={() => handleRemoveFromDid(showRemoveDidConfirm)}>
                {translate('action_remove_label', 'Remove')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export const getStaticProps = async ({locale = 'en'}: {locale?: string}) => staticPropsWithSST({locale})

export default KeyShowPage
