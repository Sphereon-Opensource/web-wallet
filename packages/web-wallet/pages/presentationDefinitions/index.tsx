import React, {useCallback, useMemo, useState} from 'react'
import {HttpError, useList, useNavigation, useTranslate, useDeleteMany, useDataProvider} from '@refinedev/core'
import {PrimaryButton} from '@sphereon/ui-components.ssi-react'
import {ButtonIcon} from '@sphereon/ui-components.core'
import ManagementIcon from '@sphereon/ui-components.ssi-react/dist/components/assets/icons/Management'
import type {DcqlQueryItem} from '@sphereon/ssi-sdk.data-store-types'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import {ListPageHeader, TabItem} from '@components/tables'
import {DataProvider, DataResource} from '@typings'
import {staticPropsWithSST} from '@/src/i18n/server'
import style from './index.module.css'

type SortField = 'queryId' | 'purpose' | 'version'
type SortDirection = 'asc' | 'desc'

interface QueryTableItem extends DcqlQueryItem {
  displayId: string
}

const PresentationDefinitionsListPage: React.FC = () => {
  const translate = useTranslate()
  const {show, create, edit} = useNavigation()
  const dataProvider = useDataProvider()

  const [selectedQuery, setSelectedQuery] = useState<QueryTableItem | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>('queryId')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{top: number; left: number} | null>(null)

  const {mutateAsync: deleteQueries} = useDeleteMany<DcqlQueryItem[], HttpError>()

  const {
    data: queryData,
    isError,
    isLoading,
    refetch,
  } = useList<DcqlQueryItem, HttpError>({
    resource: DataResource.QUERIES,
  })

  const queries: QueryTableItem[] = useMemo(() => {
    if (!queryData?.data) return []
    return queryData.data.map(item => ({
      ...item,
      displayId: item.id.length > 20 ? `${item.id.substring(0, 8)}...${item.id.substring(item.id.length - 8)}` : item.id,
    }))
  }, [queryData?.data])

  // Sort queries
  const sortedQueries = useMemo(() => {
    return [...queries].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'queryId':
          comparison = (a.queryId || '').localeCompare(b.queryId || '')
          break
        case 'purpose':
          comparison = (a.purpose || '').localeCompare(b.purpose || '')
          break
        case 'version':
          comparison = (a.version || '').localeCompare(b.version || '')
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [queries, sortField, sortDirection])

  // Handle sort
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortField(field)
        setSortDirection('asc')
      }
    },
    [sortField],
  )

  // Handle create
  const handleCreate = useCallback(() => {
    create(DataResource.QUERIES)
  }, [create])

  // Handle view details
  const handleView = useCallback(
    (query: QueryTableItem) => {
      show(DataResource.QUERIES, query.id)
    },
    [show],
  )

  // Handle edit
  const handleEdit = useCallback(
    (query: QueryTableItem) => {
      edit(DataResource.QUERIES, query.id)
    },
    [edit],
  )

  // Handle delete
  const handleDelete = useCallback(
    async (query: QueryTableItem): Promise<void> => {
      try {
        // Get all versions of this query
        const allVersions = await dataProvider(DataProvider.QUERIES).getList<DcqlQueryItem>({
          resource: DataResource.QUERIES,
          filters: [
            {field: 'queryId', operator: 'eq', value: query.queryId},
            {field: 'tenantId', operator: 'eq', value: query.tenantId},
          ],
          meta: {
            variables: {showVersionHistory: true},
          },
        })

        if (allVersions.data) {
          await deleteQueries({
            resource: DataResource.QUERIES,
            ids: allVersions.data.map((item: DcqlQueryItem) => item.id),
          })
        }

        if (selectedQuery?.id === query.id) {
          setSelectedQuery(null)
        }
        setSelectedIds(prev => {
          const next = new Set(prev)
          next.delete(query.id)
          return next
        })

        await refetch()
      } catch (error) {
        console.error('Failed to delete query:', error)
      }
    },
    [dataProvider, deleteQueries, selectedQuery, refetch],
  )

  // Selection handlers
  const handleToggleSelection = useCallback((id: string, e: React.MouseEvent): void => {
    e.stopPropagation()
    setSelectedIds(prev => {
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
        const allIds = new Set(sortedQueries.map(q => q.id))
        setSelectedIds(allIds)
      } else {
        setSelectedIds(new Set())
      }
    },
    [sortedQueries],
  )

  const handleDeleteSelected = useCallback(async (): Promise<void> => {
    const idsToDelete = Array.from(selectedIds)
    const queriesToDelete = queries.filter(q => idsToDelete.includes(q.id))

    for (const query of queriesToDelete) {
      try {
        // Get all versions of this query
        const allVersions = await dataProvider(DataProvider.QUERIES).getList<DcqlQueryItem>({
          resource: DataResource.QUERIES,
          filters: [
            {field: 'queryId', operator: 'eq', value: query.queryId},
            {field: 'tenantId', operator: 'eq', value: query.tenantId},
          ],
          meta: {
            variables: {showVersionHistory: true},
          },
        })

        if (allVersions.data) {
          await deleteQueries({
            resource: DataResource.QUERIES,
            ids: allVersions.data.map((item: DcqlQueryItem) => item.id),
          })
        }
      } catch (error) {
        console.error('Failed to delete query:', query.id, error)
      }
    }

    if (selectedQuery && idsToDelete.includes(selectedQuery.id)) {
      setSelectedQuery(null)
    }
    setSelectedIds(new Set())
    await refetch()
  }, [selectedIds, queries, dataProvider, deleteQueries, selectedQuery, refetch])

  // Menu handlers
  const handleToggleMenu = useCallback((id: string, e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation()
    e.preventDefault()

    const button = e.currentTarget
    const rect = button.getBoundingClientRect()

    setOpenMenuId(prev => {
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
    async (action: string, query: QueryTableItem, e: React.MouseEvent): Promise<void> => {
      e.stopPropagation()
      handleCloseMenu()

      switch (action) {
        case 'details':
          setSelectedQuery(query)
          break
        case 'view':
          handleView(query)
          break
        case 'edit':
          handleEdit(query)
          break
        case 'delete':
          await handleDelete(query)
          break
      }
    },
    [handleCloseMenu, handleView, handleEdit, handleDelete],
  )

  // Build tabs for ListPageHeader
  const headerTabs: TabItem[] = useMemo(() => {
    return [
      {
        id: 'all',
        label: translate('queries_tab_all', 'All Queries') as string,
        count: sortedQueries.length,
        icon: <ManagementIcon size={18} />,
      },
    ]
  }, [translate, sortedQueries.length])

  // Render meatballs icon
  const renderMeatballsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  )

  // Render menu
  const renderMenu = (query: QueryTableItem) => {
    if (openMenuId !== query.id || !menuPosition) return null

    return (
      <>
        <div className={style.menuBackdrop} onClick={handleCloseMenu} />
        <div className={style.menuDropdown} style={{top: menuPosition.top, left: menuPosition.left}}>
          <button className={style.menuItem} onClick={e => handleMenuAction('details', query, e)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            {translate('action_details_label', 'Details')}
          </button>
          <button className={style.menuItem} onClick={e => handleMenuAction('view', query, e)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {translate('action_view_label', 'View')}
          </button>
          <button className={style.menuItem} onClick={e => handleMenuAction('edit', query, e)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            {translate('action_edit_label', 'Edit')}
          </button>
          <div className={style.menuDivider} />
          <button className={`${style.menuItem} ${style.menuItemDanger}`} onClick={e => handleMenuAction('delete', query, e)}>
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
  const renderTable = () => {
    if (sortedQueries.length === 0) {
      return (
        <div className={style.emptyState}>
          <div className={style.emptyStateIcon}>
            <ManagementIcon size={48} />
          </div>
          <div className={style.emptyStateTitle}>{translate('queries_empty_title', 'No Query Definitions')}</div>
          <div className={style.emptyStateDescription}>
            {translate('queries_empty_description', 'Create query definitions to request credentials from holders.')}
          </div>
          <button className={style.emptyStateButton} onClick={handleCreate}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {translate('queries_add_button', 'Add Query')}
          </button>
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
              checked={sortedQueries.length > 0 && selectedIds.size === sortedQueries.length}
              ref={input => {
                if (input) {
                  input.indeterminate = selectedIds.size > 0 && selectedIds.size < sortedQueries.length
                }
              }}
              onChange={e => handleSelectAll(e.target.checked)}
              aria-label="Select all"
            />
          </div>
          <div
            className={`${style.headerCell} ${style.cellQueryId} ${style.sortable} ${sortField === 'queryId' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('queryId')}>
            {translate('queries_column_query_id', 'Query ID')}
            <SortIcon field="queryId" sortField={sortField} sortDirection={sortDirection} />
          </div>
          <div
            className={`${style.headerCell} ${style.cellVersion} ${style.sortable} ${sortField === 'version' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('version')}>
            {translate('queries_column_version', 'Version')}
            <SortIcon field="version" sortField={sortField} sortDirection={sortDirection} />
          </div>
          <div
            className={`${style.headerCell} ${style.cellPurpose} ${style.sortable} ${sortField === 'purpose' ? style.headerCellSorted : ''}`}
            onClick={() => handleSort('purpose')}>
            {translate('queries_column_purpose', 'Purpose')}
            <SortIcon field="purpose" sortField={sortField} sortDirection={sortDirection} />
          </div>
          <div className={`${style.headerCell} ${style.cellActions}`} />
        </div>

        {sortedQueries.map(query => (
          <div
            key={query.id}
            className={`${style.tableRow} ${selectedQuery?.id === query.id ? style.selected : ''}`}
            onClick={() => setSelectedQuery(query)}
            onDoubleClick={() => handleView(query)}
            role="row"
            tabIndex={0}>
            <div className={style.checkboxCell}>
              <input
                type="checkbox"
                checked={selectedIds.has(query.id)}
                onChange={() => {}}
                onClick={e => handleToggleSelection(query.id, e)}
                className={style.checkbox}
                aria-label={`Select ${query.queryId}`}
              />
            </div>
            <div className={`${style.cell} ${style.cellQueryId}`}>
              <span className={style.queryIdValue}>{query.queryId || '-'}</span>
            </div>
            <div className={`${style.cell} ${style.cellVersion}`}>
              <span className={style.versionBadge}>{query.version || '-'}</span>
            </div>
            <div className={`${style.cell} ${style.cellPurpose}`}>
              <span className={style.purposeValue}>{query.purpose || '-'}</span>
            </div>
            <div className={`${style.cell} ${style.cellActions}`}>
              <div className={style.menuContainer}>
                <button
                  type="button"
                  className={style.meatballsButton}
                  onClick={e => handleToggleMenu(query.id, e)}
                  onMouseDown={e => e.stopPropagation()}
                  aria-label="Open menu">
                  {renderMeatballsIcon()}
                </button>
                {renderMenu(query)}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Render detail panel
  const renderDetailPanel = () => {
    if (!selectedQuery) return null

    return (
      <div className={style.detailPanel}>
        <div className={style.detailHeader}>
          <h3 className={style.detailTitle}>{translate('queries_detail_title', 'Query Details')}</h3>
          <button className={style.closeButton} onClick={() => setSelectedQuery(null)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={style.detailBody}>
          {/* Query Card */}
          <div className={style.queryCard}>
            <div className={style.queryIcon}>
              <ManagementIcon size={24} />
            </div>
            <div className={style.queryInfo}>
              <span className={style.queryName}>{selectedQuery.queryId}</span>
              <span className={style.queryType}>{translate('queries_detail_type', 'DCQL Query')}</span>
            </div>
            {selectedQuery.version && <span className={style.versionBadge}>{selectedQuery.version}</span>}
          </div>

          {/* Metadata Section */}
          <section className={style.metadataSection}>
            <div className={style.metadataBorder} />
            <div className={style.metadataContent}>
              <div className={style.metadataTitle}>{translate('queries_detail_info', 'Information')}</div>
              <div className={style.metadataRow}>
                <span className={style.metadataLabel}>{translate('queries_detail_query_id', 'Query ID')}</span>
                <span className={style.metadataValue}>{selectedQuery.queryId || '-'}</span>
              </div>
              {selectedQuery.version && (
                <div className={style.metadataRow}>
                  <span className={style.metadataLabel}>{translate('queries_detail_version', 'Version')}</span>
                  <span className={style.metadataValue}>{selectedQuery.version}</span>
                </div>
              )}
              {selectedQuery.tenantId && (
                <div className={style.metadataRow}>
                  <span className={style.metadataLabel}>{translate('queries_detail_tenant', 'Tenant')}</span>
                  <span className={style.metadataValue}>{selectedQuery.tenantId}</span>
                </div>
              )}
            </div>
          </section>

          {/* Purpose Section */}
          {selectedQuery.purpose && (
            <section className={style.purposeSection}>
              <div className={style.purposeTitle}>{translate('queries_detail_purpose', 'Purpose')}</div>
              <div className={style.purposeFullValue}>{selectedQuery.purpose}</div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className={style.detailFooter}>
          <button className={style.secondaryButton} onClick={() => handleView(selectedQuery)}>
            {translate('action_view_full', 'View Full Details')}
          </button>
          <button className={style.primaryButton} onClick={() => handleEdit(selectedQuery)}>
            {translate('action_edit_label', 'Edit')}
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={style.container}>
        <div className={style.headerContainer}>
          <div className={style.pathCaption}>{translate('verifier_path_label', 'Verifier')} /</div>
          <div className={style.currentPathCaption}>{translate('queries_path_label', 'Query Management')}</div>
        </div>
        <AppHeaderBar title={translate('queries_overview_title', 'Query Management')} />
        <div className={style.loadingState}>
          <div className={style.spinner} />
          <span>{translate('data_provider_loading_message', 'Loading...')}</span>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className={style.container}>
        <div className={style.headerContainer}>
          <div className={style.pathCaption}>{translate('verifier_path_label', 'Verifier')} /</div>
          <div className={style.currentPathCaption}>{translate('queries_path_label', 'Query Management')}</div>
        </div>
        <AppHeaderBar title={translate('queries_overview_title', 'Query Management')} />
        <div className={style.errorBanner}>{translate('data_provider_error_message', 'Failed to load data')}</div>
      </div>
    )
  }

  return (
    <div className={style.container}>
      <div className={style.headerContainer}>
        <div className={style.pathCaption}>{translate('verifier_path_label', 'Verifier')} /</div>
        <div className={style.currentPathCaption}>{translate('queries_path_label', 'Query Management')}</div>
      </div>
      <AppHeaderBar title={translate('queries_overview_title', 'Query Management')} />

      <div className={style.mainLayout}>
        {/* Content Area */}
        <div className={`${style.contentArea} ${selectedQuery ? style.contentAreaWithDetail : ''}`}>
          {/* Header with tabs and selection overlay */}
          <ListPageHeader
            tabs={headerTabs}
            activeTab="all"
            onTabChange={() => {}}
            selectionCount={selectedIds.size}
            onClearSelection={() => setSelectedIds(new Set())}
            onDeleteSelected={handleDeleteSelected}
            selectionLabel={{singular: 'query', plural: 'queries'}}
            actions={
              <PrimaryButton
                caption={translate('queries_overview_action_add', 'Add Query')}
                icon={ButtonIcon.ADD}
                onClick={handleCreate}
              />
            }
          />

          {/* Table */}
          <div className={style.tableContainer}>{renderTable()}</div>
        </div>

        {/* Detail Panel */}
        {renderDetailPanel()}
      </div>
    </div>
  )
}

// Sort Icon Component
const SortIcon: React.FC<{field: SortField; sortField: SortField; sortDirection: SortDirection}> = ({field, sortField, sortDirection}) => {
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
      {sortDirection === 'asc' ? <path d="M6 2L9 5H3L6 2Z" fill="currentColor" /> : <path d="M6 10L3 7H9L6 10Z" fill="currentColor" />}
    </svg>
  )
}

export const getStaticProps = async ({locale = 'en'}: {locale?: string}) => staticPropsWithSST({locale})

export default PresentationDefinitionsListPage
