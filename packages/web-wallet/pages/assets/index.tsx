import React, {useCallback, useEffect, useState, useMemo, useRef} from 'react'
import {useTranslate} from '@refinedev/core'
import {PrimaryButton} from '@sphereon/ui-components.ssi-react'
import {ButtonIcon} from '@sphereon/ui-components.core'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import StatusBadge from '@components/badges/StatusBadge'
import {ListPageHeader, TabItem, FilterDropdown} from '@components/tables'
import {staticPropsWithSST} from '@/src/i18n/server'
import {
  Asset,
  AssetType,
  fetchAssets,
  uploadAsset,
  deleteAsset,
  unpublishAsset,
  formatFileSize,
  getAssetTypeName,
  getAssetPublicUrl,
  publishAssetForEvidence,
} from '@/src/services/assetService'
import style from './index.module.css'

type SortField = 'filename' | 'assetType' | 'fileSize' | 'isPublic' | 'createdAt'
type SortDirection = 'asc' | 'desc'
type VisibilityFilter = 'all' | 'public' | 'private'

// Tab configuration for visibility filter
const VISIBILITY_TABS: {value: VisibilityFilter; labelKey: string; defaultLabel: string}[] = [
  {value: 'all', labelKey: 'assets_filter_all', defaultLabel: 'All'},
  {value: 'public', labelKey: 'assets_filter_public', defaultLabel: 'Public'},
  {value: 'private', labelKey: 'assets_filter_private', defaultLabel: 'Private'},
]

