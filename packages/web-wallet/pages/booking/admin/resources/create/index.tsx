import React, {FC, ReactElement, useState, useMemo} from 'react'
import {useCreate, useList} from '@refinedev/core'
import {useNavigate} from 'react-router-dom'
import {PrimaryButton, ProgressStepIndicator, SecondaryButton} from '@sphereon/ui-components.ssi-react'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import {
  BookingDataResource,
  DataProvider,
  DataResource,
  ResourceCategory,
  ResourceGroup,
  UsagePolicy,
  ScheduleSet,
} from '@typings'
import type {DcqlQueryItem} from '@sphereon/ssi-sdk.data-store-types'
import style from './index.module.css'

interface FormData {
  // Step 1: Basic Info
  name: string
  description: string
  capacity: number
  timezone: string
  imageUrl: string
  // Step 2: Category & Group
  categoryId: string
  groupId: string | null
  // Step 3: Schedule Override
  useInheritedSchedule: boolean
  scheduleSetId: string | null
  // Step 4: Policy Override
  useInheritedPolicy: boolean
  policyId: string | null
  // Step 5: Requirements
  requiresVerification: boolean
  dcqlQueryId: string
}

const STEPS = [
  {step: 1, title: 'Basic Info', description: 'Name and capacity'},
  {step: 2, title: 'Category & Group', description: 'Organization'},
  {step: 3, title: 'Schedule', description: 'Availability hours'},
  {step: 4, title: 'Policy', description: 'Booking rules'},
  {step: 5, title: 'Requirements', description: 'Verification'},
  {step: 6, title: 'Review', description: 'Confirm and create'},
]

const TIMEZONE_OPTIONS = [
  {value: 'Europe/Amsterdam', label: 'Europe/Amsterdam'},
  {value: 'Europe/London', label: 'Europe/London'},
  {value: 'Europe/Paris', label: 'Europe/Paris'},
  {value: 'Europe/Berlin', label: 'Europe/Berlin'},
  {value: 'America/New_York', label: 'America/New York'},
  {value: 'America/Los_Angeles', label: 'America/Los Angeles'},
  {value: 'America/Chicago', label: 'America/Chicago'},
  {value: 'Asia/Tokyo', label: 'Asia/Tokyo'},
  {value: 'Asia/Singapore', label: 'Asia/Singapore'},
  {value: 'Asia/Shanghai', label: 'Asia/Shanghai'},
  {value: 'Australia/Sydney', label: 'Australia/Sydney'},
]

