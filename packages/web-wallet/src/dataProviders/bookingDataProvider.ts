import {BaseRecord, CreateParams, CreateResponse, DataProvider, DeleteManyParams, DeleteManyResponse, DeleteOneParams, DeleteOneResponse, GetListParams, GetListResponse, GetOneParams, GetOneResponse, UpdateParams, UpdateResponse} from '@refinedev/core'
import {
  Booking,
  BookingDataResource,
  BookingResource,
  EffectivePolicy,
  EffectiveSchedule,
  FlattenedScheduleRules,
  InheritanceLevel,
  PolicyAssignment,
  ResourceCategory,
  ResourceGroup,
  ResourceRequirement,
  ResourceSchedule,
  ResourceUsagePolicy,
  ScheduleRule,
  ScheduleSet,
  ScheduleSetAssignment,
  TimeSlot,
  UsagePolicy,
} from '@typings'
import {getEnv} from '@services/env'

// ============================================
// VDX API CONFIGURATION
// ============================================

// VDX Resource Manager API URL - defaults to localhost:8080
const getVdxApiUrl = () => getEnv('BROWSER_PUBLIC_VDX_API_URL') || 'http://localhost:8080/api/resources/v1'

/**
 * Get the access token from session storage.
 * The TenantContext stores the token there when the user authenticates.
 */
const getAccessToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('accessToken')
  }
  return null
}

/**
 * Get tenant ID from session storage or use default for development.
 */
const getTenantId = (): string => {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('tenantId') || '00000000-0000-0000-0000-000000000001'
  }
  return '00000000-0000-0000-0000-000000000001'
}

/**
 * Standard headers for VDX API requests.
 * Uses Bearer token authentication when available, with X-Tenant-ID fallback for development.
 */
const getHeaders = (includeContentType: boolean = false): HeadersInit => {
  const headers: HeadersInit = {
    Accept: 'application/json',
    'X-Tenant-ID': getTenantId(),
  }

  // Add Bearer token if available
  const accessToken = getAccessToken()
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  if (includeContentType) {
    headers['Content-Type'] = 'application/json'
  }

  return headers
}

// ============================================
// MOCK DATA - Used for offline development/testing
// ============================================