const AssetsListPage: React.FC = () => {
  const translate = useTranslate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filterType, setFilterType] = useState<AssetType | ''>('')
  const [filterPublic, setFilterPublic] = useState<VisibilityFilter>('all')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{top: number; left: number} | null>(null)

  const loadAssets = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const options: {assetType?: AssetType; isPublic?: boolean} = {}
      if (filterType) {
        options.assetType = filterType
      }
      if (filterPublic === 'public') {
        options.isPublic = true
      } else if (filterPublic === 'private') {
        options.isPublic = false
      }

      const response = await fetchAssets(options)
      setAssets(response.assets)
    } catch (err) {
      console.error('[AssetsListPage] Error loading assets:', err)
      setError('Failed to load assets. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [filterType, filterPublic])

  useEffect(() => {
    loadAssets()
  }, [loadAssets])

  const handleUpload = useCallback(async (file: File) => {
    try {
      setUploading(true)
      setError(null)

      // Detect asset type from file
      let assetType: AssetType = 'Other'
      const ext = file.name.toLowerCase().split('.').pop()
      const mimeType = file.type.toLowerCase()

      if (ext === 'xml' || mimeType === 'application/xml' || mimeType === 'text/xml') {
        // Check if it's a UBL invoice
        assetType = 'XMLDocument'
        // Read file to check for UBL namespace
        const text = await file.text()
        if (text.includes('urn:oasis:names:specification:ubl')) {
          assetType = 'UBLInvoice'
        }
      } else if (ext === 'json' || mimeType === 'application/json') {
        assetType = 'JSONDocument'
      } else if (ext === 'pdf' || mimeType === 'application/pdf') {
        assetType = 'PDF'
      } else if (mimeType.startsWith('image/')) {
        assetType = 'Image'
      } else if (mimeType.startsWith('text/')) {
        assetType = 'Document'
      }

      const newAsset = await uploadAsset(file, {assetType})
      setAssets((prev) => [newAsset, ...prev])
      setSelectedAsset(newAsset)
    } catch (err) {
      console.error('[AssetsListPage] Error uploading asset:', err)
      setError('Failed to upload asset. Please try again.')
    } finally {
      setUploading(false)
    }
  }, [])

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      if (files && files.length > 0) {
        handleUpload(files[0])
      }
      // Reset input
      event.target.value = ''
    },
    [handleUpload]
  )

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      const files = event.dataTransfer.files
      if (files && files.length > 0) {
        handleUpload(files[0])
      }
    },
    [handleUpload]
  )

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }, [])

  const handlePublish = useCallback(async (asset: Asset) => {
    try {
      const updated = await publishAssetForEvidence(asset.id)
      setAssets((prev) => prev.map((a) => (a.id === asset.id ? updated : a)))
      setSelectedAsset(updated)
    } catch (err) {
      console.error('[AssetsListPage] Error publishing asset:', err)
      setError('Failed to publish asset. Please try again.')
    }
  }, [])

  const handleUnpublish = useCallback(async (asset: Asset) => {
    try {
      const updated = await unpublishAsset(asset.id)
      setAssets((prev) => prev.map((a) => (a.id === asset.id ? updated : a)))
      setSelectedAsset(updated)
    } catch (err) {
      console.error('[AssetsListPage] Error unpublishing asset:', err)
      setError('Failed to unpublish asset. Please try again.')
    }
  }, [])

  const handleDelete = useCallback(
    async (asset: Asset) => {
      if (!confirm(`Are you sure you want to delete "${asset.filename}"?`)) {
        return
      }

      try {
        await deleteAsset(asset.id)
        setAssets((prev) => prev.filter((a) => a.id !== asset.id))
        if (selectedAsset?.id === asset.id) {
          setSelectedAsset(null)
        }
      } catch (err) {
        console.error('[AssetsListPage] Error deleting asset:', err)
        setError('Failed to delete asset. Please try again.')
      }
    },
    [selectedAsset]
  )

  const handleCopyUrl = useCallback((asset: Asset) => {
    // Prefer publicUrl from backend, fall back to local computation
    const url = asset.publicUrl || getAssetPublicUrl(asset.digestMultibase)
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(asset.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }, [])

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortField(field)
        setSortDirection('asc')
      }
    },
    [sortField]
  )

  // Sort assets
  const sortedAssets = [...assets].sort((a, b) => {
    let comparison = 0
    switch (sortField) {
      case 'filename':
        comparison = a.filename.localeCompare(b.filename)
        break
      case 'assetType':
        comparison = a.assetType.localeCompare(b.assetType)
        break
      case 'fileSize':
        comparison = a.fileSize - b.fileSize
        break
      case 'isPublic':
        comparison = (a.isPublic ? 1 : 0) - (b.isPublic ? 1 : 0)
        break
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
    }
    return sortDirection === 'asc' ? comparison : -comparison
  })

  // Selection handlers (must be after sortedAssets is defined)
  const handleToggleSelection = useCallback((id: string, e: React.MouseEvent): void => {
    e.stopPropagation()
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(
    (selectAll: boolean): void => {
      if (selectAll) {
        const allIds = new Set(sortedAssets.map((a) => a.id))
        setSelectedIds(allIds)
      } else {
        setSelectedIds(new Set())
      }
    },
    [sortedAssets]
  )

  const handleDeleteSelected = useCallback(async (): Promise<void> => {
    if (selectedIds.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} asset(s)?`)) return

    const idsToDelete = Array.from(selectedIds)
    for (const id of idsToDelete) {
      try {
        await deleteAsset(id)
        setAssets((prev) => prev.filter((a) => a.id !== id))
        if (selectedAsset?.id === id) {
          setSelectedAsset(null)
        }
      } catch (err) {
        console.error('[AssetsListPage] Error deleting asset:', id, err)
      }
    }
    setSelectedIds(new Set())
  }, [selectedIds, selectedAsset])

  // Get visibility count
  const getVisibilityCount = useCallback(
    (visibility: VisibilityFilter): number => {
      if (visibility === 'all') return assets.length
      return assets.filter((a) => (visibility === 'public' ? a.isPublic : !a.isPublic)).length
    },
    [assets]
  )

  // Build tabs for ListPageHeader (visibility filter)
  const headerTabs: TabItem[] = useMemo(() => {
    return VISIBILITY_TABS.map((tab) => ({
      id: tab.value,
      label: translate(tab.labelKey, tab.defaultLabel) as string,
      count: getVisibilityCount(tab.value),
      icon: tab.value === 'all' ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      ) : tab.value === 'public' ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
    }))
  }, [translate, getVisibilityCount])

  // Build filters for ListPageHeader (type filter)
  const headerFilters: FilterDropdown[] = useMemo(() => {
    return [{
      id: 'type',
      value: filterType,
      onChange: (value: string) => setFilterType(value as AssetType | ''),
      options: [
        {value: '', label: translate('assets_filter_all_types', 'All Types') as string},
        {value: 'UBLInvoice', label: translate('assets_type_ubl_invoice', 'UBL Invoice') as string},
        {value: 'SupportingDocument', label: translate('assets_type_supporting', 'Supporting Document') as string},
        {value: 'Document', label: translate('assets_type_document', 'Document') as string},
        {value: 'XMLDocument', label: translate('assets_type_xml', 'XML Document') as string},
        {value: 'JSONDocument', label: translate('assets_type_json', 'JSON Document') as string},
        {value: 'PDF', label: translate('assets_type_pdf', 'PDF') as string},
        {value: 'Image', label: translate('assets_type_image', 'Image') as string},
        {value: 'Binary', label: translate('assets_type_binary', 'Binary') as string},
        {value: 'Other', label: translate('assets_type_other', 'Other') as string},
      ],
    }]
  }, [filterType, translate])

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

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
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 180,
      })
      return id
    })
  }, [])

  const handleCloseMenu = useCallback((): void => {
    setOpenMenuId(null)
    setMenuPosition(null)
  }, [])

  const handleMenuAction = useCallback(
    async (action: string, asset: Asset, e: React.MouseEvent): Promise<void> => {
      e.stopPropagation()
      handleCloseMenu()

      switch (action) {
        case 'details':
          setSelectedAsset(asset)
          break
        case 'copyUrl':
          handleCopyUrl(asset)
          break
        case 'publish':
          await handlePublish(asset)
          break
        case 'unpublish':
          await handleUnpublish(asset)
          break
        case 'delete':
          await handleDelete(asset)
          break
      }
    },
    [handleCloseMenu, handleCopyUrl, handlePublish, handleUnpublish, handleDelete]
  )

  // Render meatballs icon
  const renderMeatballsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  )

  // Render menu for asset
  const renderAssetMenu = (asset: Asset) => {
    if (openMenuId !== asset.id || !menuPosition) return null

    return (
      <>
        <div className={style.menuBackdrop} onClick={handleCloseMenu} />
        <div className={style.menuDropdown} style={{top: menuPosition.top, left: menuPosition.left}}>
          <button className={style.menuItem} onClick={(e) => handleMenuAction('details', asset, e)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            {translate('action_details_label', 'Details')}
          </button>
          {asset.isPublic && (
            <>
              <button className={style.menuItem} onClick={(e) => handleMenuAction('copyUrl', asset, e)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                {translate('action_copy_url_label', 'Copy URL')}
              </button>
              <button className={style.menuItem} onClick={(e) => handleMenuAction('unpublish', asset, e)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                {translate('action_make_private_label', 'Make Private')}
              </button>
            </>
          )}
          {!asset.isPublic && (
            <button className={style.menuItem} onClick={(e) => handleMenuAction('publish', asset, e)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
              {translate('action_make_public_label', 'Make Public')}
            </button>
          )}
          <div className={style.menuDivider} />
          <button
            className={`${style.menuItem} ${style.menuItemDanger}`}
            onClick={(e) => handleMenuAction('delete', asset, e)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            {translate('action_delete_label', 'Delete')}
          </button>
        </div>
      </>
    )
  }

  // Render table
  const renderTable = () => (
    <div className={style.tableContainer} onDrop={handleDrop} onDragOver={handleDragOver}>
      {/* Table */}
      {sortedAssets.length === 0 ? (
        <div className={style.emptyState}>
          <div className={style.emptyStateIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </div>
          <div className={style.emptyStateTitle}>{translate('assets_empty_title', 'No Documents Yet')}</div>
          <div className={style.emptyStateDescription}>
            {translate('assets_empty_description', 'Upload your first document by clicking the button above or drag and drop files here.')}
          </div>
          <button className={style.emptyStateButton} onClick={() => fileInputRef.current?.click()}>
            {translate('assets_overview_action_add_asset', 'Upload Document')}
          </button>
        </div>
      ) : (
        <div className={`${style.table} ${selectedIds.size > 0 ? style.tableWithSelections : ''}`}>
          <div className={style.tableHeader}>
            <div className={style.checkboxCell}>
              <input
                type="checkbox"
                className={style.checkbox}
                checked={sortedAssets.length > 0 && selectedIds.size === sortedAssets.length}
                ref={(input) => {
                  if (input) {
                    input.indeterminate = selectedIds.size > 0 && selectedIds.size < sortedAssets.length
                  }
                }}
                onChange={(e) => handleSelectAll(e.target.checked)}
                aria-label="Select all"
              />
            </div>
            <div
              className={`${style.headerCell} ${style.cellName} ${style.sortable} ${sortField === 'filename' ? style.headerCellSorted : ''}`}
              onClick={() => handleSort('filename')}
            >
              {translate('asset_fields_name', 'Name')}
              <SortIcon field="filename" sortField={sortField} sortDirection={sortDirection} />
            </div>
            <div
              className={`${style.headerCell} ${style.cellType} ${style.sortable} ${sortField === 'assetType' ? style.headerCellSorted : ''}`}
              onClick={() => handleSort('assetType')}
            >
              {translate('asset_fields_type', 'Type')}
              <SortIcon field="assetType" sortField={sortField} sortDirection={sortDirection} />
            </div>
            <div
              className={`${style.headerCell} ${style.cellSize} ${style.sortable} ${sortField === 'fileSize' ? style.headerCellSorted : ''}`}
              onClick={() => handleSort('fileSize')}
            >
              {translate('asset_fields_size', 'Size')}
              <SortIcon field="fileSize" sortField={sortField} sortDirection={sortDirection} />
            </div>
            <div
              className={`${style.headerCell} ${style.cellStatus} ${style.sortable} ${sortField === 'isPublic' ? style.headerCellSorted : ''}`}
              onClick={() => handleSort('isPublic')}
            >
              {translate('asset_fields_status', 'Status')}
              <SortIcon field="isPublic" sortField={sortField} sortDirection={sortDirection} />
            </div>
            <div
              className={`${style.headerCell} ${style.cellDate} ${style.sortable} ${sortField === 'createdAt' ? style.headerCellSorted : ''}`}
              onClick={() => handleSort('createdAt')}
            >
              {translate('asset_fields_created', 'Created')}
              <SortIcon field="createdAt" sortField={sortField} sortDirection={sortDirection} />
            </div>
            <div className={`${style.headerCell} ${style.cellActions}`} />
          </div>

          {sortedAssets.map((asset) => (
            <div
              key={asset.id}
              className={`${style.tableRow} ${selectedAsset?.id === asset.id ? style.selected : ''}`}
              onClick={() => setSelectedAsset(asset)}
              role="row"
              tabIndex={0}
            >
              <div className={style.checkboxCell}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(asset.id)}
                  onChange={() => {}}
                  onClick={(e) => handleToggleSelection(asset.id, e)}
                  className={style.checkbox}
                  aria-label={`Select ${asset.filename}`}
                />
              </div>
              <div className={`${style.cell} ${style.cellName}`}>
                <span className={style.filename} title={asset.filename}>
                  {asset.originalFilename || asset.filename}
                </span>
              </div>
              <div className={`${style.cell} ${style.cellType}`}>
                <span className={style.assetTypeBadge}>{getAssetTypeName(asset.assetType)}</span>
              </div>
              <div className={`${style.cell} ${style.cellSize}`}>{formatFileSize(asset.fileSize)}</div>
              <div className={`${style.cell} ${style.cellStatus}`}>
                <StatusBadge
                  label={asset.isPublic ? translate('assets_status_public', 'Public') : translate('assets_status_private', 'Private')}
                  variant={asset.isPublic ? 'valid' : 'pending'}
                  size="small"
                />
              </div>
              <div className={`${style.cell} ${style.cellDate}`}>{formatDate(asset.createdAt)}</div>
              <div className={`${style.cell} ${style.cellActions}`}>
                <div className={style.menuContainer}>
                  <button
                    type="button"
                    className={style.meatballsButton}
                    onClick={(e) => handleToggleMenu(asset.id, e)}
                    onMouseDown={(e) => e.stopPropagation()}
                    aria-label="Open menu"
                  >
                    {renderMeatballsIcon()}
                  </button>
                  {renderAssetMenu(asset)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  if (loading && assets.length === 0) {
    return (
      <div className={style.container}>
        <AppHeaderBar title={translate('assets_overview_title', 'Documents')} />
        <div className={style.loadingState}>
          <div className={style.spinner} />
          <span>{translate('data_provider_loading_message', 'Loading...')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={style.container}>
      <AppHeaderBar title={translate('assets_overview_title', 'Documents')} />

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
        <div className={`${style.contentArea} ${selectedAsset ? style.contentAreaWithDetail : ''}`}>
          {/* Header with tabs, filters, and selection overlay */}
          <ListPageHeader
            tabs={headerTabs}
            activeTab={filterPublic}
            onTabChange={(tabId) => setFilterPublic(tabId as VisibilityFilter)}
            filters={headerFilters}
            selectionCount={selectedIds.size}
            onClearSelection={() => setSelectedIds(new Set())}
            onDeleteSelected={handleDeleteSelected}
            selectionLabel={{singular: 'document', plural: 'documents'}}
            actions={
              <PrimaryButton
                caption={uploading ? translate('assets_uploading', 'Uploading...') : translate('assets_overview_action_add_asset', 'Upload Document')}
                icon={ButtonIcon.ADD}
                onClick={async () => { fileInputRef.current?.click() }}
                disabled={uploading}
              />
            }
          />

          {/* Table */}
          {renderTable()}
        </div>

        {/* Detail Panel */}
        {selectedAsset && (
          <div className={style.detailPanel}>
            <div className={style.detailHeader}>
              <h3 className={style.detailTitle}>{translate('assets_detail_title', 'Document Details')}</h3>
              <button className={style.closeButton} onClick={() => setSelectedAsset(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className={style.detailBody}>
              {/* Filename Card */}
              <div className={style.filenameCard}>
                <div className={style.filenameIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div className={style.filenameInfo}>
                  <span className={style.filenameText}>{selectedAsset.originalFilename || selectedAsset.filename}</span>
                  <span className={style.filenameType}>{getAssetTypeName(selectedAsset.assetType)}</span>
                </div>
                <StatusBadge
                  label={selectedAsset.isPublic ? 'Public' : 'Private'}
                  variant={selectedAsset.isPublic ? 'valid' : 'pending'}
                  size="small"
                />
              </div>

              {/* Metadata Section - with purple left border */}
              <section className={style.metadataSection}>
                <div className={style.metadataBorder} />
                <div className={style.metadataContent}>
                  <div className={style.metadataTitle}>{translate('assets_detail_info', 'Information')}</div>
                  <div className={style.metadataRow}>
                    <span className={style.metadataLabel}>{translate('assets_detail_content_type', 'Content Type')}</span>
                    <span className={style.metadataValue}>{selectedAsset.contentType}</span>
                  </div>
                  <div className={style.metadataRow}>
                    <span className={style.metadataLabel}>{translate('assets_detail_size', 'Size')}</span>
                    <span className={style.metadataValue}>{formatFileSize(selectedAsset.fileSize)}</span>
                  </div>
                  <div className={style.metadataRow}>
                    <span className={style.metadataLabel}>{translate('assets_detail_hash', 'Hash Algorithm')}</span>
                    <span className={style.metadataValue}>{selectedAsset.hashAlgorithm.toUpperCase()}</span>
                  </div>
                  <div className={style.metadataRow}>
                    <span className={style.metadataLabel}>{translate('assets_detail_digest', 'Digest')}</span>
                    <span className={style.metadataValueMono}>{selectedAsset.digestMultibase}</span>
                  </div>
                  <div className={style.metadataRow}>
                    <span className={style.metadataLabel}>{translate('assets_detail_created', 'Created')}</span>
                    <span className={style.metadataValue}>{formatDate(selectedAsset.createdAt)}</span>
                  </div>
                  <div className={style.metadataRow}>
                    <span className={style.metadataLabel}>{translate('assets_detail_updated', 'Updated')}</span>
                    <span className={style.metadataValue}>{formatDate(selectedAsset.updatedAt)}</span>
                  </div>
                  {selectedAsset.isPublic && (
                    <>
                      {selectedAsset.availableFrom && (
                        <div className={style.metadataRow}>
                          <span className={style.metadataLabel}>{translate('assets_detail_available_from', 'Available From')}</span>
                          <span className={style.metadataValue}>{formatDate(selectedAsset.availableFrom)}</span>
                        </div>
                      )}
                      {selectedAsset.availableUntil && (
                        <div className={style.metadataRow}>
                          <span className={style.metadataLabel}>{translate('assets_detail_available_until', 'Available Until')}</span>
                          <span className={style.metadataValue}>{formatDate(selectedAsset.availableUntil)}</span>
                        </div>
                      )}
                    </>
                  )}
                  {selectedAsset.credentialId && (
                    <div className={style.metadataRow}>
                      <span className={style.metadataLabel}>{translate('assets_detail_credential', 'Linked Credential')}</span>
                      <span className={style.metadataValueMono}>{selectedAsset.credentialId}</span>
                    </div>
                  )}
                  {selectedAsset.description && (
                    <div className={style.metadataRow}>
                      <span className={style.metadataLabel}>{translate('assets_detail_description', 'Description')}</span>
                      <span className={style.metadataValue}>{selectedAsset.description}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Public URL Section */}
              {selectedAsset.isPublic && (
                <section className={style.urlSection}>
                  <div className={style.urlTitle}>{translate('assets_detail_public_url', 'Public URL')}</div>
                  <div className={style.urlValue}>
                    {selectedAsset.publicUrl || getAssetPublicUrl(selectedAsset.digestMultibase)}
                  </div>
                  <button
                    className={style.copyButton}
                    onClick={() => handleCopyUrl(selectedAsset)}
                  >
                    {copiedId === selectedAsset.id ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {translate('assets_url_copied', 'Copied!')}
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        {translate('assets_copy_url', 'Copy URL')}
                      </>
                    )}
                  </button>
                </section>
              )}
            </div>

            <div className={style.detailFooter}>
              {selectedAsset.isPublic ? (
                <button className={style.secondaryButton} onClick={() => handleUnpublish(selectedAsset)}>
                  {translate('action_make_private_label', 'Make Private')}
                </button>
              ) : (
                <button className={style.primaryButton} onClick={() => handlePublish(selectedAsset)}>
                  {translate('action_make_public_label', 'Publish (7 Years)')}
                </button>
              )}
              <button className={style.dangerButton} onClick={() => handleDelete(selectedAsset)}>
                {translate('action_delete_label', 'Delete')}
              </button>
            </div>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" onChange={handleFileSelect} style={{display: 'none'}} />
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

export default AssetsListPage
