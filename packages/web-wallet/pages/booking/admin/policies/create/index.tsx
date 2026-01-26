import React, {FC, ReactElement, useState} from 'react'
import {useCreate, useTranslate} from '@refinedev/core'
import {useNavigate} from 'react-router-dom'
import {PrimaryButton, ProgressStepIndicator, SecondaryButton} from '@sphereon/ui-components.ssi-react'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import {BookingDataResource} from '@typings'
import style from './index.module.css'

interface FormData {
  name: string
  description: string
  // Time constraints
  slotDurationMinutes: number
  minDurationMinutes: number | null
  maxDurationMinutes: number | null
  bufferAfterMinutes: number | null
  // Booking rules
  maxAdvanceBookingDays: number | null
  minAdvanceBookingHours: number | null
  maxConcurrentBookings: number | null
  // Flags
  requiresApproval: boolean
  allowRecurring: boolean
  // Assignment
  setAsDefault: boolean
}

const PolicyCreatePage: FC = (): ReactElement => {
  const navigate = useNavigate()
  const translate = useTranslate()
  const [step, setStep] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    slotDurationMinutes: 30,
    minDurationMinutes: 30,
    maxDurationMinutes: 240,
    bufferAfterMinutes: 0,
    maxAdvanceBookingDays: 30,
    minAdvanceBookingHours: null,
    maxConcurrentBookings: null,
    requiresApproval: false,
    allowRecurring: true,
    setAsDefault: false,
  })

  const {mutate: createPolicy, isLoading: isCreating} = useCreate()

  const handleSubmit = () => {
    setError(null)

    createPolicy(
      {
        resource: BookingDataResource.POLICIES,
        values: {
          name: formData.name,
          description: formData.description || undefined,
          slotDurationMinutes: formData.slotDurationMinutes,
          minDurationMinutes: formData.minDurationMinutes || undefined,
          maxDurationMinutes: formData.maxDurationMinutes || undefined,
          bufferAfterMinutes: formData.bufferAfterMinutes || undefined,
          maxAdvanceBookingDays: formData.maxAdvanceBookingDays || undefined,
          minAdvanceBookingHours: formData.minAdvanceBookingHours || undefined,
          maxConcurrentBookings: formData.maxConcurrentBookings || undefined,
          requiresApproval: formData.requiresApproval,
          allowRecurring: formData.allowRecurring,
          isDefault: formData.setAsDefault,
        },
      },
      {
        onSuccess: () => {
          navigate('/booking/admin/policies')
        },
        onError: (err) => {
          setError(err.message || 'Failed to create policy')
        },
      },
    )
  }

  const formatDuration = (minutes: number | null): string => {
    if (!minutes) return 'Not set'
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const isStep1Valid = formData.name.trim() !== ''
  const isStep2Valid = formData.slotDurationMinutes > 0
  const isStep3Valid = true // All booking rules are optional
  const isStep4Valid = true // Assignment is optional
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
      navigate('/booking/admin/policies')
    }
  }

  const getButtonCaption = (): string => {
    if (step === maxSteps) {
      return isCreating ? 'Creating...' : 'Create Policy'
    }
    return translate('action_proceed_label', 'Next')
  }

  return (
    <div className={style.container}>
      <PageHeaderBar path="Booking / Admin / Policies / Create" />
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
                <p className={style.stepDescription}>Enter the name and description for this booking policy.</p>

                <div className={style.formGroup}>
                  <label>Policy Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Standard Booking Policy"
                  />
                </div>

                <div className={style.formGroup}>
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Describe when this policy should be applied..."
                    rows={3}
                  />
                </div>
              </>
            )}

            {/* Step 2: Time Constraints */}
            {step === 2 && (
              <>
                <h2>Time Constraints</h2>
                <p className={style.stepDescription}>Define time-related constraints for bookings.</p>

                <div className={style.formGroup}>
                  <label>Slot Duration (minutes) *</label>
                  <input
                    type="number"
                    value={formData.slotDurationMinutes}
                    onChange={e => setFormData({...formData, slotDurationMinutes: parseInt(e.target.value) || 30})}
                    min={5}
                    max={480}
                  />
                  <span className={style.helpText}>
                    The base unit of time for each bookable slot
                  </span>
                </div>

                <div className={style.formRow}>
                  <div className={style.formGroup}>
                    <label>Minimum Duration (minutes)</label>
                    <input
                      type="number"
                      value={formData.minDurationMinutes || ''}
                      onChange={e => setFormData({...formData, minDurationMinutes: e.target.value ? parseInt(e.target.value) : null})}
                      min={5}
                      placeholder="No minimum"
                    />
                    <span className={style.helpText}>
                      Shortest booking allowed
                    </span>
                  </div>
                  <div className={style.formGroup}>
                    <label>Maximum Duration (minutes)</label>
                    <input
                      type="number"
                      value={formData.maxDurationMinutes || ''}
                      onChange={e => setFormData({...formData, maxDurationMinutes: e.target.value ? parseInt(e.target.value) : null})}
                      min={formData.minDurationMinutes || 5}
                      placeholder="No maximum"
                    />
                    <span className={style.helpText}>
                      Longest booking allowed
                    </span>
                  </div>
                </div>

                <div className={style.formGroup}>
                  <label>Buffer After (minutes)</label>
                  <input
                    type="number"
                    value={formData.bufferAfterMinutes || ''}
                    onChange={e => setFormData({...formData, bufferAfterMinutes: e.target.value ? parseInt(e.target.value) : null})}
                    min={0}
                    max={120}
                    placeholder="0"
                  />
                  <span className={style.helpText}>
                    Time blocked after each booking for cleanup/transition
                  </span>
                </div>
              </>
            )}

            {/* Step 3: Booking Rules */}
            {step === 3 && (
              <>
                <h2>Booking Rules</h2>
                <p className={style.stepDescription}>Set rules for when and how bookings can be made.</p>

                <div className={style.formRow}>
                  <div className={style.formGroup}>
                    <label>Max Advance Booking (days)</label>
                    <input
                      type="number"
                      value={formData.maxAdvanceBookingDays || ''}
                      onChange={e => setFormData({...formData, maxAdvanceBookingDays: e.target.value ? parseInt(e.target.value) : null})}
                      min={1}
                      max={365}
                      placeholder="No limit"
                    />
                    <span className={style.helpText}>
                      How far in advance bookings can be made
                    </span>
                  </div>
                  <div className={style.formGroup}>
                    <label>Min Advance Notice (hours)</label>
                    <input
                      type="number"
                      value={formData.minAdvanceBookingHours || ''}
                      onChange={e => setFormData({...formData, minAdvanceBookingHours: e.target.value ? parseInt(e.target.value) : null})}
                      min={0}
                      placeholder="No minimum"
                    />
                    <span className={style.helpText}>
                      Minimum notice required before booking starts
                    </span>
                  </div>
                </div>

                <div className={style.formGroup}>
                  <label>Max Concurrent Bookings</label>
                  <input
                    type="number"
                    value={formData.maxConcurrentBookings || ''}
                    onChange={e => setFormData({...formData, maxConcurrentBookings: e.target.value ? parseInt(e.target.value) : null})}
                    min={1}
                    placeholder="Unlimited"
                  />
                  <span className={style.helpText}>
                    Maximum number of active bookings per user
                  </span>
                </div>

                <div className={style.flagsSection}>
                  <h3>Policy Flags</h3>

                  <div className={style.flagOption}>
                    <label className={style.flagLabel}>
                      <input
                        type="checkbox"
                        checked={formData.requiresApproval}
                        onChange={e => setFormData({...formData, requiresApproval: e.target.checked})}
                      />
                      <div className={style.flagContent}>
                        <span className={style.flagTitle}>Requires Approval</span>
                        <span className={style.flagDescription}>
                          Bookings must be approved by an administrator before confirmation
                        </span>
                      </div>
                    </label>
                  </div>

                  <div className={style.flagOption}>
                    <label className={style.flagLabel}>
                      <input
                        type="checkbox"
                        checked={formData.allowRecurring}
                        onChange={e => setFormData({...formData, allowRecurring: e.target.checked})}
                      />
                      <div className={style.flagContent}>
                        <span className={style.flagTitle}>Allow Recurring Bookings</span>
                        <span className={style.flagDescription}>
                          Users can create recurring/repeating bookings
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </>
            )}

            {/* Step 4: Initial Assignment */}
            {step === 4 && (
              <>
                <h2>Initial Assignment</h2>
                <p className={style.stepDescription}>Choose how this policy should be initially assigned.</p>

                <div className={style.assignmentOptions}>
                  <div className={style.assignmentOption}>
                    <label className={style.radioLabel}>
                      <input
                        type="radio"
                        name="assignment"
                        checked={!formData.setAsDefault}
                        onChange={() => setFormData({...formData, setAsDefault: false})}
                      />
                      <div className={style.radioContent}>
                        <span className={style.radioTitle}>Don't set as default</span>
                        <span className={style.radioDescription}>
                          Create this policy without making it the default.
                          You can assign it to categories, groups, or resources later.
                        </span>
                      </div>
                    </label>
                  </div>

                  <div className={style.assignmentOption}>
                    <label className={style.radioLabel}>
                      <input
                        type="radio"
                        name="assignment"
                        checked={formData.setAsDefault}
                        onChange={() => setFormData({...formData, setAsDefault: true})}
                      />
                      <div className={style.radioContent}>
                        <span className={style.radioTitle}>Set as system default</span>
                        <span className={style.radioDescription}>
                          This policy will be used for all resources that don't have a more specific policy assigned.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className={style.assignmentNote}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span>
                    After creating the policy, you can assign it to specific categories, groups, or resources from their respective detail pages.
                  </span>
                </div>
              </>
            )}

            {/* Step 5: Review */}
            {step === 5 && (
              <>
                <h2>Review & Create</h2>
                <p className={style.stepDescription}>Review the policy details before creating.</p>

                <div className={style.reviewSection}>
                  <h3>Basic Information</h3>
                  <div className={style.reviewGrid}>
                    <div className={style.reviewItem}>
                      <span className={style.reviewLabel}>Name</span>
                      <span className={style.reviewValue}>{formData.name}</span>
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
                  <h3>Time Constraints</h3>
                  <div className={style.reviewGrid}>
                    <div className={style.reviewItem}>
                      <span className={style.reviewLabel}>Slot Duration</span>
                      <span className={style.reviewValue}>{formatDuration(formData.slotDurationMinutes)}</span>
                    </div>
                    <div className={style.reviewItem}>
                      <span className={style.reviewLabel}>Min Duration</span>
                      <span className={style.reviewValue}>{formatDuration(formData.minDurationMinutes)}</span>
                    </div>
                    <div className={style.reviewItem}>
                      <span className={style.reviewLabel}>Max Duration</span>
                      <span className={style.reviewValue}>{formatDuration(formData.maxDurationMinutes)}</span>
                    </div>
                    <div className={style.reviewItem}>
                      <span className={style.reviewLabel}>Buffer After</span>
                      <span className={style.reviewValue}>{formatDuration(formData.bufferAfterMinutes)}</span>
                    </div>
                  </div>
                </div>

                <div className={style.reviewSection}>
                  <h3>Booking Rules</h3>
                  <div className={style.reviewGrid}>
                    <div className={style.reviewItem}>
                      <span className={style.reviewLabel}>Max Advance</span>
                      <span className={style.reviewValue}>
                        {formData.maxAdvanceBookingDays ? `${formData.maxAdvanceBookingDays} days` : 'No limit'}
                      </span>
                    </div>
                    <div className={style.reviewItem}>
                      <span className={style.reviewLabel}>Min Notice</span>
                      <span className={style.reviewValue}>
                        {formData.minAdvanceBookingHours ? `${formData.minAdvanceBookingHours} hours` : 'No minimum'}
                      </span>
                    </div>
                    <div className={style.reviewItem}>
                      <span className={style.reviewLabel}>Max Concurrent</span>
                      <span className={style.reviewValue}>
                        {formData.maxConcurrentBookings ?? 'Unlimited'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={style.reviewSection}>
                  <h3>Flags & Assignment</h3>
                  <div className={style.reviewFlags}>
                    <div className={`${style.reviewFlag} ${formData.requiresApproval ? style.reviewFlagEnabled : style.reviewFlagDisabled}`}>
                      {formData.requiresApproval ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      )}
                      <span>Requires Approval</span>
                    </div>
                    <div className={`${style.reviewFlag} ${formData.allowRecurring ? style.reviewFlagEnabled : style.reviewFlagDisabled}`}>
                      {formData.allowRecurring ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      )}
                      <span>Allow Recurring</span>
                    </div>
                    <div className={`${style.reviewFlag} ${formData.setAsDefault ? style.reviewFlagEnabled : style.reviewFlagDisabled}`}>
                      {formData.setAsDefault ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      )}
                      <span>Set as Default</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Navigation Buttons */}
            <div className={style.buttonsContainer}>
              <SecondaryButton
                style={{width: 109}}
                caption={step > 1 ? translate('action_back_label', 'Back') : translate('action_cancel_label', 'Cancel')}
                onClick={async () => onBack()}
                disabled={isCreating}
              />
              <PrimaryButton
                style={{width: 180, marginLeft: 'auto'}}
                caption={getButtonCaption()}
                onClick={async () => onNext()}
                disabled={!canProceed || isCreating}
              />
            </div>
          </div>
        </div>
        <ProgressStepIndicator
          steps={[
            {
              title: 'Basic Info',
              description: 'Name and description',
            },
            {
              title: 'Time Constraints',
              description: 'Duration and buffers',
            },
            {
              title: 'Booking Rules',
              description: 'Limits and flags',
            },
            {
              title: 'Assignment',
              description: 'Initial assignment',
            },
            {
              title: 'Review',
              description: 'Review and create',
            },
          ]}
          activeStep={step}
        />
      </div>
    </div>
  )
}

export default PolicyCreatePage
