// Resource
export interface BookingResource {
  id: string
  partyId: string
  name: string
  description?: string
  categoryId: string
  category?: ResourceCategory
  groupId?: string // Optional group affiliation
  group?: ResourceGroup
  imageUrl?: string
  timezone: string
  status: ResourceStatus
  capacity?: number
  requirements: ResourceRequirement[]
  schedules?: ResourceSchedule[] // Legacy per-resource schedules
  policyId?: string
  policy?: UsagePolicy
  usagePolicies?: ResourceUsagePolicy[] // Per-resource policy assignments from VDX join table
  createdAt: string
  updatedAt: string
}

export type ResourceStatus = 'ACTIVE' | 'MAINTENANCE' | 'RETIRED'

// Resource Group - bundles multiple resources together
export interface ResourceGroup {
  id: string
  tenantId: string
  name: string
  description?: string
  categoryId?: string // Optional category affiliation
  category?: ResourceCategory
  imageAssetId?: string
  status: ResourceGroupStatus
  createdAt: string
  updatedAt: string
}

export type ResourceGroupStatus = 'ACTIVE' | 'INACTIVE'

// Category
export interface ResourceCategory {
  id: string
  tenantId: string
  name: string
  slug: string
  description?: string
  iconAssetId?: string
  parentCategoryId?: string
  isActive: boolean
  status: 'ACTIVE' | 'INACTIVE' // Derived from isActive for UI consistency
  displayOrder: number
  createdAt: string
  updatedAt: string
}

