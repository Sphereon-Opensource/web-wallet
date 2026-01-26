import React, {FC, ReactElement, useState, useMemo} from 'react'
import {useRouter} from 'next/router'
import {useCreate, useList} from '@refinedev/core'
import {PrimaryButton, SecondaryButton, ProgressStepIndicator} from '@sphereon/ui-components.ssi-react'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import {
  BookingDataResource,
  ResourceCategory,
  ScheduleSet,
  ScheduleSetAssignment,
  UsagePolicy,
  PolicyAssignment,
} from '@typings'
import style from './index.module.css'

interface FormData {
  name: string
  description: string
  slug: string
  icon: string
  displayOrder: number | null
  isActive: boolean
  // Default schedule/policy
  scheduleSetId: string | null
  policyId: string | null
}

const initialFormData: FormData = {
  name: '',
  description: '',
  slug: '',
  icon: 'folder',
  displayOrder: null,
  isActive: true,
  scheduleSetId: null,
  policyId: null,
}

const ICON_OPTIONS = [
  {value: 'folder', label: 'Folder', icon: 'M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z'},
  {value: 'building', label: 'Building', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'},
  {value: 'users', label: 'Users', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m22-4v2m-7-6a4 4 0 11-8 0 4 4 0 018 0zm6 2a3 3 0 11-6 0 3 3 0 016 0z'},
  {value: 'calendar', label: 'Calendar', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'},
  {value: 'car', label: 'Vehicle', icon: 'M5 17h14v2H5v-2zm0-3l2-6h10l2 6H5zm2-8h10v2H7V6z'},
  {value: 'tools', label: 'Equipment', icon: 'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z'},
  {value: 'desktop', label: 'Workstation', icon: 'M8 18h8m-4 0v4m-8-8h16a2 2 0 002-2V6a2 2 0 00-2-2H4a2 2 0 00-2 2v6a2 2 0 002 2z'},
  {value: 'coffee', label: 'Amenity', icon: 'M18 8h1a4 4 0 010 8h-1m-3 4H6a2 2 0 01-2-2V8h12v10a2 2 0 01-2 2zM6 2v4m4-4v4m4-4v4'},
]

const STEPS = [
  {
    step: 1,
    title: 'Basic Info',
    description: 'Name and details',
  },
  {
    step: 2,
    title: 'Default Schedule',
    description: 'Availability hours',
  },
  {
    step: 3,
    title: 'Default Policy',
    description: 'Booking rules',
  },
  {
    step: 4,
    title: 'Review',
    description: 'Confirm and create',
  },
]

const CategoryCreatePage: FC = (): ReactElement => {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [error, setError] = useState<string | null>(null)

  const {mutate: createCategory, isLoading: isCreatingCategory} = useCreate()
  const {mutate: createScheduleAssignment} = useCreate()
  const {mutate: createPolicyAssignment} = useCreate()

  // Fetch schedule sets for selection
  const {data: scheduleSetsData} = useList<ScheduleSet>({
    resource: BookingDataResource.SCHEDULE_SETS,
    pagination: {pageSize: 100},
  })

  // Fetch policies for selection
  const {data: policiesData} = useList<UsagePolicy>({
    resource: BookingDataResource.POLICIES,
    pagination: {pageSize: 100},
  })

  const scheduleSets = scheduleSetsData?.data ?? []
  const policies = policiesData?.data ?? []

  const selectedScheduleSet = useMemo(() => {
    if (!formData.scheduleSetId) return null
    return scheduleSets.find(s => s.id === formData.scheduleSetId) || null
  }, [formData.scheduleSetId, scheduleSets])

  const selectedPolicy = useMemo(() => {
    if (!formData.policyId) return null
    return policies.find(p => p.id === formData.policyId) || null
  }, [formData.policyId, policies])

  const handleBack = () => {
    if (currentStep === 1) {
      router.push('/booking/admin/categories')
    } else {
      setCurrentStep(currentStep - 1)
    }
  }

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.name.trim().length > 0
      case 2:
      case 3:
        return true // Optional selections
      case 4:
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep < 4 && isStepValid(currentStep)) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleCreate = async () => {
    if (!isStepValid(currentStep)) return
    setError(null)

    const slug = formData.slug.trim() || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    createCategory(
      {
        resource: BookingDataResource.CATEGORIES,
        values: {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          slug,
          icon: formData.icon,
          displayOrder: formData.displayOrder,
          isActive: formData.isActive,
        },
      },
      {
        onSuccess: (data) => {
          const categoryId = data?.data?.id
          if (!categoryId) {
            router.push('/booking/admin/categories')
            return
          }

          // Create schedule assignment if selected
          if (formData.scheduleSetId) {
            createScheduleAssignment({
              resource: BookingDataResource.SCHEDULE_SET_ASSIGNMENTS,
              values: {
                scheduleSetId: formData.scheduleSetId,
                categoryId: categoryId,
                priority: 1,
              },
            })
          }

          // Create policy assignment if selected
          if (formData.policyId) {
            createPolicyAssignment({
              resource: BookingDataResource.POLICY_ASSIGNMENTS,
              values: {
                policyId: formData.policyId,
                categoryId: categoryId,
                priority: 1,
              },
            })
          }

          router.push(`/booking/admin/categories/${categoryId}`)
        },
        onError: (err) => {
          setError(err?.message || 'Failed to create category')
        },
      },
    )
  }

  const renderIcon = (iconPath: string, size: number = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={iconPath} />
    </svg>
  )

  const renderStep1 = () => (
    <div className={style.formCard}>
      <h2>Basic Information</h2>
      <p className={style.stepDescription}>Enter the category name and details.</p>

      <div className={style.formGroup}>
        <label>Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={e => setFormData({...formData, name: e.target.value})}
          placeholder="e.g., Meeting Rooms"
        />
      </div>

      <div className={style.formGroup}>
        <label>Slug</label>
        <input
          type="text"
          value={formData.slug}
          onChange={e => setFormData({...formData, slug: e.target.value})}
          placeholder="Auto-generated from name"
        />
        <span className={style.helpText}>URL-friendly identifier. Leave blank to auto-generate.</span>
      </div>

      <div className={style.formGroup}>
        <label>Description</label>
        <textarea
          value={formData.description}
          onChange={e => setFormData({...formData, description: e.target.value})}
          placeholder="Brief description of this category"
          rows={3}
        />
      </div>

      <div className={style.formGroup}>
        <label>Icon</label>
        <div className={style.iconGrid}>
          {ICON_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`${style.iconOption} ${formData.icon === opt.value ? style.iconOptionSelected : ''}`}
              onClick={() => setFormData({...formData, icon: opt.value})}
              title={opt.label}
            >
              {renderIcon(opt.icon, 24)}
              <span className={style.iconLabel}>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={style.formRow}>
        <div className={style.formGroup}>
          <label>Display Order</label>
          <input
            type="number"
            value={formData.displayOrder ?? ''}
            onChange={e => setFormData({...formData, displayOrder: e.target.value ? parseInt(e.target.value, 10) : null})}
            placeholder="Optional"
            min={1}
          />
          <span className={style.helpText}>Lower numbers appear first</span>
        </div>

        <div className={style.formGroup}>
          <label>Status</label>
          <select
            value={formData.isActive ? 'active' : 'inactive'}
            onChange={e => setFormData({...formData, isActive: e.target.value === 'active'})}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className={style.formCard}>
      <h2>Default Schedule Set</h2>
      <p className={style.stepDescription}>
        Select a schedule set to use as the default for all resources in this category.
        Resources will inherit this schedule unless they override it.
      </p>

      <div className={style.assignmentNote}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>This is optional. You can always assign a schedule later or let resources use the system default.</span>
      </div>

      <div className={style.selectionList}>
        <button
          type="button"
          className={`${style.selectionCard} ${!formData.scheduleSetId ? style.selectionCardSelected : ''}`}
          onClick={() => setFormData({...formData, scheduleSetId: null})}
        >
          <div className={style.selectionIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </div>
          <div className={style.selectionInfo}>
            <span className={style.selectionName}>No Default Schedule</span>
            <span className={style.selectionDescription}>Resources will use system default or their own schedules</span>
          </div>
          {!formData.scheduleSetId && (
            <div className={style.selectionCheck}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
        </button>

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
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <p>No schedule sets available</p>
            <span className={style.emptyNote}>Create schedule sets in the Schedules management section</span>
          </div>
        )}
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className={style.formCard}>
      <h2>Default Policy</h2>
      <p className={style.stepDescription}>
        Select a booking policy to use as the default for all resources in this category.
        Resources will inherit this policy unless they override it.
      </p>

      <div className={style.assignmentNote}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>This is optional. You can always assign a policy later or let resources use the system default.</span>
      </div>

      <div className={style.selectionList}>
        <button
          type="button"
          className={`${style.selectionCard} ${!formData.policyId ? style.selectionCardSelected : ''}`}
          onClick={() => setFormData({...formData, policyId: null})}
        >
          <div className={style.selectionIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </div>
          <div className={style.selectionInfo}>
            <span className={style.selectionName}>No Default Policy</span>
            <span className={style.selectionDescription}>Resources will use system default or their own policies</span>
          </div>
          {!formData.policyId && (
            <div className={style.selectionCheck}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
        </button>

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
              <span className={style.selectionName}>{policy.name}</span>
              <span className={style.selectionDescription}>
                {policy.description || `${policy.slotDurationMinutes} min slots`}
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
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <p>No policies available</p>
            <span className={style.emptyNote}>Create policies in the Policies management section</span>
          </div>
        )}
      </div>
    </div>
  )

  const renderStep4 = () => {
    const iconOption = ICON_OPTIONS.find(opt => opt.value === formData.icon)
    const slug = formData.slug.trim() || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    return (
      <div className={style.formCard}>
        <h2>Review & Create</h2>
        <p className={style.stepDescription}>Review the category details before creating.</p>

        <div className={style.reviewSection}>
          <h3>Basic Information</h3>
          <div className={style.reviewGrid}>
            <div className={style.reviewItem}>
              <span className={style.reviewLabel}>Name</span>
              <span className={style.reviewValue}>{formData.name}</span>
            </div>
            <div className={style.reviewItem}>
              <span className={style.reviewLabel}>Slug</span>
              <span className={style.reviewValue}>/{slug}</span>
            </div>
            <div className={style.reviewItem}>
              <span className={style.reviewLabel}>Status</span>
              <span className={style.reviewValue}>{formData.isActive ? 'Active' : 'Inactive'}</span>
            </div>
            <div className={style.reviewItem}>
              <span className={style.reviewLabel}>Display Order</span>
              <span className={style.reviewValue}>{formData.displayOrder || 'Not set'}</span>
            </div>
            <div className={style.reviewItem}>
              <span className={style.reviewLabel}>Icon</span>
              <span className={style.reviewValue}>
                <span className={style.reviewIconPreview}>
                  {iconOption && renderIcon(iconOption.icon, 16)}
                  {iconOption?.label || formData.icon}
                </span>
              </span>
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
          <h3>Default Schedule</h3>
          {selectedScheduleSet ? (
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
                <span className={style.reviewAssignmentDescription}>
                  {selectedScheduleSet.description || `${selectedScheduleSet.rules?.length || 0} rules defined`}
                </span>
              </div>
            </div>
          ) : (
            <p className={style.reviewNone}>No default schedule set selected</p>
          )}
        </div>

        <div className={style.reviewSection}>
          <h3>Default Policy</h3>
          {selectedPolicy ? (
            <div className={style.reviewAssignment}>
              <div className={style.reviewAssignmentIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className={style.reviewAssignmentInfo}>
                <span className={style.reviewAssignmentName}>{selectedPolicy.name}</span>
                <span className={style.reviewAssignmentDescription}>
                  {selectedPolicy.slotDurationMinutes} min slots
                  {selectedPolicy.requiresApproval && ' • Requires approval'}
                </span>
              </div>
            </div>
          ) : (
            <p className={style.reviewNone}>No default policy selected</p>
          )}
        </div>
      </div>
    )
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1()
      case 2:
        return renderStep2()
      case 3:
        return renderStep3()
      case 4:
        return renderStep4()
      default:
        return null
    }
  }

  return (
    <div className={style.container}>
      <PageHeaderBar
        title="Create Category"
        path="Booking / Admin / Categories / Create"
      />

      {error && (
        <div className={style.errorContainer}>
          <strong>Error</strong>
          <span>{error}</span>
        </div>
      )}

      <div className={style.contentContainer}>
        <div className={style.outletContainer}>
          {renderCurrentStep()}

          <div className={style.buttonsContainer}>
            <SecondaryButton style={{width: 109}} caption="Back" onClick={async () => handleBack()} />
            {currentStep < 4 ? (
              <PrimaryButton
                style={{width: 180, marginLeft: 'auto'}}
                caption="Next"
                onClick={async () => handleNext()}
                disabled={!isStepValid(currentStep)}
              />
            ) : (
              <PrimaryButton
                style={{width: 180, marginLeft: 'auto'}}
                caption={isCreatingCategory ? 'Creating...' : 'Create Category'}
                onClick={async () => handleCreate()}
                disabled={isCreatingCategory || !isStepValid(currentStep)}
              />
            )}
          </div>
        </div>

        <ProgressStepIndicator steps={STEPS} activeStep={currentStep} />
      </div>
    </div>
  )
}

export default CategoryCreatePage