const MOCK_CATEGORIES: ResourceCategory[] = [
  {
    id: 'cat-1',
    tenantId: 'tenant-1',
    name: 'Meeting Rooms',
    slug: 'meeting-rooms',
    description: 'Conference and meeting rooms',
    isActive: true,
    status: 'ACTIVE',
    displayOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat-2',
    tenantId: 'tenant-1',
    name: 'Equipment',
    slug: 'equipment',
    description: 'AV equipment and devices',
    isActive: true,
    status: 'ACTIVE',
    displayOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat-3',
    tenantId: 'tenant-1',
    name: 'Workspaces',
    slug: 'workspaces',
    description: 'Hot desks and shared workspaces',
    isActive: true,
    status: 'ACTIVE',
    displayOrder: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat-4',
    tenantId: 'tenant-1',
    name: 'Vehicles',
    slug: 'vehicles',
    description: 'Company vehicles',
    isActive: true,
    status: 'ACTIVE',
    displayOrder: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const MOCK_RESOURCES: BookingResource[] = [
  {
    id: 'res-1',
    partyId: 'party-1',
    name: 'Conference Room A',
    description: 'Large conference room with video conferencing capabilities. Seats up to 20 people.',
    categoryId: 'cat-1',
    category: MOCK_CATEGORIES[0],
    timezone: 'Europe/Amsterdam',
    status: 'ACTIVE',
    capacity: 20,
    requirements: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'res-2',
    partyId: 'party-1',
    name: 'Meeting Room B',
    description: 'Medium-sized meeting room with whiteboard and projector.',
    categoryId: 'cat-1',
    category: MOCK_CATEGORIES[0],
    timezone: 'Europe/Amsterdam',
    status: 'ACTIVE',
    capacity: 8,
    requirements: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'res-3',
    partyId: 'party-1',
    name: 'Executive Boardroom',
    description: 'Premium boardroom with executive furniture and advanced AV equipment. Credential verification required.',
    categoryId: 'cat-1',
    category: MOCK_CATEGORIES[0],
    timezone: 'Europe/Amsterdam',
    status: 'ACTIVE',
    capacity: 12,
    requirements: [
      {
        id: 'req-1',
        resourceId: 'res-3',
        description: 'Employee credential required',
        isMandatory: true,
        displayOrder: 1,
        dcqlQuery: 'employee-credential',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'res-4',
    partyId: 'party-1',
    name: 'Projector Unit #1',
    description: 'Portable projector with HDMI and USB-C connectivity.',
    categoryId: 'cat-2',
    category: MOCK_CATEGORIES[1],
    timezone: 'Europe/Amsterdam',
    status: 'ACTIVE',
    requirements: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'res-5',
    partyId: 'party-1',
    name: 'Video Conference Kit',
    description: 'Owl camera with speaker and microphone for hybrid meetings.',
    categoryId: 'cat-2',
    category: MOCK_CATEGORIES[1],
    timezone: 'Europe/Amsterdam',
    status: 'MAINTENANCE',
    requirements: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'res-6',
    partyId: 'party-1',
    name: 'Hot Desk Zone A',
    description: 'Open workspace area with 10 hot desks and standing desk options.',
    categoryId: 'cat-3',
    category: MOCK_CATEGORIES[2],
    timezone: 'Europe/Amsterdam',
    status: 'ACTIVE',
    capacity: 10,
    requirements: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'res-7',
    partyId: 'party-1',
    name: 'Company Car - Tesla Model 3',
    description: 'Electric vehicle for business travel. Driver license verification required.',
    categoryId: 'cat-4',
    category: MOCK_CATEGORIES[3],
    timezone: 'Europe/Amsterdam',
    status: 'ACTIVE',
    capacity: 5,
    requirements: [
      {
        id: 'req-2',
        resourceId: 'res-7',
        description: 'Valid driver license required',
        isMandatory: true,
        displayOrder: 1,
        dcqlQuery: 'driver-license',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'res-8',
    partyId: 'party-1',
    name: 'Phone Booth 1',
    description: 'Private phone booth for calls and focused work.',
    categoryId: 'cat-3',
    category: MOCK_CATEGORIES[2],
    timezone: 'Europe/Amsterdam',
    status: 'ACTIVE',
    capacity: 1,
    requirements: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const MOCK_POLICIES: UsagePolicy[] = [
  {
    id: 'policy-1',
    tenantId: 'tenant-1',
    name: 'Standard Booking',
    description: 'Default policy for most resources',
    slotDurationMinutes: 30,
    minDurationMinutes: 30,
    maxDurationMinutes: 480,
    maxAdvanceBookingDays: 30,
    allowSameDayBooking: true,
    requiresApproval: false,
    allowRecurring: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const MOCK_BOOKINGS: Booking[] = [
  {
    id: 'booking-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    resourceId: 'res-1',
    resource: MOCK_RESOURCES[0],
    title: 'Team Standup',
    startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    endTime: new Date(Date.now() + 86400000 + 1800000).toISOString(),
    status: 'CONFIRMED',
    proofStatus: 'NOT_REQUIRED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'booking-2',
    tenantId: 'tenant-1',
    userId: 'user-1',
    resourceId: 'res-2',
    resource: MOCK_RESOURCES[1],
    title: 'Client Call',
    startTime: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
    endTime: new Date(Date.now() + 172800000 + 3600000).toISOString(),
    status: 'PENDING',
    proofStatus: 'NOT_REQUIRED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// ============================================
// MOCK DATA - Resource Groups
// ============================================

const MOCK_GROUPS: ResourceGroup[] = [
  {
    id: 'group-1',
    tenantId: 'tenant-1',
    name: 'Executive Floor Rooms',
    description: 'Premium meeting spaces on the executive floor',
    categoryId: 'cat-1',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'group-2',
    tenantId: 'tenant-1',
    name: 'Ground Floor Workspaces',
    description: 'Hot desks and collaborative spaces',
    categoryId: 'cat-3',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// ============================================
// MOCK DATA - Schedule Sets (Composite Schedules)
// ============================================

const MOCK_SCHEDULE_SETS: ScheduleSet[] = [
  {
    id: 'sset-1',
    tenantId: 'tenant-1',
    name: 'Standard Office Hours',
    description: 'Monday to Friday 09:00-17:00',
    rules: [
      {id: 'rule-1-1', dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isClosed: false},
      {id: 'rule-1-2', dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isClosed: false},
      {id: 'rule-1-3', dayOfWeek: 3, startTime: '09:00', endTime: '17:00', isClosed: false},
      {id: 'rule-1-4', dayOfWeek: 4, startTime: '09:00', endTime: '17:00', isClosed: false},
      {id: 'rule-1-5', dayOfWeek: 5, startTime: '09:00', endTime: '17:00', isClosed: false},
    ],
    includedSetIds: [],
    priority: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sset-2',
    tenantId: 'tenant-1',
    name: 'Dutch Public Holidays',
    description: 'Official Dutch public holidays - closed',
    rules: [
      {id: 'rule-2-1', month: 1, dayOfMonth: 1, startTime: '00:00', endTime: '23:59', isClosed: true}, // New Year
      {id: 'rule-2-2', month: 4, dayOfMonth: 27, startTime: '00:00', endTime: '23:59', isClosed: true}, // Kingsday
      {id: 'rule-2-3', month: 5, dayOfMonth: 5, startTime: '00:00', endTime: '23:59', isClosed: true}, // Liberation Day
      {id: 'rule-2-4', month: 12, dayOfMonth: 25, startTime: '00:00', endTime: '23:59', isClosed: true}, // Christmas
      {id: 'rule-2-5', month: 12, dayOfMonth: 26, startTime: '00:00', endTime: '23:59', isClosed: true}, // Boxing Day
    ],
    includedSetIds: [],
    priority: 100, // High priority - overrides regular hours
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sset-3',
    tenantId: 'tenant-1',
    name: 'Extended Hours',
    description: 'Extended weekday hours plus Saturday morning',
    rules: [
      {id: 'rule-3-1', dayOfWeek: 1, startTime: '07:00', endTime: '21:00', isClosed: false},
      {id: 'rule-3-2', dayOfWeek: 2, startTime: '07:00', endTime: '21:00', isClosed: false},
      {id: 'rule-3-3', dayOfWeek: 3, startTime: '07:00', endTime: '21:00', isClosed: false},
      {id: 'rule-3-4', dayOfWeek: 4, startTime: '07:00', endTime: '21:00', isClosed: false},
      {id: 'rule-3-5', dayOfWeek: 5, startTime: '07:00', endTime: '21:00', isClosed: false},
      {id: 'rule-3-6', dayOfWeek: 6, startTime: '09:00', endTime: '14:00', isClosed: false}, // Saturday morning
    ],
    includedSetIds: [],
    priority: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sset-4',
    tenantId: 'tenant-1',
    name: 'Full Business Schedule',
    description: 'Standard office hours with Dutch holidays',
    rules: [], // No direct rules - uses composition
    includedSetIds: ['sset-1', 'sset-2'], // Includes Standard Office Hours + Dutch Holidays
    priority: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// ============================================
// MOCK DATA - Schedule Set Assignments
// ============================================

const MOCK_SCHEDULE_SET_ASSIGNMENTS: ScheduleSetAssignment[] = [
  {
    id: 'ssa-1',
    tenantId: 'tenant-1',
    scheduleSetId: 'sset-1',
    isDefault: true, // System default
    priority: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ssa-2',
    tenantId: 'tenant-1',
    scheduleSetId: 'sset-4',
    categoryId: 'cat-1', // Meeting Rooms category
    priority: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ssa-3',
    tenantId: 'tenant-1',
    scheduleSetId: 'sset-3',
    groupId: 'group-1', // Executive Floor Rooms group
    priority: 20,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// ============================================
// MOCK DATA - Policy Assignments
// ============================================

const MOCK_POLICY_ASSIGNMENTS: PolicyAssignment[] = [
  {
    id: 'pa-1',
    tenantId: 'tenant-1',
    policyId: 'policy-1',
    isDefault: true, // System default
    priority: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// Generate mock time slots for a given date
const generateMockSlots = (resourceId: string, date: string): TimeSlot[] => {
  const slots: TimeSlot[] = []
  const baseDate = new Date(date)

  // Generate slots from 8:00 to 18:00
  for (let hour = 8; hour < 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const startTime = new Date(baseDate)
      startTime.setHours(hour, minute, 0, 0)

      const endTime = new Date(startTime)
      endTime.setMinutes(endTime.getMinutes() + 30)

      // Randomly make some slots unavailable
      const isAvailable = Math.random() > 0.3

      slots.push({
        id: `slot-${resourceId}-${hour}-${minute}`,
        startTime,
        endTime,
        isAvailable,
        bookingId: isAvailable ? undefined : `booking-${Math.random().toString(36).substr(2, 9)}`,
      })
    }
  }

  return slots
}

// Use mock data flag - set to false to use real VDX backend
const USE_MOCK_DATA = false

// ============================================
// VDX API RESOURCE MAPPING
// ============================================

/**
 * Maps frontend resource names to VDX API paths
 */
const getResourcePath = (resource: string): string => {
  switch (resource) {
    case BookingDataResource.RESOURCES:
      return 'resources'
    case BookingDataResource.CATEGORIES:
      return 'categories/resources'
    case BookingDataResource.POLICIES:
      return 'policies/usage'
    case BookingDataResource.BOOKINGS:
      return 'bookings'
    case BookingDataResource.SCHEDULES:
      // Schedules are nested within resources in VDX
      return 'resources'
    case BookingDataResource.REQUIREMENTS:
      // Requirements are nested within resources in VDX
      return 'resources'
    // New composite schedule and group resources
    case BookingDataResource.GROUPS:
      return 'groups'
    case BookingDataResource.SCHEDULE_SETS:
      return 'schedule-sets'
    case BookingDataResource.SCHEDULE_SET_ASSIGNMENTS:
      return 'schedule-sets/assignments'
    case BookingDataResource.POLICY_ASSIGNMENTS:
      return 'policies/assignments'
    default:
      throw new Error(`Unknown booking resource: ${resource}`)
  }
}

// ============================================
// MOCK DATA HELPERS
// ============================================

const getMockData = (resource: string, filters?: any[]): any[] => {
  let data: any[] = []

  switch (resource) {
    case BookingDataResource.RESOURCES:
      data = MOCK_RESOURCES
      break
    case BookingDataResource.CATEGORIES:
      data = MOCK_CATEGORIES
      break
    case BookingDataResource.POLICIES:
      data = MOCK_POLICIES
      break
    case BookingDataResource.BOOKINGS:
      data = MOCK_BOOKINGS
      break
    case BookingDataResource.GROUPS:
      data = MOCK_GROUPS
      break
    case BookingDataResource.SCHEDULE_SETS:
      data = MOCK_SCHEDULE_SETS
      break
    case BookingDataResource.SCHEDULE_SET_ASSIGNMENTS:
      data = MOCK_SCHEDULE_SET_ASSIGNMENTS
      break
    case BookingDataResource.POLICY_ASSIGNMENTS:
      data = MOCK_POLICY_ASSIGNMENTS
      break
    default:
      data = []
  }

  // Apply filters
  if (filters && filters.length > 0) {
    filters.forEach(filter => {
      if (filter.operator === 'eq' && filter.value) {
        data = data.filter((item: any) => item[filter.field] === filter.value)
      }
    })
  }

  return data
}

const getMockDataById = (resource: string, id: string): any => {
  const data = getMockData(resource)
  return data.find((item: any) => item.id === id)
}

// ============================================
// VDX RESPONSE TRANSFORMERS
// ============================================

/**
 * Transforms VDX resource response to frontend BookingResource format
 */
const transformResource = (vdxResource: any): BookingResource => {
  // Transform usage policies from VDX join table
  const usagePolicies = (vdxResource.usagePolicies || []).map(transformResourceUsagePolicy)

  // Get effective policy: first from direct policy, then from usagePolicies join table
  const directPolicy = vdxResource.usagePolicy ? transformPolicy(vdxResource.usagePolicy) : undefined
  const effectiveFromJoinTable = getEffectivePolicy(usagePolicies)
  const effectivePolicy = directPolicy || effectiveFromJoinTable

  // Transform legacy per-resource schedules
  const schedules = (vdxResource.schedules || []).map(transformSchedule)

  return {
    id: vdxResource.id,
    partyId: vdxResource.partyId,
    name: vdxResource.name,
    description: vdxResource.description,
    categoryId: vdxResource.categoryId || vdxResource.resourceCategoryId,
    category: vdxResource.category ? transformCategory(vdxResource.category) : undefined,
    imageUrl: vdxResource.imageAssetId,
    timezone: vdxResource.timezone || 'UTC',
    status: vdxResource.status || 'ACTIVE',
    capacity: vdxResource.capacity,
    requirements: (vdxResource.requirements || []).map(transformRequirement),
    schedules: schedules.length > 0 ? schedules : undefined,
    policyId: vdxResource.usagePolicyId || effectiveFromJoinTable?.id,
    policy: effectivePolicy,
    usagePolicies,
    createdAt: vdxResource.createdAt,
    updatedAt: vdxResource.updatedAt,
  }
}

/**
 * Transforms VDX category response to frontend ResourceCategory format
 */
const transformCategory = (vdxCategory: any): ResourceCategory => {
  const isActive = vdxCategory.isActive ?? true
  return {
    id: vdxCategory.id,
    tenantId: vdxCategory.tenantId,
    name: vdxCategory.name,
    slug: vdxCategory.slug,
    description: vdxCategory.description,
    iconAssetId: vdxCategory.iconAssetId,
    parentCategoryId: vdxCategory.parentCategoryId,
    isActive,
    status: isActive ? 'ACTIVE' : 'INACTIVE',
    displayOrder: vdxCategory.displayOrder ?? 0,
    createdAt: vdxCategory.createdAt,
    updatedAt: vdxCategory.updatedAt,
  }
}

/**
 * Transforms VDX policy response to frontend UsagePolicy format
 */
const transformPolicy = (vdxPolicy: any): UsagePolicy => {
  return {
    id: vdxPolicy.id,
    tenantId: vdxPolicy.tenantId,
    name: vdxPolicy.name,
    description: vdxPolicy.description,
    // Map VDX field names to frontend field names
    slotDurationMinutes: vdxPolicy.slotIntervalMinutes ?? vdxPolicy.slotDurationMinutes ?? 30,
    minDurationMinutes: vdxPolicy.minBookingDurationMinutes ?? vdxPolicy.minDurationMinutes,
    maxDurationMinutes: vdxPolicy.maxBookingDurationMinutes ?? vdxPolicy.maxDurationMinutes,
    bufferAfterMinutes: vdxPolicy.bufferAfterMinutes,
    maxAdvanceBookingDays: vdxPolicy.maxAdvanceBookingDays ?? 30,
    minAdvanceBookingHours: vdxPolicy.minAdvanceBookingHours,
    maxConcurrentBookings: vdxPolicy.concurrencyLimit ?? vdxPolicy.maxConcurrentBookings ?? 1,
    requiresApproval: vdxPolicy.requiresApproval ?? false,
    allowRecurring: vdxPolicy.allowRecurring ?? true,
    allowSameDayBooking: vdxPolicy.allowSameDayBooking ?? true,
    isDefault: vdxPolicy.isDefault ?? false,
    createdAt: vdxPolicy.createdAt,
    updatedAt: vdxPolicy.updatedAt,
  }
}

/**
 * Transforms VDX requirement response to frontend ResourceRequirement format
 */
const transformRequirement = (vdxReq: any): ResourceRequirement => {
  return {
    id: vdxReq.id,
    resourceId: vdxReq.resourceId,
    requirementCategoryId: vdxReq.requirementCategoryId,
    dcqlQuery: vdxReq.dcqlQuery,
    subIdentifier: vdxReq.subIdentifier,
    description: vdxReq.description,
    isMandatory: vdxReq.isMandatory ?? true,
    displayOrder: vdxReq.displayOrder ?? 0,
  }
}

/**
 * Transforms VDX schedule response to frontend ResourceSchedule format
 */
const transformSchedule = (vdxSchedule: any): ResourceSchedule => {
  return {
    id: vdxSchedule.id,
    resourceId: vdxSchedule.resourceId,
    dayOfWeek: vdxSchedule.dayOfWeek,
    dayOfMonth: vdxSchedule.dayOfMonth,
    month: vdxSchedule.month,
    specificDate: vdxSchedule.specificDate,
    startTime: vdxSchedule.startTime,
    endTime: vdxSchedule.endTime,
    isClosed: vdxSchedule.isClosed ?? false,
    validFrom: vdxSchedule.validFrom,
    validUntil: vdxSchedule.validUntil,
    createdAt: vdxSchedule.createdAt,
    updatedAt: vdxSchedule.updatedAt,
  }
}

/**
 * Transforms VDX resource usage policy response to frontend ResourceUsagePolicy format
 */
const transformResourceUsagePolicy = (vdxPolicy: any): ResourceUsagePolicy => {
  return {
    id: vdxPolicy.id,
    resourceId: vdxPolicy.resourceId,
    usagePolicyId: vdxPolicy.usagePolicyId,
    usagePolicy: vdxPolicy.usagePolicy ? transformPolicy(vdxPolicy.usagePolicy) : undefined,
    priority: vdxPolicy.priority ?? 0,
    concurrencyOverride: vdxPolicy.concurrencyOverride,
    effectiveFrom: vdxPolicy.effectiveFrom,
    effectiveUntil: vdxPolicy.effectiveUntil,
    createdAt: vdxPolicy.createdAt,
    updatedAt: vdxPolicy.updatedAt,
  }
}

/**
 * Gets the effective policy for a resource from its usagePolicies array.
 * Considers priority (higher wins) and date validity (effectiveFrom/effectiveUntil).
 */
const getEffectivePolicy = (usagePolicies: ResourceUsagePolicy[]): UsagePolicy | undefined => {
  if (!usagePolicies || usagePolicies.length === 0) return undefined

  const now = new Date()

  // Filter to currently valid policies
  const validPolicies = usagePolicies.filter(rup => {
    if (rup.effectiveFrom && new Date(rup.effectiveFrom) > now) return false
    if (rup.effectiveUntil && new Date(rup.effectiveUntil) < now) return false
    return true
  })

  if (validPolicies.length === 0) return undefined

  // Sort by priority (descending) and pick the highest
  const sorted = validPolicies.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
  const topPolicy = sorted[0]

  // If there's a concurrency override, apply it to the policy
  if (topPolicy.usagePolicy && topPolicy.concurrencyOverride !== undefined) {
    return {
      ...topPolicy.usagePolicy,
      maxConcurrentBookings: topPolicy.concurrencyOverride,
    }
  }

  return topPolicy.usagePolicy
}

/**
 * Transforms VDX booking response to frontend Booking format
 */
const transformBooking = (vdxBooking: any): Booking => {
  return {
    id: vdxBooking.id,
    tenantId: vdxBooking.tenantId,
    userId: vdxBooking.userId,
    delegateId: vdxBooking.bookerPartyId,
    resourceId: vdxBooking.resourceId,
    resource: vdxBooking.resource ? transformResource(vdxBooking.resource) : undefined,
    bookingType: vdxBooking.bookingType,
    title: vdxBooking.title,
    description: vdxBooking.description,
    startTime: vdxBooking.startTime,
    endTime: vdxBooking.endTime,
    status: vdxBooking.status || 'PENDING',
    proofStatus: mapVerificationStatus(vdxBooking.verificationStatus),
    headcount: vdxBooking.headcount,
    createdAt: vdxBooking.createdAt,
    updatedAt: vdxBooking.updatedAt,
  }
}

/**
 * Maps VDX verification status to frontend proof status
 */
const mapVerificationStatus = (vdxStatus: string | undefined): 'NOT_REQUIRED' | 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED' => {
  switch (vdxStatus) {
    case 'NOT_REQUIRED':
      return 'NOT_REQUIRED'
    case 'PENDING':
      return 'PENDING'
    case 'VERIFIED':
      return 'VERIFIED'
    case 'FAILED':
      return 'FAILED'
    case 'EXPIRED':
      return 'EXPIRED'
    default:
      return 'NOT_REQUIRED'
  }
}

/**
 * Transforms VDX resource group response to frontend ResourceGroup format
 */
const transformGroup = (vdxGroup: any): ResourceGroup => {
  return {
    id: vdxGroup.id,
    tenantId: vdxGroup.tenantId,
    name: vdxGroup.name,
    description: vdxGroup.description,
    categoryId: vdxGroup.categoryId,
    category: vdxGroup.category ? transformCategory(vdxGroup.category) : undefined,
    imageAssetId: vdxGroup.imageAssetId,
    status: vdxGroup.status || 'ACTIVE',
    createdAt: vdxGroup.createdAt,
    updatedAt: vdxGroup.updatedAt,
  }
}

/**
 * Transforms VDX schedule rule to frontend ScheduleRule format
 */
const transformScheduleRule = (vdxRule: any): ScheduleRule => {
  return {
    id: vdxRule.id,
    dayOfWeek: vdxRule.dayOfWeek,
    dayOfMonth: vdxRule.dayOfMonth,
    month: vdxRule.month,
    specificDate: vdxRule.specificDate,
    nthWeekday: vdxRule.nthWeekday,
    startTime: vdxRule.startTime,
    endTime: vdxRule.endTime,
    isClosed: vdxRule.isClosed ?? false,
    validFrom: vdxRule.validFrom,
    validUntil: vdxRule.validUntil,
  }
}

/**
 * Transforms VDX schedule set to frontend ScheduleSet format
 */
const transformScheduleSet = (vdxSet: any): ScheduleSet => {
  return {
    id: vdxSet.id,
    tenantId: vdxSet.tenantId,
    name: vdxSet.name,
    description: vdxSet.description,
    rules: (vdxSet.rules || []).map(transformScheduleRule),
    includedSetIds: vdxSet.includedSetIds || [],
    includedSets: vdxSet.includedSets ? vdxSet.includedSets.map(transformScheduleSet) : undefined,
    priority: vdxSet.priority ?? 10,
    createdAt: vdxSet.createdAt,
    updatedAt: vdxSet.updatedAt,
  }
}

/**
 * Transforms VDX schedule set assignment to frontend ScheduleSetAssignment format
 */
const transformScheduleSetAssignment = (vdxAssignment: any): ScheduleSetAssignment => {
  return {
    id: vdxAssignment.id,
    tenantId: vdxAssignment.tenantId,
    scheduleSetId: vdxAssignment.scheduleSetId,
    scheduleSet: vdxAssignment.scheduleSet ? transformScheduleSet(vdxAssignment.scheduleSet) : undefined,
    categoryId: vdxAssignment.categoryId,
    groupId: vdxAssignment.groupId,
    resourceId: vdxAssignment.resourceId,
    isDefault: vdxAssignment.isDefault ?? false,
    priority: vdxAssignment.priority ?? 0,
    validFrom: vdxAssignment.validFrom,
    validUntil: vdxAssignment.validUntil,
    createdAt: vdxAssignment.createdAt,
    updatedAt: vdxAssignment.updatedAt,
  }
}

/**
 * Transforms VDX policy assignment to frontend PolicyAssignment format
 */
const transformPolicyAssignment = (vdxAssignment: any): PolicyAssignment => {
  return {
    id: vdxAssignment.id,
    tenantId: vdxAssignment.tenantId,
    policyId: vdxAssignment.policyId,
    policy: vdxAssignment.policy ? transformPolicy(vdxAssignment.policy) : undefined,
    categoryId: vdxAssignment.categoryId,
    groupId: vdxAssignment.groupId,
    resourceId: vdxAssignment.resourceId,
    isDefault: vdxAssignment.isDefault ?? false,
    priority: vdxAssignment.priority ?? 0,
    validFrom: vdxAssignment.validFrom,
    validUntil: vdxAssignment.validUntil,
    createdAt: vdxAssignment.createdAt,
    updatedAt: vdxAssignment.updatedAt,
  }
}

/**
 * Transforms response based on resource type
 */
const transformResponse = (resource: string, data: any): any => {
  switch (resource) {
    case BookingDataResource.RESOURCES:
      return transformResource(data)
    case BookingDataResource.CATEGORIES:
      return transformCategory(data)
    case BookingDataResource.POLICIES:
      return transformPolicy(data)
    case BookingDataResource.BOOKINGS:
      return transformBooking(data)
    case BookingDataResource.SCHEDULES:
      return transformSchedule(data)
    case BookingDataResource.REQUIREMENTS:
      return transformRequirement(data)
    case BookingDataResource.GROUPS:
      return transformGroup(data)
    case BookingDataResource.SCHEDULE_SETS:
      return transformScheduleSet(data)
    case BookingDataResource.SCHEDULE_SET_ASSIGNMENTS:
      return transformScheduleSetAssignment(data)
    case BookingDataResource.POLICY_ASSIGNMENTS:
      return transformPolicyAssignment(data)
    default:
      return data
  }
}

// ============================================
// DATA PROVIDER
// ============================================

export const bookingDataProvider = (): DataProvider => ({
  getList: async <TData extends BaseRecord = BaseRecord>({resource, pagination, filters, sorters}: GetListParams): Promise<GetListResponse<TData>> => {
    // Use mock data if enabled
    if (USE_MOCK_DATA) {
      const data = getMockData(resource, filters)
      return {
        data: data as TData[],
        total: data.length,
      }
    }

    // Handle nested resources (schedules and requirements are inside resources)
    if (resource === BookingDataResource.SCHEDULES || resource === BookingDataResource.REQUIREMENTS) {
      return handleNestedResourceList(resource, filters) as Promise<GetListResponse<TData>>
    }

    const resourcePath = getResourcePath(resource)
    const url = new URL(`${getVdxApiUrl()}/${resourcePath}`)

    // VDX uses page (0-indexed) and size for pagination
    if (pagination) {
      const size = pagination.pageSize || 20
      const page = (pagination.current || 1) - 1 // Convert 1-indexed to 0-indexed
      url.searchParams.set('page', String(page))
      url.searchParams.set('size', String(size))
    }

    // Apply filters as query parameters
    filters?.forEach(filter => {
      if (filter.operator === 'eq' && filter.value !== undefined && filter.value !== null && filter.value !== '') {
        // Map frontend filter field names to VDX field names
        const fieldName = mapFilterField(resource, filter.field)
        url.searchParams.set(fieldName, String(filter.value))
      } else if (filter.operator === 'contains' && filter.value) {
        url.searchParams.set('name', String(filter.value)) // VDX uses 'name' for text search
      }
    })

    // Apply sorting
    if (sorters && sorters.length > 0) {
      const sortFields = sorters.map(s => (s.order === 'desc' ? `-${s.field}` : s.field))
      url.searchParams.set('sort', sortFields.join(','))
    }

    const response = await fetch(url.toString(), {
      credentials: 'include',
      headers: getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch ${resource}: ${response.statusText}`)
    }

    const responseData = await response.json()

    // VDX returns { items: [], page: { totalElements, ... } }
    // (older comment said data/pagination but VDX uses items/page)
    const items = responseData.items || responseData.data || []
    const total = responseData.page?.totalElements ?? responseData.pagination?.totalElements ?? items.length

    // Transform each item to frontend format
    const transformedItems = items.map((item: any) => transformResponse(resource, item))

    return {
      data: transformedItems as TData[],
      total: total,
    }
  },

  getOne: async <TData extends BaseRecord = BaseRecord>({resource, id}: GetOneParams): Promise<GetOneResponse<TData>> => {
    // Use mock data if enabled
    if (USE_MOCK_DATA) {
      const data = getMockDataById(resource, id as string)
      return {data: data as TData}
    }

    // Handle nested resources
    if (resource === BookingDataResource.SCHEDULES || resource === BookingDataResource.REQUIREMENTS) {
      return handleNestedResourceGetOne(resource, id as string) as Promise<GetOneResponse<TData>>
    }

    const resourcePath = getResourcePath(resource)

    const response = await fetch(`${getVdxApiUrl()}/${resourcePath}/${id}`, {
      credentials: 'include',
      headers: getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch ${resource}/${id}: ${response.statusText}`)
    }

    const data = await response.json()
    const transformedData = transformResponse(resource, data)

    return {data: transformedData as TData}
  },

  create: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({resource, variables}: CreateParams<TVariables>): Promise<CreateResponse<TData>> => {
    // Use mock data if enabled
    if (USE_MOCK_DATA) {
      const newItem = {
        id: `mock-${Date.now()}`,
        ...variables,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      return {data: newItem as unknown as TData}
    }

    // Handle nested resources
    if (resource === BookingDataResource.SCHEDULES || resource === BookingDataResource.REQUIREMENTS) {
      return handleNestedResourceCreate(resource, variables) as Promise<CreateResponse<TData>>
    }

    const resourcePath = getResourcePath(resource)

    // Transform variables to VDX format
    const requestBody = transformToVdxFormat(resource, variables)

    console.log('[BookingDataProvider] POST request:', {
      url: `${getVdxApiUrl()}/${resourcePath}`,
      variables: JSON.parse(JSON.stringify(variables)),
      requestBody: JSON.parse(JSON.stringify(requestBody)),
    })

    const response = await fetch(`${getVdxApiUrl()}/${resourcePath}`, {
      method: 'POST',
      credentials: 'include',
      headers: getHeaders(true),
      body: JSON.stringify(requestBody),
    })

    const responseText = await response.text()
    console.log('[BookingDataProvider] POST response:', {
      status: response.status,
      ok: response.ok,
      body: responseText,
    })

    if (!response.ok) {
      throw new Error(`Failed to create ${resource}: ${responseText}`)
    }

    const data = responseText ? JSON.parse(responseText) : {}
    const transformedData = transformResponse(resource, data)

    return {data: transformedData as TData}
  },

  update: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({resource, id, variables}: UpdateParams<TVariables>): Promise<UpdateResponse<TData>> => {
    // Use mock data if enabled
    if (USE_MOCK_DATA) {
      const updatedItem = {
        id,
        ...variables,
        updatedAt: new Date().toISOString(),
      }
      return {data: updatedItem as unknown as TData}
    }

    // Handle nested resources
    if (resource === BookingDataResource.SCHEDULES || resource === BookingDataResource.REQUIREMENTS) {
      return handleNestedResourceUpdate(resource, id as string, variables) as Promise<UpdateResponse<TData>>
    }

    const resourcePath = getResourcePath(resource)

    // Transform variables to VDX format
    const requestBody = transformToVdxFormat(resource, variables)

    console.log('[BookingDataProvider] PATCH request:', {
      url: `${getVdxApiUrl()}/${resourcePath}/${id}`,
      variables: JSON.parse(JSON.stringify(variables)), // Deep copy for logging
      requestBody: JSON.parse(JSON.stringify(requestBody)), // Deep copy for logging
    })

    // VDX uses PATCH for partial updates
    const response = await fetch(`${getVdxApiUrl()}/${resourcePath}/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: getHeaders(true),
      body: JSON.stringify(requestBody),
    })

    const responseText = await response.text()
    console.log('[BookingDataProvider] PATCH response:', {
      status: response.status,
      ok: response.ok,
      body: responseText,
    })

    if (!response.ok) {
      throw new Error(`Failed to update ${resource}/${id}: ${responseText}`)
    }

    const data = responseText ? JSON.parse(responseText) : {}
    const transformedData = transformResponse(resource, data)

    return {data: transformedData as TData}
  },

  deleteOne: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({resource, id}: DeleteOneParams<TVariables>): Promise<DeleteOneResponse<TData>> => {
    // Use mock data if enabled
    if (USE_MOCK_DATA) {
      return {data: {id} as unknown as TData}
    }

    // Handle nested resources
    if (resource === BookingDataResource.SCHEDULES || resource === BookingDataResource.REQUIREMENTS) {
      return handleNestedResourceDelete(resource, id as string) as Promise<DeleteOneResponse<TData>>
    }

    const resourcePath = getResourcePath(resource)

    const response = await fetch(`${getVdxApiUrl()}/${resourcePath}/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to delete ${resource}/${id}: ${response.statusText}`)
    }

    return {data: {id} as unknown as TData}
  },

  deleteMany: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({resource, ids}: DeleteManyParams<TVariables>): Promise<DeleteManyResponse<TData>> => {
    // Use mock data if enabled
    if (USE_MOCK_DATA) {
      return {
        data: ids.map(id => ({id})) as unknown as TData[],
      }
    }

    const resourcePath = getResourcePath(resource)

    // Delete each item individually
    await Promise.all(
      ids.map(id =>
        fetch(`${getVdxApiUrl()}/${resourcePath}/${id}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: getHeaders(),
        }),
      ),
    )

    return {
      data: ids.map(id => ({id})) as unknown as TData[],
    }
  },

  getApiUrl: (): string => {
    return getVdxApiUrl()
  },
})

// ============================================
// NESTED RESOURCE HANDLERS
// VDX stores schedules and requirements inside resources
// ============================================

/**
 * Handles listing nested resources (schedules/requirements) from parent resource
 */
async function handleNestedResourceList(resource: string, filters?: any[]): Promise<GetListResponse<any>> {
  // Find resourceId from filters
  const resourceIdFilter = filters?.find(f => f.field === 'resourceId')
  const resourceId = resourceIdFilter?.value

  if (!resourceId) {
    // No resourceId filter - fetch all resources and combine their nested items
    const allResourcesResponse = await fetch(`${getVdxApiUrl()}/resources?page=0&size=1000`, {
      credentials: 'include',
      headers: getHeaders(),
    })

    if (!allResourcesResponse.ok) {
      throw new Error('Failed to fetch all resources')
    }

    const allResourcesData = await allResourcesResponse.json()
    const allResources = allResourcesData.items || allResourcesData.data || []

    if (resource === BookingDataResource.SCHEDULES) {
      const allSchedules: any[] = []
      for (const res of allResources) {
        const schedules = (res.schedules || []).map((s: any) => ({
          ...transformSchedule(s),
          resourceId: res.id, // Ensure resourceId is set
        }))
        allSchedules.push(...schedules)
      }
      return {data: allSchedules, total: allSchedules.length}
    } else if (resource === BookingDataResource.REQUIREMENTS) {
      const allRequirements: any[] = []
      for (const res of allResources) {
        const requirements = (res.requirements || []).map((r: any) => ({
          ...transformRequirement(r),
          resourceId: res.id,
        }))
        allRequirements.push(...requirements)
      }
      return {data: allRequirements, total: allRequirements.length}
    }

    return {data: [], total: 0}
  }

  // Fetch the parent resource by ID
  const response = await fetch(`${getVdxApiUrl()}/resources/${resourceId}`, {
    credentials: 'include',
    headers: getHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch resource ${resourceId}`)
  }

  const resourceData = await response.json()

  if (resource === BookingDataResource.SCHEDULES) {
    const schedules = (resourceData.schedules || []).map((s: any) => ({
      ...transformSchedule(s),
      resourceId: resourceData.id,
    }))
    return {data: schedules, total: schedules.length}
  } else if (resource === BookingDataResource.REQUIREMENTS) {
    const requirements = (resourceData.requirements || []).map((r: any) => ({
      ...transformRequirement(r),
      resourceId: resourceData.id,
    }))
    return {data: requirements, total: requirements.length}
  }

  return {data: [], total: 0}
}

/**
 * Handles getting a single nested resource
 */
async function handleNestedResourceGetOne(resource: string, id: string): Promise<GetOneResponse<any>> {
  // We need to find the parent resource first
  // This is a limitation - we'd need the resourceId to fetch
  // For now, throw an error suggesting to use getList with resourceId filter
  throw new Error(`Cannot get single ${resource} without resourceId. Use getList with resourceId filter.`)
}

/**
 * Handles creating a nested resource by updating the parent
 */
async function handleNestedResourceCreate(resource: string, variables: any): Promise<CreateResponse<any>> {
  const {resourceId, ...itemData} = variables as any

  if (!resourceId) {
    throw new Error(`resourceId is required to create ${resource}`)
  }

  // Fetch current resource
  const getResponse = await fetch(`${getVdxApiUrl()}/resources/${resourceId}`, {
    credentials: 'include',
    headers: getHeaders(),
  })

  if (!getResponse.ok) {
    throw new Error(`Failed to fetch resource ${resourceId}`)
  }

  const resourceData = await getResponse.json()

  // Add new item with generated ID
  const newId = crypto.randomUUID()
  const newItem = {id: newId, resourceId, ...itemData}

  let updatePayload: any = {}

  if (resource === BookingDataResource.SCHEDULES) {
    const currentSchedules = resourceData.schedules || []
    updatePayload = {schedules: [...currentSchedules, newItem]}
  } else if (resource === BookingDataResource.REQUIREMENTS) {
    const currentRequirements = resourceData.requirements || []
    updatePayload = {requirements: [...currentRequirements, newItem]}
  }

  // PATCH the parent resource
  const patchResponse = await fetch(`${getVdxApiUrl()}/resources/${resourceId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: getHeaders(true),
    body: JSON.stringify(updatePayload),
  })

  if (!patchResponse.ok) {
    const errorText = await patchResponse.text()
    throw new Error(`Failed to create ${resource}: ${errorText}`)
  }

  return {data: newItem}
}

/**
 * Handles updating a nested resource by updating the parent
 */
async function handleNestedResourceUpdate(resource: string, id: string, variables: any): Promise<UpdateResponse<any>> {
  const {resourceId, ...itemData} = variables as any

  if (!resourceId) {
    throw new Error(`resourceId is required to update ${resource}`)
  }

  // Fetch current resource
  const getResponse = await fetch(`${getVdxApiUrl()}/resources/${resourceId}`, {
    credentials: 'include',
    headers: getHeaders(),
  })

  if (!getResponse.ok) {
    throw new Error(`Failed to fetch resource ${resourceId}`)
  }

  const resourceData = await getResponse.json()

  let updatePayload: any = {}
  let updatedItem: any = null

  if (resource === BookingDataResource.SCHEDULES) {
    const currentSchedules = resourceData.schedules || []
    const updatedSchedules = currentSchedules.map((s: any) => {
      if (s.id === id) {
        updatedItem = {...s, ...itemData}
        return updatedItem
      }
      return s
    })
    updatePayload = {schedules: updatedSchedules}
  } else if (resource === BookingDataResource.REQUIREMENTS) {
    const currentRequirements = resourceData.requirements || []
    const updatedRequirements = currentRequirements.map((r: any) => {
      if (r.id === id) {
        updatedItem = {...r, ...itemData}
        return updatedItem
      }
      return r
    })
    updatePayload = {requirements: updatedRequirements}
  }

  if (!updatedItem) {
    throw new Error(`${resource} with id ${id} not found`)
  }

  // PATCH the parent resource
  const patchResponse = await fetch(`${getVdxApiUrl()}/resources/${resourceId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: getHeaders(true),
    body: JSON.stringify(updatePayload),
  })

  if (!patchResponse.ok) {
    const errorText = await patchResponse.text()
    throw new Error(`Failed to update ${resource}: ${errorText}`)
  }

  return {data: updatedItem}
}

/**
 * Handles deleting a nested resource by updating the parent
 */
async function handleNestedResourceDelete(resource: string, id: string): Promise<DeleteOneResponse<any>> {
  // For deletion, we need to know the resourceId
  // This is tricky - we might need to store/pass this somehow
  // For now, we'll throw an error suggesting alternative approach
  throw new Error(`Cannot delete ${resource} without resourceId. Use update on parent resource.`)
}

// ============================================
// FIELD MAPPING HELPERS
// ============================================

/**
 * Maps frontend filter field names to VDX API field names
 */
const mapFilterField = (resource: string, field: string): string => {
  const mappings: Record<string, Record<string, string>> = {
    [BookingDataResource.RESOURCES]: {
      categoryId: 'categoryId',
      groupId: 'groupId',
      status: 'status',
      partyId: 'partyId',
    },
    [BookingDataResource.CATEGORIES]: {
      isActive: 'isActive',
      name: 'name',
    },
    [BookingDataResource.POLICIES]: {
      isDefault: 'isDefault',
    },
    [BookingDataResource.BOOKINGS]: {
      resourceId: 'resourceId',
      userId: 'userId',
      status: 'status',
    },
    [BookingDataResource.GROUPS]: {
      categoryId: 'categoryId',
      status: 'status',
    },
    [BookingDataResource.SCHEDULE_SETS]: {
      name: 'name',
    },
    [BookingDataResource.SCHEDULE_SET_ASSIGNMENTS]: {
      scheduleSetId: 'scheduleSetId',
      categoryId: 'categoryId',
      groupId: 'groupId',
      resourceId: 'resourceId',
      isDefault: 'isDefault',
    },
    [BookingDataResource.POLICY_ASSIGNMENTS]: {
      policyId: 'policyId',
      categoryId: 'categoryId',
      groupId: 'groupId',
      resourceId: 'resourceId',
      isDefault: 'isDefault',
    },
  }

  return mappings[resource]?.[field] || field
}

/**
 * Transforms frontend request data to VDX API format
 */
const transformToVdxFormat = (resource: string, data: any): any => {
  switch (resource) {
    case BookingDataResource.RESOURCES:
      // VDX CreateResourceRequest expects: partyId, name, description, categoryId, timezone, status, capacity
      // Also supports: usagePolicyId, requirements, groupId
      return {
        partyId: data.partyId,
        name: data.name,
        description: data.description,
        categoryId: data.categoryId, // VDX expects categoryId, not resourceCategoryId
        groupId: data.groupId,
        timezone: data.timezone,
        status: data.status,
        capacity: data.capacity,
        usagePolicyId: data.policyId || undefined, // Map frontend policyId to VDX usagePolicyId
        requirements: data.requirements || undefined, // Include requirements if provided
        imageAssetId: data.imageUrl || undefined, // Map imageUrl to imageAssetId
      }
    case BookingDataResource.CATEGORIES:
      return {
        name: data.name,
        slug: data.slug,
        description: data.description,
        parentCategoryId: data.parentCategoryId,
        iconAssetId: data.iconAssetId,
        isActive: data.isActive,
        displayOrder: data.displayOrder,
      }
    case BookingDataResource.POLICIES:
      // Map frontend field names to VDX field names
      return {
        name: data.name,
        description: data.description,
        // Map frontend slotDurationMinutes -> VDX slotIntervalMinutes
        slotIntervalMinutes: data.slotDurationMinutes ?? data.slotIntervalMinutes,
        // Map frontend minDurationMinutes -> VDX minBookingDurationMinutes
        minBookingDurationMinutes: data.minDurationMinutes ?? data.minBookingDurationMinutes,
        // Map frontend maxDurationMinutes -> VDX maxBookingDurationMinutes
        maxBookingDurationMinutes: data.maxDurationMinutes ?? data.maxBookingDurationMinutes,
        bufferAfterMinutes: data.bufferAfterMinutes,
        maxAdvanceBookingDays: data.maxAdvanceBookingDays,
        // Map frontend minAdvanceBookingHours -> VDX minAdvanceBookingHours
        minAdvanceBookingHours: data.minAdvanceBookingHours,
        // Map frontend maxConcurrentBookings -> VDX concurrencyLimit
        concurrencyLimit: data.maxConcurrentBookings ?? data.concurrencyLimit,
        requiresApproval: data.requiresApproval,
        allowRecurring: data.allowRecurring,
        allowSameDayBooking: data.allowSameDayBooking,
        isDefault: data.isDefault,
      }
    case BookingDataResource.BOOKINGS:
      return {
        resourceId: data.resourceId,
        userId: data.userId,
        bookerPartyId: data.delegateId,
        bookingType: data.bookingType,
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        status: data.status,
        headcount: data.headcount,
      }
    case BookingDataResource.GROUPS:
      return {
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        imageAssetId: data.imageAssetId,
        status: data.status,
      }
    case BookingDataResource.SCHEDULE_SETS:
      // Normalize rules - VDX requires startTime/endTime, use 00:00-23:59 for all-day
      const normalizedRules = (data.rules || []).map((rule: any) => {
        const normalized: any = {
          isClosed: rule.isClosed,
          // VDX requires startTime/endTime - default to full day if not provided
          startTime: rule.startTime || '00:00',
          endTime: rule.endTime || '23:59',
        }
        // Only include date pattern fields that are set
        if (rule.dayOfWeek !== undefined) normalized.dayOfWeek = rule.dayOfWeek
        if (rule.dayOfMonth !== undefined) normalized.dayOfMonth = rule.dayOfMonth
        if (rule.month !== undefined && rule.month !== null) normalized.month = rule.month
        if (rule.specificDate) normalized.specificDate = rule.specificDate
        if (rule.nthWeekday !== undefined) normalized.nthWeekday = rule.nthWeekday
        // Include validity window if set
        if (rule.validFrom) normalized.validFrom = rule.validFrom
        if (rule.validUntil) normalized.validUntil = rule.validUntil
        return normalized
      })
      return {
        name: data.name,
        description: data.description,
        rules: normalizedRules,
        includedSetIds: data.includedSetIds,
        priority: data.priority,
      }
    case BookingDataResource.SCHEDULE_SET_ASSIGNMENTS:
      return {
        scheduleSetId: data.scheduleSetId,
        categoryId: data.categoryId,
        groupId: data.groupId,
        resourceId: data.resourceId,
        isDefault: data.isDefault,
        priority: data.priority,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
      }
    case BookingDataResource.POLICY_ASSIGNMENTS:
      return {
        policyId: data.policyId,
        categoryId: data.categoryId,
        groupId: data.groupId,
        resourceId: data.resourceId,
        isDefault: data.isDefault,
        priority: data.priority,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
      }
    default:
      return data
  }
}

// ============================================
// CUSTOM BOOKING SERVICE FUNCTIONS
// For non-CRUD operations
// ============================================

// ============================================
// INHERITANCE RESOLUTION HELPERS
// ============================================

/**
 * Gets the inheritance level priority for sorting
 * Higher values = more specific = wins over lower
 */
const getInheritanceLevelPriority = (assignment: ScheduleSetAssignment | PolicyAssignment): number => {
  if (assignment.resourceId) return 4
  if (assignment.groupId) return 3
  if (assignment.categoryId) return 2
  if (assignment.isDefault) return 1
  return 0
}

/**
 * Checks if an assignment is currently valid based on validFrom/validUntil dates
 */
const isAssignmentValid = (assignment: ScheduleSetAssignment | PolicyAssignment): boolean => {
  const now = new Date()
  if (assignment.validFrom && new Date(assignment.validFrom) > now) return false
  if (assignment.validUntil && new Date(assignment.validUntil) < now) return false
  return true
}

/**
 * Gets the inheritance level name from an assignment
 */
const getInheritanceLevel = (assignment: ScheduleSetAssignment | PolicyAssignment): InheritanceLevel => {
  if (assignment.resourceId) return 'resource'
  if (assignment.groupId) return 'group'
  if (assignment.categoryId) return 'category'
  return 'default'
}

export const bookingService = {
  /**
   * Resolves the effective schedule sets for a resource, considering inheritance
   * Returns schedules sorted by specificity (most specific first)
   */
  async resolveEffectiveSchedules(
    resourceId: string,
    groupId?: string,
    categoryId?: string,
  ): Promise<EffectiveSchedule[]> {
    // Use mock data if enabled
    if (USE_MOCK_DATA) {
      // Filter assignments relevant to this resource
      const relevantAssignments = MOCK_SCHEDULE_SET_ASSIGNMENTS.filter(a => {
        if (!isAssignmentValid(a)) return false
        if (a.resourceId && a.resourceId === resourceId) return true
        if (a.groupId && a.groupId === groupId) return true
        if (a.categoryId && a.categoryId === categoryId) return true
        if (a.isDefault) return true
        return false
      })

      // Sort by inheritance level (resource > group > category > default)
      // Within same level, sort by priority (higher first)
      relevantAssignments.sort((a, b) => {
        const levelA = getInheritanceLevelPriority(a)
        const levelB = getInheritanceLevelPriority(b)
        if (levelA !== levelB) return levelB - levelA
        return (b.priority ?? 0) - (a.priority ?? 0)
      })

      // Map to EffectiveSchedule format
      const effectiveSchedules: EffectiveSchedule[] = relevantAssignments.map(assignment => {
        const scheduleSet = MOCK_SCHEDULE_SETS.find(s => s.id === assignment.scheduleSetId)
        if (!scheduleSet) return null

        let sourceName = 'System Default'
        let sourceId: string | undefined
        if (assignment.resourceId) {
          sourceName = 'Resource Override'
          sourceId = assignment.resourceId
        } else if (assignment.groupId) {
          const group = MOCK_GROUPS.find(g => g.id === assignment.groupId)
          sourceName = group?.name || 'Group'
          sourceId = assignment.groupId
        } else if (assignment.categoryId) {
          const category = MOCK_CATEGORIES.find(c => c.id === assignment.categoryId)
          sourceName = category?.name || 'Category'
          sourceId = assignment.categoryId
        }

        const result: EffectiveSchedule = {
          scheduleSet,
          sourceLevel: getInheritanceLevel(assignment),
          sourceName,
        }
        if (sourceId) result.sourceId = sourceId
        return result
      }).filter((s): s is EffectiveSchedule => s !== null)

      return effectiveSchedules
    }

    // VDX API call
    const params = new URLSearchParams()
    params.set('resourceId', resourceId)
    if (groupId) params.set('groupId', groupId)
    if (categoryId) params.set('categoryId', categoryId)
    params.set('includeDefault', 'true')

    const response = await fetch(`${getVdxApiUrl()}/schedule-sets/assignments/resolve?${params.toString()}`, {
      credentials: 'include',
      headers: getHeaders(),
    })

    if (!response.ok) {
      console.warn(`Failed to resolve schedules from VDX, falling back to manual resolution`)
      return []
    }

    const data = await response.json()
    return (data.schedules || []).map((s: any) => ({
      scheduleSet: transformScheduleSet(s.scheduleSet),
      sourceLevel: s.sourceLevel as InheritanceLevel,
      sourceId: s.sourceId,
      sourceName: s.sourceName,
    }))
  },

  /**
   * Resolves the effective policy for a resource, considering inheritance
   * Returns the most specific policy that applies
   */
  async resolveEffectivePolicy(
    resourceId: string,
    groupId?: string,
    categoryId?: string,
  ): Promise<EffectivePolicy | undefined> {
    // Use mock data if enabled
    if (USE_MOCK_DATA) {
      // Filter assignments relevant to this resource
      const relevantAssignments = MOCK_POLICY_ASSIGNMENTS.filter(a => {
        if (!isAssignmentValid(a)) return false
        if (a.resourceId && a.resourceId === resourceId) return true
        if (a.groupId && a.groupId === groupId) return true
        if (a.categoryId && a.categoryId === categoryId) return true
        if (a.isDefault) return true
        return false
      })

      if (relevantAssignments.length === 0) return undefined

      // Sort by inheritance level (resource > group > category > default)
      // Within same level, sort by priority (higher first)
      relevantAssignments.sort((a, b) => {
        const levelA = getInheritanceLevelPriority(a)
        const levelB = getInheritanceLevelPriority(b)
        if (levelA !== levelB) return levelB - levelA
        return (b.priority ?? 0) - (a.priority ?? 0)
      })

      // Get the most specific assignment
      const topAssignment = relevantAssignments[0]
      const policy = MOCK_POLICIES.find(p => p.id === topAssignment.policyId)
      if (!policy) return undefined

      let sourceName = 'System Default'
      if (topAssignment.resourceId) sourceName = 'Resource Override'
      else if (topAssignment.groupId) {
        const group = MOCK_GROUPS.find(g => g.id === topAssignment.groupId)
        sourceName = group?.name || 'Group'
      } else if (topAssignment.categoryId) {
        const category = MOCK_CATEGORIES.find(c => c.id === topAssignment.categoryId)
        sourceName = category?.name || 'Category'
      }

      return {
        policy,
        sourceLevel: getInheritanceLevel(topAssignment),
        sourceId: topAssignment.resourceId || topAssignment.groupId || topAssignment.categoryId,
        sourceName,
      }
    }

    // VDX API call
    const params = new URLSearchParams()
    params.set('resourceId', resourceId)
    if (groupId) params.set('groupId', groupId)
    if (categoryId) params.set('categoryId', categoryId)
    params.set('includeDefault', 'true')

    const response = await fetch(`${getVdxApiUrl()}/policies/assignments/resolve?${params.toString()}`, {
      credentials: 'include',
      headers: getHeaders(),
    })

    if (!response.ok) {
      console.warn(`Failed to resolve policy from VDX, falling back to manual resolution`)
      return undefined
    }

    const data = await response.json()
    if (!data.policy) return undefined

    return {
      policy: transformPolicy(data.policy),
      sourceLevel: data.sourceLevel as InheritanceLevel,
      sourceId: data.sourceId,
      sourceName: data.sourceName,
    }
  },

  /**
   * Flattens a schedule set by resolving all included sets recursively
   * Rules from higher-priority sets override lower-priority
   */
  async flattenScheduleSet(scheduleSetId: string, visited: Set<string> = new Set()): Promise<FlattenedScheduleRules> {
    // Prevent circular references
    if (visited.has(scheduleSetId)) {
      return {rules: [], sources: []}
    }
    visited.add(scheduleSetId)

    // Use mock data if enabled
    if (USE_MOCK_DATA) {
      const scheduleSet = MOCK_SCHEDULE_SETS.find(s => s.id === scheduleSetId)
      if (!scheduleSet) {
        return {rules: [], sources: []}
      }

      const allRules: ScheduleRule[] = []
      const sources: FlattenedScheduleRules['sources'] = []

      // First, recursively flatten included sets (lower priority)
      for (const includedId of scheduleSet.includedSetIds) {
        const includedFlattened = await this.flattenScheduleSet(includedId, visited)
        allRules.push(...includedFlattened.rules)
        sources.push(...includedFlattened.sources)
      }

      // Then add direct rules from this set (higher priority - added last)
      allRules.push(...scheduleSet.rules)
      sources.push({
        setId: scheduleSet.id,
        setName: scheduleSet.name,
        priority: scheduleSet.priority,
      })

      return {rules: allRules, sources}
    }

    // VDX API call
    const response = await fetch(`${getVdxApiUrl()}/schedule-sets/${scheduleSetId}/flatten`, {
      credentials: 'include',
      headers: getHeaders(),
    })

    if (!response.ok) {
      console.warn(`Failed to flatten schedule set ${scheduleSetId}`)
      return {rules: [], sources: []}
    }

    const data = await response.json()
    return {
      rules: (data.rules || []).map(transformScheduleRule),
      sources: data.sources || [],
    }
  },

  async getResourceAvailability(resourceId: string, date: string): Promise<{resourceId: string; date: string; timezone?: string; slots: TimeSlot[]}> {
    // Use mock data if enabled
    if (USE_MOCK_DATA) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500))
      return {
        resourceId,
        date,
        slots: generateMockSlots(resourceId, date),
      }
    }

    // Try to use VDX availability endpoint first
    try {
      const availabilityResponse = await fetch(`${getVdxApiUrl()}/resources/${resourceId}/availability?date=${date}`, {
        credentials: 'include',
        headers: getHeaders(),
      })

      if (availabilityResponse.ok) {
        const availabilityData = await availabilityResponse.json()
        // VDX returns: { resourceId, date, timezone, slots: [{ startTime, endTime, isAvailable, bookingId? }] }
        const transformedSlots: TimeSlot[] = (availabilityData.slots || []).map((slot: any, index: number) => ({
          id: `slot-${resourceId}-${date}-${index}`,
          startTime: new Date(`${date}T${slot.startTime}`),
          endTime: new Date(`${date}T${slot.endTime}`),
          isAvailable: slot.isAvailable,
          bookingId: slot.bookingId,
        }))

        return {
          resourceId,
          date,
          timezone: availabilityData.timezone,
          slots: transformedSlots,
        }
      }

      // If availability endpoint returns 404 or error, fall back to local calculation
      console.warn(`[Booking] Availability endpoint not available for resource ${resourceId}, falling back to local calculation`)
    } catch (error) {
      console.warn(`[Booking] Error calling availability endpoint, falling back to local calculation:`, error)
    }

    // Fallback: Calculate slots locally from resource schedules and existing bookings
    const [resourceResponse, bookingsResponse, policiesResponse] = await Promise.all([
      fetch(`${getVdxApiUrl()}/resources/${resourceId}`, {
        credentials: 'include',
        headers: getHeaders(),
      }),
      fetch(`${getVdxApiUrl()}/bookings?resourceId=${resourceId}&startDate=${date}&endDate=${date}`, {
        credentials: 'include',
        headers: getHeaders(),
      }),
      fetch(`${getVdxApiUrl()}/policies/usage?isDefault=true&page=0&size=1`, {
        credentials: 'include',
        headers: getHeaders(),
      }),
    ])

    if (!resourceResponse.ok) {
      throw new Error(`Failed to fetch resource: ${resourceResponse.statusText}`)
    }

    const resource = await resourceResponse.json()
    const bookingsData = bookingsResponse.ok ? await bookingsResponse.json() : {items: []}
    const existingBookings: Booking[] = (bookingsData.items || []).map(transformBooking)

    // Get effective policy: use resource's policy, or fall back to default policy
    let effectivePolicy = resource.usagePolicy
    if (!effectivePolicy && policiesResponse.ok) {
      const policiesData = await policiesResponse.json()
      const defaultPolicy = (policiesData.data || policiesData.items || []).find((p: any) => p.isDefault)
      effectivePolicy = defaultPolicy ? transformPolicy(defaultPolicy) : undefined
    }

    // Fetch schedule rules - try multiple sources in order of preference:
    // 1. ScheduleSet assignments (new composite schedule system)
    // 2. Legacy per-resource schedules (from resource.schedules)
    // 3. Default schedule (weekdays 9-17) - handled by slot generation function
    let allRules: any[] = []

    // First, try to use legacy per-resource schedules if available
    if (resource.schedules && resource.schedules.length > 0) {
      console.log('[Booking] Using legacy per-resource schedules:', resource.schedules.length, 'rules')
      allRules = resource.schedules
    } else {
      // No legacy schedules - try ScheduleSet assignments
      try {
        // Try to resolve effective schedules via VDX API
        const params = new URLSearchParams()
        params.set('resourceId', resourceId)
        if (resource.groupId) params.set('groupId', resource.groupId)
        if (resource.categoryId || resource.resourceCategoryId) {
          params.set('categoryId', resource.categoryId || resource.resourceCategoryId)
        }
        params.set('includeDefault', 'true')

        const scheduleResponse = await fetch(`${getVdxApiUrl()}/schedule-sets/assignments/resolve?${params.toString()}`, {
          credentials: 'include',
          headers: getHeaders(),
        })

        if (scheduleResponse.ok) {
          const scheduleData = await scheduleResponse.json()
          const effectiveSchedules = scheduleData.schedules || []

          // Flatten all schedule sets and collect all rules
          for (const effective of effectiveSchedules) {
            const scheduleSet = effective.scheduleSet
            if (scheduleSet?.rules) {
              allRules.push(...scheduleSet.rules)
            }
          }
        } else {
          // Fallback: Try to fetch schedule set assignments directly
          const assignmentsResponse = await fetch(
            `${getVdxApiUrl()}/schedule-sets/assignments?resourceId=${resourceId}`,
            {credentials: 'include', headers: getHeaders()},
          )

          if (assignmentsResponse.ok) {
            const assignmentsData = await assignmentsResponse.json()
            const assignments = assignmentsData.data || assignmentsData.items || []

            // For each assignment, fetch the schedule set with rules
            for (const assignment of assignments) {
              if (assignment.scheduleSetId) {
                const setResponse = await fetch(`${getVdxApiUrl()}/schedule-sets/${assignment.scheduleSetId}`, {
                  credentials: 'include',
                  headers: getHeaders(),
                })
                if (setResponse.ok) {
                  const scheduleSet = await setResponse.json()
                  if (scheduleSet.rules) {
                    allRules.push(...scheduleSet.rules)
                  }
                }
              }
            }
          }
        }

        if (allRules.length > 0) {
          console.log('[Booking] Using ScheduleSet rules:', allRules.length, 'rules')
        }
      } catch (err) {
        console.warn('[Booking] Failed to fetch schedule sets:', err)
      }
    }

    // If no rules found, the slot generation function will use default schedule (weekdays 9-17)
    if (allRules.length === 0) {
      console.log('[Booking] No schedules found, using default weekday schedule')
    }

    // Generate slots based on schedule rules and check against existing bookings
    const slots = generateSlotsFromSchedulesWithConflicts(resourceId, date, allRules, existingBookings, effectivePolicy)

    return {
      resourceId,
      date,
      timezone: resource.timezone,
      slots,
    }
  },

  async startVerification(resourceId: string, bookingId?: string): Promise<{verificationId: string; qrUri: string; deeplink: string}> {
    // Use mock data if enabled
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 300))
      const verificationId = `ver-${Date.now()}`
      return {
        verificationId,
        qrUri: `openid4vp://authorize?request_uri=https://example.com/verify/${verificationId}`,
        deeplink: `sphereon-wallet://openid4vp?request_uri=https://example.com/verify/${verificationId}`,
      }
    }

    // Verification goes through the web-wallet agent, not VDX
    // TODO: Update when agent verification endpoints are implemented
    const agentBaseUrl = getEnv('BROWSER_PUBLIC_AGENT_BASE_URL') || 'http://localhost:5010'
    const response = await fetch(`${agentBaseUrl}/api/booking/verification/start`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({resourceId, bookingId}),
    })

    if (!response.ok) {
      throw new Error(`Failed to start verification: ${response.statusText}`)
    }

    return response.json()
  },

  async getVerificationStatus(verificationId: string): Promise<{verificationId: string; status: 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED'; verifiedAt?: string}> {
    // Use mock data if enabled
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 200))
      // Simulate random verification status progression
      const random = Math.random()
      if (random > 0.8) {
        return {
          verificationId,
          status: 'VERIFIED',
          verifiedAt: new Date().toISOString(),
        }
      }
      return {
        verificationId,
        status: 'PENDING',
      }
    }

    // Verification goes through the web-wallet agent, not VDX
    const agentBaseUrl = getEnv('BROWSER_PUBLIC_AGENT_BASE_URL') || 'http://localhost:5010'
    const response = await fetch(`${agentBaseUrl}/api/booking/verification/${verificationId}/status`, {
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch verification status: ${response.statusText}`)
    }

    return response.json()
  },

  async cancelBooking(bookingId: string): Promise<void> {
    // Use mock data if enabled
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 300))
      return
    }

    const response = await fetch(`${getVdxApiUrl()}/bookings/${bookingId}/cancel`, {
      method: 'POST',
      credentials: 'include',
      headers: getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to cancel booking: ${response.statusText}`)
    }
  },
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Time window helper - represents a time range in minutes from midnight
 */
interface TimeWindow {
  start: number // Minutes from midnight (0-1440)
  end: number // Minutes from midnight (0-1440)
}

/**
 * Parses time string "HH:mm" to minutes from midnight
 */
function parseTimeToMinutes(timeStr: string): number {
  const [hours, mins] = timeStr.split(':').map(Number)
  return hours * 60 + mins
}

/**
 * Parses a date string "YYYY-MM-DD" as local time (not UTC).
 * new Date("YYYY-MM-DD") parses as UTC midnight, which can shift the day
 * when converted to local time in timezones ahead of UTC.
 * This function parses as local midnight to avoid timezone issues.
 */
function parseDateAsLocal(dateStr: string): Date {
  const parts = dateStr.split('-').map(Number)
  return new Date(parts[0], parts[1] - 1, parts[2])
}

/**
 * Checks if a schedule rule applies to a given date
 */
function ruleAppliesToDate(rule: any, date: Date, dateStr: string): boolean {
  const dayOfWeek = date.getDay() || 7 // Convert Sunday (0) to 7 for ISO 8601
  const dayOfMonth = date.getDate()
  const month = date.getMonth() + 1 // JavaScript months are 0-indexed

  // Check validity window
  if (rule.validFrom && dateStr < rule.validFrom) return false
  if (rule.validUntil && dateStr > rule.validUntil) return false

  // Specific date takes highest priority
  if (rule.specificDate) {
    return rule.specificDate === dateStr
  }

  // Check day of week (most common pattern)
  if (rule.dayOfWeek !== undefined && rule.dayOfWeek !== null) {
    // Also check if month restriction applies
    if (rule.month !== undefined && rule.month !== null && rule.month !== month) {
      return false
    }
    // Also check if dayOfMonth restriction applies
    if (rule.dayOfMonth !== undefined && rule.dayOfMonth !== null && rule.dayOfMonth !== dayOfMonth) {
      return false
    }
    return rule.dayOfWeek === dayOfWeek
  }

  // Check month + dayOfMonth combination (e.g., Dec 25 = Christmas)
  if (rule.month !== undefined && rule.month !== null && rule.dayOfMonth !== undefined && rule.dayOfMonth !== null) {
    return rule.month === month && rule.dayOfMonth === dayOfMonth
  }

  // Check dayOfMonth alone (e.g., 1st of every month)
  if (rule.dayOfMonth !== undefined && rule.dayOfMonth !== null) {
    if (rule.dayOfMonth === -1) {
      // Last day of month
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
      return dayOfMonth === lastDay
    }
    return rule.dayOfMonth === dayOfMonth
  }

  // Check month alone (e.g., all of December)
  if (rule.month !== undefined && rule.month !== null) {
    return rule.month === month
  }

  // nthWeekday pattern (e.g., 2nd Tuesday of month)
  if (rule.nthWeekday !== undefined && rule.nthWeekday !== null) {
    const weekNum = Math.ceil(dayOfMonth / 7)
    return weekNum === rule.nthWeekday && (rule.dayOfWeek === undefined || rule.dayOfWeek === dayOfWeek)
  }

  return false
}

/**
 * Merges overlapping time windows
 */
function mergeTimeWindows(windows: TimeWindow[]): TimeWindow[] {
  if (windows.length === 0) return []

  // Sort by start time
  const sorted = [...windows].sort((a, b) => a.start - b.start)
  const merged: TimeWindow[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]
    const last = merged[merged.length - 1]

    if (current.start <= last.end) {
      // Overlapping or adjacent - merge
      last.end = Math.max(last.end, current.end)
    } else {
      // No overlap - add new window
      merged.push(current)
    }
  }

  return merged
}

/**
 * Subtracts closed windows from open windows
 * Returns the remaining open time windows
 */
function subtractClosedFromOpen(openWindows: TimeWindow[], closedWindows: TimeWindow[]): TimeWindow[] {
  if (openWindows.length === 0) return []
  if (closedWindows.length === 0) return openWindows

  let result = [...openWindows]

  for (const closed of closedWindows) {
    const newResult: TimeWindow[] = []

    for (const open of result) {
      // No overlap - keep the open window as is
      if (closed.end <= open.start || closed.start >= open.end) {
        newResult.push(open)
        continue
      }

      // Closed window completely covers open window - remove it
      if (closed.start <= open.start && closed.end >= open.end) {
        continue
      }

      // Closed window cuts into the start
      if (closed.start <= open.start && closed.end < open.end) {
        newResult.push({start: closed.end, end: open.end})
        continue
      }

      // Closed window cuts into the end
      if (closed.start > open.start && closed.end >= open.end) {
        newResult.push({start: open.start, end: closed.start})
        continue
      }

      // Closed window is in the middle - split into two
      if (closed.start > open.start && closed.end < open.end) {
        newResult.push({start: open.start, end: closed.start})
        newResult.push({start: closed.end, end: open.end})
        continue
      }
    }

    result = newResult
  }

  return result
}

/**
 * Generates time slots from resource schedules with proper rule merging.
 * Handles the combination of open rules and closed rules to produce
 * the final available time windows for slot generation.
 */
function generateSlotsFromSchedules(resourceId: string, dateStr: string, rules: any[]): TimeSlot[] {
  const slots: TimeSlot[] = []
  const date = parseDateAsLocal(dateStr)
  const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay() // Convert Sunday from 0 to 7 (ISO 8601)

  // Find all rules that apply to this date
  const applicableRules = rules.filter(rule => ruleAppliesToDate(rule, date, dateStr))

  // Fallback to default schedule if no rules defined (all 7 days 9-17)
  if (applicableRules.length === 0 && rules.length === 0) {
    // Default schedule: all days 09:00-17:00 (includes weekends)
    applicableRules.push({
      dayOfWeek,
      startTime: '09:00',
      endTime: '17:00',
      isClosed: false,
    })
  }

  if (applicableRules.length === 0) {
    return [] // No rules for this day
  }

  // Separate open and closed rules
  const openRules = applicableRules.filter(r => !r.isClosed)
  const closedRules = applicableRules.filter(r => r.isClosed)

  // If no open rules, day is closed
  if (openRules.length === 0) {
    return []
  }

  // Convert open rules to time windows
  const openWindows: TimeWindow[] = openRules.map(rule => ({
    start: parseTimeToMinutes(rule.startTime || '00:00'),
    end: parseTimeToMinutes(rule.endTime || '23:59'),
  }))

  // Merge overlapping open windows
  const mergedOpen = mergeTimeWindows(openWindows)

  // Convert closed rules to time windows
  const closedWindows: TimeWindow[] = closedRules.map(rule => ({
    start: parseTimeToMinutes(rule.startTime || '00:00'),
    end: parseTimeToMinutes(rule.endTime || '23:59'),
  }))

  // Subtract closed windows from open windows
  const finalWindows = subtractClosedFromOpen(mergedOpen, closedWindows)

  // Default slot interval is 30 minutes
  const intervalMinutes = 30
  let slotIndex = 0

  // Generate slots within each remaining open window
  for (const window of finalWindows) {
    let currentMinutes = window.start

    while (currentMinutes + intervalMinutes <= window.end) {
      const startTime = new Date(date)
      startTime.setHours(Math.floor(currentMinutes / 60), currentMinutes % 60, 0, 0)

      const endTime = new Date(date)
      const endMinutes = currentMinutes + intervalMinutes
      endTime.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0)

      slots.push({
        id: `slot-${resourceId}-${dateStr}-${slotIndex}`,
        startTime,
        endTime,
        isAvailable: true,
      })

      currentMinutes += intervalMinutes
      slotIndex++
    }
  }

  return slots
}

/**
 * Generates time slots from resource schedules with proper rule merging
 * and checks against existing bookings.
 *
 * This function handles the combination of open rules and closed rules:
 * - Open rules define when the resource is available
 * - Closed rules subtract from the open time windows
 * - Example: Monday 00:00-23:59 (open) + Weekdays 12:00-13:00 (closed)
 *   = Monday 00:00-12:00 and 13:00-23:59 available
 */
function generateSlotsFromSchedulesWithConflicts(
  resourceId: string,
  dateStr: string,
  rules: any[],
  existingBookings: Booking[],
  policy?: UsagePolicy,
): TimeSlot[] {
  const slots: TimeSlot[] = []
  const date = parseDateAsLocal(dateStr)
  const dayOfWeek = date.getDay() || 7 // Convert Sunday (0) to 7 for ISO 8601

  // Find all rules that apply to this date
  const applicableRules = rules.filter(rule => ruleAppliesToDate(rule, date, dateStr))

  // Fallback to default schedule if no rules defined (all 7 days 9-17)
  if (applicableRules.length === 0 && rules.length === 0) {
    // Default schedule: all days 09:00-17:00 (includes weekends)
    applicableRules.push({
      dayOfWeek,
      startTime: '09:00',
      endTime: '17:00',
      isClosed: false,
    })
  }

  if (applicableRules.length === 0) {
    return [] // No rules for this day
  }

  // Separate open and closed rules
  const openRules = applicableRules.filter(r => !r.isClosed)
  const closedRules = applicableRules.filter(r => r.isClosed)

  // If no open rules, day is closed
  if (openRules.length === 0) {
    return []
  }

  // Convert open rules to time windows
  const openWindows: TimeWindow[] = openRules.map(rule => ({
    start: parseTimeToMinutes(rule.startTime || '00:00'),
    end: parseTimeToMinutes(rule.endTime || '23:59'),
  }))

  // Merge overlapping open windows
  const mergedOpen = mergeTimeWindows(openWindows)

  // Convert closed rules to time windows
  const closedWindows: TimeWindow[] = closedRules.map(rule => ({
    start: parseTimeToMinutes(rule.startTime || '00:00'),
    end: parseTimeToMinutes(rule.endTime || '23:59'),
  }))

  // Subtract closed windows from open windows
  const finalWindows = subtractClosedFromOpen(mergedOpen, closedWindows)

  // Use policy slot interval or default to 30 minutes
  const intervalMinutes = policy?.slotDurationMinutes || 30
  const bufferMinutes = policy?.bufferAfterMinutes || 0

  let slotIndex = 0

  // Generate slots within each remaining open window
  for (const window of finalWindows) {
    let currentMinutes = window.start

    while (currentMinutes + intervalMinutes <= window.end) {
      const startTime = new Date(date)
      startTime.setHours(Math.floor(currentMinutes / 60), currentMinutes % 60, 0, 0)

      const endTime = new Date(date)
      const endMinutes = currentMinutes + intervalMinutes
      endTime.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0)

      // Check if this slot conflicts with any existing booking (including buffer)
      const conflictingBooking = existingBookings.find(booking => {
        if (booking.status === 'CANCELLED') return false

        const bookingStart = new Date(booking.startTime)
        const bookingEnd = new Date(booking.endTime)

        // Add buffer to booking end time
        const bookingEndWithBuffer = new Date(bookingEnd)
        bookingEndWithBuffer.setMinutes(bookingEndWithBuffer.getMinutes() + bufferMinutes)

        // Check for overlap: slot overlaps with booking if slot starts before booking ends (+ buffer) and slot ends after booking starts
        return startTime < bookingEndWithBuffer && endTime > bookingStart
      })

      slots.push({
        id: `slot-${resourceId}-${dateStr}-${slotIndex}`,
        startTime,
        endTime,
        isAvailable: !conflictingBooking,
        bookingId: conflictingBooking?.id,
      })

      currentMinutes += intervalMinutes
      slotIndex++
    }
  }

  return slots
}

// Export internal functions for testing
export const __testing__ = {
  transformPolicy,
  transformResource,
  transformRequirement,
  transformToVdxFormat,
  generateSlotsFromSchedules,
  generateSlotsFromSchedulesWithConflicts,
}