const AdminResourceCreatePage: FC = (): ReactElement => {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    capacity: 1,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Amsterdam',
    imageUrl: '',
    categoryId: '',
    groupId: null,
    useInheritedSchedule: true,
    scheduleSetId: null,
    useInheritedPolicy: true,
    policyId: null,
    requiresVerification: false,
    dcqlQueryId: '',
  })

  const {data: categoriesData} = useList<ResourceCategory>({
    resource: BookingDataResource.CATEGORIES,
    pagination: {pageSize: 100},
  })

  const {data: groupsData} = useList<ResourceGroup>({
    resource: BookingDataResource.GROUPS,
    pagination: {pageSize: 100},
  })

  const {data: scheduleSetsData} = useList<ScheduleSet>({
    resource: BookingDataResource.SCHEDULE_SETS,
    pagination: {pageSize: 100},
  })

  const {data: policiesData} = useList<UsagePolicy>({
    resource: BookingDataResource.POLICIES,
    pagination: {pageSize: 100},
  })

  const {data: dcqlQueriesData} = useList<DcqlQueryItem>({
    resource: DataResource.QUERIES,
    pagination: {pageSize: 100},
    meta: {dataProviderName: DataProvider.QUERIES},
  })

  const {mutate: createResource, isLoading: isCreating} = useCreate()
  const {mutate: createScheduleAssignment} = useCreate()
  const {mutate: createPolicyAssignment} = useCreate()

  const categories = categoriesData?.data ?? []
  const groups = groupsData?.data ?? []
  const scheduleSets = scheduleSetsData?.data ?? []
  const policies = policiesData?.data ?? []
  const dcqlQueries = dcqlQueriesData?.data ?? []

  // Filter groups by selected category
  const filteredGroups = useMemo(() => {
    if (!formData.categoryId) return groups
    return groups.filter(g => !g.categoryId || g.categoryId === formData.categoryId)
  }, [groups, formData.categoryId])

  const selectedCategory = categories.find(c => c.id === formData.categoryId)
  const selectedGroup = groups.find(g => g.id === formData.groupId)
  const selectedScheduleSet = scheduleSets.find(s => s.id === formData.scheduleSetId)
  const selectedPolicy = policies.find(p => p.id === formData.policyId)
  const selectedDcqlQuery = dcqlQueries.find(q => q.id === formData.dcqlQueryId)

  const isStepValid = (stepNum: number): boolean => {
    switch (stepNum) {
      case 1:
        return formData.name.trim() !== ''
      case 2:
        return formData.categoryId !== ''
      case 3:
        return true // Optional
      case 4:
        return true // Optional
      case 5:
        return !formData.requiresVerification || formData.dcqlQueryId !== ''
      case 6:
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (step < 6 && isStepValid(step)) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    } else {
      navigate('/booking/admin/resources')
    }
  }

  const handleSubmit = () => {
    setError(null)

    // Build requirements array
    const requirements = formData.requiresVerification && formData.dcqlQueryId
      ? [{
          isMandatory: true,
          description: selectedDcqlQuery?.name || 'Credential verification required',
          dcqlQuery: formData.dcqlQueryId,
          displayOrder: 1,
        }]
      : []

    createResource(
      {
        resource: BookingDataResource.RESOURCES,
        values: {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          categoryId: formData.categoryId,
          groupId: formData.groupId || undefined,
          timezone: formData.timezone,
          capacity: formData.capacity,
          imageUrl: formData.imageUrl || undefined,
          status: 'ACTIVE',
          requirements,
        },
        meta: {dataProviderName: DataProvider.BOOKING},
      },
      {
        onSuccess: (data) => {
          console.log('[Create Resource] Success response:', data)
          // Extract resource ID - try multiple paths for robustness
          const resourceId = data?.data?.id || data?.data?.partyId || (data as any)?.id

          if (!resourceId) {
            console.error('[Create Resource] No resource ID in response:', data)
            // Navigate to list as fallback
            navigate('/booking/admin/resources')
            return
          }

          console.log('[Create Resource] Resource ID:', resourceId)

          // Create schedule assignment if overriding (fire and forget)
          if (!formData.useInheritedSchedule && formData.scheduleSetId) {
            createScheduleAssignment(
              {
                resource: BookingDataResource.SCHEDULE_SET_ASSIGNMENTS,
                values: {
                  scheduleSetId: formData.scheduleSetId,
                  resourceId: resourceId,
                  priority: 1,
                },
                meta: {dataProviderName: DataProvider.BOOKING},
              },
              {
                onError: (err) => {
                  console.error('[Create Resource] Failed to create schedule assignment:', err)
                },
              },
            )
          }

          // Create policy assignment if overriding (fire and forget)
          if (!formData.useInheritedPolicy && formData.policyId) {
            createPolicyAssignment(
              {
                resource: BookingDataResource.POLICY_ASSIGNMENTS,
                values: {
                  policyId: formData.policyId,
                  resourceId: resourceId,
                  priority: 1,
                },
                meta: {dataProviderName: DataProvider.BOOKING},
              },
              {
                onError: (err) => {
                  console.error('[Create Resource] Failed to create policy assignment:', err)
                },
              },
            )
          }

          // Navigate to the resource detail page
          console.log('[Create Resource] Navigating to:', `/booking/admin/resources/${resourceId}`)
          navigate(`/booking/admin/resources/${resourceId}`)
        },
        onError: (err) => {
          console.error('[Create Resource] Failed to create resource:', err)
          setError(err.message || 'Failed to create resource')
        },
      },
    )
  }

  const renderStep1 = () => (
    <>
      <h2>Basic Information</h2>
      <p className={style.stepDescription}>Enter the basic details for this resource.</p>

      <div className={style.formGroup}>
        <label>Resource Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={e => setFormData({...formData, name: e.target.value})}
          placeholder="e.g., Conference Room A"
        />
      </div>

      <div className={style.formGroup}>
        <label>Description</label>
        <textarea
          value={formData.description}
          onChange={e => setFormData({...formData, description: e.target.value})}
          placeholder="Describe the resource, its features, and any important information..."
          rows={4}
        />
      </div>

      <div className={style.formRow}>
        <div className={style.formGroup}>
          <label>Capacity</label>
          <input
            type="number"
            value={formData.capacity}
            onChange={e => setFormData({...formData, capacity: parseInt(e.target.value) || 1})}
            min={1}
          />
          <span className={style.helpText}>Maximum number of people</span>
        </div>

        <div className={style.formGroup}>
          <label>Timezone</label>
          <select value={formData.timezone} onChange={e => setFormData({...formData, timezone: e.target.value})}>
            {TIMEZONE_OPTIONS.map(tz => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={style.formGroup}>
        <label>Image URL</label>
        <input
          type="text"
          value={formData.imageUrl}
          onChange={e => setFormData({...formData, imageUrl: e.target.value})}
          placeholder="https://example.com/image.jpg"
        />
        {formData.imageUrl && (
          <div className={style.imagePreview}>
            <img src={formData.imageUrl} alt="Preview" onError={e => (e.currentTarget.style.display = 'none')} />
          </div>
        )}
      </div>
    </>
  )

  const renderStep2 = () => (
    <>
      <h2>Category & Group</h2>
      <p className={style.stepDescription}>Organize this resource within categories and groups.</p>

      <div className={style.formGroup}>
        <label>Category *</label>
        <select
          value={formData.categoryId}
          onChange={e => setFormData({...formData, categoryId: e.target.value, groupId: null})}
        >
          <option value="">Select a category</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <span className={style.helpText}>Categories help organize resources and can provide default schedules/policies</span>
      </div>

      <div className={style.formGroup}>
        <label>Group (Optional)</label>
        <select
          value={formData.groupId || ''}
          onChange={e => setFormData({...formData, groupId: e.target.value || null})}
          disabled={!formData.categoryId && filteredGroups.length === 0}
        >
          <option value="">No group</option>
          {filteredGroups.map(group => (
            <option key={group.id} value={group.id}>{group.name}</option>
          ))}
        </select>
        <span className={style.helpText}>Groups bundle related resources and can override category settings</span>
      </div>

      {filteredGroups.length === 0 && formData.categoryId && (
        <div className={style.infoNote}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>No groups available for this category. You can create groups in the Groups management section.</span>
        </div>
      )}
    </>
  )

  const renderStep3 = () => (
    <>
      <h2>Schedule</h2>
      <p className={style.stepDescription}>Configure availability hours for this resource.</p>

      <div className={style.assignmentOptions}>
        <div className={style.assignmentOption}>
          <label className={style.radioLabel}>
            <input
              type="radio"
              checked={formData.useInheritedSchedule}
              onChange={() => setFormData({...formData, useInheritedSchedule: true, scheduleSetId: null})}
            />
            <div className={style.radioContent}>
              <span className={style.radioTitle}>Use Inherited Schedule</span>
              <span className={style.radioDescription}>
                Inherit schedule from {selectedGroup ? `group "${selectedGroup.name}"` : selectedCategory ? `category "${selectedCategory.name}"` : 'system default'}
              </span>
            </div>
          </label>
        </div>

        <div className={style.assignmentOption}>
          <label className={style.radioLabel}>
            <input
              type="radio"
              checked={!formData.useInheritedSchedule}
              onChange={() => setFormData({...formData, useInheritedSchedule: false})}
            />
            <div className={style.radioContent}>
              <span className={style.radioTitle}>Override with Specific Schedule</span>
              <span className={style.radioDescription}>Select a schedule set to use for this resource only</span>
            </div>
          </label>
        </div>
      </div>

      {!formData.useInheritedSchedule && (
        <div className={style.selectionList}>
          {scheduleSets.map(scheduleSet => (
            <button
              key={scheduleSet.id}
              type="button"
              className={`${style.selectionCard} ${formData.scheduleSetId === scheduleSet.id ? style.selectionCardSelected : ''}`}
              onClick={() => setFormData({...formData, scheduleSetId: scheduleSet.id})}
            >
              <div className={style.selectionIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className={style.selectionInfo}>
                <span className={style.selectionName}>{scheduleSet.name}</span>
                <span className={style.selectionDescription}>
                  {scheduleSet.description || `${scheduleSet.rules?.length || 0} rules`}
                </span>
              </div>
              {formData.scheduleSetId === scheduleSet.id && (
                <div className={style.selectionCheck}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </button>
          ))}

          {scheduleSets.length === 0 && (
            <div className={style.emptyState}>
              <p>No schedule sets available</p>
              <span className={style.emptyNote}>Create schedule sets in the Schedules management section</span>
            </div>
          )}
        </div>
      )}
    </>
  )

  const renderStep4 = () => (
    <>
      <h2>Policy</h2>
      <p className={style.stepDescription}>Configure booking rules for this resource.</p>

      <div className={style.assignmentOptions}>
        <div className={style.assignmentOption}>
          <label className={style.radioLabel}>
            <input
              type="radio"
              checked={formData.useInheritedPolicy}
              onChange={() => setFormData({...formData, useInheritedPolicy: true, policyId: null})}
            />
            <div className={style.radioContent}>
              <span className={style.radioTitle}>Use Inherited Policy</span>
              <span className={style.radioDescription}>
                Inherit policy from {selectedGroup ? `group "${selectedGroup.name}"` : selectedCategory ? `category "${selectedCategory.name}"` : 'system default'}
              </span>
            </div>
          </label>
        </div>

        <div className={style.assignmentOption}>
          <label className={style.radioLabel}>
            <input
              type="radio"
              checked={!formData.useInheritedPolicy}
              onChange={() => setFormData({...formData, useInheritedPolicy: false})}
            />
            <div className={style.radioContent}>
              <span className={style.radioTitle}>Override with Specific Policy</span>
              <span className={style.radioDescription}>Select a policy to use for this resource only</span>
            </div>
          </label>
        </div>
      </div>

      {!formData.useInheritedPolicy && (
        <div className={style.selectionList}>
          {policies.map(policy => (
            <button
              key={policy.id}
              type="button"
              className={`${style.selectionCard} ${formData.policyId === policy.id ? style.selectionCardSelected : ''}`}
              onClick={() => setFormData({...formData, policyId: policy.id})}
            >
              <div className={style.selectionIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className={style.selectionInfo}>
                <span className={style.selectionName}>
                  {policy.name}
                  {policy.isDefault && <span className={style.defaultBadge}>Default</span>}
                </span>
                <span className={style.selectionDescription}>
                  {policy.slotDurationMinutes} min slots • Max {policy.maxAdvanceBookingDays} days advance
                </span>
              </div>
              {formData.policyId === policy.id && (
                <div className={style.selectionCheck}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </button>
          ))}

          {policies.length === 0 && (
            <div className={style.emptyState}>
              <p>No policies available</p>
              <span className={style.emptyNote}>Create policies in the Policies management section</span>
            </div>
          )}
        </div>
      )}
    </>
  )

  const renderStep5 = () => {
    const hasQueries = dcqlQueries.length > 0

    return (
      <>
        <h2>Verification Requirements</h2>
        <p className={style.stepDescription}>Configure credential verification for bookings.</p>

        {!hasQueries && (
          <div className={style.warningBox}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div className={style.warningBoxContent}>
              <span className={style.warningBoxTitle}>No DCQL queries available</span>
              <span className={style.warningBoxText}>
                To enable credential verification, you first need to create a DCQL query in Query Management.
                This defines which credentials users must present.
              </span>
            </div>
          </div>
        )}

        <div className={style.flagsSection}>
          <div className={style.flagOption}>
            <label className={`${style.flagLabel} ${!hasQueries ? style.flagLabelDisabled : ''}`}>
              <input
                type="checkbox"
                checked={formData.requiresVerification}
                onChange={e => setFormData({...formData, requiresVerification: e.target.checked, dcqlQueryId: ''})}
                disabled={!hasQueries}
              />
              <div className={style.flagContent}>
                <span className={style.flagTitle}>Require Credential Verification (OID4VP)</span>
                <span className={style.flagDescription}>
                  Users will need to present a verifiable credential to complete their booking
                </span>
              </div>
            </label>
          </div>
        </div>

        {formData.requiresVerification && hasQueries && (
          <div className={style.formGroup}>
            <label>Verification Query (DCQL) *</label>
            <select
              value={formData.dcqlQueryId}
              onChange={e => setFormData({...formData, dcqlQueryId: e.target.value})}
            >
              <option value="">Select a query...</option>
              {dcqlQueries.map(query => (
                <option key={query.id} value={query.id}>
                  {query.name || query.queryId || query.id}
                  {query.purpose && ` - ${query.purpose}`}
                </option>
              ))}
            </select>
            <span className={style.helpText}>
              Select the DCQL query that defines which credentials users must present
            </span>
          </div>
        )}

        {!formData.requiresVerification && hasQueries && (
          <div className={style.infoNote}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>You can always add verification requirements later by editing the resource.</span>
          </div>
        )}
      </>
    )
  }

  const renderStep6 = () => (
    <>
      <h2>Review & Create</h2>
      <p className={style.stepDescription}>Review the resource details before creating.</p>

      <div className={style.reviewSection}>
        <h3>Basic Information</h3>
        <div className={style.reviewGrid}>
          <div className={style.reviewItem}>
            <span className={style.reviewLabel}>Name</span>
            <span className={style.reviewValue}>{formData.name}</span>
          </div>
          <div className={style.reviewItem}>
            <span className={style.reviewLabel}>Capacity</span>
            <span className={style.reviewValue}>{formData.capacity} person(s)</span>
          </div>
          <div className={style.reviewItem}>
            <span className={style.reviewLabel}>Timezone</span>
            <span className={style.reviewValue}>{formData.timezone}</span>
          </div>
          {formData.description && (
            <div className={`${style.reviewItem} ${style.fullWidth}`}>
              <span className={style.reviewLabel}>Description</span>
              <span className={style.reviewValue}>{formData.description}</span>
            </div>
          )}
        </div>
      </div>

      <div className={style.reviewSection}>
        <h3>Organization</h3>
        <div className={style.reviewGrid}>
          <div className={style.reviewItem}>
            <span className={style.reviewLabel}>Category</span>
            <span className={style.reviewValue}>{selectedCategory?.name || 'Not selected'}</span>
          </div>
          <div className={style.reviewItem}>
            <span className={style.reviewLabel}>Group</span>
            <span className={style.reviewValue}>{selectedGroup?.name || 'None'}</span>
          </div>
        </div>
      </div>

      <div className={style.reviewSection}>
        <h3>Schedule</h3>
        {formData.useInheritedSchedule ? (
          <p className={style.reviewNote}>
            Will inherit schedule from {selectedGroup ? `group "${selectedGroup.name}"` : selectedCategory ? `category "${selectedCategory.name}"` : 'system default'}
          </p>
        ) : selectedScheduleSet ? (
          <div className={style.reviewAssignment}>
            <div className={style.reviewAssignmentIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className={style.reviewAssignmentInfo}>
              <span className={style.reviewAssignmentName}>{selectedScheduleSet.name}</span>
              <span className={style.reviewAssignmentMeta}>Override - specific to this resource</span>
            </div>
          </div>
        ) : (
          <p className={style.reviewNote}>No schedule selected</p>
        )}
      </div>

      <div className={style.reviewSection}>
        <h3>Policy</h3>
        {formData.useInheritedPolicy ? (
          <p className={style.reviewNote}>
            Will inherit policy from {selectedGroup ? `group "${selectedGroup.name}"` : selectedCategory ? `category "${selectedCategory.name}"` : 'system default'}
          </p>
        ) : selectedPolicy ? (
          <div className={style.reviewAssignment}>
            <div className={style.reviewAssignmentIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className={style.reviewAssignmentInfo}>
              <span className={style.reviewAssignmentName}>{selectedPolicy.name}</span>
              <span className={style.reviewAssignmentMeta}>Override - specific to this resource</span>
            </div>
          </div>
        ) : (
          <p className={style.reviewNote}>No policy selected</p>
        )}
      </div>

      <div className={style.reviewSection}>
        <h3>Verification</h3>
        {formData.requiresVerification ? (
          <div className={style.reviewFlags}>
            <div className={`${style.reviewFlag} ${style.reviewFlagEnabled}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Credential verification required
            </div>
            {selectedDcqlQuery && (
              <p className={style.reviewNote}>Query: {selectedDcqlQuery.name || selectedDcqlQuery.id}</p>
            )}
          </div>
        ) : (
          <div className={style.reviewFlags}>
            <div className={`${style.reviewFlag} ${style.reviewFlagDisabled}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              No verification required
            </div>
          </div>
        )}
      </div>

      {formData.imageUrl && (
        <div className={style.reviewSection}>
          <h3>Image</h3>
          <div className={style.reviewImage}>
            <img src={formData.imageUrl} alt={formData.name} />
          </div>
        </div>
      )}
    </>
  )

  const renderCurrentStep = () => {
    switch (step) {
      case 1: return renderStep1()
      case 2: return renderStep2()
      case 3: return renderStep3()
      case 4: return renderStep4()
      case 5: return renderStep5()
      case 6: return renderStep6()
      default: return null
    }
  }

  return (
    <div className={style.container}>
      <PageHeaderBar
        path="Booking / Admin / Resources / Create"
      />

      <div className={style.contentContainer}>
        <div className={style.outletContainer}>
          {error && (
            <div className={style.errorContainer}>
              <strong>Error</strong>
              <span>{error}</span>
            </div>
          )}

          <div className={style.formCard}>
            {renderCurrentStep()}

            <div className={style.buttonsContainer}>
              <SecondaryButton
                style={{width: 109}}
                caption={step > 1 ? 'Back' : 'Cancel'}
                onClick={async () => handleBack()}
                disabled={isCreating}
              />
              {step < 6 ? (
                <PrimaryButton
                  style={{width: 180, marginLeft: 'auto'}}
                  caption="Next"
                  onClick={async () => handleNext()}
                  disabled={!isStepValid(step)}
                />
              ) : (
                <PrimaryButton
                  style={{width: 180, marginLeft: 'auto'}}
                  caption={isCreating ? 'Creating...' : 'Create Resource'}
                  onClick={async () => handleSubmit()}
                  disabled={isCreating}
                />
              )}
            </div>
          </div>
        </div>

        <ProgressStepIndicator steps={STEPS} activeStep={step} />
      </div>
    </div>
  )
}

export default AdminResourceCreatePage
