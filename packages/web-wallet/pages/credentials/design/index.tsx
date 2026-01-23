import React, {useCallback, useMemo, useState} from 'react'
import {HttpError, useDelete, useList, useNavigation, useTranslate} from '@refinedev/core'
import {useNavigate} from 'react-router-dom'
import {CredentialMiniCardView, PrimaryButton, SSICredentialCardView} from '@sphereon/ui-components.ssi-react'
import {ButtonIcon} from '@sphereon/ui-components.core'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import ConfirmDeleteModal, {useConfirmDelete, useBulkDelete} from '@components/modals/ConfirmDeleteModal'
import {useListPageState} from '@/src/hooks/useListPageState'
import {staticPropsWithSST} from '@/src/i18n/server'
import {CredentialDesignTableItem, DataResource} from '@typings'
import {removeCredentialConfigurationFromOid4vciMetadata} from '@/src/services/credentials/credentialDesignService'
import {getEnv} from '@/src/services/env'
import style from './index.module.css'

type SortColumn = 'name' | 'format' | 'type'
type SortDirection = 'asc' | 'desc'

const CredentialDesignsListPage: React.FC = () => {
  const translate = useTranslate()
  const {create, edit} = useNavigation()
  const navigate = useNavigate()
  const {mutateAsync: deleteDesign} = useDelete<CredentialDesignTableItem, HttpError>()
  const allowCreateCredentialDesign = getEnv('BROWSER_PUBLIC_DISABLE_CREDENTIAL_DESIGN_INTERFACE') !== 'true'

  const [selectedDesign, setSelectedDesign] = useState<CredentialDesignTableItem | null>(null)

  const {
    selectedIds,
    selectionCount,
    isSelected,
    isAllSelected,
    isIndeterminate,
    toggleSelection,
    clearSelection,
    handleSelectAll: handleSelectAllItems,
    sortColumn,
    sortDirection,
    handleSort,
    openMenuId,
    menuPosition,
    toggleMenu,
    closeMenu,
  } = useListPageState<SortColumn>({
    defaultSortColumn: 'name',
    defaultSortDirection: 'asc',
    getItemId: (item: CredentialDesignTableItem) => item.id,
  })

  const {data: designsData, isLoading, isError, refetch} = useList<CredentialDesignTableItem, HttpError>({
    resource: DataResource.CREDENTIAL_DESIGNS,
    pagination: {
      pageSize: 100,
      current: 1,
      mode: 'server',
    },
    sorters: [{field: 'name', order: 'asc'}],
    meta: {idColumnName: 'id'},
  })

  const designs: CredentialDesignTableItem[] = designsData?.data ?? []

  // Helper functions
  const getCredentialFormat = useCallback((design: CredentialDesignTableItem): string => {
    const keyItem = design.metadataKeys.find(key => key.key === 'credentialFormat')
    return keyItem?.values?.[0]?.textValue ?? '-'
  }, [])

  const getCredentialTypes = useCallback((design: CredentialDesignTableItem): string => {
    const keyItem = design.metadataKeys.find(key => key.key === 'credentialType')
    return keyItem?.values?.map(v => v.textValue).join(', ') ?? '-'
  }, [])

  // Sort designs
  const sortedDesigns = useMemo(() => {
    const getSortValue = (design: CredentialDesignTableItem, column: SortColumn): string => {
      switch (column) {
        case 'name':
          return design.name?.toLowerCase() || ''
        case 'format':
          return getCredentialFormat(design).toLowerCase()
        case 'type':
          return getCredentialTypes(design).toLowerCase()
        default:
          return ''
      }
    }

    return [...designs].sort((a, b) => {
      const aVal = getSortValue(a, sortColumn)
      const bVal = getSortValue(b, sortColumn)

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [designs, sortColumn, sortDirection, getCredentialFormat, getCredentialTypes])

  // Delete confirmation hooks
  const singleDelete = useConfirmDelete({
    onConfirm: async (id: string) => {
      const design = designs.find(d => d.id === id)
      await deleteDesign({
        resource: DataResource.CREDENTIAL_DESIGNS,
        id: id,
      })
      if (design) {
        await removeCredentialConfigurationFromOid4vciMetadata(design.name)
      }
      if (selectedDesign?.id === id) {
        setSelectedDesign(null)
      }
    },
    onSuccess: () => {
      void refetch()
    },
    onError: err => {
      console.error('Failed to delete design:', err)
    },
  })

  const bulkDelete = useBulkDelete({
    onConfirm: async (ids: string[]) => {
      for (const id of ids) {
        const design = designs.find(d => d.id === id)
        await deleteDesign({
          resource: DataResource.CREDENTIAL_DESIGNS,
          id: id,
        })
        if (design) {
          await removeCredentialConfigurationFromOid4vciMetadata(design.name)
        }
        if (selectedDesign?.id === id) {
          setSelectedDesign(null)
        }
      }
    },
    onSuccess: () => {
      clearSelection()
      void refetch()
    },
    onError: err => {
      console.error('Failed to delete designs:', err)
    },
  })

  const handleDeleteSelected = useCallback((): void => {
    if (selectionCount === 0) return
    bulkDelete.openModal(Array.from(selectedIds))
  }, [selectionCount, selectedIds, bulkDelete])

  // Handle design actions
  const handleAction = useCallback((action: string, design: CredentialDesignTableItem, e: React.MouseEvent): void => {
    e.stopPropagation()
    closeMenu()

    switch (action) {
      case 'view':
        navigate(`/credentials/designs/show/${design.id}`)
        break
      case 'edit':
        edit(DataResource.CREDENTIAL_DESIGNS, design.id)
        break
      case 'delete':
        singleDelete.openModal(design.id, design.name)
        break
    }
  }, [closeMenu, navigate, edit, singleDelete])

  // Handle view from detail panel
  const handleView = useCallback((design: CredentialDesignTableItem): void => {
    navigate(`/credentials/designs/show/${design.id}`)
  }, [navigate])

  // Handle edit from detail panel
  const handleEdit = useCallback((design: CredentialDesignTableItem): void => {
    edit(DataResource.CREDENTIAL_DESIGNS, design.id)
  }, [edit])

  // Handle delete from detail panel
  const handleDelete = useCallback((design: CredentialDesignTableItem): void => {
    singleDelete.openModal(design.id, design.name)
  }, [singleDelete])

  // Navigate to create
  const handleCreateDesign = useCallback(async (): Promise<void> => {
    await create(DataResource.CREDENTIAL_DESIGNS)
  }, [create])

  // Render meatballs icon
  const renderMeatballsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  )

  // Render menu
  const renderMenu = (design: CredentialDesignTableItem) => {
    if (openMenuId !== design.id || !menuPosition) return null

    return (
      <>
        <div className={style.menuBackdrop} onClick={closeMenu} />
        <div className={style.menuDropdown} style={{top: menuPosition.top, left: menuPosition.left}}>
          <button className={style.menuItem} onClick={e => handleAction('view', design, e)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {translate('credential_design_actions_view', 'View Details')}
          </button>
          <button className={style.menuItem} onClick={e => handleAction('edit', design, e)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            {translate('credential_design_actions_edit', 'Edit')}
          </button>
          <div className={style.menuDivider} />
          <button className={`${style.menuItem} ${style.menuItemDanger}`} onClick={e => handleAction('delete', design, e)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            {translate('credential_design_actions_delete', 'Delete')}
          </button>
        </div>
      </>
    )
  }

  // Build mini card view props from design branding
  const getMiniCardViewProps = useCallback((design: CredentialDesignTableItem) => {
    const branding = design.credentialDesignBranding
    return {
      ...(branding?.backgroundImage && {
        backgroundImage: {
          uri: branding.backgroundImage.uri,
        },
      }),
      ...(branding?.backgroundColor && {
        backgroundColor: branding.backgroundColor,
      }),
      ...(branding?.textColor && {
        logoColor: branding.textColor,
      }),
      ...(branding?.logo && branding.logo.dimensions && {
        logo: {
          uri: branding.logo.uri,
          dimensions: {
            width: branding.logo.dimensions.width,
            height: branding.logo.dimensions.height,
          },
        },
      }),
    }
  }, [])

  // Render card preview using CredentialMiniCardView
  const renderCardPreview = (design: CredentialDesignTableItem) => {
    return (
      <div className={style.cardPreview}>
        <CredentialMiniCardView {...getMiniCardViewProps(design)} />
      </div>
    )
  }

  // Render table
  const renderTable = () => {
    if (sortedDesigns.length === 0) {
      return (
        <div className={style.emptyState}>
          <div className={style.emptyStateIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <line x1="7" y1="8" x2="17" y2="8" />
              <line x1="7" y1="12" x2="14" y2="12" />
              <line x1="7" y1="16" x2="11" y2="16" />
            </svg>
          </div>
          <div className={style.emptyStateTitle}>
            {translate('credential_designs_empty_title', 'No credential designs yet')}
          </div>
          <div className={style.emptyStateDescription}>
            {translate('credential_designs_empty_description', 'Create your first credential design to define the structure and appearance of verifiable credentials.')}
          </div>
          {allowCreateCredentialDesign && (
            <button className={style.emptyStateButton} onClick={handleCreateDesign}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {translate('credential_designs_overview_action_create_design', 'Create design')}
            </button>
          )}
        </div>
      )
    }

    return (
      <div className={`${style.table} ${selectedIds.size > 0 ? style.tableWithSelections : ''}`}>
        <div className={style.tableHeader}>
          <div className={style.checkboxCell}>
            <input
              type="checkbox"
              className={style.checkbox}
              checked={isAllSelected(sortedDesigns)}
              ref={input => {
                if (input) {
                  input.indeterminate = isIndeterminate(sortedDesigns)
                }
              }}
              onChange={e => handleSelectAllItems(sortedDesigns, e.target.checked)}
              aria-label="Select all"
            />
          </div>
          <div className={`${style.headerCell} ${style.cellPreview}`}>
            {translate('credential_design_fields_card', 'Preview')}
          </div>
          <div
            className={`${style.headerCell} ${style.headerCellSortable} ${style.cellName} ${sortColumn === 'name' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('name')}
            role="columnheader"
            aria-sort={sortColumn === 'name' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
          >
            {translate('credential_design_fields_identifier', 'Name')}
            <SortIcon field="name" sortColumn={sortColumn} sortDirection={sortDirection} />
          </div>
          <div
            className={`${style.headerCell} ${style.headerCellSortable} ${style.cellFormat} ${sortColumn === 'format' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('format')}
            role="columnheader"
            aria-sort={sortColumn === 'format' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
          >
            {translate('credential_design_fields_credential_format', 'Format')}
            <SortIcon field="format" sortColumn={sortColumn} sortDirection={sortDirection} />
          </div>
          <div
            className={`${style.headerCell} ${style.headerCellSortable} ${style.cellType} ${sortColumn === 'type' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('type')}
            role="columnheader"
            aria-sort={sortColumn === 'type' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
          >
            {translate('credential_design_fields_credential_type', 'Type')}
            <SortIcon field="type" sortColumn={sortColumn} sortDirection={sortDirection} />
          </div>
          <div className={`${style.headerCell} ${style.cellActions}`} />
        </div>

        {sortedDesigns.map(design => (
          <div
            key={design.id}
            className={`${style.tableRow} ${selectedDesign?.id === design.id ? style.selected : ''}`}
            onClick={() => setSelectedDesign(design)}
            onDoubleClick={() => handleView(design)}
            role="row"
            tabIndex={0}
          >
            <div className={style.checkboxCell}>
              <input
                type="checkbox"
                checked={isSelected(design.id)}
                onChange={() => {}}
                onClick={e => {
                  e.stopPropagation()
                  toggleSelection(design.id)
                }}
                className={style.checkbox}
                aria-label={`Select ${design.name}`}
              />
            </div>
            <div className={`${style.cell} ${style.cellPreview}`}>
              {renderCardPreview(design)}
            </div>
            <div className={`${style.cell} ${style.cellName}`}>
              <span className={style.designName}>{design.name || '-'}</span>
            </div>
            <div className={`${style.cell} ${style.cellFormat}`}>
              <span className={style.secondaryValue}>{getCredentialFormat(design)}</span>
            </div>
            <div className={`${style.cell} ${style.cellType}`}>
              <span className={style.typeValue}>{getCredentialTypes(design)}</span>
            </div>
            <div className={`${style.cell} ${style.cellActions}`}>
              <div className={style.menuContainer}>
                <button
                  type="button"
                  className={style.meatballsButton}
                  onClick={e => toggleMenu(design.id, e)}
                  onMouseDown={e => e.stopPropagation()}
                  aria-label="Open menu"
                >
                  {renderMeatballsIcon()}
                </button>
                {renderMenu(design)}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Build full card view props from design branding
  const getFullCardViewProps = useCallback((design: CredentialDesignTableItem) => {
    const branding = design.credentialDesignBranding
    return {
      header: {
        ...(branding?.logo && branding.logo.dimensions && {
          logo: {
            uri: branding.logo.uri,
            dimensions: {
              width: branding.logo.dimensions.width,
              height: branding.logo.dimensions.height,
            },
          },
        }),
      },
      footer: {},
      display: {
        ...(branding?.backgroundImage && {
          backgroundImage: {
            uri: branding.backgroundImage.uri,
          },
        }),
        ...(branding?.backgroundColor && {
          backgroundColor: branding.backgroundColor,
        }),
        ...(branding?.textColor && {
          textColor: branding.textColor,
        }),
      },
    }
  }, [])

  // Render detail panel
  const renderDetailPanel = () => {
    if (!selectedDesign) return null

    const format = getCredentialFormat(selectedDesign)
    const types = getCredentialTypes(selectedDesign)

    return (
      <div className={style.detailPanel}>
        <div className={style.detailHeader}>
          <h2 className={style.detailTitle}>{translate('credential_design_detail_title', 'Design Details')}</h2>
          <button className={style.closeButton} onClick={() => setSelectedDesign(null)} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={style.detailBody}>
          {/* Design Card using SSICredentialCardView */}
          <div className={style.designCard}>
            <div className={style.designCardPreview}>
              <SSICredentialCardView {...getFullCardViewProps(selectedDesign)} />
            </div>
            <div className={style.designCardInfo}>
              <span className={style.designCardName}>{selectedDesign.name}</span>
              <span className={style.designCardFormat}>{format}</span>
            </div>
          </div>

          {/* Metadata Section */}
          <div className={style.metadataSection}>
            <div className={style.metadataBorder} />
            <div className={style.metadataContent}>
              <div className={style.metadataTitle}>{translate('credential_design_metadata_title', 'Details')}</div>
              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>{translate('credential_design_fields_identifier', 'Name')}</span>
                <span className={style.metadataValue}>{selectedDesign.name}</span>
              </div>
              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>{translate('credential_design_fields_credential_format', 'Format')}</span>
                <span className={style.metadataValue}>{format}</span>
              </div>
              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>{translate('credential_design_fields_credential_type', 'Type')}</span>
                <span className={style.metadataValue}>{types}</span>
              </div>
            </div>
          </div>

          {/* View Full Details button in body */}
          <button className={style.viewFullButton} onClick={() => handleView(selectedDesign)}>
            {translate('action_view_full_details', 'View Full Details')}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
        </div>

        {/* Footer with Actions */}
        <div className={style.detailFooter}>
          <button className={style.editButton} onClick={() => handleEdit(selectedDesign)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            {translate('credential_design_actions_edit', 'Edit')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={style.container}>
      <AppHeaderBar title={translate('credential_designs_overview_title', 'Credential Designs')} />

      <div className={style.mainLayout}>
        {/* Content Area */}
        <div className={`${style.contentArea} ${selectedDesign ? style.contentAreaWithDetail : ''}`}>
          {/* Header Navigation */}
          <div className={style.headerNavigation}>
            <div className={style.headerTitle}>
              {translate('credential_designs_all', 'All Designs')}
              {designs.length > 0 && <span className={style.headerBadge}>{designs.length}</span>}
            </div>
            <div className={style.headerSpacer} />
            <div className={style.actionButtonContainer}>
              {allowCreateCredentialDesign && (
                <PrimaryButton
                  caption={translate('credential_designs_overview_action_create_design', 'Create design')}
                  icon={ButtonIcon.ADD}
                  onClick={handleCreateDesign}
                />
              )}
            </div>

            {/* Selection Actions Overlay */}
            {selectionCount > 0 && (
              <div className={style.selectionOverlay}>
                <div className={style.selectionInfo}>
                  <button
                    type="button"
                    className={style.deselectButton}
                    onClick={clearSelection}
                    aria-label={translate('action_deselect_all', 'Deselect all')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                  <span className={style.selectionCount}>
                    {selectionCount} {selectionCount === 1 ? 'item' : 'items'} selected
                  </span>
                </div>
                <button
                  type="button"
                  className={style.bulkDeleteButton}
                  onClick={handleDeleteSelected}
                  aria-label={translate('action_delete_selected', 'Delete selected')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  {translate('action_delete_selected', 'Delete')}
                </button>
              </div>
            )}
          </div>

          {/* Error Banner */}
          {isError && (
            <div className={style.errorBanner}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>
                {translate('credential_designs_connection_error', 'Unable to connect to the credential design service.')}
              </span>
            </div>
          )}

          {/* Table Content */}
          {isLoading ? (
            <div className={style.loadingState}>
              <div className={style.spinner} />
              <span>{translate('loading', 'Loading...')}</span>
            </div>
          ) : (
            <div className={style.tableContainer}>
              {renderTable()}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {renderDetailPanel()}
      </div>

      {/* Delete Confirmation Modals */}
      <ConfirmDeleteModal
        isOpen={singleDelete.isOpen}
        title="Delete Credential Design"
        message="Are you sure you want to delete this credential design? This action cannot be undone."
        itemName={singleDelete.itemName ?? undefined}
        onCancel={singleDelete.closeModal}
        onConfirm={singleDelete.handleConfirm}
        isLoading={singleDelete.isLoading}
      />
      <ConfirmDeleteModal
        isOpen={bulkDelete.isOpen}
        title="Delete Credential Designs"
        message="Are you sure you want to delete these credential designs? This action cannot be undone."
        itemCount={bulkDelete.itemIds.length}
        onCancel={bulkDelete.closeModal}
        onConfirm={bulkDelete.handleConfirm}
        isLoading={bulkDelete.isLoading}
      />
    </div>
  )
}

// Sort Icon Component
const SortIcon: React.FC<{field: SortColumn; sortColumn: SortColumn; sortDirection: SortDirection}> = ({
  field,
  sortColumn,
  sortDirection,
}) => {
  if (sortColumn !== field) {
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

export default CredentialDesignsListPage
