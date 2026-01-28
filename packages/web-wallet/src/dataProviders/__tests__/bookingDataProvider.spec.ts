/**
 * Tests for the booking data provider
 *
 * These tests verify the transformation functions that convert between
 * VDX backend format and frontend format.
 */

// Mock the @typings module to avoid ESM issues with @sphereon packages
jest.mock('@typings', () => ({
  BookingDataResource: {
    RESOURCES: 'resources',
    CATEGORIES: 'categories',
    POLICIES: 'policies',
    BOOKINGS: 'bookings',
    GROUPS: 'groups',
    SCHEDULE_SETS: 'schedule-sets',
    SCHEDULE_SET_ASSIGNMENTS: 'schedule-set-assignments',
    POLICY_ASSIGNMENTS: 'policy-assignments',
    SCHEDULES: 'schedules',
    REQUIREMENTS: 'requirements',
  },
  DataResource: {
    DCQL_QUERIES: 'dcql-queries',
  },
}))

import {__testing__} from '../bookingDataProvider'
import {BookingDataResource} from '@typings'

const {
  transformPolicy,
  transformResource,
  transformRequirement,
  transformToVdxFormat,
  generateSlotsFromSchedules,
  generateSlotsFromSchedulesWithConflicts,
} = __testing__

describe('bookingDataProvider', () => {
  describe('transformPolicy', () => {
    it('should transform VDX policy response to frontend format', () => {
      const vdxPolicy = {
        id: 'policy-123',
        tenantId: 'tenant-1',
        name: 'Test Policy',
        description: 'A test policy',
        slotIntervalMinutes: 30,
        minBookingDurationMinutes: 30,
        maxBookingDurationMinutes: 120,
        bufferAfterMinutes: 15,
        maxAdvanceBookingDays: 30,
        minAdvanceBookingHours: 2,
        concurrencyLimit: 1,
        requiresApproval: false,
        allowRecurring: true,
        allowSameDayBooking: true,
        isDefault: false,
      }

      const result = transformPolicy(vdxPolicy)

      expect(result.id).toBe('policy-123')
      expect(result.name).toBe('Test Policy')
      expect(result.slotDurationMinutes).toBe(30)
      expect(result.minDurationMinutes).toBe(30)
      expect(result.maxDurationMinutes).toBe(120)
      expect(result.bufferAfterMinutes).toBe(15)
      expect(result.maxAdvanceBookingDays).toBe(30)
      expect(result.minAdvanceBookingHours).toBe(2)
      expect(result.maxConcurrentBookings).toBe(1)
      expect(result.requiresApproval).toBe(false)
      expect(result.allowRecurring).toBe(true)
      expect(result.allowSameDayBooking).toBe(true)
      expect(result.isDefault).toBe(false)
    })

    it('should handle missing optional fields with defaults', () => {
      const vdxPolicy = {
        id: 'policy-456',
        name: 'Minimal Policy',
      }

      const result = transformPolicy(vdxPolicy)

      expect(result.id).toBe('policy-456')
      expect(result.name).toBe('Minimal Policy')
      // Some fields have defaults in the transform function
      expect(result.slotDurationMinutes).toBe(30) // default
      expect(result.maxAdvanceBookingDays).toBe(30) // default
      expect(result.maxConcurrentBookings).toBe(1) // default
      expect(result.requiresApproval).toBe(false) // default
      expect(result.allowRecurring).toBe(true) // default
      expect(result.allowSameDayBooking).toBe(true) // default
      expect(result.isDefault).toBe(false) // default
      // These don't have defaults and will be undefined
      expect(result.minDurationMinutes).toBeUndefined()
      expect(result.bufferAfterMinutes).toBeUndefined()
    })
  })

  describe('transformRequirement', () => {
    it('should transform VDX requirement response to frontend format', () => {
      const vdxReq = {
        id: 'req-123',
        resourceId: 'resource-456',
        requirementCategoryId: 'cat-789',
        dcqlQuery: 'credential-query-123',
        subIdentifier: 'sub-1',
        description: 'Proof of membership required',
        isMandatory: true,
        displayOrder: 1,
      }

      const result = transformRequirement(vdxReq)

      expect(result.id).toBe('req-123')
      expect(result.resourceId).toBe('resource-456')
      expect(result.requirementCategoryId).toBe('cat-789')
      expect(result.dcqlQuery).toBe('credential-query-123')
      expect(result.description).toBe('Proof of membership required')
      expect(result.isMandatory).toBe(true)
      expect(result.displayOrder).toBe(1)
    })

    it('should provide defaults for missing optional fields', () => {
      const vdxReq = {
        id: 'req-456',
        resourceId: 'resource-789',
      }

      const result = transformRequirement(vdxReq)

      expect(result.isMandatory).toBe(true) // default
      expect(result.displayOrder).toBe(0) // default
    })
  })

  describe('transformResource', () => {
    it('should transform VDX resource response to frontend format', () => {
      const vdxResource = {
        id: 'resource-123',
        partyId: 'party-123',
        name: 'Conference Room A',
        description: 'A large conference room',
        categoryId: 'cat-456',
        timezone: 'Europe/Amsterdam',
        status: 'ACTIVE',
        capacity: 10,
        requirements: [
          {
            id: 'req-1',
            resourceId: 'resource-123',
            dcqlQuery: 'credential-query-1',
            description: 'Membership required',
            isMandatory: true,
            displayOrder: 1,
          },
        ],
        schedules: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      const result = transformResource(vdxResource)

      expect(result.id).toBe('resource-123')
      expect(result.name).toBe('Conference Room A')
      expect(result.categoryId).toBe('cat-456')
      expect(result.timezone).toBe('Europe/Amsterdam')
      expect(result.status).toBe('ACTIVE')
      expect(result.capacity).toBe(10)
      expect(result.requirements).toHaveLength(1)
      expect(result.requirements[0].dcqlQuery).toBe('credential-query-1')
    })

    it('should handle resourceCategoryId as alias for categoryId', () => {
      const vdxResource = {
        id: 'resource-456',
        name: 'Test Resource',
        resourceCategoryId: 'cat-789', // VDX uses this field name
      }

      const result = transformResource(vdxResource)

      expect(result.categoryId).toBe('cat-789')
    })
  })

  describe('transformToVdxFormat', () => {
    describe('POLICIES', () => {
      it('should map frontend policy fields to VDX format', () => {
        const frontendData = {
          name: 'New Policy',
          description: 'Test description',
          slotDurationMinutes: 30,
          minDurationMinutes: 30,
          maxDurationMinutes: 120,
          bufferAfterMinutes: 15,
          maxAdvanceBookingDays: 30,
          minAdvanceBookingHours: 2,
          maxConcurrentBookings: 1,
          requiresApproval: true,
          allowRecurring: false,
          allowSameDayBooking: true,
          isDefault: false,
        }

        const result = transformToVdxFormat(BookingDataResource.POLICIES, frontendData)

        // Frontend field names should be mapped to VDX field names
        expect(result.slotIntervalMinutes).toBe(30) // mapped from slotDurationMinutes
        expect(result.minBookingDurationMinutes).toBe(30) // mapped from minDurationMinutes
        expect(result.maxBookingDurationMinutes).toBe(120) // mapped from maxDurationMinutes
        expect(result.concurrencyLimit).toBe(1) // mapped from maxConcurrentBookings
        expect(result.minAdvanceBookingHours).toBe(2)
        expect(result.requiresApproval).toBe(true)
        expect(result.allowRecurring).toBe(false)
        expect(result.allowSameDayBooking).toBe(true)
      })

      it('should handle alternative VDX field names in input', () => {
        const frontendData = {
          name: 'Policy with VDX names',
          slotIntervalMinutes: 60, // VDX name
          concurrencyLimit: 5, // VDX name
        }

        const result = transformToVdxFormat(BookingDataResource.POLICIES, frontendData)

        expect(result.slotIntervalMinutes).toBe(60)
        expect(result.concurrencyLimit).toBe(5)
      })
    })

    describe('RESOURCES', () => {
      it('should include requirements in VDX format', () => {
        const frontendData = {
          name: 'Test Resource',
          categoryId: 'cat-123',
          timezone: 'UTC',
          capacity: 5,
          requirements: [
            {
              dcqlQuery: 'credential-query-1',
              description: 'Membership proof required',
              isMandatory: true,
              displayOrder: 1,
            },
          ],
        }

        const result = transformToVdxFormat(BookingDataResource.RESOURCES, frontendData)

        expect(result.name).toBe('Test Resource')
        expect(result.categoryId).toBe('cat-123')
        expect(result.requirements).toEqual([
          {
            dcqlQuery: 'credential-query-1',
            description: 'Membership proof required',
            isMandatory: true,
            displayOrder: 1,
          },
        ])
      })

      it('should map policyId to usagePolicyId', () => {
        const frontendData = {
          name: 'Resource with Policy',
          categoryId: 'cat-123',
          policyId: 'policy-456',
        }

        const result = transformToVdxFormat(BookingDataResource.RESOURCES, frontendData)

        expect(result.usagePolicyId).toBe('policy-456')
      })
    })
  })

  describe('generateSlotsFromSchedules', () => {
    it('should return empty array when no rules are provided', () => {
      const resourceId = 'resource-123'
      const dateStr = '2024-03-04' // Monday
      const scheduleRules: any[] = []

      // generateSlotsFromSchedules does NOT have default schedule fallback
      // (only generateSlotsFromSchedulesWithConflicts does)
      const slots = generateSlotsFromSchedules(resourceId, dateStr, scheduleRules)

      expect(slots.length).toBe(0)
    })

    it('should use schedule rules when provided', () => {
      const resourceId = 'resource-123'
      const dateStr = '2024-03-04' // Monday
      const scheduleRules = [
        {
          dayOfWeek: 1, // Monday
          startTime: '10:00',
          endTime: '12:00',
          isClosed: false,
        },
      ]

      const slots = generateSlotsFromSchedules(resourceId, dateStr, scheduleRules)

      // Should generate slots for the 10:00-12:00 window (2 hours / 30min = 4 slots)
      expect(slots.length).toBe(4)
      // First slot should start at 10:00
      expect(slots[0].startTime.getHours()).toBe(10)
      expect(slots[0].startTime.getMinutes()).toBe(0)
    })

    it('should return empty array when day is closed', () => {
      const resourceId = 'resource-123'
      const dateStr = '2024-03-04' // Monday
      const scheduleRules = [
        {
          dayOfWeek: 1, // Monday
          startTime: '09:00',
          endTime: '17:00',
          isClosed: true, // Closed
        },
      ]

      const slots = generateSlotsFromSchedules(resourceId, dateStr, scheduleRules)

      expect(slots.length).toBe(0)
    })
  })

  describe('generateSlotsFromSchedulesWithConflicts', () => {
    it('should use default schedule when no rules provided (Issue 4 fix)', () => {
      const resourceId = 'resource-123'
      // A Saturday (2024-03-02 is a Saturday)
      const saturdayStr = '2024-03-02'
      const scheduleRules: any[] = [] // Empty rules - should use default schedule

      const slots = generateSlotsFromSchedulesWithConflicts(
        resourceId,
        saturdayStr,
        scheduleRules,
        [], // No bookings
        undefined,
      )

      // With the Issue 4 fix, weekends should have slots using default schedule
      // Default schedule is 09:00-17:00 = 8 hours with 30min slots = 16 slots
      expect(slots.length).toBeGreaterThan(0)
      expect(slots.length).toBe(16)
    })

    it('should use default schedule for Sunday (Issue 4 fix)', () => {
      const resourceId = 'resource-123'
      // A Sunday (2024-03-03 is a Sunday)
      const sundayStr = '2024-03-03'
      const scheduleRules: any[] = []

      const slots = generateSlotsFromSchedulesWithConflicts(
        resourceId,
        sundayStr,
        scheduleRules,
        [],
        undefined,
      )

      // With the fix, Sundays should have slots too
      expect(slots.length).toBe(16) // 8 hours * 2 slots/hour = 16
    })

    it('should mark slots as unavailable when there are existing bookings', () => {
      const resourceId = 'resource-123'
      const dateStr = '2024-03-04' // Monday
      const scheduleRules = [
        {
          dayOfWeek: 1, // Monday
          startTime: '09:00',
          endTime: '17:00',
          isClosed: false,
        },
      ]

      // Booking at 10:00-10:30 - use local time format to match slot times
      const bookingDate = new Date('2024-03-04T10:00:00')
      const bookingEndDate = new Date('2024-03-04T10:30:00')
      const existingBookings = [
        {
          id: 'booking-1',
          resourceId: 'resource-123',
          startTime: bookingDate.toISOString(),
          endTime: bookingEndDate.toISOString(),
          status: 'CONFIRMED',
        },
      ]

      const slots = generateSlotsFromSchedulesWithConflicts(
        resourceId,
        dateStr,
        scheduleRules,
        existingBookings as any,
        undefined,
      )

      // Slots should be generated
      expect(slots.length).toBeGreaterThan(0)

      // Find a slot and verify structure
      const firstSlot = slots[0]
      expect(firstSlot).toBeDefined()
      expect(firstSlot.startTime).toBeInstanceOf(Date)
    })

    it('should ignore cancelled bookings', () => {
      const resourceId = 'resource-123'
      const dateStr = '2024-03-04'
      const scheduleRules = [
        {
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '17:00',
          isClosed: false,
        },
      ]

      // Cancelled booking at 10:00-10:30
      const existingBookings = [
        {
          id: 'booking-1',
          resourceId: 'resource-123',
          startTime: '2024-03-04T10:00:00',
          endTime: '2024-03-04T10:30:00',
          status: 'CANCELLED', // Should be ignored
        },
      ]

      const slots = generateSlotsFromSchedulesWithConflicts(
        resourceId,
        dateStr,
        scheduleRules,
        existingBookings as any,
        undefined,
      )

      // All slots should be available since the booking is cancelled
      const allAvailable = slots.every(s => s.isAvailable)
      expect(allAvailable).toBe(true)
    })
  })
})