// Usage Policy
export interface UsagePolicy {
  id: string
  tenantId: string
  name: string
  description?: string
  // Booking constraints - using user-friendly names
  slotDurationMinutes: number // Slot interval/duration in minutes
  minDurationMinutes?: number // Minimum booking duration
  maxDurationMinutes?: number // Maximum booking duration
  bufferAfterMinutes?: number // Buffer time after each booking
  maxAdvanceBookingDays: number // How far in advance bookings can be made
  minAdvanceBookingHours?: number // Minimum hours notice for booking
  maxConcurrentBookings?: number // Max concurrent bookings per user
  // Flags
  requiresApproval: boolean // Whether bookings need approval
  allowRecurring: boolean // Whether recurring bookings are allowed
  allowSameDayBooking: boolean // Whether same-day bookings are allowed
  // Status
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

// Resource Usage Policy (join table for resource-specific policy assignment)
export interface ResourceUsagePolicy {
  id: string
  resourceId: string
  usagePolicyId: string
  usagePolicy?: UsagePolicy
  priority: number // Higher priority overrides lower (100 = highest)
  concurrencyOverride?: number // Override policy's concurrency limit for this resource
  effectiveFrom?: string // ISO date when this policy assignment starts
  effectiveUntil?: string // ISO date when this policy assignment ends
  createdAt: string
  updatedAt: string
}

// Requirement (with DCQL)
export interface ResourceRequirement {
  id: string
  resourceId: string
  requirementCategoryId?: string
  dcqlQuery?: string
  subIdentifier?: string
  description?: string
  isMandatory: boolean
  displayOrder: number
}

// Schedule (legacy - resource-specific)
export interface ResourceSchedule {
  id: string
  resourceId: string
  dayOfWeek?: DayOfWeek // ISO 8601: 1=Monday
  dayOfMonth?: number
  month?: number
  specificDate?: string
  startTime: string // HH:mm
  endTime: string // HH:mm
  isClosed: boolean
  validFrom?: string
  validUntil?: string
  createdAt: string
  updatedAt: string
}

export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7

// ============================================================
// COMPOSITE SCHEDULES - Reusable, composable schedule system
// ============================================================

/**
 * ScheduleRule - Atomic unit of schedule definition
 * Defines a single time slot with flexible date patterns
 */
export interface ScheduleRule {
  id: string
  // Date pattern (one or more can be set for complex patterns)
  dayOfWeek?: DayOfWeek // 1=Monday, 7=Sunday (ISO 8601)
  dayOfMonth?: number // 1-31, or -1 for last day of month
  month?: number // 1-12 for specific month
  specificDate?: string // "2026-04-06" for one-time rules
  nthWeekday?: number // 1-5 for "Nth weekday of month" (e.g., 2nd Tuesday)
  // Time range
  startTime: string // "09:00" (HH:mm format)
  endTime: string // "17:00" (HH:mm format)
  // Status
  isClosed: boolean // true = blocked/closed during this time
  // Validity window (optional)
  validFrom?: string // ISO date when this rule becomes active
  validUntil?: string // ISO date when this rule expires
}

/**
 * ScheduleSet - A named collection of rules and/or references to other sets
 * Supports composition by including other ScheduleSets
 */
export interface ScheduleSet {
  id: string
  tenantId: string
  name: string // "Standard Office Hours", "Dutch Public Holidays"
  description?: string
  // Direct rules in this set
  rules: ScheduleRule[]
  // Included sets (composition) - references to other ScheduleSets
  includedSetIds: string[]
  // Resolved included sets (populated when fetching with relations)
  includedSets?: ScheduleSet[]
  // Inheritance priority - higher values override lower (100 = highest)
  priority: number
  createdAt: string
  updatedAt: string
}

/**
 * ScheduleSetAssignment - Links ScheduleSets to entities at various levels
 * Enables inheritance: Default -> Category -> Group -> Resource
 */
export interface ScheduleSetAssignment {
  id: string
  tenantId: string
  scheduleSetId: string
  scheduleSet?: ScheduleSet // Populated when fetching with relations
  // Target (exactly one should be set, or isDefault=true for system default)
  categoryId?: string
  groupId?: string
  resourceId?: string
  isDefault?: boolean // System default schedule
  // Priority for multiple assignments at same level
  priority: number
  // Validity window
  validFrom?: string
  validUntil?: string
  createdAt: string
  updatedAt: string
}

// ============================================================
// REUSABLE POLICIES - Policy assignment at multiple levels
// ============================================================

/**
 * PolicyAssignment - Links policies to entities at various levels
 * Enables inheritance: Default -> Category -> Group -> Resource
 */
export interface PolicyAssignment {
  id: string
  tenantId: string
  policyId: string
  policy?: UsagePolicy // Populated when fetching with relations
  // Target (exactly one should be set, or isDefault=true for system default)
  categoryId?: string
  groupId?: string
  resourceId?: string
  isDefault?: boolean // System default policy
  // Priority for multiple assignments at same level
  priority: number
  // Validity window
  validFrom?: string
  validUntil?: string
  createdAt: string
  updatedAt: string
}

// ============================================================
// INHERITANCE RESOLUTION TYPES
// ============================================================

/**
 * Inheritance level priority (higher = more specific, wins over lower)
 */
export type InheritanceLevel = 'default' | 'category' | 'group' | 'resource'

/**
 * Effective schedule with source information
 */
export interface EffectiveSchedule {
  scheduleSet: ScheduleSet
  sourceLevel: InheritanceLevel
  sourceId?: string // ID of the category/group/resource that assigned this
  sourceName?: string // Name of the source for display
}

/**
 * Effective policy with source information
 */
export interface EffectivePolicy {
  policy: UsagePolicy
  sourceLevel: InheritanceLevel
  sourceId?: string
  sourceName?: string
}

/**
 * Flattened schedule rules from all included sets
 * Used for slot generation
 */
export interface FlattenedScheduleRules {
  rules: ScheduleRule[]
  sources: Array<{
    setId: string
    setName: string
    priority: number
  }>
}

// Booking
export interface Booking {
  id: string
  tenantId: string
  userId: string
  delegateId?: string
  resourceId: string
  resource?: BookingResource
  bookingType?: string
  title?: string
  description?: string
  startTime: string
  endTime: string
  status: BookingStatus
  proofStatus: ProofStatus
  headcount?: number
  createdAt: string
  updatedAt: string
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'
export type ProofStatus = 'NOT_REQUIRED' | 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED'

// Booking Verification
export interface BookingVerification {
  id: string
  bookingId: string
  requirementId: string
  oid4vcStateId?: string
  verificationStatus: VerificationStatus
  credentialHash?: string
  verifiedAt?: string
  expiresAt?: string
}

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED'

// Time Slot (computed from schedules)
export interface TimeSlot {
  id: string
  startTime: Date
  endTime: Date
  isAvailable: boolean
  bookingId?: string
}

// Calendar View
export type CalendarView = 'day' | 'week'

// Booking Create Wizard State
export interface BookingCreateState {
  step: BookingCreateStep
  selectedResource?: BookingResource
  selectedDate?: Date
  availableSlots: TimeSlot[]
  selectedSlot?: TimeSlot
  bookingTitle?: string
  bookingDescription?: string
  verification?: {
    qrUri?: string
    deeplink?: string
    verificationId?: string
    status: VerificationStatus
  }
  createdBooking?: Booking
  error?: string
}

export type BookingCreateStep = 'resource' | 'time' | 'verification' | 'confirmation'

// API Request/Response types
export interface CreateBookingRequest {
  resourceId: string
  startTime: string
  endTime: string
  title?: string
  description?: string
  headcount?: number
}

export interface ResourceAvailabilityResponse {
  resourceId: string
  date: string
  slots: TimeSlot[]
}

export interface StartVerificationRequest {
  resourceId: string
  bookingId?: string
}

export interface StartVerificationResponse {
  verificationId: string
  qrUri: string
  deeplink: string
}

export interface VerificationStatusResponse {
  verificationId: string
  status: VerificationStatus
  verifiedAt?: string
}

// List filters
export interface BookingResourceFilter {
  categoryId?: string
  status?: ResourceStatus
  search?: string
}

export interface BookingFilter {
  resourceId?: string
  status?: BookingStatus
  startDate?: string
  endDate?: string
}

// ============================================================
// CREATE/UPDATE REQUEST TYPES
// ============================================================

/**
 * Create a new resource group
 */
export interface CreateResourceGroupRequest {
  name: string
  description?: string
  categoryId?: string
  imageAssetId?: string
  status?: ResourceGroupStatus
}

/**
 * Update an existing resource group
 */
export interface UpdateResourceGroupRequest extends Partial<CreateResourceGroupRequest> {
  id: string
}

/**
 * Create a new schedule rule (embedded in ScheduleSet)
 */
export interface CreateScheduleRuleRequest {
  dayOfWeek?: DayOfWeek
  dayOfMonth?: number
  month?: number
  specificDate?: string
  nthWeekday?: number
  startTime?: string  // Optional - if not provided, entire day is assumed
  endTime?: string    // Optional - if not provided, entire day is assumed
  isClosed: boolean
  validFrom?: string
  validUntil?: string
}

/**
 * Create a new schedule set
 */
export interface CreateScheduleSetRequest {
  name: string
  description?: string
  rules: CreateScheduleRuleRequest[]
  includedSetIds: string[]
  priority?: number
}

/**
 * Update an existing schedule set
 */
export interface UpdateScheduleSetRequest extends Partial<CreateScheduleSetRequest> {
  id: string
}

/**
 * Create a schedule set assignment
 */
export interface CreateScheduleSetAssignmentRequest {
  scheduleSetId: string
  categoryId?: string
  groupId?: string
  resourceId?: string
  isDefault?: boolean
  priority?: number
  validFrom?: string
  validUntil?: string
}

/**
 * Update a schedule set assignment
 */
export interface UpdateScheduleSetAssignmentRequest extends Partial<CreateScheduleSetAssignmentRequest> {
  id: string
}

/**
 * Create a policy assignment
 */
export interface CreatePolicyAssignmentRequest {
  policyId: string
  categoryId?: string
  groupId?: string
  resourceId?: string
  isDefault?: boolean
  priority?: number
  validFrom?: string
  validUntil?: string
}

/**
 * Update a policy assignment
 */
export interface UpdatePolicyAssignmentRequest extends Partial<CreatePolicyAssignmentRequest> {
  id: string
}

/**
 * Filter for resource groups
 */
export interface ResourceGroupFilter {
  categoryId?: string
  status?: ResourceGroupStatus
  search?: string
}

/**
 * Filter for schedule sets
 */
export interface ScheduleSetFilter {
  search?: string
}

/**
 * Filter for schedule set assignments
 */
export interface ScheduleSetAssignmentFilter {
  scheduleSetId?: string
  categoryId?: string
  groupId?: string
  resourceId?: string
  isDefault?: boolean
}

/**
 * Filter for policy assignments
 */
export interface PolicyAssignmentFilter {
  policyId?: string
  categoryId?: string
  groupId?: string
  resourceId?: string
  isDefault?: boolean
}
