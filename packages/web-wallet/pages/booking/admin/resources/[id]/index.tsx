import React, {FC, ReactElement, useState, useEffect, useCallback} from 'react'
import {useNavigate, useParams} from 'react-router-dom'
import {useOne, useList, useDelete} from '@refinedev/core'
import {PrimaryButton, SecondaryButton} from '@sphereon/ui-components.ssi-react'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import ConfirmDeleteModal, {useConfirmDelete} from '@components/modals/ConfirmDeleteModal'
import AvailabilityTimeline from '@components/booking/AvailabilityTimeline'
import {bookingService} from '@/src/dataProviders/bookingDataProvider'
import {
  BookingDataResource,
  BookingResource,
  ResourceCategory,
  ResourceGroup,
  UsagePolicy,
  ScheduleSetAssignment,
  PolicyAssignment,
  Booking,
  TimeSlot,
} from '@typings'
import style from './index.module.css'

enum ResourceTab {
  OVERVIEW = 'overview',
  SCHEDULE = 'schedule',
  POLICY = 'policy',
  BOOKINGS = 'bookings',
}

const ResourceDetailPage: FC = (): ReactElement => {
  const navigate = useNavigate()
  const {id} = useParams<{id: string}>()
  const [activeTab, setActiveTab] = useState<ResourceTab>(ResourceTab.OVERVIEW)

  const {mutate: deleteResource} = useDelete()

  // Fetch resource details
  const {data: resourceData, isLoading, error} = useOne<BookingResource>({
    resource: BookingDataResource.RESOURCES,
    id: id as string,
    queryOptions: {enabled: !!id},
  })

  // Fetch category if resource has one
  const {data: categoryData} = useOne<ResourceCategory>({
    resource: BookingDataResource.CATEGORIES,
    id: resourceData?.data?.categoryId || '',
    queryOptions: {enabled: !!resourceData?.data?.categoryId},
  })

  // Fetch group if resource has one
  const {data: groupData} = useOne<ResourceGroup>({
    resource: BookingDataResource.GROUPS,
    id: resourceData?.data?.groupId || '',
    queryOptions: {enabled: !!resourceData?.data?.groupId},
  })

  // Fetch schedule assignments for this resource, its group, and category
  const {data: scheduleAssignmentsData} = useList<ScheduleSetAssignment>({
    resource: BookingDataResource.SCHEDULE_SET_ASSIGNMENTS,
    pagination: {pageSize: 100},
    queryOptions: {enabled: !!id},
  })

  // Fetch policy assignments
  const {data: policyAssignmentsData} = useList<PolicyAssignment>({
    resource: BookingDataResource.POLICY_ASSIGNMENTS,
    pagination: {pageSize: 100},
    queryOptions: {enabled: !!id},
  })

  // Fetch bookings for this resource
  const {data: bookingsData} = useList<Booking>({
    resource: BookingDataResource.BOOKINGS,
    filters: [{field: 'resourceId', operator: 'eq', value: id}],
    pagination: {pageSize: 20},
    sorters: [{field: 'startTime', order: 'desc'}],
    queryOptions: {enabled: !!id},
  })

  // Fetch default policy
  const {data: defaultPolicyData} = useList<UsagePolicy>({
    resource: BookingDataResource.POLICIES,
    filters: [{field: 'isDefault', operator: 'eq', value: true}],
    pagination: {pageSize: 1},
  })

  const resource = resourceData?.data
  const category = categoryData?.data
  const group = groupData?.data
  const bookings = bookingsData?.data ?? []

  // State for availability timeline
  const [timelineSlots, setTimelineSlots] = useState<TimeSlot[]>([])
  const [timelineSlotsLoading, setTimelineSlotsLoading] = useState(false)

  // Format date for API
  const formatDateForApi = (date: Date): string => {
    return date.toISOString().split('T')[0]
  }

  // Get week start (Monday)
  const getWeekStart = useCallback((date: Date): Date => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  // Load availability for current week
  const loadAvailability = useCallback(async () => {
    if (!id) return
    setTimelineSlotsLoading(true)
    try {
      const weekStart = getWeekStart(new Date())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)

      // Calculate the number of days to fetch
      const daysDiff = Math.ceil((weekEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)) + 1

      // Fetch availability for each day in the range
      const promises: Promise<{resourceId: string; date: string; timezone?: string; slots: TimeSlot[]}>[] = []
      for (let i = 0; i < daysDiff; i++) {
        const date = new Date(weekStart)
        date.setDate(date.getDate() + i)
        promises.push(bookingService.getResourceAvailability(id as string, formatDateForApi(date)))
      }

      const responses = await Promise.all(promises)

      // Combine all slots from all days
      const allSlots: TimeSlot[] = []
      for (const response of responses) {
        const parsedSlots = response.slots.map((slot: TimeSlot) => ({
          ...slot,
          startTime: new Date(slot.startTime),
          endTime: new Date(slot.endTime),
        }))
        allSlots.push(...parsedSlots)
      }

      setTimelineSlots(allSlots)
    } catch (error) {
      console.error('Failed to load availability:', error)
      setTimelineSlots([])
    } finally {
      setTimelineSlotsLoading(false)
    }
  }, [id, getWeekStart])

  // Load availability when switching to Schedule tab
  useEffect(() => {
    if (activeTab === ResourceTab.SCHEDULE && id && timelineSlots.length === 0 && !timelineSlotsLoading) {
      loadAvailability()
    }
  }, [activeTab, id, timelineSlots.length, timelineSlotsLoading, loadAvailability])

  // Find effective schedule assignment (resource > group > category > default)
  const scheduleAssignments = scheduleAssignmentsData?.data ?? []
  const getEffectiveScheduleAssignment = () => {
    // Resource level
    const resourceAssignment = scheduleAssignments.find(a => a.resourceId === id)
    if (resourceAssignment) {
      return {assignment: resourceAssignment, source: 'resource' as const, sourceName: resource?.name}
    }
    // Group level
    if (resource?.groupId) {
      const groupAssignment = scheduleAssignments.find(a => a.groupId === resource.groupId)
      if (groupAssignment) {
        return {assignment: groupAssignment, source: 'group' as const, sourceName: group?.name}
      }
    }
    // Category level
    if (resource?.categoryId) {
      const categoryAssignment = scheduleAssignments.find(a => a.categoryId === resource.categoryId)
      if (categoryAssignment) {
        return {assignment: categoryAssignment, source: 'category' as const, sourceName: category?.name}
      }
    }
    // Default level
    const defaultAssignment = scheduleAssignments.find(a => a.isDefault)
    if (defaultAssignment) {
      return {assignment: defaultAssignment, source: 'default' as const, sourceName: 'System Default'}
    }
    return null
  }

  // Find effective policy assignment
  const policyAssignments = policyAssignmentsData?.data ?? []
  const getEffectivePolicyAssignment = () => {
    // Resource level
    const resourceAssignment = policyAssignments.find(a => a.resourceId === id)
    if (resourceAssignment) {
      return {assignment: resourceAssignment, source: 'resource' as const, sourceName: resource?.name}
    }
    // Group level
    if (resource?.groupId) {
      const groupAssignment = policyAssignments.find(a => a.groupId === resource.groupId)
      if (groupAssignment) {
        return {assignment: groupAssignment, source: 'group' as const, sourceName: group?.name}
      }
    }
    // Category level
    if (resource?.categoryId) {
      const categoryAssignment = policyAssignments.find(a => a.categoryId === resource.categoryId)
      if (categoryAssignment) {
        return {assignment: categoryAssignment, source: 'category' as const, sourceName: category?.name}
      }
    }
    // Default level
    const defaultAssignment = policyAssignments.find(a => a.isDefault)
    if (defaultAssignment) {
      return {assignment: defaultAssignment, source: 'default' as const, sourceName: 'System Default'}
    }
    // Fallback to default policy if no assignment
    if (defaultPolicyData?.data?.[0]) {
      return {
        policy: defaultPolicyData.data[0],
        source: 'default' as const,
        sourceName: 'System Default Policy',
      }
    }
    return null
  }

  const effectiveSchedule = getEffectiveScheduleAssignment()
  const effectivePolicy = getEffectivePolicyAssignment()

  const deleteModal = useConfirmDelete({
    onConfirm: async () => {
      return new Promise<void>((resolve, reject) => {
        deleteResource(
          {
            resource: BookingDataResource.RESOURCES,
            id: id as string,
          },
          {
            onSuccess: () => {
              navigate('/booking/admin/resources')
              resolve()
            },
            onError: (err) => reject(err),
          },
        )
      })
    },
  })

  const handleEdit = async () => {
    navigate(`/booking/admin/resources/edit/${id}`)
  }

  const handleDelete = () => {
    deleteModal.openModal(id as string, resource?.name || 'Resource')
  }

  const handleClose = async () => {
    navigate('/booking/admin/resources')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return style.statusActive
      case 'MAINTENANCE':
        return style.statusMaintenance
      case 'RETIRED':
        return style.statusRetired
      default:
        return ''
    }
  }

  const getBookingStatusClass = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return style.bookingConfirmed
      case 'PENDING':
        return style.bookingPending
      case 'CANCELLED':
        return style.bookingCancelled
      case 'COMPLETED':
        return style.bookingCompleted
      default:
        return ''
    }
  }

  const getSourceBadgeClass = (source: string) => {
    switch (source) {
      case 'resource':
        return style.sourceResource
      case 'group':
        return style.sourceGroup
      case 'category':
        return style.sourceCategory
      case 'default':
        return style.sourceDefault
      default:
        return ''
    }
  }

  if (isLoading) {
    return (
      <div className={style.pageContainer}>
        <PageHeaderBar
          title="Resource Details"
          path="Booking / Admin / Resources / Loading..."
        />
        <div className={style.loadingContainer}>
          <div className={style.spinner} />
          <span>Loading resource...</span>
        </div>
      </div>
    )
  }

  if (error || !resource) {
    return (
      <div className={style.pageContainer}>
        <PageHeaderBar
          title="Resource Details"
          path="Booking / Admin / Resources / Error"
        />
        <div className={style.errorContainer}>
          <p>Resource not found or an error occurred.</p>
          <SecondaryButton caption="Back to Resources" onClick={async () => navigate('/booking/admin/resources')} />
        </div>
      </div>
    )
  }

  const renderOverviewTab = () => (
    <div className={style.tabContent}>
      {/* Basic Information */}
      <div className={style.infoCard}>
        <div className={style.infoCardHeader}>
          <h3 className={style.infoCardTitle}>Basic Information</h3>
        </div>
        <div className={style.infoCardBody}>
          <div className={style.infoGrid}>
            <div className={style.infoField}>
              <span className={style.infoLabel}>Name</span>
              <span className={style.infoValue}>{resource.name}</span>
            </div>
            <div className={style.infoField}>
              <span className={style.infoLabel}>Status</span>
              <span className={`${style.statusBadge} ${getStatusBadgeClass(resource.status)}`}>
                {resource.status}
              </span>
            </div>
            <div className={style.infoField}>
              <span className={style.infoLabel}>Category</span>
              <span className={style.infoValue}>{category?.name || 'Uncategorized'}</span>
            </div>
            <div className={style.infoField}>
              <span className={style.infoLabel}>Group</span>
              <span className={style.infoValue}>{group?.name || 'Not assigned'}</span>
            </div>
            <div className={style.infoField}>
              <span className={style.infoLabel}>Capacity</span>
              <span className={style.infoValue}>{resource.capacity || 1} person(s)</span>
            </div>
            <div className={style.infoField}>
              <span className={style.infoLabel}>Timezone</span>
              <span className={style.infoValue}>{resource.timezone}</span>
            </div>
            {resource.description && (
              <div className={`${style.infoField} ${style.fullWidth}`}>
                <span className={style.infoLabel}>Description</span>
                <span className={style.infoValue}>{resource.description}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Requirements */}
      {resource.requirements && resource.requirements.length > 0 && (
        <div className={style.infoCard}>
          <div className={style.infoCardHeader}>
            <h3 className={style.infoCardTitle}>Verification Requirements</h3>
          </div>
          <div className={style.infoCardBody}>
            <div className={style.requirementsList}>
              {resource.requirements.map((req, index) => (
                <div key={req.id || index} className={style.requirementItem}>
                  <div className={style.requirementIcon}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <div className={style.requirementInfo}>
                    <span className={style.requirementName}>{req.description || 'Credential verification'}</span>
                    <span className={style.requirementMeta}>
                      {req.isMandatory ? 'Required' : 'Optional'}
                      {req.dcqlQuery && ` • DCQL: ${req.dcqlQuery}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className={style.infoCard}>
        <div className={style.infoCardHeader}>
          <h3 className={style.infoCardTitle}>Metadata</h3>
        </div>
        <div className={style.infoCardBody}>
          <div className={style.infoGrid}>
            <div className={style.infoField}>
              <span className={style.infoLabel}>Created</span>
              <span className={style.infoValue}>{formatDate(resource.createdAt)}</span>
            </div>
            <div className={style.infoField}>
              <span className={style.infoLabel}>Last Updated</span>
              <span className={style.infoValue}>{formatDate(resource.updatedAt)}</span>
            </div>
            <div className={`${style.infoField} ${style.fullWidth}`}>
              <span className={style.infoLabel}>Resource ID</span>
              <span className={style.infoValueMono}>{resource.id}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderScheduleTab = () => (
    <div className={style.tabContent}>
      {/* Availability Timeline */}
      <div className={style.availabilitySection}>
        <AvailabilityTimeline
          resourceId={id as string}
          showBookings={true}
          isAdminView={true}
          slots={timelineSlots}
          isLoading={timelineSlotsLoading}
        />
      </div>

      {/* Inheritance Chain */}
      <div className={style.inheritanceChain}>
        <div className={style.inheritanceTitle}>Inheritance Chain</div>
        <div className={style.inheritanceLevels}>
          <div className={`${style.inheritanceLevel} ${effectiveSchedule?.source === 'default' ? style.inheritanceLevelActive : ''}`}>
            <span className={style.inheritanceLevelName}>Default</span>
            {effectiveSchedule?.source === 'default' && <span className={style.inheritanceBadge}>Active</span>}
          </div>
          <div className={style.inheritanceArrow}>→</div>
          <div className={`${style.inheritanceLevel} ${effectiveSchedule?.source === 'category' ? style.inheritanceLevelActive : ''}`}>
            <span className={style.inheritanceLevelName}>Category</span>
            {effectiveSchedule?.source === 'category' && <span className={style.inheritanceBadge}>Active</span>}
          </div>
          <div className={style.inheritanceArrow}>→</div>
          <div className={`${style.inheritanceLevel} ${effectiveSchedule?.source === 'group' ? style.inheritanceLevelActive : ''}`}>
            <span className={style.inheritanceLevelName}>Group</span>
            {effectiveSchedule?.source === 'group' && <span className={style.inheritanceBadge}>Active</span>}
          </div>
          <div className={style.inheritanceArrow}>→</div>
          <div className={`${style.inheritanceLevel} ${effectiveSchedule?.source === 'resource' ? style.inheritanceLevelActive : ''}`}>
            <span className={style.inheritanceLevelName}>Resource</span>
            {effectiveSchedule?.source === 'resource' && <span className={style.inheritanceBadge}>Override</span>}
          </div>
        </div>
      </div>

      {/* Effective Schedule */}
      {effectiveSchedule ? (
        <div className={style.effectiveCard}>
          <div className={style.effectiveHeader}>
            <div className={style.effectiveIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className={style.effectiveInfo}>
              <span className={style.effectiveLabel}>Effective Schedule</span>
              <span className={style.effectiveName}>
                {effectiveSchedule.assignment?.scheduleSet?.name || 'Schedule Set'}
              </span>
            </div>
            <span className={`${style.sourceBadge} ${getSourceBadgeClass(effectiveSchedule.source)}`}>
              {effectiveSchedule.source === 'resource' ? 'Override' : `Inherited from ${effectiveSchedule.sourceName}`}
            </span>
          </div>
          {effectiveSchedule.assignment?.scheduleSet?.description && (
            <div className={style.effectiveDescription}>
              {effectiveSchedule.assignment.scheduleSet.description}
            </div>
          )}
          {effectiveSchedule.assignment?.scheduleSet?.rules && effectiveSchedule.assignment.scheduleSet.rules.length > 0 && (
            <div className={style.rulesPreview}>
              <span className={style.rulesCount}>
                {effectiveSchedule.assignment.scheduleSet.rules.length} rule(s) defined
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className={style.emptyState}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <p>No schedule assigned</p>
          <span className={style.emptyNote}>Assign a schedule set to define availability hours</span>
        </div>
      )}

      {/* Note about schedule management */}
      <div className={style.inheritanceNote}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>
          Schedules are inherited from the most specific level. To override, assign a schedule directly to this resource.
        </span>
      </div>

      {/* Action Button */}
      <div className={style.tabActions}>
        <button
          className={style.manageButton}
          onClick={() => navigate(`/booking/admin/resources/edit/${id}?step=3`)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Manage Schedule Assignment
        </button>
      </div>
    </div>
  )

  const renderPolicyTab = () => {
    const policy = effectivePolicy?.assignment?.policy || (effectivePolicy as any)?.policy

    return (
      <div className={style.tabContent}>
        {/* Inheritance Chain */}
        <div className={style.inheritanceChain}>
          <div className={style.inheritanceTitle}>Inheritance Chain</div>
          <div className={style.inheritanceLevels}>
            <div className={`${style.inheritanceLevel} ${effectivePolicy?.source === 'default' ? style.inheritanceLevelActive : ''}`}>
              <span className={style.inheritanceLevelName}>Default</span>
              {effectivePolicy?.source === 'default' && <span className={style.inheritanceBadge}>Active</span>}
            </div>
            <div className={style.inheritanceArrow}>→</div>
            <div className={`${style.inheritanceLevel} ${effectivePolicy?.source === 'category' ? style.inheritanceLevelActive : ''}`}>
              <span className={style.inheritanceLevelName}>Category</span>
              {effectivePolicy?.source === 'category' && <span className={style.inheritanceBadge}>Active</span>}
            </div>
            <div className={style.inheritanceArrow}>→</div>
            <div className={`${style.inheritanceLevel} ${effectivePolicy?.source === 'group' ? style.inheritanceLevelActive : ''}`}>
              <span className={style.inheritanceLevelName}>Group</span>
              {effectivePolicy?.source === 'group' && <span className={style.inheritanceBadge}>Active</span>}
            </div>
            <div className={style.inheritanceArrow}>→</div>
            <div className={`${style.inheritanceLevel} ${effectivePolicy?.source === 'resource' ? style.inheritanceLevelActive : ''}`}>
              <span className={style.inheritanceLevelName}>Resource</span>
              {effectivePolicy?.source === 'resource' && <span className={style.inheritanceBadge}>Override</span>}
            </div>
          </div>
        </div>

        {/* Effective Policy */}
        {policy ? (
          <>
            <div className={style.effectiveCard}>
              <div className={style.effectiveHeader}>
                <div className={style.effectiveIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div className={style.effectiveInfo}>
                  <span className={style.effectiveLabel}>Effective Policy</span>
                  <span className={style.effectiveName}>{policy.name}</span>
                </div>
                <span className={`${style.sourceBadge} ${getSourceBadgeClass(effectivePolicy?.source || 'default')}`}>
                  {effectivePolicy?.source === 'resource' ? 'Override' : `Inherited from ${effectivePolicy?.sourceName}`}
                </span>
              </div>
              {policy.description && (
                <div className={style.effectiveDescription}>{policy.description}</div>
              )}
            </div>

            {/* Policy Constraints */}
            <div className={style.constraintsCard}>
              <div className={style.constraintsHeader}>
                <h3 className={style.constraintsTitle}>Policy Constraints</h3>
              </div>
              <div className={style.constraintsGrid}>
                <div className={style.constraintItem}>
                  <div className={style.constraintIcon}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div className={style.constraintInfo}>
                    <span className={style.constraintLabel}>Slot Duration</span>
                    <span className={style.constraintValue}>{policy.slotIntervalMinutes} min</span>
                  </div>
                </div>

                {policy.minBookingDurationMinutes && (
                  <div className={style.constraintItem}>
                    <div className={style.constraintIcon}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </div>
                    <div className={style.constraintInfo}>
                      <span className={style.constraintLabel}>Min Duration</span>
                      <span className={style.constraintValue}>{policy.minBookingDurationMinutes} min</span>
                    </div>
                  </div>
                )}

                {policy.maxBookingDurationMinutes && (
                  <div className={style.constraintItem}>
                    <div className={style.constraintIcon}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                      </svg>
                    </div>
                    <div className={style.constraintInfo}>
                      <span className={style.constraintLabel}>Max Duration</span>
                      <span className={style.constraintValue}>{policy.maxBookingDurationMinutes} min</span>
                    </div>
                  </div>
                )}

                {policy.bufferAfterMinutes && (
                  <div className={style.constraintItem}>
                    <div className={style.constraintIcon}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="3" y1="9" x2="21" y2="9" />
                      </svg>
                    </div>
                    <div className={style.constraintInfo}>
                      <span className={style.constraintLabel}>Buffer After</span>
                      <span className={style.constraintValue}>{policy.bufferAfterMinutes} min</span>
                    </div>
                  </div>
                )}

                <div className={style.constraintItem}>
                  <div className={style.constraintIcon}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <div className={style.constraintInfo}>
                    <span className={style.constraintLabel}>Advance Booking</span>
                    <span className={style.constraintValue}>Up to {policy.maxAdvanceBookingDays} days</span>
                  </div>
                </div>

                {policy.concurrencyLimit && (
                  <div className={style.constraintItem}>
                    <div className={style.constraintIcon}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                    <div className={style.constraintInfo}>
                      <span className={style.constraintLabel}>Concurrent Bookings</span>
                      <span className={style.constraintValue}>Max {policy.concurrencyLimit}</span>
                    </div>
                  </div>
                )}

                <div className={style.constraintItem}>
                  <div className={style.constraintIcon}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {policy.allowSameDayBooking ? (
                        <polyline points="20 6 9 17 4 12" />
                      ) : (
                        <>
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </>
                      )}
                    </svg>
                  </div>
                  <div className={style.constraintInfo}>
                    <span className={style.constraintLabel}>Same-Day Booking</span>
                    <span className={style.constraintValue}>
                      {policy.allowSameDayBooking ? 'Allowed' : 'Not allowed'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className={style.emptyState}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <p>No policy assigned</p>
            <span className={style.emptyNote}>Assign a policy to define booking rules</span>
          </div>
        )}

        {/* Note */}
        <div className={style.inheritanceNote}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>
            Policies are inherited from the most specific level. To override, assign a policy directly to this resource.
          </span>
        </div>

        {/* Action Button */}
        <div className={style.tabActions}>
          <button
            className={style.manageButton}
            onClick={() => navigate(`/booking/admin/resources/edit/${id}?step=4`)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Manage Policy Assignment
          </button>
        </div>
      </div>
    )
  }

  const renderBookingsTab = () => (
    <div className={style.tabContent}>
      {bookings.length > 0 ? (
        <div className={style.bookingsList}>
          {bookings.map(booking => (
            <div key={booking.id} className={style.bookingCard}>
              <div className={style.bookingCardIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className={style.bookingCardInfo}>
                <span className={style.bookingTitle}>{booking.title || 'Booking'}</span>
                <span className={style.bookingTime}>
                  {formatDateTime(booking.startTime)} - {new Date(booking.endTime).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})}
                </span>
              </div>
              <div className={style.bookingCardMeta}>
                <span className={`${style.bookingStatus} ${getBookingStatusClass(booking.status)}`}>
                  {booking.status}
                </span>
                <span className={style.bookingUser}>User: {booking.userId}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={style.emptyState}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <p>No bookings yet</p>
          <span className={style.emptyNote}>Bookings for this resource will appear here</span>
        </div>
      )}
    </div>
  )

  return (
    <div className={style.pageContainer}>
      <PageHeaderBar
        title={resource.name}
        path={`Booking / Admin / Resources / ${resource.name}`}
      />

      <div className={style.container}>
        {/* Header */}
        <div className={style.header}>
          <div className={style.titleSection}>
            <div className={style.titleRow}>
              <h1 className={style.title}>{resource.name}</h1>
              <span className={`${style.statusBadge} ${getStatusBadgeClass(resource.status)}`}>
                {resource.status}
              </span>
            </div>
            <span className={style.subtitle}>
              {category?.name || 'Uncategorized'}
              {group && ` • ${group.name}`}
            </span>
          </div>
          <div className={style.headerActions}>
            <button className={style.deleteButton} onClick={handleDelete} title="Delete">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
            <SecondaryButton caption="Edit" onClick={handleEdit} />
            <PrimaryButton caption="Close" onClick={handleClose} />
          </div>
        </div>

        {/* Tabs */}
        <div className={style.tabs}>
          <button
            className={`${style.tab} ${activeTab === ResourceTab.OVERVIEW ? style.tabActive : ''}`}
            onClick={() => setActiveTab(ResourceTab.OVERVIEW)}
          >
            Overview
          </button>
          <button
            className={`${style.tab} ${activeTab === ResourceTab.SCHEDULE ? style.tabActive : ''}`}
            onClick={() => setActiveTab(ResourceTab.SCHEDULE)}
          >
            Schedule
          </button>
          <button
            className={`${style.tab} ${activeTab === ResourceTab.POLICY ? style.tabActive : ''}`}
            onClick={() => setActiveTab(ResourceTab.POLICY)}
          >
            Policy
          </button>
          <button
            className={`${style.tab} ${activeTab === ResourceTab.BOOKINGS ? style.tabActive : ''}`}
            onClick={() => setActiveTab(ResourceTab.BOOKINGS)}
          >
            Bookings ({bookings.length})
          </button>
        </div>

        {/* Body */}
        <div className={style.body}>
          {activeTab === ResourceTab.OVERVIEW && renderOverviewTab()}
          {activeTab === ResourceTab.SCHEDULE && renderScheduleTab()}
          {activeTab === ResourceTab.POLICY && renderPolicyTab()}
          {activeTab === ResourceTab.BOOKINGS && renderBookingsTab()}
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onCancel={deleteModal.closeModal}
        onConfirm={deleteModal.handleConfirm}
        title="Delete Resource"
        message={`Are you sure you want to delete "${resource.name}"? This action cannot be undone.`}
        isLoading={deleteModal.isLoading}
        itemName={resource.name}
      />
    </div>
  )
}

export default ResourceDetailPage
