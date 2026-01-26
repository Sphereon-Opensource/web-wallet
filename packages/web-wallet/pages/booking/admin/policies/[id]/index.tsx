import React, {FC, ReactElement, useState} from 'react'
import {useOne, useList, useDelete} from '@refinedev/core'
import {useParams, useNavigate} from 'react-router-dom'
import {SecondaryButton} from '@sphereon/ui-components.ssi-react'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import ConfirmDeleteModal, {useConfirmDelete} from '@components/modals/ConfirmDeleteModal'
import {
  BookingDataResource,
  UsagePolicy,
  PolicyAssignment,
  ResourceCategory,
  ResourceGroup,
  BookingResource,
} from '@typings'
import style from './index.module.css'

enum PolicyTab {
  OVERVIEW = 'overview',
  CONSTRAINTS = 'constraints',
  ASSIGNMENTS = 'assignments',
}

const PolicyDetailPage: FC = (): ReactElement => {
  const {id} = useParams<{id: string}>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<PolicyTab>(PolicyTab.OVERVIEW)

  // Fetch policy data
  const {data: policyData, isLoading, isError} = useOne<UsagePolicy>({
    resource: BookingDataResource.POLICIES,
    id: id!,
  })

  // Fetch policy assignments
  const {data: assignmentsData} = useList<PolicyAssignment>({
    resource: BookingDataResource.POLICY_ASSIGNMENTS,
    pagination: {pageSize: 100},
    filters: [{field: 'policyId', operator: 'eq', value: id}],
  })

  // Fetch categories, groups, resources for lookup
  const {data: categoriesData} = useList<ResourceCategory>({
    resource: BookingDataResource.CATEGORIES,
    pagination: {pageSize: 100},
  })

  const {data: groupsData} = useList<ResourceGroup>({
    resource: BookingDataResource.GROUPS,
    pagination: {pageSize: 100},
  })

  const {data: resourcesData} = useList<BookingResource>({
    resource: BookingDataResource.RESOURCES,
    pagination: {pageSize: 100},
  })

  const {mutate: deletePolicy} = useDelete()

  const policy = policyData?.data
  const assignments = assignmentsData?.data ?? []
  const categories = categoriesData?.data ?? []
  const groups = groupsData?.data ?? []
  const resources = resourcesData?.data ?? []

  // Create lookup maps
  const categoryMap = categories.reduce((acc, cat) => {
    acc[cat.id] = cat
    return acc
  }, {} as Record<string, ResourceCategory>)

  const groupMap = groups.reduce((acc, group) => {
    acc[group.id] = group
    return acc
  }, {} as Record<string, ResourceGroup>)

  const resourceMap = resources.reduce((acc, resource) => {
    acc[resource.id] = resource
    return acc
  }, {} as Record<string, BookingResource>)

  const deleteModal = useConfirmDelete({
    onConfirm: async () => {
      return new Promise<void>((resolve, reject) => {
        deletePolicy(
          {
            resource: BookingDataResource.POLICIES,
            id: id!,
          },
          {
            onSuccess: () => {
              navigate('/booking/admin/policies')
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
    navigate(`/booking/admin/policies/${id}/edit`)
  }

  const handleDelete = () => {
    if (policy && !policy.isDefault) {
      deleteModal.openModal(policy.id, policy.name)
    }
  }

  const handleClose = () => {
    navigate('/booking/admin/policies')
  }

  const formatDuration = (minutes?: number): string => {
    if (!minutes) return 'Not set'
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  // Get assignment target description
  const getAssignmentTarget = (assignment: PolicyAssignment): {label: string; name: string; type: string} => {
    if (assignment.isDefault) {
      return {label: 'System', name: 'Default Policy', type: 'default'}
    }
    if (assignment.resourceId) {
      const resource = resourceMap[assignment.resourceId]
      return {label: 'Resource', name: resource?.name || assignment.resourceId, type: 'resource'}
    }
    if (assignment.groupId) {
      const group = groupMap[assignment.groupId]
      return {label: 'Group', name: group?.name || assignment.groupId, type: 'group'}
    }
    if (assignment.categoryId) {
      const category = categoryMap[assignment.categoryId]
      return {label: 'Category', name: category?.name || assignment.categoryId, type: 'category'}
    }
    return {label: 'Unknown', name: 'Unknown', type: 'unknown'}
  }

  const tabs = [
    {id: PolicyTab.OVERVIEW, label: 'Overview'},
    {id: PolicyTab.CONSTRAINTS, label: 'Constraints'},
    {id: PolicyTab.ASSIGNMENTS, label: `Assignments (${assignments.length})`},
  ]

  if (isLoading) {
    return (
      <div className={style.pageContainer}>
        <PageHeaderBar path="Booking / Admin / Policies / Loading..." />
        <div className={style.loadingContainer}>
          <div className={style.spinner} />
          <p>Loading policy...</p>
        </div>
      </div>
    )
  }

  if (isError || !policy) {
    return (
      <div className={style.pageContainer}>
        <PageHeaderBar path="Booking / Admin / Policies / Error" />
        <div className={style.errorContainer}>
          <p>Failed to load policy.</p>
        </div>
      </div>
    )
  }

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
            {!policy.isDefault && (
              <button className={style.deleteButton} onClick={handleDelete}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
                Delete
              </button>
            )}
          </div>
        </div>
        <div className={style.infoCardBody}>
          <div className={style.infoGrid}>
            <div className={style.infoField}>
              <span className={style.infoLabel}>NAME</span>
              <span className={style.infoValue}>{policy.name}</span>
            </div>
            <div className={style.infoField}>
              <span className={style.infoLabel}>TYPE</span>
              <span className={`${style.typeBadge} ${policy.isDefault ? style.typeDefault : style.typeCustom}`}>
                {policy.isDefault ? 'Default Policy' : 'Custom Policy'}
              </span>
            </div>
            {policy.description && (
              <div className={`${style.infoField} ${style.fullWidth}`}>
                <span className={style.infoLabel}>DESCRIPTION</span>
                <span className={style.infoValue}>{policy.description}</span>
              </div>
            )}
            <div className={style.infoField}>
              <span className={style.infoLabel}>ASSIGNMENTS</span>
              <span className={style.infoValue}>{assignments.length} assignment(s)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Summary */}
      <div className={style.summaryCard}>
        <div className={style.summaryHeader}>
          <span className={style.summaryTitle}>Policy Summary</span>
        </div>
        <div className={style.summaryBody}>
          <div className={style.summaryItem}>
            <div className={style.summaryIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className={style.summaryContent}>
              <span className={style.summaryLabel}>Slot Duration</span>
              <span className={style.summaryValue}>{formatDuration(policy.slotDurationMinutes)}</span>
            </div>
          </div>
          <div className={style.summaryItem}>
            <div className={style.summaryIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className={style.summaryContent}>
              <span className={style.summaryLabel}>Max Advance</span>
              <span className={style.summaryValue}>
                {policy.maxAdvanceBookingDays ? `${policy.maxAdvanceBookingDays} days` : 'No limit'}
              </span>
            </div>
          </div>
          <div className={style.summaryItem}>
            <div className={style.summaryIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
            </div>
            <div className={style.summaryContent}>
              <span className={style.summaryLabel}>Requires Approval</span>
              <span className={style.summaryValue}>{policy.requiresApproval ? 'Yes' : 'No'}</span>
            </div>
          </div>
          <div className={style.summaryItem}>
            <div className={style.summaryIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 014-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 01-4 4H3" />
              </svg>
            </div>
            <div className={style.summaryContent}>
              <span className={style.summaryLabel}>Recurring Allowed</span>
              <span className={style.summaryValue}>{policy.allowRecurring ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderConstraintsTab = (): ReactElement => (
    <div className={style.tabContent}>
      {/* Time Constraints */}
      <div className={style.constraintSection}>
        <div className={style.constraintHeader}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className={style.constraintTitle}>Time Constraints</span>
        </div>
        <div className={style.constraintGrid}>
          <div className={style.constraintItem}>
            <span className={style.constraintLabel}>Slot Duration</span>
            <span className={style.constraintValue}>{formatDuration(policy.slotDurationMinutes)}</span>
            <span className={style.constraintDescription}>Duration of each bookable time slot</span>
          </div>
          <div className={style.constraintItem}>
            <span className={style.constraintLabel}>Minimum Duration</span>
            <span className={style.constraintValue}>{formatDuration(policy.minDurationMinutes)}</span>
            <span className={style.constraintDescription}>Minimum booking length allowed</span>
          </div>
          <div className={style.constraintItem}>
            <span className={style.constraintLabel}>Maximum Duration</span>
            <span className={style.constraintValue}>{formatDuration(policy.maxDurationMinutes)}</span>
            <span className={style.constraintDescription}>Maximum booking length allowed</span>
          </div>
          <div className={style.constraintItem}>
            <span className={style.constraintLabel}>Buffer After</span>
            <span className={style.constraintValue}>{formatDuration(policy.bufferAfterMinutes)}</span>
            <span className={style.constraintDescription}>Buffer time between consecutive bookings</span>
          </div>
        </div>
      </div>

      {/* Booking Rules */}
      <div className={style.constraintSection}>
        <div className={style.constraintHeader}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className={style.constraintTitle}>Booking Rules</span>
        </div>
        <div className={style.constraintGrid}>
          <div className={style.constraintItem}>
            <span className={style.constraintLabel}>Max Advance Booking</span>
            <span className={style.constraintValue}>
              {policy.maxAdvanceBookingDays ? `${policy.maxAdvanceBookingDays} days` : 'No limit'}
            </span>
            <span className={style.constraintDescription}>How far in advance bookings can be made</span>
          </div>
          <div className={style.constraintItem}>
            <span className={style.constraintLabel}>Min Advance Notice</span>
            <span className={style.constraintValue}>
              {policy.minAdvanceBookingHours ? `${policy.minAdvanceBookingHours} hours` : 'No minimum'}
            </span>
            <span className={style.constraintDescription}>Minimum notice required before booking</span>
          </div>
          <div className={style.constraintItem}>
            <span className={style.constraintLabel}>Max Concurrent Bookings</span>
            <span className={style.constraintValue}>
              {policy.maxConcurrentBookings ?? 'Unlimited'}
            </span>
            <span className={style.constraintDescription}>Maximum active bookings per user</span>
          </div>
        </div>
      </div>

      {/* Flags */}
      <div className={style.constraintSection}>
        <div className={style.constraintHeader}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
            <line x1="4" y1="22" x2="4" y2="15" />
          </svg>
          <span className={style.constraintTitle}>Policy Flags</span>
        </div>
        <div className={style.flagsList}>
          <div className={`${style.flagItem} ${policy.requiresApproval ? style.flagEnabled : style.flagDisabled}`}>
            <div className={style.flagIcon}>
              {policy.requiresApproval ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                </svg>
              )}
            </div>
            <div className={style.flagContent}>
              <span className={style.flagLabel}>Requires Approval</span>
              <span className={style.flagDescription}>
                {policy.requiresApproval
                  ? 'Bookings must be approved before confirmation'
                  : 'Bookings are automatically confirmed'}
              </span>
            </div>
          </div>
          <div className={`${style.flagItem} ${policy.allowRecurring ? style.flagEnabled : style.flagDisabled}`}>
            <div className={style.flagIcon}>
              {policy.allowRecurring ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                </svg>
              )}
            </div>
            <div className={style.flagContent}>
              <span className={style.flagLabel}>Allow Recurring</span>
              <span className={style.flagDescription}>
                {policy.allowRecurring
                  ? 'Users can create recurring bookings'
                  : 'Only single bookings allowed'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderAssignmentsTab = (): ReactElement => (
    <div className={style.tabContent}>
      {assignments.length === 0 ? (
        <div className={style.emptyState}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
          </svg>
          <p>This policy is not assigned anywhere yet.</p>
          <span className={style.emptyNote}>
            {policy.isDefault
              ? 'As the default policy, it will be used when no other policy is assigned.'
              : 'Assign it to categories, groups, or resources to apply its constraints.'}
          </span>
        </div>
      ) : (
        <div className={style.assignmentsList}>
          {assignments.map(assignment => {
            const target = getAssignmentTarget(assignment)
            return (
              <div key={assignment.id} className={style.assignmentCard}>
                <div className={`${style.assignmentCardIcon} ${style[`assignmentType${target.type.charAt(0).toUpperCase() + target.type.slice(1)}`]}`}>
                  {target.type === 'default' && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  )}
                  {target.type === 'category' && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                    </svg>
                  )}
                  {target.type === 'group' && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                    </svg>
                  )}
                  {target.type === 'resource' && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="9" y1="3" x2="9" y2="21" />
                    </svg>
                  )}
                </div>
                <div className={style.assignmentCardInfo}>
                  <span className={style.assignmentType}>{target.label}</span>
                  <span className={style.assignmentName}>{target.name}</span>
                </div>
                <div className={style.assignmentCardMeta}>
                  <span className={style.assignmentPriority}>Priority: {assignment.priority}</span>
                  {(assignment.validFrom || assignment.validUntil) && (
                    <span className={style.assignmentValidity}>
                      {assignment.validFrom && `From ${new Date(assignment.validFrom).toLocaleDateString()}`}
                      {assignment.validFrom && assignment.validUntil && ' - '}
                      {assignment.validUntil && `Until ${new Date(assignment.validUntil).toLocaleDateString()}`}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Assignment Note */}
      <div className={style.assignmentNote}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>
          Policies follow inheritance: Resource overrides Group, Group overrides Category, Category overrides Default.
        </span>
      </div>
    </div>
  )

  const renderTabContent = (): ReactElement => {
    switch (activeTab) {
      case PolicyTab.OVERVIEW:
        return renderOverviewTab()
      case PolicyTab.CONSTRAINTS:
        return renderConstraintsTab()
      case PolicyTab.ASSIGNMENTS:
        return renderAssignmentsTab()
      default:
        return renderOverviewTab()
    }
  }

  return (
    <div className={style.pageContainer}>
      <PageHeaderBar path={`Booking / Admin / Policies / ${policy.name}`} />
      <div className={style.container}>
        {/* Header */}
        <div className={style.header}>
          <div className={style.titleSection}>
            <div className={style.titleRow}>
              <div className={style.title}>{policy.name}</div>
              <span className={`${style.typeBadge} ${policy.isDefault ? style.typeDefault : style.typeCustom}`}>
                {policy.isDefault ? 'Default' : 'Custom'}
              </span>
            </div>
            {policy.description && (
              <div className={style.subtitle}>{policy.description}</div>
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
        title="Delete Policy"
        message={`Are you sure you want to delete "${policy.name}"? Resources using this policy will fall back to inherited policies.`}
        isLoading={deleteModal.isLoading}
        itemName={policy.name}
      />
    </div>
  )
}

export default PolicyDetailPage
