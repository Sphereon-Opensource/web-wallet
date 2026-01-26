import React, {FC, ReactElement, useState, useEffect} from 'react'
import {useOne, useUpdate, useList, useTranslate} from '@refinedev/core'
import {useNavigate, useParams} from 'react-router-dom'
import {PrimaryButton, ProgressStepIndicator, SecondaryButton} from '@sphereon/ui-components.ssi-react'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import {FormInput, FormTextarea, FormSelect, FormSection, FormRow, FormNumberInput} from '@components/fields/FormInput'
import {BookingDataResource, ScheduleSet, DayOfWeek, CreateScheduleRuleRequest} from '@typings'
import style from './index.module.css'

interface FormData {
  name: string
  description: string
  priority: number
  rules: CreateScheduleRuleRequest[]
  includedSetIds: string[]
}

interface RuleFormState {
  ruleType: 'dayOfWeek' | 'dayOfMonth' | 'specificDate'
  daysOfWeek: DayOfWeek[]
  dayOfMonth: number
  month: number | null
  specificDate: string
  startTime: string
  endTime: string
  isClosed: boolean
}

const DAYS_OF_WEEK: {value: DayOfWeek; label: string}[] = [
  {value: 1, label: 'Monday'},
  {value: 2, label: 'Tuesday'},
  {value: 3, label: 'Wednesday'},
  {value: 4, label: 'Thursday'},
  {value: 5, label: 'Friday'},
  {value: 6, label: 'Saturday'},
  {value: 7, label: 'Sunday'},
]

const MONTHS = [
  {value: 1, label: 'January'},
  {value: 2, label: 'February'},
  {value: 3, label: 'March'},
  {value: 4, label: 'April'},
  {value: 5, label: 'May'},
  {value: 6, label: 'June'},
  {value: 7, label: 'July'},
  {value: 8, label: 'August'},
  {value: 9, label: 'September'},
  {value: 10, label: 'October'},
  {value: 11, label: 'November'},
  {value: 12, label: 'December'},
]

const createEmptyRuleForm = (): RuleFormState => ({
  ruleType: 'dayOfWeek',
  daysOfWeek: [],
  dayOfMonth: 1,
  month: null,
  specificDate: '',
  startTime: '',
  endTime: '',
  isClosed: false,
})

