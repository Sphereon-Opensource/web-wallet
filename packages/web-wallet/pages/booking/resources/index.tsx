import React, {FC, ReactElement, useMemo, useState, useCallback} from 'react'
import {useList} from '@refinedev/core'
import {useNavigate} from 'react-router-dom'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import {ListPageHeader, TabItem} from '@components/tables'
import {BookingDataResource, BookingResource, ResourceCategory} from '@typings'
import styles from './index.module.css'

type CategoryFilter = 'all' | string

const BookingResourcesPage: FC = (): ReactElement => {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch resources
  const {data: resourcesData, isLoading: resourcesLoading} = useList<BookingResource>({
    resource: BookingDataResource.RESOURCES,
    pagination: {pageSize: 100},
    filters: selectedCategory !== 'all' ? [{field: 'categoryId', operator: 'eq', value: selectedCategory}] : undefined,
  })

  // Fetch categories for filter tabs
  const {data: categoriesData} = useList<ResourceCategory>({
    resource: BookingDataResource.CATEGORIES,
    pagination: {pageSize: 50},
  })

  const resources = resourcesData?.data ?? []
  const categories = categoriesData?.data ?? []

  // Filter resources by search query
  const filteredResources = useMemo(() => {
    if (!searchQuery.trim()) return resources
    const query = searchQuery.toLowerCase()
    return resources.filter(
      resource => resource.name.toLowerCase().includes(query) || resource.description?.toLowerCase().includes(query),
    )
  }, [resources, searchQuery])

  // Get count for each category
  const getCategoryCount = useCallback(
    (categoryId: string): number => {
      if (categoryId === 'all') return resources.length
      return resources.filter(r => r.categoryId === categoryId).length
    },
    [resources],
  )

  // Build tabs for ListPageHeader
  const headerTabs: TabItem[] = useMemo(() => {
    const tabs: TabItem[] = [
      {
        id: 'all',
        label: 'All Resources',
        count: resources.length,
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
        ),
      },
    ]

    categories.forEach(category => {
      tabs.push({
        id: category.id,
        label: category.name,
        count: getCategoryCount(category.id),
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        ),
      })
    })

    return tabs
  }, [categories, resources.length, getCategoryCount])

  const handleResourceClick = (resourceId: string) => {
    navigate(`/booking/resources/${resourceId}`)
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return styles.statusAvailable
      case 'MAINTENANCE':
        return styles.statusMaintenance
      case 'RETIRED':
        return styles.statusRetired
      default:
        return ''
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Available'
      case 'MAINTENANCE':
        return 'Maintenance'
      case 'RETIRED':
        return 'Unavailable'
      default:
        return status
    }
  }

  // Search filter component
  const searchFilter = (
    <div className={styles.searchContainer}>
      <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <input
        type="text"
        placeholder="Search resources..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        className={styles.searchInput}
      />
    </div>
  )

  return (
    <div className={styles.container}>
      <AppHeaderBar title="Browse Resources" />

      <div className={styles.mainLayout}>
        <div className={styles.contentArea}>
          {/* Header with tabs */}
          <ListPageHeader
            tabs={headerTabs}
            activeTab={selectedCategory}
            onTabChange={tabId => setSelectedCategory(tabId)}
            actions={searchFilter}
          />

          {/* Resources Grid */}
          <div className={styles.content}>
            {resourcesLoading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner} />
                <p>Loading resources...</p>
              </div>
            ) : filteredResources.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                  </svg>
                </div>
                <div className={styles.emptyStateTitle}>No resources found</div>
                <div className={styles.emptyStateDescription}>Try adjusting your search or filter criteria</div>
              </div>
            ) : (
              <div className={styles.resourcesGrid}>
                {filteredResources.map(resource => (
                  <div key={resource.id} className={styles.resourceCard} onClick={() => handleResourceClick(resource.id)}>
                    <div className={styles.resourceImage}>
                      <div className={styles.iconBox}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="3" y="3" width="7" height="7" rx="1" />
                          <rect x="14" y="3" width="7" height="7" rx="1" />
                          <rect x="14" y="14" width="7" height="7" rx="1" />
                          <rect x="3" y="14" width="7" height="7" rx="1" />
                        </svg>
                      </div>
                      <span className={`${styles.statusBadge} ${getStatusBadgeClass(resource.status)}`}>
                        {getStatusLabel(resource.status)}
                      </span>
                    </div>
                    <div className={styles.resourceContent}>
                      {resource.category && <span className={styles.categoryBadge}>{resource.category.name}</span>}
                      <h3 className={styles.resourceName}>{resource.name}</h3>
                      {resource.description && <p className={styles.resourceDescription}>{resource.description}</p>}
                      <div className={styles.resourceMeta}>
                        {resource.capacity && (
                          <span className={styles.metaItem}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                            {resource.capacity}
                          </span>
                        )}
                        {resource.requirements && resource.requirements.length > 0 && (
                          <span className={styles.verificationBadge} title="Credential verification required">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                            Verification required
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookingResourcesPage
