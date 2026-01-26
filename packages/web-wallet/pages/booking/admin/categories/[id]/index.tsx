import React, {FC, ReactElement, useState} from 'react'
import {useOne, useList, useDelete} from '@refinedev/core'
import {useParams, useNavigate} from 'react-router-dom'
import {PrimaryButton, SecondaryButton} from '@sphereon/ui-components.ssi-react'
import {ButtonIcon} from '@sphereon/ui-components.core'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import ConfirmDeleteModal, {useConfirmDelete} from '@components/modals/ConfirmDeleteModal'
import {
  BookingDataResource,
  ResourceCategory,
  BookingResource,
  ResourceGroup,
  ScheduleSet,
  UsagePolicy,
  ScheduleSetAssignment,
  PolicyAssignment,
} from '@typings'
import style from './index.module.css'

enum CategoryTab {
  OVERVIEW = 'overview',
  RESOURCES = 'resources',
  GROUPS = 'groups',
  SCHEDULE = 'schedule',
  POLICY = 'policy',
}

const CategoryDetailPage: FC = (): ReactElement => {
  const {id} = useParams<{id: string}>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<CategoryTab>(CategoryTab.OVERVIEW)

  // Fetch category data
  const {data: categoryData, isLoading, isError} = useOne<ResourceCategory>({
    resource: BookingDataResource.CATEGORIES,
    id: id!,
  })

  // Fetch resources in this category
  const {data: resourcesData} = useList<BookingResource>({
    resource: BookingDataResource.RESOURCES,
    pagination: {pageSize: 100},
    filters: [{field: 'categoryId', operator: 'eq', value: id}],
  })

  // Fetch groups affiliated with this category
  const {data: groupsData} = useList<ResourceGroup>({
    resource: BookingDataResource.GROUPS,
    pagination: {pageSize: 100},
    filters: [{field: 'categoryId', operator: 'eq', value: id}],
  })

  // Fetch schedule set assignments for this category
  const {data: scheduleAssignmentsData} = useList<ScheduleSetAssignment>({
    resource: BookingDataResource.SCHEDULE_SET_ASSIGNMENTS,
    pagination: {pageSize: 100},
    filters: [{field: 'categoryId', operator: 'eq', value: id}],
  })

  // Fetch policy assignments for this category
  const {data: policyAssignmentsData} = useList<PolicyAssignment>({
    resource: BookingDataResource.POLICY_ASSIGNMENTS,
    pagination: {pageSize: 100},
    filters: [{field: 'categoryId', operator: 'eq', value: id}],
  })

  // Fetch all schedule sets for lookup
  const {data: scheduleSetsData} = useList<ScheduleSet>({
    resource: BookingDataResource.SCHEDULE_SETS,
    pagination: {pageSize: 100},
  })

  // Fetch all policies for lookup
  const {data: policiesData} = useList<UsagePolicy>({
    resource: BookingDataResource.POLICIES,
    pagination: {pageSize: 100},
  })

  const {mutate: deleteCategory} = useDelete()

  const category = categoryData?.data
  const resources = resourcesData?.data ?? []
  const groups = groupsData?.data ?? []
  const scheduleAssignments = scheduleAssignmentsData?.data ?? []
  const policyAssignments = policyAssignmentsData?.data ?? []
  const scheduleSets = scheduleSetsData?.data ?? []
  const policies = policiesData?.data ?? []

  // Create lookup maps
  const scheduleSetMap = scheduleSets.reduce((acc, set) => {
    acc[set.id] = set
    return acc
  }, {} as Record<string, ScheduleSet>)

  const policyMap = policies.reduce((acc, policy) => {
    acc[policy.id] = policy
    return acc
  }, {} as Record<string, UsagePolicy>)

  const deleteModal = useConfirmDelete({
    onConfirm: async () => {
      return new Promise<void>((resolve, reject) => {
        deleteCategory(
          {
            resource: BookingDataResource.CATEGORIES,
            id: id!,
          },
          {
            onSuccess: () => {
              navigate('/booking/admin/categories')
              resolve()
            },
            onError: (error) => {
              reject(error)
            },
          },
        )
      })
    },
  })

  const handleEdit = () => {
    navigate(`/booking/admin/categories/${id}/edit`)
  }

  const handleDelete = () => {
    if (category) {
      deleteModal.openModal(category.id, category.name)
    }
  }

  const handleClose = () => {
    navigate('/booking/admin/categories')
  }

  const handleViewResource = (resource: BookingResource) => {
    navigate(`/booking/admin/resources/${resource.id}`)
  }

  const handleViewGroup = (group: ResourceGroup) => {
    navigate(`/booking/admin/groups/${group.id}`)
  }

  const handleViewSchedule = (scheduleSet: ScheduleSet) => {
    navigate(`/booking/admin/schedules/${scheduleSet.id}`)
  }

  const handleViewPolicy = (policy: UsagePolicy) => {
    navigate(`/booking/admin/policies/${policy.id}`)
  }

  const getStatusBadgeClass = (status: string) => {
    return status === 'ACTIVE' ? style.statusActive : style.statusInactive
  }

  // Get the assigned schedule set
  const getAssignedScheduleSet = (): {assignment: ScheduleSetAssignment; scheduleSet: ScheduleSet} | null => {
    if (scheduleAssignments.length === 0) return null
    const assignment = scheduleAssignments[0]
    const scheduleSet = scheduleSetMap[assignment.scheduleSetId]
    if (!scheduleSet) return null
    return {assignment, scheduleSet}
  }

  // Get the assigned policy
  const getAssignedPolicy = (): {assignment: PolicyAssignment; policy: UsagePolicy} | null => {
    if (policyAssignments.length === 0) return null
    const assignment = policyAssignments[0]
    const policy = policyMap[assignment.policyId]
    if (!policy) return null
    return {assignment, policy}
  }

  const tabs = [
    {id: CategoryTab.OVERVIEW, label: 'Overview'},
    {id: CategoryTab.RESOURCES, label: `Resources (${resources.length})`},
    {id: CategoryTab.GROUPS, label: `Groups (${groups.length})`},
    {id: CategoryTab.SCHEDULE, label: 'Schedule'},
    {id: CategoryTab.POLICY, label: 'Policy'},
  ]

  if (isLoading) {
    return (
      <div className={style.pageContainer}>
        <PageHeaderBar path="Booking / Admin / Categories / Loading..." />
        <div className={style.loadingContainer}>
          <div className={style.spinner} />
          <p>Loading category...</p>
        </div>
      </div>
    )
  }

  if (isError || !category) {
    return (
      <div className={style.pageContainer}>
        <PageHeaderBar path="Booking / Admin / Categories / Error" />
        <div className={style.errorContainer}>
          <p>Failed to load category.</p>
          <SecondaryButton caption="Go Back" onClick={async () => handleClose()} />
        </div>
      </div>
    )
  }

  const renderOverviewTab = (): ReactElement => (
    <div className={style.tabContent}>
      <div className={style.infoCard}>
        <div className={style.infoCardHeader}>
          <span className={style.infoCardTitle}>Basic Information</span>
        </div>
        <div className={style.infoCardBody}>
          <div className={style.infoGrid}>
            <div className={style.infoField}>
              <span className={style.infoLabel}>NAME</span>
              <span className={style.infoValue}>{category.name}</span>
            </div>
            <div className={style.infoField}>
              <span className={style.infoLabel}>STATUS</span>
              <span className={`${style.statusBadge} ${getStatusBadgeClass(category.status)}`}>
                {category.status}
              </span>
            </div>
            {category.description && (
              <div className={`${style.infoField} ${style.fullWidth}`}>
                <span className={style.infoLabel}>DESCRIPTION</span>
                <span className={style.infoValue}>{category.description}</span>
              </div>
            )}
            <div className={style.infoField}>
              <span className={style.infoLabel}>RESOURCES</span>
              <span className={style.infoValue}>{resources.length} resource(s)</span>
            </div>
            <div className={style.infoField}>
              <span className={style.infoLabel}>GROUPS</span>
              <span className={style.infoValue}>{groups.length} group(s)</span>
            </div>
            <div className={style.infoField}>
              <span className={style.infoLabel}>TENANT ID</span>
              <span className={style.infoValue}>{category.tenantId}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className={style.statsGrid}>
        <div className={style.statCard}>
          <div className={style.statIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </div>
          <div className={style.statContent}>
            <span className={style.statValue}>{resources.length}</span>
            <span className={style.statLabel}>Resources</span>
          </div>
        </div>
        <div className={style.statCard}>
          <div className={style.statIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <div className={style.statContent}>
            <span className={style.statValue}>{groups.length}</span>
            <span className={style.statLabel}>Groups</span>
          </div>
        </div>
        <div className={style.statCard}>
          <div className={style.statIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>
          <div className={style.statContent}>
            <span className={style.statValue}>{scheduleAssignments.length > 0 ? 'Yes' : 'No'}</span>
            <span className={style.statLabel}>Schedule Assigned</span>
          </div>
        </div>
        <div className={style.statCard}>
          <div className={style.statIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div className={style.statContent}>
            <span className={style.statValue}>{policyAssignments.length > 0 ? 'Yes' : 'No'}</span>
            <span className={style.statLabel}>Policy Assigned</span>
          </div>
        </div>
      </div>
    </div>
  )

  const renderResourcesTab = (): ReactElement => (
    <div className={style.tabContent}>
      {resources.length === 0 ? (
        <div className={style.emptyState}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
          <p>No resources in this category yet.</p>
          <span className={style.emptyNote}>
            Create resources and assign them to this category.
          </span>
        </div>
      ) : (
        <div className={style.resourcesList}>
          {resources.map(resource => (
            <div
              key={resource.id}
              className={style.resourceCard}
              onClick={() => handleViewResource(resource)}
            >
              <div className={style.resourceCardIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                </svg>
              </div>
              <div className={style.resourceCardInfo}>
                <span className={style.resourceName}>{resource.name}</span>
                {resource.description && (
                  <span className={style.resourceDescription}>{resource.description}</span>
                )}
              </div>
              <div className={style.resourceCardMeta}>
                <span className={`${style.statusBadge} ${getStatusBadgeClass(resource.status)}`}>
                  {resource.status}
                </span>
                {resource.capacity && (
                  <span className={style.capacityBadge}>Capacity: {resource.capacity}</span>
                )}
              </div>
              <svg className={style.cardArrow} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderGroupsTab = (): ReactElement => (
    <div className={style.tabContent}>
      {groups.length === 0 ? (
        <div className={style.emptyState}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
          <p>No groups affiliated with this category.</p>
          <span className={style.emptyNote}>
            Groups can optionally belong to a category for organization.
          </span>
        </div>
      ) : (
        <div className={style.groupsList}>
          {groups.map(group => (
            <div
              key={group.id}
              className={style.groupCard}
              onClick={() => handleViewGroup(group)}
            >
              <div className={style.groupCardIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <div className={style.groupCardInfo}>
                <span className={style.groupName}>{group.name}</span>
                {group.description && (
                  <span className={style.groupDescription}>{group.description}</span>
                )}
              </div>
              <div className={style.groupCardMeta}>
                <span className={`${style.statusBadge} ${getStatusBadgeClass(group.status)}`}>
                  {group.status}
                </span>
              </div>
              <svg className={style.cardArrow} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderScheduleTab = (): ReactElement => {
    const assignedSchedule = getAssignedScheduleSet()

    return (
      <div className={style.tabContent}>
        {!assignedSchedule ? (
          <div className={style.emptyState}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <p>No default schedule set assigned to this category.</p>
            <span className={style.emptyNote}>
              Resources and groups will use the system default schedule.
            </span>
          </div>
        ) : (
          <div className={style.assignedSection}>
            <div className={style.assignedCard} onClick={() => handleViewSchedule(assignedSchedule.scheduleSet)}>
              <div className={style.assignedCardIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </div>
              <div className={style.assignedCardInfo}>
                <span className={style.assignedLabel}>DEFAULT SCHEDULE SET</span>
                <span className={style.assignedName}>{assignedSchedule.scheduleSet.name}</span>
                {assignedSchedule.scheduleSet.description && (
                  <span className={style.assignedDescription}>
                    {assignedSchedule.scheduleSet.description}
                  </span>
                )}
              </div>
              <div className={style.assignedCardMeta}>
                <span className={style.priorityBadge}>Priority: {assignedSchedule.assignment.priority}</span>
                <span className={style.rulesBadge}>
                  {assignedSchedule.scheduleSet.rules.length} rule(s)
                </span>
              </div>
              <svg className={style.cardArrow} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>

            <div className={style.inheritanceNote}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
              <span>
                Resources and groups in this category will inherit this schedule unless they have their own assignment.
              </span>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderPolicyTab = (): ReactElement => {
    const assignedPolicy = getAssignedPolicy()

    return (
      <div className={style.tabContent}>
        {!assignedPolicy ? (
          <div className={style.emptyState}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <p>No default policy assigned to this category.</p>
            <span className={style.emptyNote}>
              Resources and groups will use the system default policy.
            </span>
          </div>
        ) : (
          <div className={style.assignedSection}>
            <div className={style.assignedCard} onClick={() => handleViewPolicy(assignedPolicy.policy)}>
              <div className={style.assignedCardIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className={style.assignedCardInfo}>
                <span className={style.assignedLabel}>DEFAULT POLICY</span>
                <span className={style.assignedName}>{assignedPolicy.policy.name}</span>
                {assignedPolicy.policy.description && (
                  <span className={style.assignedDescription}>
                    {assignedPolicy.policy.description}
                  </span>
                )}
              </div>
              <div className={style.assignedCardMeta}>
                <span className={style.priorityBadge}>Priority: {assignedPolicy.assignment.priority}</span>
              </div>
              <svg className={style.cardArrow} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>

            {/* Policy Summary */}
            <div className={style.policySummary}>
              <div className={style.policySummaryHeader}>
                <span className={style.policySummaryTitle}>Policy Constraints</span>
              </div>
              <div className={style.policySummaryGrid}>
                <div className={style.policySummaryItem}>
                  <span className={style.policySummaryLabel}>Slot Duration</span>
                  <span className={style.policySummaryValue}>{assignedPolicy.policy.slotDurationMinutes} min</span>
                </div>
                {assignedPolicy.policy.maxAdvanceBookingDays && (
                  <div className={style.policySummaryItem}>
                    <span className={style.policySummaryLabel}>Max Advance</span>
                    <span className={style.policySummaryValue}>{assignedPolicy.policy.maxAdvanceBookingDays} days</span>
                  </div>
                )}
                <div className={style.policySummaryItem}>
                  <span className={style.policySummaryLabel}>Approval</span>
                  <span className={style.policySummaryValue}>
                    {assignedPolicy.policy.requiresApproval ? 'Required' : 'Auto'}
                  </span>
                </div>
                <div className={style.policySummaryItem}>
                  <span className={style.policySummaryLabel}>Recurring</span>
                  <span className={style.policySummaryValue}>
                    {assignedPolicy.policy.allowRecurring ? 'Allowed' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            <div className={style.inheritanceNote}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
              <span>
                Resources and groups in this category will inherit this policy unless they have their own assignment.
              </span>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderTabContent = (): ReactElement => {
    switch (activeTab) {
      case CategoryTab.OVERVIEW:
        return renderOverviewTab()
      case CategoryTab.RESOURCES:
        return renderResourcesTab()
      case CategoryTab.GROUPS:
        return renderGroupsTab()
      case CategoryTab.SCHEDULE:
        return renderScheduleTab()
      case CategoryTab.POLICY:
        return renderPolicyTab()
      default:
        return renderOverviewTab()
    }
  }

  return (
    <div className={style.pageContainer}>
      <PageHeaderBar path={`Booking / Admin / Categories / ${category.name}`} />
      <div className={style.container}>
        {/* Header */}
        <div className={style.header}>
          <div className={style.titleSection}>
            <div className={style.titleRow}>
              <div className={style.title}>{category.name}</div>
              <span className={`${style.statusBadge} ${getStatusBadgeClass(category.status)}`}>
                {category.status}
              </span>
            </div>
            {category.description && (
              <div className={style.subtitle}>{category.description}</div>
            )}
          </div>
          <div className={style.headerActions}>
            <SecondaryButton
              caption="Close"
              onClick={async () => handleClose()}
            />
            <PrimaryButton
              icon={ButtonIcon.EDIT}
              caption="Edit"
              onClick={async () => handleEdit()}
            />
            <button className={style.deleteButton} onClick={handleDelete} title="Delete">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={style.tabs}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`${style.tab} ${activeTab === tab.id ? style.tabActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className={style.body}>
          {renderTabContent()}
        </div>
      </div>

      {/* Delete Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onCancel={deleteModal.closeModal}
        onConfirm={deleteModal.handleConfirm}
        title="Delete Category"
        message={`Are you sure you want to delete "${category.name}"? Resources in this category will become uncategorized.`}
        isLoading={deleteModal.isLoading}
        itemName={category.name}
      />
    </div>
  )
}

export default CategoryDetailPage
