import React, {FC, ReactElement, useState} from 'react'
import {useOne, useList, useDelete} from '@refinedev/core'
import {useParams, useNavigate} from 'react-router-dom'
import {SecondaryButton} from '@sphereon/ui-components.ssi-react'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import ConfirmDeleteModal, {useConfirmDelete} from '@components/modals/ConfirmDeleteModal'
import {BookingDataResource, ScheduleSet, ScheduleRule, ScheduleSetAssignment, DayOfWeek} from '@typings'
import style from './index.module.css'

const DAYS_OF_WEEK: {value: DayOfWeek; label: string; short: string}[] = [
  {value: 1, label: 'Monday', short: 'Mon'},
  {value: 2, label: 'Tuesday', short: 'Tue'},
  {value: 3, label: 'Wednesday', short: 'Wed'},
  {value: 4, label: 'Thursday', short: 'Thu'},
  {value: 5, label: 'Friday', short: 'Fri'},
  {value: 6, label: 'Saturday', short: 'Sat'},
  {value: 7, label: 'Sunday', short: 'Sun'},
]

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

enum ScheduleSetTab {
  OVERVIEW = 'overview',
  RULES = 'rules',
  INCLUDES = 'includes',
  ASSIGNMENTS = 'assignments',
}

const ScheduleSetDetailPage: FC = (): ReactElement => {
  const {id} = useParams<{id: string}>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<ScheduleSetTab>(ScheduleSetTab.OVERVIEW)

  const {data: scheduleSetData, isLoading, isError} = useOne<ScheduleSet>({
    resource: BookingDataResource.SCHEDULE_SETS,
    id: id!,
  })

  const {data: allScheduleSetsData} = useList<ScheduleSet>({
    resource: BookingDataResource.SCHEDULE_SETS,
    pagination: {pageSize: 100},
  })

  const {data: assignmentsData} = useList<ScheduleSetAssignment>({
    resource: BookingDataResource.SCHEDULE_SET_ASSIGNMENTS,
    pagination: {pageSize: 100},
    filters: [{field: 'scheduleSetId', operator: 'eq', value: id}],
  })

  const {mutate: deleteScheduleSet} = useDelete()

  const scheduleSet = scheduleSetData?.data
  const allScheduleSets = allScheduleSetsData?.data ?? []
  const assignments = assignmentsData?.data ?? []

  const deleteModal = useConfirmDelete({
    onConfirm: async () => {
      return new Promise<void>((resolve, reject) => {
        deleteScheduleSet(
          {
            resource: BookingDataResource.SCHEDULE_SETS,
            id: id!,
          },
          {
            onSuccess: () => {
              navigate('/booking/admin/schedules')
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
    navigate(`/booking/admin/schedules/${id}/edit`)
  }

  const handleDelete = () => {
    if (scheduleSet) {
      deleteModal.openModal(scheduleSet.id, scheduleSet.name)
    }
  }

  const handleClose = () => {
    navigate('/booking/admin/schedules')
  }

  // Get included schedule sets by ID
  const getIncludedSets = (): ScheduleSet[] => {
    if (!scheduleSet) return []
    return scheduleSet.includedSetIds
      .map(setId => allScheduleSets.find(s => s.id === setId))
      .filter((s): s is ScheduleSet => s !== undefined)
  }

  // Format a rule for display
  const formatRule = (rule: ScheduleRule): string => {
    const parts: string[] = []

    if (rule.specificDate) {
      parts.push(new Date(rule.specificDate).toLocaleDateString())
    } else {
      if (rule.dayOfWeek) {
        parts.push(DAYS_OF_WEEK.find(d => d.value === rule.dayOfWeek)?.label || '')
      }
      if (rule.month) {
        parts.push(MONTHS[rule.month - 1])
      }
      if (rule.dayOfMonth) {
        parts.push(`Day ${rule.dayOfMonth}`)
      }
      if (rule.nthWeekday && rule.dayOfWeek) {
        const ordinal = ['1st', '2nd', '3rd', '4th', '5th'][rule.nthWeekday - 1]
        const day = DAYS_OF_WEEK.find(d => d.value === rule.dayOfWeek)?.label
        parts.push(`${ordinal} ${day} of month`)
      }
    }

    return parts.join(', ') || 'Every day'
  }

  // Get assignment target description
  const getAssignmentTarget = (assignment: ScheduleSetAssignment): string => {
    if (assignment.isDefault) return 'System Default'
    if (assignment.resourceId) return `Resource: ${assignment.resourceId}`
    if (assignment.groupId) return `Group: ${assignment.groupId}`
    if (assignment.categoryId) return `Category: ${assignment.categoryId}`
    return 'Unknown'
  }

  const tabs = [
    {id: ScheduleSetTab.OVERVIEW, label: 'Overview'},
    {id: ScheduleSetTab.RULES, label: `Rules (${scheduleSet?.rules.length || 0})`},
    {id: ScheduleSetTab.INCLUDES, label: `Includes (${scheduleSet?.includedSetIds.length || 0})`},
    {id: ScheduleSetTab.ASSIGNMENTS, label: `Assignments (${assignments.length})`},
  ]

  if (isLoading) {
    return (
      <div className={style.pageContainer}>
        <PageHeaderBar path="Booking / Admin / Schedules / Loading..." />
        <div className={style.loadingContainer}>
          <div className={style.spinner} />
          <p>Loading schedule...</p>
        </div>
      </div>
    )
  }

  if (isError || !scheduleSet) {
    return (
      <div className={style.pageContainer}>
        <PageHeaderBar path="Booking / Admin / Schedules / Error" />
        <div className={style.errorContainer}>
          <p>Failed to load schedule.</p>
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
              <span className={style.infoValue}>{scheduleSet.name}</span>
            </div>
            <div className={style.infoField}>
              <span className={style.infoLabel}>PRIORITY</span>
              <span className={style.infoValue}>{scheduleSet.priority}</span>
            </div>
            {scheduleSet.description && (
              <div className={`${style.infoField} ${style.fullWidth}`}>
                <span className={style.infoLabel}>DESCRIPTION</span>
                <span className={style.infoValue}>{scheduleSet.description}</span>
              </div>
            )}
            <div className={style.infoField}>
              <span className={style.infoLabel}>RULES COUNT</span>
              <span className={style.infoValue}>{scheduleSet.rules.length} rule(s)</span>
            </div>
            <div className={style.infoField}>
              <span className={style.infoLabel}>INCLUDES</span>
              <span className={style.infoValue}>
                {scheduleSet.includedSetIds.length > 0
                  ? `${scheduleSet.includedSetIds.length} other schedule(s)`
                  : 'None (standalone)'}
              </span>
            </div>
            <div className={style.infoField}>
              <span className={style.infoLabel}>CREATED</span>
              <span className={style.infoValue}>
                {new Date(scheduleSet.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className={style.infoField}>
              <span className={style.infoLabel}>LAST UPDATED</span>
              <span className={style.infoValue}>
                {new Date(scheduleSet.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderRulesTab = (): ReactElement => (
    <div className={style.tabContent}>
      {scheduleSet.rules.length === 0 ? (
        <div className={style.emptyState}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <p>No rules defined in this schedule.</p>
          {scheduleSet.includedSetIds.length > 0 && (
            <span className={style.emptyNote}>
              This schedule uses rules from included schedules.
            </span>
          )}
        </div>
      ) : (
        <div className={style.rulesList}>
          {scheduleSet.rules.map((rule, index) => (
            <div key={rule.id || index} className={`${style.ruleCard} ${rule.isClosed ? style.ruleCardClosed : ''}`}>
              <div className={style.ruleCardHeader}>
                <span className={style.ruleIndex}>#{index + 1}</span>
                {rule.isClosed ? (
                  <span className={style.closedBadge}>Closed</span>
                ) : (
                  <span className={style.openBadge}>Open</span>
                )}
              </div>
              <div className={style.ruleCardBody}>
                <div className={style.rulePattern}>
                  <span className={style.rulePatternLabel}>When:</span>
                  <span className={style.rulePatternValue}>{formatRule(rule)}</span>
                </div>
                <div className={style.ruleTime}>
                  <span className={style.ruleTimeLabel}>{rule.isClosed ? 'Blocked:' : 'Hours:'}</span>
                  <span className={style.ruleTimeValue}>
                    {rule.startTime && rule.endTime
                      ? `${rule.startTime} - ${rule.endTime}`
                      : 'All day'}
                  </span>
                </div>
                {(rule.validFrom || rule.validUntil) && (
                  <div className={style.ruleValidity}>
                    <span className={style.ruleValidityLabel}>Valid:</span>
                    <span className={style.ruleValidityValue}>
                      {rule.validFrom && `From ${new Date(rule.validFrom).toLocaleDateString()}`}
                      {rule.validFrom && rule.validUntil && ' '}
                      {rule.validUntil && `Until ${new Date(rule.validUntil).toLocaleDateString()}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderIncludesTab = (): ReactElement => {
    const includedSets = getIncludedSets()

    return (
      <div className={style.tabContent}>
        {includedSets.length === 0 ? (
          <div className={style.emptyState}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M16 16v6M8 8V2M12 19l-4-4 4-4M12 5l4 4-4 4" />
            </svg>
            <p>This schedule doesn't include other schedules.</p>
            <span className={style.emptyNote}>
              It uses only its own rules.
            </span>
          </div>
        ) : (
          <div className={style.includesList}>
            {includedSets.map((set, index) => (
              <div
                key={set.id}
                className={style.includeCard}
                onClick={() => navigate(`/booking/admin/schedules/${set.id}`)}
              >
                <div className={style.includeCardIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                </div>
                <div className={style.includeCardInfo}>
                  <span className={style.includeOrder}>#{index + 1}</span>
                  <span className={style.includeName}>{set.name}</span>
                  {set.description && (
                    <span className={style.includeDescription}>{set.description}</span>
                  )}
                </div>
                <div className={style.includeCardMeta}>
                  <span className={style.includePriority}>Priority: {set.priority}</span>
                  <span className={style.includeRules}>{set.rules.length} rule(s)</span>
                </div>
                <svg className={style.includeCardArrow} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderAssignmentsTab = (): ReactElement => (
    <div className={style.tabContent}>
      {assignments.length === 0 ? (
        <div className={style.emptyState}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
          </svg>
          <p>This schedule is not assigned anywhere yet.</p>
          <span className={style.emptyNote}>
            Assign it to categories, groups, or resources.
          </span>
        </div>
      ) : (
        <div className={style.assignmentsList}>
          {assignments.map(assignment => (
            <div key={assignment.id} className={style.assignmentCard}>
              <div className={style.assignmentCardIcon}>
                {assignment.isDefault && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                )}
                {assignment.categoryId && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
                  </svg>
                )}
                {assignment.groupId && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                  </svg>
                )}
                {assignment.resourceId && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                  </svg>
                )}
              </div>
              <div className={style.assignmentCardInfo}>
                <span className={style.assignmentTarget}>{getAssignmentTarget(assignment)}</span>
                <span className={style.assignmentPriority}>Priority: {assignment.priority}</span>
              </div>
              {(assignment.validFrom || assignment.validUntil) && (
                <div className={style.assignmentValidity}>
                  {assignment.validFrom && (
                    <span>From: {new Date(assignment.validFrom).toLocaleDateString()}</span>
                  )}
                  {assignment.validUntil && (
                    <span>Until: {new Date(assignment.validUntil).toLocaleDateString()}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderTabContent = (): ReactElement => {
    switch (activeTab) {
      case ScheduleSetTab.OVERVIEW:
        return renderOverviewTab()
      case ScheduleSetTab.RULES:
        return renderRulesTab()
      case ScheduleSetTab.INCLUDES:
        return renderIncludesTab()
      case ScheduleSetTab.ASSIGNMENTS:
        return renderAssignmentsTab()
      default:
        return renderOverviewTab()
    }
  }

  return (
    <div className={style.pageContainer}>
      <PageHeaderBar path={`Booking / Admin / Schedules / ${scheduleSet.name}`} />
      <div className={style.container}>
        {/* Header */}
        <div className={style.header}>
          <div className={style.titleSection}>
            <div className={style.titleRow}>
              <div className={style.title}>{scheduleSet.name}</div>
              <span className={style.priorityBadge}>Priority: {scheduleSet.priority}</span>
              {scheduleSet.includedSetIds.length > 0 && (
                <span className={style.compositeBadge}>Composite</span>
              )}
            </div>
            {scheduleSet.description && (
              <div className={style.subtitle}>{scheduleSet.description}</div>
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
        title="Delete Schedule"
        message={`Are you sure you want to delete "${scheduleSet.name}"? This will remove it from any assignments.`}
        isLoading={deleteModal.isLoading}
        itemName={scheduleSet.name}
      />
    </div>
  )
}

export default ScheduleSetDetailPage