const ScheduleEditPage: FC = (): ReactElement => {
  const {id} = useParams<{id: string}>()
  const navigate = useNavigate()
  const translate = useTranslate()
  const [step, setStep] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    priority: 10,
    rules: [],
    includedSetIds: [],
  })
  const [currentRule, setCurrentRule] = useState<RuleFormState>(createEmptyRuleForm())
  const [isAddingRule, setIsAddingRule] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load existing schedule
  const {data: scheduleData, isLoading: isLoadingSchedule} = useOne<ScheduleSet>({
    resource: BookingDataResource.SCHEDULE_SETS,
    id: id!,
  })

  const {data: allScheduleSetsData} = useList<ScheduleSet>({
    resource: BookingDataResource.SCHEDULE_SETS,
    pagination: {pageSize: 100},
  })

  const {mutate: updateSchedule, isLoading: isUpdating} = useUpdate()

  const schedule = scheduleData?.data
  const allScheduleSets = (allScheduleSetsData?.data ?? []).filter(s => s.id !== id)

  // Initialize form with existing data
  useEffect(() => {
    if (schedule && !isInitialized) {
      setFormData({
        name: schedule.name,
        description: schedule.description || '',
        priority: schedule.priority,
        rules: schedule.rules.map(r => ({
          dayOfWeek: r.dayOfWeek,
          dayOfMonth: r.dayOfMonth,
          month: r.month,
          specificDate: r.specificDate,
          nthWeekday: r.nthWeekday,
          startTime: r.startTime,
          endTime: r.endTime,
          isClosed: r.isClosed,
          validFrom: r.validFrom,
          validUntil: r.validUntil,
        })),
        includedSetIds: schedule.includedSetIds,
      })
      setIsInitialized(true)
    }
  }, [schedule, isInitialized])

  const handleSubmit = () => {
    setError(null)

    updateSchedule(
      {
        resource: BookingDataResource.SCHEDULE_SETS,
        id: id!,
        values: {
          name: formData.name,
          description: formData.description || undefined,
          priority: formData.priority,
          rules: formData.rules,
          includedSetIds: formData.includedSetIds,
        },
      },
      {
        onSuccess: () => {
          navigate(`/booking/admin/schedules/${id}`)
        },
        onError: (err) => {
          setError(err.message || 'Failed to update schedule')
        },
      },
    )
  }

  const addRule = () => {
    const newRules: CreateScheduleRuleRequest[] = []
    // Only include time if both start and end are provided
    const hasTime = currentRule.startTime && currentRule.endTime

    if (currentRule.ruleType === 'dayOfWeek') {
      // Create a rule for each selected day
      for (const day of currentRule.daysOfWeek) {
        newRules.push({
          dayOfWeek: day,
          startTime: hasTime ? currentRule.startTime : undefined,
          endTime: hasTime ? currentRule.endTime : undefined,
          isClosed: currentRule.isClosed,
        })
      }
    } else if (currentRule.ruleType === 'dayOfMonth') {
      newRules.push({
        dayOfMonth: currentRule.dayOfMonth,
        month: currentRule.month || undefined,
        startTime: hasTime ? currentRule.startTime : undefined,
        endTime: hasTime ? currentRule.endTime : undefined,
        isClosed: currentRule.isClosed,
      })
    } else if (currentRule.ruleType === 'specificDate') {
      newRules.push({
        specificDate: currentRule.specificDate,
        startTime: hasTime ? currentRule.startTime : undefined,
        endTime: hasTime ? currentRule.endTime : undefined,
        isClosed: currentRule.isClosed,
      })
    }

    setFormData({
      ...formData,
      rules: [...formData.rules, ...newRules],
    })
    setCurrentRule(createEmptyRuleForm())
    setIsAddingRule(false)
  }

  const removeRule = (index: number) => {
    setFormData({
      ...formData,
      rules: formData.rules.filter((_, i) => i !== index),
    })
  }

  const toggleIncludedSet = (setId: string) => {
    if (formData.includedSetIds.includes(setId)) {
      setFormData({
        ...formData,
        includedSetIds: formData.includedSetIds.filter(id => id !== setId),
      })
    } else {
      setFormData({
        ...formData,
        includedSetIds: [...formData.includedSetIds, setId],
      })
    }
  }

  const formatRuleDescription = (rule: CreateScheduleRuleRequest): string => {
    const parts: string[] = []

    if (rule.specificDate) {
      parts.push(new Date(rule.specificDate).toLocaleDateString())
    } else if (rule.dayOfWeek) {
      parts.push(DAYS_OF_WEEK.find(d => d.value === rule.dayOfWeek)?.label || '')
    } else if (rule.dayOfMonth) {
      const month = rule.month ? MONTHS.find(m => m.value === rule.month)?.label : 'Every month'
      parts.push(`Day ${rule.dayOfMonth} of ${month}`)
    }

    if (rule.startTime && rule.endTime) {
      parts.push(`${rule.startTime} - ${rule.endTime}`)
    } else {
      parts.push('All day')
    }

    if (rule.isClosed) {
      parts.push('(Closed)')
    }

    return parts.join(' ')
  }

  const isStep1Valid = formData.name.trim() !== ''
  const isStep2Valid = true // Rules are optional
  const isStep3Valid = true // Includes are optional
  const canProceed = step === 1 ? isStep1Valid : step === 2 ? isStep2Valid : step === 3 ? isStep3Valid : true

  const maxSteps = 4

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
      navigate(`/booking/admin/schedules/${id}`)
    }
  }

  const getButtonCaption = (): string => {
    if (step === maxSteps) {
      return isUpdating ? 'Saving...' : 'Save Changes'
    }
    return translate('action_proceed_label', 'Next')
  }

  if (isLoadingSchedule) {
    return (
      <div className={style.container}>
        <PageHeaderBar path="Booking / Admin / Schedules / Edit" />
        <div className={style.loadingContainer}>
          <div className={style.spinner} />
          <span>Loading schedule...</span>
        </div>
      </div>
    )
  }

  if (!schedule) {
    return (
      <div className={style.container}>
        <PageHeaderBar path="Booking / Admin / Schedules / Edit" />
        <div className={style.errorContainer}>
          <strong>Error</strong>
          <span>Schedule not found</span>
        </div>
      </div>
    )
  }

  return (
    <div className={style.container}>
      <PageHeaderBar path={`Booking / Admin / Schedules / ${schedule.name} / Edit`} />
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
              <FormSection
                title="Basic Information"
                description="Update the name and description for this schedule."
              >
                <FormRow columns={1}>
                  <FormInput
                    label="Schedule Name"
                    value={formData.name}
                    onChange={value => setFormData({...formData, name: value})}
                    placeholder="e.g., Standard Office Hours"
                    required
                  />
                </FormRow>

                <FormRow columns={1}>
                  <FormTextarea
                    label="Description"
                    value={formData.description}
                    onChange={value => setFormData({...formData, description: value})}
                    placeholder="Describe when this schedule applies..."
                    rows={3}
                  />
                </FormRow>

                <FormRow columns={2}>
                  <FormNumberInput
                    label="Priority"
                    value={formData.priority}
                    onChange={value => setFormData({...formData, priority: value})}
                    min={0}
                    max={100}
                    helperText="Higher priority schedules override lower ones (0-100)"
                  />
                </FormRow>
              </FormSection>
            )}

            {/* Step 2: Add Rules */}
            {step === 2 && (
              <FormSection
                title="Schedule Rules"
                description="Manage the time rules for this schedule."
              >
                {/* Existing Rules */}
                {formData.rules.length > 0 && (
                  <div className={style.rulesList}>
                    {formData.rules.map((rule, index) => (
                      <div key={index} className={`${style.ruleItem} ${rule.isClosed ? style.ruleItemClosed : ''}`}>
                        <span className={style.ruleDescription}>{formatRuleDescription(rule)}</span>
                        <button
                          type="button"
                          className={style.removeRuleButton}
                          onClick={() => removeRule(index)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Rule Form */}
                {isAddingRule ? (
                  <div className={style.addRuleForm}>
                    <h3>New Rule</h3>

                    <FormRow columns={1}>
                      <FormSelect
                        label="Rule Type"
                        value={currentRule.ruleType}
                        onChange={value => setCurrentRule({
                          ...currentRule,
                          ruleType: value as 'dayOfWeek' | 'dayOfMonth' | 'specificDate'
                        })}
                        options={[
                          {value: 'dayOfWeek', label: 'Day of Week (e.g., Every Monday)'},
                          {value: 'dayOfMonth', label: 'Day of Month (e.g., 1st of each month)'},
                          {value: 'specificDate', label: 'Specific Date (e.g., Dec 25, 2026)'},
                        ]}
                      />
                    </FormRow>

                    {currentRule.ruleType === 'dayOfWeek' && (
                      <div className={style.fieldGroup}>
                        <label className={style.fieldLabel}>Days of Week</label>
                        <div className={style.daysOfWeekGrid}>
                          {DAYS_OF_WEEK.map(day => (
                            <label key={day.value} className={style.dayCheckbox}>
                              <input
                                type="checkbox"
                                checked={currentRule.daysOfWeek.includes(day.value)}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setCurrentRule({
                                      ...currentRule,
                                      daysOfWeek: [...currentRule.daysOfWeek, day.value].sort((a, b) => a - b)
                                    })
                                  } else {
                                    setCurrentRule({
                                      ...currentRule,
                                      daysOfWeek: currentRule.daysOfWeek.filter(d => d !== day.value)
                                    })
                                  }
                                }}
                              />
                              <span>{day.label}</span>
                            </label>
                          ))}
                        </div>
                        <div className={style.quickSelectButtons}>
                          <button
                            type="button"
                            className={style.quickSelectButton}
                            onClick={() => setCurrentRule({
                              ...currentRule,
                              daysOfWeek: [1, 2, 3, 4, 5] as DayOfWeek[]
                            })}
                          >
                            Mon-Fri
                          </button>
                          <button
                            type="button"
                            className={style.quickSelectButton}
                            onClick={() => setCurrentRule({
                              ...currentRule,
                              daysOfWeek: [6, 7] as DayOfWeek[]
                            })}
                          >
                            Weekends
                          </button>
                          <button
                            type="button"
                            className={style.quickSelectButton}
                            onClick={() => setCurrentRule({
                              ...currentRule,
                              daysOfWeek: [1, 2, 3, 4, 5, 6, 7] as DayOfWeek[]
                            })}
                          >
                            All Days
                          </button>
                          <button
                            type="button"
                            className={style.quickSelectButton}
                            onClick={() => setCurrentRule({
                              ...currentRule,
                              daysOfWeek: []
                            })}
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    )}

                    {currentRule.ruleType === 'dayOfMonth' && (
                      <FormRow columns={2}>
                        <FormNumberInput
                          label="Day of Month"
                          value={currentRule.dayOfMonth}
                          onChange={value => setCurrentRule({
                            ...currentRule,
                            dayOfMonth: value
                          })}
                          min={1}
                          max={31}
                        />
                        <FormSelect
                          label="Month (optional)"
                          value={currentRule.month?.toString() || ''}
                          onChange={value => setCurrentRule({
                            ...currentRule,
                            month: value ? parseInt(value) : null
                          })}
                          options={[
                            {value: '', label: 'Every month'},
                            ...MONTHS.map(m => ({value: m.value.toString(), label: m.label}))
                          ]}
                        />
                      </FormRow>
                    )}

                    {currentRule.ruleType === 'specificDate' && (
                      <FormRow columns={1}>
                        <FormInput
                          type="date"
                          label="Date"
                          value={currentRule.specificDate}
                          onChange={value => setCurrentRule({...currentRule, specificDate: value})}
                        />
                      </FormRow>
                    )}

                    <div className={style.fieldGroup}>
                      <div className={style.timeRangeHeader}>
                        <label className={style.fieldLabel}>Time Range (optional)</label>
                        {(currentRule.startTime || currentRule.endTime) && (
                          <button
                            type="button"
                            className={style.clearTimeButton}
                            onClick={() => setCurrentRule({...currentRule, startTime: '', endTime: ''})}
                          >
                            Clear times (use all day)
                          </button>
                        )}
                      </div>
                      <FormRow columns={2}>
                        <FormInput
                          type="time"
                          label="Start Time"
                          value={currentRule.startTime}
                          onChange={value => setCurrentRule({...currentRule, startTime: value})}
                        />
                        <FormInput
                          type="time"
                          label="End Time"
                          value={currentRule.endTime}
                          onChange={value => setCurrentRule({...currentRule, endTime: value})}
                        />
                      </FormRow>
                      {!currentRule.startTime && !currentRule.endTime && (
                        <span className={style.allDayIndicator}>
                          All day - applies to the entire day
                        </span>
                      )}
                      <span className={style.helpText}>
                        Leave empty for all day. Specify both start and end times to restrict to a time window.
                      </span>
                    </div>

                    <div className={style.closedOption}>
                      <label className={style.closedCheckbox}>
                        <input
                          type="checkbox"
                          checked={currentRule.isClosed}
                          onChange={e => setCurrentRule({...currentRule, isClosed: e.target.checked})}
                        />
                        <span>Closed (block this time/day from bookings)</span>
                      </label>
                      <span className={style.helpText}>
                        Use this to block specific times (e.g., lunch breaks) or entire days (e.g., holidays).
                      </span>
                    </div>

                    <div className={style.addRuleActions}>
                      <button
                        type="button"
                        className={style.cancelButton}
                        onClick={() => {
                          setCurrentRule(createEmptyRuleForm())
                          setIsAddingRule(false)
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className={style.addButton}
                        onClick={addRule}
                        disabled={
                          (currentRule.ruleType === 'specificDate' && !currentRule.specificDate) ||
                          (currentRule.ruleType === 'dayOfWeek' && currentRule.daysOfWeek.length === 0)
                        }
                      >
                        Add Rule
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={style.addRuleButton}
                    onClick={() => setIsAddingRule(true)}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v8M8 12h8" />
                    </svg>
                    Add Rule
                  </button>
                )}

                {formData.rules.length === 0 && !isAddingRule && (
                  <p className={style.noRulesHint}>
                    No rules yet. Add rules to define operating hours, or skip to include other schedules.
                  </p>
                )}
              </FormSection>
            )}

            {/* Step 3: Include Sets */}
            {step === 3 && (
              <>
                <h2>Include Other Schedules</h2>
                <p className={style.stepDescription}>
                  Optionally include rules from other schedules. Included rules will be combined with this schedule's rules.
                </p>

                {allScheduleSets.length === 0 ? (
                  <p className={style.noSetsMessage}>
                    No other schedules available to include.
                  </p>
                ) : (
                  <div className={style.includedSetsList}>
                    {allScheduleSets.map(set => (
                      <label key={set.id} className={style.includedSetItem}>
                        <input
                          type="checkbox"
                          checked={formData.includedSetIds.includes(set.id)}
                          onChange={() => toggleIncludedSet(set.id)}
                        />
                        <div className={style.includedSetInfo}>
                          <span className={style.includedSetName}>{set.name}</span>
                          {set.description && (
                            <span className={style.includedSetDescription}>{set.description}</span>
                          )}
                          <span className={style.includedSetMeta}>
                            {set.rules.length} rules, Priority: {set.priority}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {formData.includedSetIds.length > 0 && (
                  <p className={style.includeNote}>
                    {formData.includedSetIds.length} schedule(s) will be included.
                    Rules from included schedules will be applied with their respective priorities.
                  </p>
                )}
              </>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <>
                <h2>Review Changes</h2>
                <p className={style.stepDescription}>Review the schedule details before saving.</p>

                <div className={style.reviewSection}>
                  <h3>Basic Information</h3>
                  <div className={style.reviewGrid}>
                    <div className={style.reviewItem}>
                      <span className={style.reviewLabel}>Name</span>
                      <span className={style.reviewValue}>{formData.name}</span>
                    </div>
                    <div className={style.reviewItem}>
                      <span className={style.reviewLabel}>Priority</span>
                      <span className={style.reviewValue}>{formData.priority}</span>
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
                  <h3>Rules ({formData.rules.length})</h3>
                  {formData.rules.length === 0 ? (
                    <p className={style.reviewEmpty}>No rules defined</p>
                  ) : (
                    <div className={style.reviewRulesList}>
                      {formData.rules.map((rule, index) => (
                        <div key={index} className={style.reviewRuleItem}>
                          {formatRuleDescription(rule)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={style.reviewSection}>
                  <h3>Included Schedules ({formData.includedSetIds.length})</h3>
                  {formData.includedSetIds.length === 0 ? (
                    <p className={style.reviewEmpty}>No schedules included (standalone)</p>
                  ) : (
                    <div className={style.reviewIncludesList}>
                      {formData.includedSetIds.map(setId => {
                        const set = allScheduleSets.find(s => s.id === setId)
                        return (
                          <div key={setId} className={style.reviewIncludeItem}>
                            {set?.name || setId}
                          </div>
                        )
                      })}
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
              description: 'Name and priority',
            },
            {
              title: 'Rules',
              description: 'Manage time rules',
            },
            {
              title: 'Include Schedules',
              description: 'Compose with other schedules',
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

export default ScheduleEditPage
