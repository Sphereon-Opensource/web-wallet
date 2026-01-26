import React, {FC, ReactElement, useState} from 'react'
import {useOne, useList, useDelete} from '@refinedev/core'
import {useParams, useNavigate} from 'react-router-dom'
import {SecondaryButton} from '@sphereon/ui-components.ssi-react'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import ConfirmDeleteModal, {useConfirmDelete} from '@components/modals/ConfirmDeleteModal'
import {
  BookingDataResource,
  ResourceGroup,
  ResourceCategory,
  BookingResource,
  ScheduleSet,
  UsagePolicy,
  ScheduleSetAssignment,
  PolicyAssignment,
} from '@typings'
import style from './index.module.css'

enum GroupTab {
  OVERVIEW = 'overview',
  RESOURCES = 'resources',
  SCHEDULE = 'schedule',
  POLICY = 'policy',
}

const GroupDetailPage: FC = (): ReactElement => {
  const {id} = useParams<{id: string}>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<GroupTab>(GroupTab.OVERVIEW)

  // Fetch group data
  const {data: groupData, isLoading, isError} = useOne<ResourceGroup>({
    resource: BookingDataResource.GROUPS,
    id: id!,
  })

  // Fetch categories for category name lookup
  const {data: categoriesData} = useList<ResourceCategory>({
    resource: BookingDataResource.CATEGORIES,
    pagination: {pageSize: 100},
  })

  // Fetch resources in this group
  const {data: resourcesData} = useList<BookingResource>({
    resource: BookingDataResource.RESOURCES,
    pagination: {pageSize: 100},
    filters: [{field: 'groupId', operator: 'eq', value: id}],
  })

  // Fetch schedule set assignments for this group
  const {data: scheduleAssignmentsData} = useList<ScheduleSetAssignment>({
    resource: BookingDataResource.SCHEDULE_SET_ASSIGNMENTS,
    pagination: {pageSize: 100},
    filters: [{field: 'groupId', operator: 'eq', value: id}],
  })

  // Fetch policy assignments for this group
  const {data: policyAssignmentsData} = useList<PolicyAssignment>({
    resource: BookingDataResource.POLICY_ASSIGNMENTS,
    pagination: {pageSize: 100},
    filters: [{field: 'groupId', operator: 'eq', value: id}],
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

  const {mutate: deleteGroup} = useDelete()

  const group = groupData?.data
  const categories = categoriesData?.data ?? []
  const resources = resourcesData?.data ?? []
  const scheduleAssignments = scheduleAssignmentsData?.data ?? []
  const policyAssignments = policyAssignmentsData?.data ?? []
  const scheduleSets = scheduleSetsData?.data ?? []
  const policies = policiesData?.data ?? []

  // Create lookup maps
  const categoryMap = categories.reduce((acc, cat) => {
    acc[cat.id] = cat
    return acc
  }, {} as Record<string, ResourceCategory>)

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
        deleteGroup(
          {
            resource: BookingDataResource.GROUPS,
            id: id!,
          },
          {
            onSuccess: () => {
              navigate('/booking/admin/groups')
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
    navigate(`/booking/admin/groups/${id}/edit`)
  }

  const handleDelete = () => {
    if (group) {
      deleteModal.openModal(group.id, group.name)
    }
  }

  const handleClose = () => {
    navigate('/booking/admin/groups')
  }

  const handleViewResource = (resource: BookingResource) => {
    navigate(`/booking/admin/resources/${resource.id}`)
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
    const assignment = scheduleAssignments[0] // Use the first/highest priority assignment
    const scheduleSet = scheduleSetMap[assignment.scheduleSetId]
    if (!scheduleSet) return null
    return {assignment, scheduleSet}
  }

  // Get the assigned policy
  const getAssignedPolicy = (): {assignment: PolicyAssignment; policy: UsagePolicy} | null => {
    if (policyAssignments.length === 0) return null
    const assignment = policyAssignments[0] // Use the first/highest priority assignment
    const policy = policyMap[assignment.policyId]
    if (!policy) return null
    return {assignment, policy}
  }

  const tabs = [
    {id: GroupTab.OVERVIEW, label: 'Overview'},
    {id: GroupTab.RESOURCES, label: `Resources (${resources.length})`},
    {id: GroupTab.SCHEDULE, label: 'Schedule'},
    {id: GroupTab.POLICY, label: 'Policy'},
  ]

  if (isLoading) {
    return (
      <div className={style.pageContainer}>
        <PageHeaderBar path="Booking / Admin / Groups / Loading..." />
        <div className={style.loadingContainer}>
          <div className={style.spinner} />
          <p>Loading group...</p>
        </div>
      </div>
    )
  }

  if (isError || !group) {
    return (
      <div className={style.pageContainer}>
        <PageHeaderBar path="Booking / Admin / Groups / Error" />
        <div className={style.errorContainer}>
          <p>Failed to load group.</p>
        </div>
      </div>
    )
  }

  const category = group.categoryId ? categoryMap[group.categoryId] : undefined

  const renderOverviewTab = (): ReactElement => (
    <div className={style.tabContent}>
      <div className={style.infoCard}>
        <div className={style.infoCardHeader}>
          <span className={style.infoCardTitle}>Basic Information</span>
          <div className={style.infoCardActions}>
            <button className={style.editButton} onClick={handleEdit}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
              Edit
            </button>
            <button className={style.deleteButton} onClick={handleDelete}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              Delete
            </button>
          </div>
        </div>
        <div className={style.infoCardBody}>
          <div className={style.infoGrid}>
            <div className={style.infoField}>
              <span className={style.infoLabel}>NAME</span>
              <span className={style.infoValue}>{group.name}</span>
            </div>
            <div className={style.infoField}>
              <span className={style.infoLabel}>STATUS</span>
              <span className={`${style.statusBadge} ${getStatusBadgeClass(group.status)}`}>
                {group.status}
              </span>
            </div>
            {group.description && (
              <div className={`${style.infoField} ${style.fullWidth}`}>
                <span className={style.infoLabel}>DESCRIPTION</span>
                <span className={style.infoValue}>{group.description}</span>
              </div>
            )}
            <div className={style.infoField}>
              <span className={style.infoLabel}>CATEGORY</span>
              <span className={style.infoValue}>
                {category ? category.name : 'No category'}
              </span>
            </div>
            <div className={style.infoField}>
              <span className={style.infoLabel}>RESOURCES</span>
              <span className={style.infoValue}>{resources.length} resource(s)</span>
            </div>
            <div className={style.infoField}>
              <span className={style.infoLabel}>CREATED</span>
              <span className={style.infoValue}>
                {new Date(group.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className={style.infoField}>
              <span className={style.infoLabel}>LAST UPDATED</span>
              <span className={style.infoValue}>
                {new Date(group.updatedAt).toLocaleDateString()}
              </span>
            </div>
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
          <p>No resources in this group yet.</p>
          <span className={style.emptyNote}>
            Add resources to this group to apply shared schedules and policies.
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
              <svg className={style.resourceCardArrow} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            <p>No schedule set assigned to this group.</p>
            <span className={style.emptyNote}>
              {category
                ? 'Resources will inherit the schedule from the category.'
                : 'Resources will use the system default schedule.'}
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
                <span className={style.assignedLabel}>ASSIGNED SCHEDULE SET</span>
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
              <svg className={style.assignedCardArrow} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>

            {(assignedSchedule.assignment.validFrom || assignedSchedule.assignment.validUntil) && (
              <div className={style.validityInfo}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>
                  Valid
                  {assignedSchedule.assignment.validFrom && ` from ${new Date(assignedSchedule.assignment.validFrom).toLocaleDateString()}`}
                  {assignedSchedule.assignment.validUntil && ` until ${new Date(assignedSchedule.assignment.validUntil).toLocaleDateString()}`}
                </span>
              </div>
            )}

            <div className={style.inheritanceNote}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
              <span>
                Resources in this group will inherit this schedule unless they have their own override.
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
            <p>No policy assigned to this group.</p>
            <span className={style.emptyNote}>
              {category
                ? 'Resources will inherit the policy from the category.'
                : 'Resources will use the system default policy.'}
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
                <span className={style.assignedLabel}>ASSIGNED POLICY</span>
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
              <svg className={style.assignedCardArrow} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>

            {/* Policy Constraints Summary */}
            <div className={style.policyConstraints}>
              <div className={style.constraintsHeader}>
                <span className={style.constraintsTitle}>Policy Constraints</span>
              </div>
              <div className={style.constraintsGrid}>
                <div className={style.constraintItem}>
                  <span className={style.constraintLabel}>Slot Duration</span>
                  <span className={style.constraintValue}>{assignedPolicy.policy.slotDurationMinutes} min</span>
                </div>
                {assignedPolicy.policy.minDurationMinutes && (
                  <div className={style.constraintItem}>
                    <span className={style.constraintLabel}>Min Duration</span>
                    <span className={style.constraintValue}>{assignedPolicy.policy.minDurationMinutes} min</span>
                  </div>
                )}
                {assignedPolicy.policy.maxDurationMinutes && (
                  <div className={style.constraintItem}>
                    <span className={style.constraintLabel}>Max Duration</span>
                    <span className={style.constraintValue}>{assignedPolicy.policy.maxDurationMinutes} min</span>
                  </div>
                )}
                {assignedPolicy.policy.bufferAfterMinutes && (
                  <div className={style.constraintItem}>
                    <span className={style.constraintLabel}>Buffer After</span>
                    <span className={style.constraintValue}>{assignedPolicy.policy.bufferAfterMinutes} min</span>
                  </div>
                )}
                {assignedPolicy.policy.maxAdvanceBookingDays && (
                  <div className={style.constraintItem}>
                    <span className={style.constraintLabel}>Max Advance</span>
                    <span className={style.constraintValue}>{assignedPolicy.policy.maxAdvanceBookingDays} days</span>
                  </div>
                )}
                {assignedPolicy.policy.maxConcurrentBookings && (
                  <div className={style.constraintItem}>
                    <span className={style.constraintLabel}>Max Concurrent</span>
                    <span className={style.constraintValue}>{assignedPolicy.policy.maxConcurrentBookings}</span>
                  </div>
                )}
                <div className={style.constraintItem}>
                  <span className={style.constraintLabel}>Requires Approval</span>
                  <span className={style.constraintValue}>
                    {assignedPolicy.policy.requiresApproval ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className={style.constraintItem}>
                  <span className={style.constraintLabel}>Allow Recurring</span>
                  <span className={style.constraintValue}>
                    {assignedPolicy.policy.allowRecurring ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            {(assignedPolicy.assignment.validFrom || assignedPolicy.assignment.validUntil) && (
              <div className={style.validityInfo}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>
                  Valid
                  {assignedPolicy.assignment.validFrom && ` from ${new Date(assignedPolicy.assignment.validFrom).toLocaleDateString()}`}
                  {assignedPolicy.assignment.validUntil && ` until ${new Date(assignedPolicy.assignment.validUntil).toLocaleDateString()}`}
                </span>
              </div>
            )}

            <div className={style.inheritanceNote}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
              <span>
                Resources in this group will inherit this policy unless they have their own override.
              </span>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderTabContent = (): ReactElement => {
    switch (activeTab) {
      case GroupTab.OVERVIEW:
        return renderOverviewTab()
      case GroupTab.RESOURCES:
        return renderResourcesTab()
      case GroupTab.SCHEDULE:
        return renderScheduleTab()
      case GroupTab.POLICY:
        return renderPolicyTab()
      default:
        return renderOverviewTab()
    }
  }

  return (
    <div className={style.pageContainer}>
      <PageHeaderBar path={`Booking / Admin / Groups / ${group.name}`} />
      <div className={style.container}>
        {/* Header */}
        <div className={style.header}>
          <div className={style.titleSection}>
            <div className={style.titleRow}>
              <div className={style.title}>{group.name}</div>
              <span className={`${style.statusBadge} ${getStatusBadgeClass(group.status)}`}>
                {group.status}
              </span>
              {category && (
                <span className={style.categoryBadge}>{category.name}</span>
              )}
            </div>
            {group.description && (
              <div className={style.subtitle}>{group.description}</div>
            )}
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
        title="Delete Resource Group"
        message={`Are you sure you want to delete "${group.name}"? Resources in this group will be unassigned.`}
        isLoading={deleteModal.isLoading}
        itemName={group.name}
      />
    </div>
  )
}

export default GroupDetailPage
