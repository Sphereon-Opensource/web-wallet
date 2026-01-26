import React, {FC, ReactElement, useState, useEffect} from 'react'
import {useOne, useUpdate, useList, useTranslate} from '@refinedev/core'
import {useNavigate, useParams} from 'react-router-dom'
import {PrimaryButton, ProgressStepIndicator, SecondaryButton} from '@sphereon/ui-components.ssi-react'
import PageHeaderBar from '@components/bars/PageHeaderBar'
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

interface FormData {
  name: string
  description: string
  categoryId: string | null
  status: 'ACTIVE' | 'INACTIVE'
  resourceIds: string[]
  scheduleSetId: string | null
  policyId: string | null
  useInheritedSchedule: boolean
  useInheritedPolicy: boolean
}

const GroupEditPage: FC = (): ReactElement => {
  const {id} = useParams<{id: string}>()
  const navigate = useNavigate()
  const translate = useTranslate()
  const [step, setStep] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    categoryId: null,
    status: 'ACTIVE',
    resourceIds: [],
    scheduleSetId: null,
    policyId: null,
    useInheritedSchedule: true,
    useInheritedPolicy: true,
  })

  // Fetch existing group
  const {data: groupData, isLoading: isLoadingGroup} = useOne<ResourceGroup>({
    resource: BookingDataResource.GROUPS,
    id: id!,
  })

  // Fetch categories
  const {data: categoriesData} = useList<ResourceCategory>({
    resource: BookingDataResource.CATEGORIES,
    pagination: {pageSize: 100},
  })

  // Fetch all resources
  const {data: resourcesData} = useList<BookingResource>({
    resource: BookingDataResource.RESOURCES,
    pagination: {pageSize: 100},
  })

  // Fetch all schedule sets
  const {data: scheduleSetsData} = useList<ScheduleSet>({
    resource: BookingDataResource.SCHEDULE_SETS,
    pagination: {pageSize: 100},
  })

  // Fetch all policies
  const {data: policiesData} = useList<UsagePolicy>({
    resource: BookingDataResource.POLICIES,
    pagination: {pageSize: 100},
  })

  // Fetch existing schedule assignments for this group
  const {data: scheduleAssignmentsData} = useList<ScheduleSetAssignment>({
    resource: BookingDataResource.SCHEDULE_SET_ASSIGNMENTS,
    pagination: {pageSize: 100},
    filters: [{field: 'groupId', operator: 'eq', value: id}],
  })

  // Fetch existing policy assignments for this group
  const {data: policyAssignmentsData} = useList<PolicyAssignment>({
    resource: BookingDataResource.POLICY_ASSIGNMENTS,
    pagination: {pageSize: 100},
    filters: [{field: 'groupId', operator: 'eq', value: id}],
  })

  const {mutate: updateGroup, isLoading: isUpdating} = useUpdate()

  const group = groupData?.data
  const categories = categoriesData?.data ?? []
  const resources = resourcesData?.data ?? []
  const scheduleSets = scheduleSetsData?.data ?? []
  const policies = policiesData?.data ?? []
  const scheduleAssignments = scheduleAssignmentsData?.data ?? []
  const policyAssignments = policyAssignmentsData?.data ?? []

  // Initialize form with existing data
  useEffect(() => {
    if (group && !isInitialized) {
      const existingScheduleAssignment = scheduleAssignments.length > 0 ? scheduleAssignments[0] : null
      const existingPolicyAssignment = policyAssignments.length > 0 ? policyAssignments[0] : null

      // Get resources that belong to this group
      const groupResourceIds = resources.filter(r => r.groupId === id).map(r => r.id)

      setFormData({
        name: group.name,
        description: group.description || '',
        categoryId: group.categoryId || null,
        status: group.status,
        resourceIds: groupResourceIds,
        scheduleSetId: existingScheduleAssignment?.scheduleSetId || null,
        policyId: existingPolicyAssignment?.policyId || null,
        useInheritedSchedule: !existingScheduleAssignment,
        useInheritedPolicy: !existingPolicyAssignment,
      })
      setIsInitialized(true)
    }
  }, [group, isInitialized, scheduleAssignments, policyAssignments, resources, id])

  // Filter resources that don't belong to another group (or belong to this group)
  const availableResources = resources.filter(r =>
    (!r.groupId || r.groupId === id) &&
    (!formData.categoryId || r.categoryId === formData.categoryId)
  )

  // Filter by search
  const filteredResources = availableResources.filter(r =>
    searchQuery === '' ||
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSubmit = () => {
    setError(null)

    updateGroup(
      {
        resource: BookingDataResource.GROUPS,
        id: id!,
        values: {
          name: formData.name,
          description: formData.description || undefined,
          categoryId: formData.categoryId || undefined,
          status: formData.status,
          resourceIds: formData.resourceIds,
          scheduleSetId: formData.useInheritedSchedule ? undefined : formData.scheduleSetId || undefined,
          policyId: formData.useInheritedPolicy ? undefined : formData.policyId || undefined,
        },
      },
      {
        onSuccess: () => {
          navigate(`/booking/admin/groups/${id}`)
        },
        onError: (err) => {
          setError(err.message || 'Failed to update group')
        },
      },
    )
  }

  const toggleResource = (resourceId: string) => {
    if (formData.resourceIds.includes(resourceId)) {
      setFormData({
        ...formData,
        resourceIds: formData.resourceIds.filter(rid => rid !== resourceId),
      })
    } else {
      setFormData({
        ...formData,
        resourceIds: [...formData.resourceIds, resourceId],
      })
    }
  }

  const selectedCategory = categories.find(c => c.id === formData.categoryId)
  const selectedScheduleSet = scheduleSets.find(s => s.id === formData.scheduleSetId)
  const selectedPolicy = policies.find(p => p.id === formData.policyId)

  const isStep1Valid = formData.name.trim() !== ''
  const isStep2Valid = true // Resources are optional
  const isStep3Valid = formData.useInheritedSchedule || formData.scheduleSetId !== null
  const isStep4Valid = formData.useInheritedPolicy || formData.policyId !== null
  const canProceed = step === 1 ? isStep1Valid : step === 2 ? isStep2Valid : step === 3 ? isStep3Valid : step === 4 ? isStep4Valid : true

  const maxSteps = 5

  const onNext = () => {
    if (step < maxSteps) {
      setStep(step + 1)
    } else {
      handleSubmit()
    }
  }

  const onBack = () => {
    if (step > 1) {
      setStep(step - 1)
    } else {
      navigate(`/booking/admin/groups/${id}`)
    }
  }

  const getButtonCaption = (): string => {
    if (step === maxSteps) {
      return isUpdating ? 'Saving...' : 'Save Changes'
    }
    return translate('action_proceed_label', 'Next')
  }

  if (isLoadingGroup) {
    return (
      <div className={style.container}>
        <PageHeaderBar path="Booking / Admin / Groups / Edit" />
        <div className={style.loadingContainer}>
          <div className={style.spinner} />
          <span>Loading group...</span>
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className={style.container}>
        <PageHeaderBar path="Booking / Admin / Groups / Edit" />
        <div className={style.errorContainer}>
          <strong>Error</strong>
          <span>Group not found</span>
        </div>
      </div>
    )
  }

  return (
    <div className={style.container}>
      <PageHeaderBar path={`Booking / Admin / Groups / ${group.name} / Edit`} />
      <div className={style.contentContainer}>
        <div className={style.outletContainer}>
          {error && (
            <div className={style.errorContainer}>
              <strong>Error</strong>
              <span>{error}</span>
            </div>
          )}

          <div className={style.formCard}>
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <>
                <h2>Basic Information</h2>
                <p className={style.stepDescription}>Update the name and details for this resource group.</p>

                <div className={style.formGroup}>
                  <label>Group Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Executive Meeting Rooms"
                  />
                </div>

                <div className={style.formGroup}>
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Describe this group of resources..."
                    rows={3}
                  />
                </div>

                <div className={style.formGroup}>
                  <label>Category (optional)</label>
                  <select
                    value={formData.categoryId || ''}
                    onChange={e => setFormData({
                      ...formData,
                      categoryId: e.target.value || null,
                    })}
                  >
                    <option value="">No category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                  <span className={style.helpText}>
                    Groups can optionally belong to a category for organization
                  </span>
                </div>

                <div className={style.formGroup}>
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE'})}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </>
            )}

            {/* Step 2: Assign Resources */}
            {step === 2 && (
              <>
                <h2>Assign Resources</h2>
                <p className={style.stepDescription}>
                  Select resources to include in this group.
                  {formData.categoryId && ' Only resources from the selected category are shown.'}
                </p>

                <div className={style.resourceSearchContainer}>
                  <input
                    type="text"
                    className={style.resourceSearch}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search resources..."
                  />
                </div>

                {filteredResources.length === 0 ? (
                  <div className={style.noResourcesMessage}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="9" y1="3" x2="9" y2="21" />
                    </svg>
                    <p>No available resources found.</p>
                    <span>Resources may already belong to other groups, or no resources exist in the selected category.</span>
                  </div>
                ) : (
                  <div className={style.resourcesList}>
                    {filteredResources.map(resource => (
                      <label key={resource.id} className={style.resourceItem}>
                        <input
                          type="checkbox"
                          checked={formData.resourceIds.includes(resource.id)}
                          onChange={() => toggleResource(resource.id)}
                        />
                        <div className={style.resourceItemInfo}>
                          <span className={style.resourceItemName}>{resource.name}</span>
                          {resource.description && (
                            <span className={style.resourceItemDescription}>{resource.description}</span>
                          )}
                          <div className={style.resourceItemMeta}>
                            <span className={`${style.statusBadge} ${resource.status === 'ACTIVE' ? style.statusActive : style.statusInactive}`}>
                              {resource.status}
                            </span>
                            {resource.capacity && (
                              <span className={style.capacityBadge}>Capacity: {resource.capacity}</span>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {formData.resourceIds.length > 0 && (
                  <p className={style.selectionNote}>
                    {formData.resourceIds.length} resource(s) selected
                  </p>
                )}
              </>
            )}

            {/* Step 3: Assign Schedule */}
            {step === 3 && (
              <>
                <h2>Assign Schedule</h2>
                <p className={style.stepDescription}>
                  Choose how scheduling will work for resources in this group.
                </p>

                <div className={style.inheritanceOption}>
                  <label className={style.radioLabel}>
                    <input
                      type="radio"
                      name="scheduleChoice"
                      checked={formData.useInheritedSchedule}
                      onChange={() => setFormData({
                        ...formData,
                        useInheritedSchedule: true,
                        scheduleSetId: null,
                      })}
                    />
                    <div className={style.radioContent}>
                      <span className={style.radioTitle}>
                        Inherit from {selectedCategory ? 'category' : 'system default'}
                      </span>
                      <span className={style.radioDescription}>
                        {selectedCategory
                          ? `Use the schedule assigned to the "${selectedCategory.name}" category.`
                          : 'Use the system default schedule.'}
                      </span>
                    </div>
                  </label>
                </div>

                <div className={style.inheritanceOption}>
                  <label className={style.radioLabel}>
                    <input
                      type="radio"
                      name="scheduleChoice"
                      checked={!formData.useInheritedSchedule}
                      onChange={() => setFormData({...formData, useInheritedSchedule: false})}
                    />
                    <div className={style.radioContent}>
                      <span className={style.radioTitle}>Assign a specific schedule</span>
                      <span className={style.radioDescription}>
                        Override inheritance with a specific schedule for this group.
                      </span>
                    </div>
                  </label>
                </div>

                {!formData.useInheritedSchedule && (
                  <div className={style.scheduleSetsList}>
                    {scheduleSets.length === 0 ? (
                      <p className={style.noSetsMessage}>No schedules available. Create one first.</p>
                    ) : (
                      scheduleSets.map(set => (
                        <label key={set.id} className={`${style.scheduleSetItem} ${formData.scheduleSetId === set.id ? style.scheduleSetItemSelected : ''}`}>
                          <input
                            type="radio"
                            name="scheduleSet"
                            checked={formData.scheduleSetId === set.id}
                            onChange={() => setFormData({...formData, scheduleSetId: set.id})}
                          />
                          <div className={style.scheduleSetInfo}>
                            <span className={style.scheduleSetName}>{set.name}</span>
                            {set.description && (
                              <span className={style.scheduleSetDescription}>{set.description}</span>
                            )}
                            <span className={style.scheduleSetMeta}>
                              {set.rules.length} rules, Priority: {set.priority}
                            </span>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </>
            )}

            {/* Step 4: Assign Policy */}
            {step === 4 && (
              <>
                <h2>Assign Policy</h2>
                <p className={style.stepDescription}>
                  Choose how booking policies will work for resources in this group.
                </p>

                <div className={style.inheritanceOption}>
                  <label className={style.radioLabel}>
                    <input
                      type="radio"
                      name="policyChoice"
                      checked={formData.useInheritedPolicy}
                      onChange={() => setFormData({
                        ...formData,
                        useInheritedPolicy: true,
                        policyId: null,
                      })}
                    />
                    <div className={style.radioContent}>
                      <span className={style.radioTitle}>
                        Inherit from {selectedCategory ? 'category' : 'system default'}
                      </span>
                      <span className={style.radioDescription}>
                        {selectedCategory
                          ? `Use the policy assigned to the "${selectedCategory.name}" category.`
                          : 'Use the system default policy.'}
                      </span>
                    </div>
                  </label>
                </div>

                <div className={style.inheritanceOption}>
                  <label className={style.radioLabel}>
                    <input
                      type="radio"
                      name="policyChoice"
                      checked={!formData.useInheritedPolicy}
                      onChange={() => setFormData({...formData, useInheritedPolicy: false})}
                    />
                    <div className={style.radioContent}>
                      <span className={style.radioTitle}>Assign a specific policy</span>
                      <span className={style.radioDescription}>
                        Override inheritance with a specific policy for this group.
                      </span>
                    </div>
                  </label>
                </div>

                {!formData.useInheritedPolicy && (
                  <div className={style.policiesList}>
                    {policies.length === 0 ? (
                      <p className={style.noSetsMessage}>No policies available. Create one first.</p>
                    ) : (
                      policies.map(policy => (
                        <label key={policy.id} className={`${style.policyItem} ${formData.policyId === policy.id ? style.policyItemSelected : ''}`}>
                          <input
                            type="radio"
                            name="policy"
                            checked={formData.policyId === policy.id}
                            onChange={() => setFormData({...formData, policyId: policy.id})}
                          />
                          <div className={style.policyInfo}>
                            <span className={style.policyName}>{policy.name}</span>
                            {policy.description && (
                              <span className={style.policyDescription}>{policy.description}</span>
                            )}
                            <span className={style.policyMeta}>
                              {policy.slotDurationMinutes} min slots
                              {policy.requiresApproval && ' - Requires approval'}
                              {policy.maxAdvanceBookingDays && ` - Max ${policy.maxAdvanceBookingDays} days advance`}
                            </span>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </>
            )}

            {/* Step 5: Review */}
            {step === 5 && (
              <>
                <h2>Review Changes</h2>
                <p className={style.stepDescription}>Review the group details before saving.</p>

                <div className={style.reviewSection}>
                  <h3>Basic Information</h3>
                  <div className={style.reviewGrid}>
                    <div className={style.reviewItem}>
                      <span className={style.reviewLabel}>Name</span>
                      <span className={style.reviewValue}>{formData.name}</span>
                    </div>
                    <div className={style.reviewItem}>
                      <span className={style.reviewLabel}>Status</span>
                      <span className={`${style.statusBadge} ${formData.status === 'ACTIVE' ? style.statusActive : style.statusInactive}`}>
                        {formData.status}
                      </span>
                    </div>
                    {formData.description && (
                      <div className={`${style.reviewItem} ${style.fullWidth}`}>
                        <span className={style.reviewLabel}>Description</span>
                        <span className={style.reviewValue}>{formData.description}</span>
                      </div>
                    )}
                    <div className={style.reviewItem}>
                      <span className={style.reviewLabel}>Category</span>
                      <span className={style.reviewValue}>
                        {selectedCategory?.name || 'No category'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={style.reviewSection}>
                  <h3>Resources ({formData.resourceIds.length})</h3>
                  {formData.resourceIds.length === 0 ? (
                    <p className={style.reviewEmpty}>No resources assigned</p>
                  ) : (
                    <div className={style.reviewResourcesList}>
                      {formData.resourceIds.map(resourceId => {
                        const resource = resources.find(r => r.id === resourceId)
                        return (
                          <div key={resourceId} className={style.reviewResourceItem}>
                            {resource?.name || resourceId}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className={style.reviewSection}>
                  <h3>Schedule</h3>
                  {formData.useInheritedSchedule ? (
                    <p className={style.reviewInherited}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                      </svg>
                      Inherited from {selectedCategory ? `"${selectedCategory.name}" category` : 'system default'}
                    </p>
                  ) : (
                    <div className={style.reviewAssigned}>
                      <span className={style.reviewLabel}>Assigned Schedule</span>
                      <span className={style.reviewValue}>{selectedScheduleSet?.name || 'None selected'}</span>
                    </div>
                  )}
                </div>

                <div className={style.reviewSection}>
                  <h3>Policy</h3>
                  {formData.useInheritedPolicy ? (
                    <p className={style.reviewInherited}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                      </svg>
                      Inherited from {selectedCategory ? `"${selectedCategory.name}" category` : 'system default'}
                    </p>
                  ) : (
                    <div className={style.reviewAssigned}>
                      <span className={style.reviewLabel}>Assigned Policy</span>
                      <span className={style.reviewValue}>{selectedPolicy?.name || 'None selected'}</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Navigation Buttons */}
            <div className={style.buttonsContainer}>
              <SecondaryButton
                style={{width: 109}}
                caption={step > 1 ? translate('action_back_label', 'Back') : translate('action_cancel_label', 'Cancel')}
                onClick={async () => onBack()}
                disabled={isUpdating}
              />
              <PrimaryButton
                style={{width: 180, marginLeft: 'auto'}}
                caption={getButtonCaption()}
                onClick={async () => onNext()}
                disabled={!canProceed || isUpdating}
              />
            </div>
          </div>
        </div>
        <ProgressStepIndicator
          steps={[
            {
              title: 'Basic Info',
              description: 'Name and category',
            },
            {
              title: 'Resources',
              description: 'Assign resources',
            },
            {
              title: 'Schedule',
              description: 'Assign schedule',
            },
            {
              title: 'Policy',
              description: 'Assign policy',
            },
            {
              title: 'Review',
              description: 'Review and save',
            },
          ]}
          activeStep={step}
        />
      </div>
    </div>
  )
}

export default GroupEditPage
