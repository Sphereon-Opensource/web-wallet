import React, {useCallback, useEffect, useState, useMemo, ReactNode} from 'react'
import {HttpError, useDelete, useList, useNavigation, useTranslate} from '@refinedev/core'
import {CredentialMiniCardView} from '@sphereon/ui-components.ssi-react'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import StatusBadge from '@components/badges/StatusBadge'
import {ListPageHeader, TabItem, FilterDropdown} from '@components/tables'
import {staticPropsWithSST} from '@/src/i18n/server'
import {CredentialTableItem, DataProvider, DataResource} from '@typings'
import {toCredentialSummary, CredentialSummary} from '@sphereon/ui-components.credential-branding'
import {getAgent} from '@agent'
import {useBrandingSync} from '@services/brandingSyncService'
import {Party} from '@sphereon/ssi-sdk.data-store-types'
import {CredentialRole, DigitalCredential} from '@sphereon/ssi-sdk.credential-store'
import {getMatchingIdentity} from '@helpers/IdentityFilters'
import {CredentialMapper, OriginalVerifiableCredential} from '@sphereon/ssi-types'
import {VerifiableCredential} from '@veramo/core'
import style from './index.module.css'

type StatusFilter = 'all' | 'valid' | 'expired' | 'revoked' | 'suspended'
type CredentialTypeFilter = 'credentials' | 'pid' | 'einvoice'
type SortField = 'type' | 'issuer' | 'validFrom' | 'expirationDate' | 'status'
type SortDirection = 'asc' | 'desc'

// Status options for dropdown
const STATUS_OPTIONS: {value: StatusFilter; labelKey: string; defaultLabel: string}[] = [
  {value: 'all', labelKey: 'credentials_filter_all', defaultLabel: 'All Statuses'},
  {value: 'valid', labelKey: 'credentials_filter_valid', defaultLabel: 'Valid'},
  {value: 'expired', labelKey: 'credentials_filter_expired', defaultLabel: 'Expired'},
  {value: 'revoked', labelKey: 'credentials_filter_revoked', defaultLabel: 'Revoked'},
  {value: 'suspended', labelKey: 'credentials_filter_suspended', defaultLabel: 'Suspended'},
]

// Credential type tabs
const CREDENTIAL_TYPE_TABS: {value: CredentialTypeFilter; labelKey: string; defaultLabel: string; icon: string}[] = [
  {value: 'credentials', labelKey: 'credentials_tab_credentials', defaultLabel: 'Credentials', icon: 'credential'},
  {value: 'pid', labelKey: 'credentials_tab_pid', defaultLabel: 'PID', icon: 'pid'},
  {value: 'einvoice', labelKey: 'credentials_tab_einvoice', defaultLabel: 'eInvoice', icon: 'invoice'},
]

// Helper to check if credential is an eInvoice
const isEInvoiceCredential = (credential: CredentialTableItem): boolean => {
  const typeLower = credential.type?.toLowerCase() ?? ''
  const contextLower = credential.context?.toLowerCase() ?? ''
  return typeLower.includes('einvoice') || typeLower.includes('invoice') ||
         contextLower.includes('fides') || contextLower.includes('einvoice')
}

// Helper to check if credential is a PID
const isPIDCredential = (credential: CredentialTableItem): boolean => {
  const typeLower = credential.type?.toLowerCase() ?? ''
  return typeLower.includes('pid') || typeLower.includes('personalidentification') ||
         typeLower.includes('personal_identification')
}

const CredentialsListPage: React.FC = () => {
  const translate = useTranslate()
  const {show} = useNavigation()
  const {mutateAsync: deleteCredential} = useDelete<DigitalCredential, HttpError>()
  const credentialRole = CredentialRole.HOLDER

  const [credentialItems, setCredentialItems] = useState<CredentialTableItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCredential, setSelectedCredential] = useState<CredentialTableItem | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')
  const [filterType, setFilterType] = useState<CredentialTypeFilter>('credentials')
  const [sortField, setSortField] = useState<SortField>('validFrom')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{top: number; left: number} | null>(null)

  const {service: brandingSync, sync: syncBrandings} = useBrandingSync()

  const {
    data: credentialData,
    isLoading: credentialsLoading,
    isError: credentialsError,
    refetch: refetchCredentials,
  } = useList<DigitalCredential, HttpError>({
    resource: DataResource.CREDENTIALS,
    pagination: {pageSize: 1000, mode: 'server'},
    sorters: [{field: 'validFrom', order: 'asc'}],
    meta: {idColumnName: 'hash'},
    filters: [
      {field: 'credentialRole', operator: 'eq', value: credentialRole},
      {field: 'documentType', operator: 'eq', value: 'VC'},
    ],
  })

  const {data: partyData, isLoading: partiesLoading} = useList<Party, HttpError>({resource: 'parties'})

  // Build credential table items when data is loaded
  useEffect(() => {
    const fetchCredentialTableItems = async () => {
      if (!credentialData || !partyData) return

      setLoading(true)
      const digitalCredentials = credentialData.data as Array<DigitalCredential>

      try {
        await syncBrandings()

        const items = await Promise.all(
          digitalCredentials.map(async (credential: DigitalCredential) => {
            const filteredCredentialBrandings = brandingSync.getBrandingsByVcHash(credential.hash)
            const issuerPartyIdentity = credential.issuerCorrelationId
              ? getMatchingIdentity(partyData.data, credential.issuerCorrelationId)
              : undefined
            const subjectPartyIdentity = credential.subjectCorrelationId
              ? getMatchingIdentity(partyData.data, credential.subjectCorrelationId)
              : undefined
            const originalVC = JSON.parse(credential.uniformDocument ?? credential.rawDocument) as OriginalVerifiableCredential

            const credentialSummary = await toCredentialSummary({
              verifiableCredential: originalVC as VerifiableCredential,
              hash: credential.hash,
              credentialRole,
              branding: filteredCredentialBrandings.length ? filteredCredentialBrandings[0].localeBranding : undefined,
              issuer: issuerPartyIdentity?.party,
              subject: subjectPartyIdentity?.party,
              ...(credential.linkedVpId && credential.linkedVpFrom && {
                linkedVp: {linkedVpId: credential.linkedVpId, linkedVpFrom: credential.linkedVpFrom},
              }),
            })

            return CredentialTableItem.from(credential, partyData.data, credentialSummary)
          }),
        )
        setCredentialItems(items)
      } catch (err) {
        console.error('[CredentialsListPage] Error fetching credential items:', err)
        setError('Failed to load credentials. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    void fetchCredentialTableItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentialData, partyData])

  // Filter credentials by type first, then by status
  const getFilteredCredentials = useCallback((): CredentialTableItem[] => {
    // First filter by credential type
    let filtered: CredentialTableItem[]
    switch (filterType) {
      case 'einvoice':
        filtered = credentialItems.filter(isEInvoiceCredential)
        break
      case 'pid':
        filtered = credentialItems.filter(isPIDCredential)
        break
      case 'credentials':
      default:
        // Show all credentials except eInvoices in the default view
        filtered = credentialItems.filter((c) => !isEInvoiceCredential(c))
        break
    }

    // Then filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter((c) => c.status.toLowerCase() === filterStatus)
    }

    return filtered
  }, [credentialItems, filterType, filterStatus])

  // Sort credentials
  const getSortedCredentials = useCallback((): CredentialTableItem[] => {
    const filtered = getFilteredCredentials()
    const parseDate = (dateStr: string | undefined): number => {
      if (!dateStr) return 0
      const parsed = new Date(dateStr)
      return isNaN(parsed.getTime()) ? 0 : parsed.getTime()
    }

    return [...filtered].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'type':
          comparison = a.type.localeCompare(b.type)
          break
        case 'issuer':
          comparison = (a.issuer?.contact?.displayName ?? '').localeCompare(b.issuer?.contact?.displayName ?? '')
          break
        case 'validFrom':
          comparison = parseDate(a.validFromStr) - parseDate(b.validFromStr)
          break
        case 'expirationDate':
          comparison = parseDate(a.expirationDateStr) - parseDate(b.expirationDateStr)
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [getFilteredCredentials, sortField, sortDirection])

  // Get count for each credential type
  const getTypeCount = useCallback(
    (type: CredentialTypeFilter): number => {
      switch (type) {
        case 'einvoice':
          return credentialItems.filter(isEInvoiceCredential).length
        case 'pid':
          return credentialItems.filter(isPIDCredential).length
        case 'credentials':
        default:
          return credentialItems.filter((c) => !isEInvoiceCredential(c)).length
      }
    },
    [credentialItems],
  )

  // Get count for each status (within the current type filter)
  const getStatusCount = useCallback(
    (status: StatusFilter): number => {
      // First filter by type
      let filtered: CredentialTableItem[]
      switch (filterType) {
        case 'einvoice':
          filtered = credentialItems.filter(isEInvoiceCredential)
          break
        case 'pid':
          filtered = credentialItems.filter(isPIDCredential)
          break
        case 'credentials':
        default:
          filtered = credentialItems.filter((c) => !isEInvoiceCredential(c))
          break
      }

      if (status === 'all') return filtered.length
      return filtered.filter((c) => c.status.toLowerCase() === status).length
    },
    [credentialItems, filterType],
  )

  // Build tabs for ListPageHeader
  const headerTabs: TabItem[] = useMemo(() => {
    return CREDENTIAL_TYPE_TABS.map((tab) => ({
      id: tab.value,
      label: translate(tab.labelKey, tab.defaultLabel) as string,
      count: getTypeCount(tab.value),
      icon: tab.value === 'credentials' ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ) : tab.value === 'pid' ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="16" y2="17" />
        </svg>
      ),
    }))
  }, [translate, getTypeCount])

  // Build filters for ListPageHeader
  const headerFilters: FilterDropdown[] = useMemo(() => {
    return [{
      id: 'status',
      value: filterStatus,
      onChange: (value: string) => setFilterStatus(value as StatusFilter),
      options: STATUS_OPTIONS.map((option) => ({
        value: option.value,
        label: `${translate(option.labelKey, option.defaultLabel)} (${getStatusCount(option.value)})`,
      })),
    }]
  }, [filterStatus, translate, getStatusCount])

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortField(field)
        setSortDirection('asc')
      }
    },
    [sortField],
  )

  // Selection handlers
  const handleToggleSelection = useCallback((hash: string, e: React.MouseEvent): void => {
    e.stopPropagation()
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(hash)) {
        next.delete(hash)
      } else {
        next.add(hash)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(
    (selectAll: boolean): void => {
      const sortedCredentials = getSortedCredentials()
      if (selectAll) {
        const allIds = new Set(sortedCredentials.map((c) => c.hash))
        setSelectedIds(allIds)
      } else {
        setSelectedIds(new Set())
      }
    },
    [getSortedCredentials]
  )

  const handleDeleteSelected = useCallback(async (): Promise<void> => {
    if (selectedIds.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} credential(s)?`)) return

    const hashesToDelete = Array.from(selectedIds)
    for (const hash of hashesToDelete) {
      try {
        await deleteCredential({
          dataProviderName: DataProvider.CREDENTIALS,
          meta: {idColumnName: 'hash'},
          resource: 'CREDENTIALS',
          id: hash,
        })
        if (selectedCredential?.hash === hash) {
          setSelectedCredential(null)
        }
      } catch (err) {
        console.error('[CredentialsListPage] Error deleting credential:', hash, err)
      }
    }
    setSelectedIds(new Set())
    void refetchCredentials()
  }, [selectedIds, selectedCredential, deleteCredential, refetchCredentials])

  const handleDelete = useCallback(
    async (credential: CredentialTableItem) => {
      if (!confirm(`Are you sure you want to delete this credential?`)) return

      try {
        await deleteCredential({
          dataProviderName: DataProvider.CREDENTIALS,
          meta: {idColumnName: 'hash'},
          resource: 'CREDENTIALS',
          id: credential.hash,
        })
        if (selectedCredential?.hash === credential.hash) {
          setSelectedCredential(null)
        }
        void refetchCredentials()
      } catch (err) {
        console.error('[CredentialsListPage] Error deleting credential:', err)
        setError('Failed to delete credential. Please try again.')
      }
    },
    [deleteCredential, selectedCredential, refetchCredentials],
  )

  const handleViewDetails = useCallback(
    (credential: CredentialTableItem) => {
      show(DataResource.CREDENTIALS, credential.hash, undefined, {variables: {credentialRole}})
    },
    [show, credentialRole],
  )

  const handlePublish = useCallback(async (credential: CredentialTableItem) => {
    if (!credential.id) return
    try {
      await getAgent().lvpPublishCredential({digitalCredentialId: credential.id})
      void refetchCredentials()
    } catch (err) {
      console.error('[CredentialsListPage] Error publishing credential:', err)
    }
  }, [refetchCredentials])

  const handleUnpublish = useCallback(async (credential: CredentialTableItem) => {
    if (!credential.linkedVpId) return
    try {
      await getAgent().lvpUnpublishCredential({linkedVpId: credential.linkedVpId})
      void refetchCredentials()
    } catch (err) {
      console.error('[CredentialsListPage] Error unpublishing credential:', err)
    }
  }, [refetchCredentials])

  // Menu handlers
  const handleToggleMenu = useCallback((id: string, e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation()
    e.preventDefault()
    const button = e.currentTarget
    const rect = button.getBoundingClientRect()

    setOpenMenuId((prev) => {
      if (prev === id) {
        setMenuPosition(null)
        return null
      }
      setMenuPosition({top: rect.bottom + 4, left: rect.right - 180})
      return id
    })
  }, [])

  const handleCloseMenu = useCallback((): void => {
    setOpenMenuId(null)
    setMenuPosition(null)
  }, [])

  const handleMenuAction = useCallback(
    async (action: string, credential: CredentialTableItem, e: React.MouseEvent): Promise<void> => {
      e.stopPropagation()
      handleCloseMenu()

      switch (action) {
        case 'details':
          handleViewDetails(credential)
          break
        case 'publish':
          await handlePublish(credential)
          break
        case 'unpublish':
          await handleUnpublish(credential)
          break
        case 'delete':
          await handleDelete(credential)
          break
      }
    },
    [handleCloseMenu, handleViewDetails, handlePublish, handleUnpublish, handleDelete],
  )

  const getStatusVariant = (status: string): 'valid' | 'expired' | 'revoked' | 'pending' => {
    switch (status.toLowerCase()) {
      case 'valid':
        return 'valid'
      case 'expired':
        return 'expired'
      case 'revoked':
      case 'suspended':
        return 'revoked'
      default:
        return 'pending'
    }
  }

  // Render meatballs icon
  const renderMeatballsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  )

  // Render menu for credential
  const renderCredentialMenu = (credential: CredentialTableItem) => {
    if (openMenuId !== credential.hash || !menuPosition) return null

    return (
      <>
        <div className={style.menuBackdrop} onClick={handleCloseMenu} />
        <div className={style.menuDropdown} style={{top: menuPosition.top, left: menuPosition.left}}>
          <button className={style.menuItem} onClick={(e) => handleMenuAction('details', credential, e)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            {translate('action_view_details', 'View Details')}
          </button>
          {credential.linkedVpId ? (
            <button className={style.menuItem} onClick={(e) => handleMenuAction('unpublish', credential, e)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              {translate('action_unpublish_credential_caption', 'Unpublish')}
            </button>
          ) : (
            <button className={style.menuItem} onClick={(e) => handleMenuAction('publish', credential, e)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
              {translate('action_publish_credential_caption', 'Publish')}
            </button>
          )}
          <div className={style.menuDivider} />
          <button
            className={`${style.menuItem} ${style.menuItemDanger}`}
            onClick={(e) => handleMenuAction('delete', credential, e)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            {translate('credential_fields_actions_delete', 'Delete')}
          </button>
        </div>
      </>
    )
  }

  // Render table
  const renderTable = () => {
    const sortedCredentials = getSortedCredentials()

    return (
      <div className={style.tableContainer}>
        {/* Table or Empty State */}
        {sortedCredentials.length === 0 ? (
          <div className={style.emptyState}>
            <div className={style.emptyStateIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className={style.emptyStateTitle}>
              {translate('credentials_empty_title', 'No Credentials Yet')}
            </div>
            <div className={style.emptyStateDescription}>
              {translate('credentials_empty_description', 'Issue or import your first credential to get started.')}
            </div>
          </div>
        ) : (
          <div className={`${style.table} ${selectedIds.size > 0 ? style.tableWithSelections : ''}`}>
            <div className={style.tableHeader}>
              <div className={style.checkboxCell}>
                <input
                  type="checkbox"
                  className={style.checkbox}
                  checked={sortedCredentials.length > 0 && selectedIds.size === sortedCredentials.length}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = selectedIds.size > 0 && selectedIds.size < sortedCredentials.length
                    }
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  aria-label="Select all"
                />
              </div>
              <div className={`${style.headerCell} ${style.cellCard}`} />
              <div
                className={`${style.headerCell} ${style.cellType} ${style.sortable} ${sortField === 'type' ? style.headerCellSorted : ''}`}
                onClick={() => handleSort('type')}
              >
                {translate('credentials_fields_credential', 'Credential')}
                <SortIcon field="type" sortField={sortField} sortDirection={sortDirection} />
              </div>
              <div
                className={`${style.headerCell} ${style.cellIssuer} ${style.sortable} ${sortField === 'issuer' ? style.headerCellSorted : ''}`}
                onClick={() => handleSort('issuer')}
              >
                {translate('credentials_fields_issuer_did', 'Issuer')}
                <SortIcon field="issuer" sortField={sortField} sortDirection={sortDirection} />
              </div>
              <div
                className={`${style.headerCell} ${style.cellDate} ${style.sortable} ${sortField === 'validFrom' ? style.headerCellSorted : ''}`}
                onClick={() => handleSort('validFrom')}
              >
                {translate('credentials_fields_valid_from', 'Valid From')}
                <SortIcon field="validFrom" sortField={sortField} sortDirection={sortDirection} />
              </div>
              <div
                className={`${style.headerCell} ${style.cellDate} ${style.sortable} ${sortField === 'expirationDate' ? style.headerCellSorted : ''}`}
                onClick={() => handleSort('expirationDate')}
              >
                {translate('credentials_fields_expiration_date', 'Expires')}
                <SortIcon field="expirationDate" sortField={sortField} sortDirection={sortDirection} />
              </div>
              <div
                className={`${style.headerCell} ${style.cellStatus} ${style.sortable} ${sortField === 'status' ? style.headerCellSorted : ''}`}
                onClick={() => handleSort('status')}
              >
                {translate('credential_fields_status', 'Status')}
                <SortIcon field="status" sortField={sortField} sortDirection={sortDirection} />
              </div>
              <div className={`${style.headerCell} ${style.cellActions}`} />
            </div>

            {sortedCredentials.map((credential) => (
              <div
                key={credential.hash}
                className={`${style.tableRow} ${selectedCredential?.hash === credential.hash ? style.selected : ''}`}
                onClick={() => setSelectedCredential(credential)}
                role="row"
                tabIndex={0}
              >
                <div className={style.checkboxCell}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(credential.hash)}
                    onChange={() => {}}
                    onClick={(e) => handleToggleSelection(credential.hash, e)}
                    className={style.checkbox}
                    aria-label={`Select ${credential.type}`}
                  />
                </div>
                <div className={`${style.cell} ${style.cellCard}`}>
                  <CredentialMiniCardView {...credential.miniCardView} />
                </div>
                <div className={`${style.cell} ${style.cellType}`}>
                  <span className={style.typeName} title={credential.type}>
                    {credential.type}
                  </span>
                </div>
                <div className={`${style.cell} ${style.cellIssuer}`}>
                  <span className={style.partyName} title={credential.issuer?.contact?.displayName}>
                    {credential.issuer?.contact?.displayName ?? '-'}
                  </span>
                </div>
                <div className={`${style.cell} ${style.cellDate}`}>{credential.validFromStr || '-'}</div>
                <div className={`${style.cell} ${style.cellDate}`}>{credential.expirationDateStr || '-'}</div>
                <div className={`${style.cell} ${style.cellStatus}`}>
                  <StatusBadge label={credential.status} variant={getStatusVariant(credential.status)} size="small" />
                </div>
                <div className={`${style.cell} ${style.cellActions}`}>
                  <div className={style.menuContainer}>
                    <button
                      type="button"
                      className={style.meatballsButton}
                      onClick={(e) => handleToggleMenu(credential.hash, e)}
                      onMouseDown={(e) => e.stopPropagation()}
                      aria-label="Open menu"
                    >
                      {renderMeatballsIcon()}
                    </button>
                    {renderCredentialMenu(credential)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Render detail panel
  const renderDetailPanel = () => {
    if (!selectedCredential) return null

    return (
      <div className={style.detailPanel}>
        <div className={style.detailHeader}>
          <h3 className={style.detailTitle}>{translate('credentials_detail_title', 'Credential Details')}</h3>
          <button className={style.closeButton} onClick={() => setSelectedCredential(null)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={style.detailBody}>
          {/* Credential Card */}
          <div className={style.credentialCard}>
            <div className={style.credentialCardImage}>
              <CredentialMiniCardView {...selectedCredential.miniCardView} />
            </div>
            <div className={style.credentialCardInfo}>
              <span className={style.credentialCardTitle}>{selectedCredential.type}</span>
              <span className={style.credentialCardIssuer}>
                {selectedCredential.issuer?.contact?.displayName ?? 'Unknown Issuer'}
              </span>
            </div>
            <StatusBadge
              label={selectedCredential.status}
              variant={getStatusVariant(selectedCredential.status)}
              size="small"
            />
          </div>

          {/* Metadata Section - with purple left border */}
          <section className={style.metadataSection}>
            <div className={style.metadataBorder} />
            <div className={style.metadataContent}>
              <div className={style.metadataTitle}>{translate('credentials_detail_info', 'Information')}</div>
              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>{translate('credentials_detail_type', 'Type')}</span>
                <span className={style.metadataValue}>{selectedCredential.type}</span>
              </div>
              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>{translate('credentials_detail_issuer', 'Issuer')}</span>
                <span className={style.metadataValue}>
                  {selectedCredential.issuer?.contact?.displayName ?? '-'}
                </span>
              </div>
              {selectedCredential.subject && (
                <div className={style.metadataRow}>
                  <span className={style.metadataLabel}>{translate('credentials_detail_subject', 'Subject')}</span>
                  <span className={style.metadataValue}>
                    {selectedCredential.subject?.contact?.displayName ?? '-'}
                  </span>
                </div>
              )}
              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>{translate('credentials_detail_valid_from', 'Valid From')}</span>
                <span className={style.metadataValue}>{selectedCredential.validFromStr || '-'}</span>
              </div>
              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>{translate('credentials_detail_expires', 'Expires')}</span>
                <span className={style.metadataValue}>{selectedCredential.expirationDateStr || '-'}</span>
              </div>
              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>{translate('credentials_detail_created', 'Created')}</span>
                <span className={style.metadataValue}>{selectedCredential.createdStr || '-'}</span>
              </div>
              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>{translate('credentials_detail_hash', 'Hash')}</span>
                <span className={style.metadataValueMono}>{selectedCredential.hash}</span>
              </div>
              {selectedCredential.linkedVpId && (
                <div className={style.metadataRow}>
                  <span className={style.metadataLabel}>{translate('credentials_detail_published', 'Published')}</span>
                  <span className={style.metadataValue}>Yes</span>
                </div>
              )}
            </div>
          </section>

          {/* View Full Details button in body */}
          <button className={style.viewFullButton} onClick={() => handleViewDetails(selectedCredential)}>
            {translate('action_view_full_details', 'View Full Details')}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
        </div>

        {/* Footer with Delete button */}
        <div className={style.detailFooter}>
          <button
            className={style.deleteButton}
            onClick={() => handleDelete(selectedCredential)}
          >
            {translate('credential_fields_actions_delete', 'Delete credential')}
          </button>
        </div>
      </div>
    )
  }

  if (credentialsLoading || partiesLoading || loading) {
    return (
      <div className={style.container}>
        <AppHeaderBar title={translate('credentials_overview_title', 'Credentials')} />
        <div className={style.loadingState}>
          <div className={style.spinner} />
          <span>{translate('data_provider_loading_message', 'Loading...')}</span>
        </div>
      </div>
    )
  }

  if (credentialsError) {
    return (
      <div className={style.container}>
        <AppHeaderBar title={translate('credentials_overview_title', 'Credentials')} />
        <div className={style.emptyState}>
          <div className={style.emptyStateIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className={style.emptyStateTitle}>{translate('data_provider_error_title', 'Error')}</div>
          <div className={style.emptyStateDescription}>
            {translate('data_provider_error_message', 'Failed to load data. Please try again.')}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={style.container}>
      <AppHeaderBar title={translate('credentials_overview_title', 'Credentials')} />

      {error && (
        <div className={style.errorBanner}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
          <button onClick={() => setError(null)} className={style.errorClose}>
            &times;
          </button>
        </div>
      )}

      <div className={style.mainLayout}>
        {/* Content Area */}
        <div className={`${style.contentArea} ${selectedCredential ? style.contentAreaWithDetail : ''}`}>
          {/* Header with tabs, filters, and selection overlay */}
          <ListPageHeader
            tabs={headerTabs}
            activeTab={filterType}
            onTabChange={(tabId) => setFilterType(tabId as CredentialTypeFilter)}
            filters={headerFilters}
            selectionCount={selectedIds.size}
            onClearSelection={() => setSelectedIds(new Set())}
            onDeleteSelected={handleDeleteSelected}
            selectionLabel={{singular: 'credential', plural: 'credentials'}}
          />

          {/* Table */}
          {renderTable()}
        </div>

        {/* Detail Panel */}
        {renderDetailPanel()}
      </div>
    </div>
  )
}

// Sort Icon Component
const SortIcon: React.FC<{field: SortField; sortField: SortField; sortDirection: SortDirection}> = ({
  field,
  sortField,
  sortDirection,
}) => {
  if (sortField !== field) {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={style.sortIconInactive}>
        <path d="M6 2L9 5H3L6 2Z" fill="currentColor" />
        <path d="M6 10L3 7H9L6 10Z" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={style.sortIcon}>
      {sortDirection === 'asc' ? (
        <path d="M6 2L9 5H3L6 2Z" fill="currentColor" />
      ) : (
        <path d="M6 10L3 7H9L6 10Z" fill="currentColor" />
      )}
    </svg>
  )
}

export const getStaticProps = async ({locale = 'en'}: {locale?: string}) => staticPropsWithSST({locale})

export default CredentialsListPage
