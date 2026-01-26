import React, {FC, ReactElement, useCallback, useMemo, useState, useRef} from 'react'
import {useOne, useList} from '@refinedev/core'
import {useNavigate, useParams} from 'react-router-dom'
import {useSession} from 'next-auth/react'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import {BookingDataResource, BookingResource, TimeSlot, Booking, UsagePolicy, PolicyAssignment} from '@typings'
import {bookingService} from '@/src/dataProviders/bookingDataProvider'
import styles from './index.module.css'

type CalendarView = 'day' | 'week'
type SlotInterval = 15 | 30 | 60

interface DayData {
  date: Date
  dayName: string
  dayNumber: number
  isToday: boolean
  slots: TimeSlot[]
}

const BookingResourceDetailPage: FC = (): ReactElement => {
  const navigate = useNavigate()
  const {id} = useParams<{id: string}>()
  const {data: session} = useSession()

  // Extract user ID from JWT access token if available
  const currentUserId = useMemo(() => {
    // First try common session locations
    const fromUser = (session?.user as any)?.id
      || (session?.user as any)?.sub
      || (session?.user as any)?.userId

    if (fromUser) return fromUser

    // Try to decode JWT access token to get the 'sub' claim
    const accessToken = (session as any)?.accessToken
    if (accessToken) {
      try {
        // JWT is base64url encoded in 3 parts separated by dots
        const parts = accessToken.split('.')
        if (parts.length === 3) {
          // Decode the payload (second part)
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
          console.log('[Booking] JWT payload:', payload)
          return payload.sub || payload.userId || payload.user_id || payload.preferred_username
        }
      } catch (err) {
        console.error('[Booking] Failed to decode JWT:', err)
      }
    }

    // Fallback to email
    return (session?.user as any)?.email
  }, [session])

  // Debug: Log session info
  React.useEffect(() => {
    if (session) {
      console.log('[Booking] Full session:', session)
      console.log('[Booking] Session user:', session.user)
      console.log('[Booking] Current user ID:', currentUserId)
    } else {
      console.log('[Booking] No session available')
    }
  }, [session, currentUserId])

  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [calendarView, setCalendarView] = useState<CalendarView>('week')
  const [slotInterval, setSlotInterval] = useState<SlotInterval>(30)
  // Multi-slot selection: start and end of range
  const [selectionStart, setSelectionStart] = useState<TimeSlot | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<TimeSlot | null>(null)
  // Drag selection state
  const [isDragging, setIsDragging] = useState(false)
  const dragStartSlot = useRef<TimeSlot | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [bookingTitle, setBookingTitle] = useState('')
  const [bookingDescription, setBookingDescription] = useState('')
  const [attendees, setAttendees] = useState<number>(1)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Fetch resource details
  const {data: resourceData, isLoading: resourceLoading} = useOne<BookingResource>({
    resource: BookingDataResource.RESOURCES,
    id: id!,
  })

  const resource = resourceData?.data

  // Fetch ALL bookings for this resource, then filter by userId on the client
  // The VDX API might not support userId filtering properly
  const {data: allBookingsData} = useList<Booking>({
    resource: BookingDataResource.BOOKINGS,
    filters: [
      {field: 'resourceId', operator: 'eq', value: id},
    ],
    pagination: {pageSize: 100},
    queryOptions: {enabled: !!id},
  })

  // Debug: Log all bookings to understand the data
  React.useEffect(() => {
    if (allBookingsData?.data) {
      console.log('[Booking] All bookings for resource:', allBookingsData.data.map(b => ({
        id: b.id,
        userId: b.userId,
        status: b.status,
        start: b.startTime,
        end: b.endTime
      })))
      console.log('[Booking] Looking for userId:', currentUserId)
    }
  }, [allBookingsData, currentUserId])

  // Filter to only the current user's bookings
  const myBookingsData = useMemo(() => {
    if (!allBookingsData?.data || !currentUserId) return {data: []}
    const myBookings = allBookingsData.data.filter(b => b.userId === currentUserId)
    console.log('[Booking] Filtered to my bookings:', myBookings.length)
    return {data: myBookings}
  }, [allBookingsData, currentUserId])

  // Filter to only active bookings (not cancelled)
  const myActiveBookings = useMemo(() => {
    const bookings = myBookingsData?.data?.filter(b => b.status !== 'CANCELLED') || []
    if (bookings.length > 0) {
      console.log('[Booking] My active bookings:', bookings.length, bookings.map(b => ({id: b.id, status: b.status, start: b.startTime, end: b.endTime})))
    }
    return bookings
  }, [myBookingsData])

  // Set of booking IDs that belong to the current user
  const myBookingIds = useMemo(() => {
    const ids = new Set(myActiveBookings.map(b => b.id))
    if (ids.size > 0) {
      console.log('[Booking] My booking IDs:', Array.from(ids))
    }
    return ids
  }, [myActiveBookings])

  // Create a map of time ranges to booking IDs for the current user
  // This helps match slots to user's bookings even if bookingId isn't directly on the slot
  const myBookingTimeRanges = useMemo(() => {
    const ranges: Array<{start: Date; end: Date; bookingId: string}> = []
    myActiveBookings.forEach(booking => {
      const range = {
        start: new Date(booking.startTime),
        end: new Date(booking.endTime),
        bookingId: booking.id,
      }
      ranges.push(range)
      console.log('[Booking] My booking time range:', booking.id, range.start.toISOString(), '-', range.end.toISOString())
    })
    return ranges
  }, [myActiveBookings])

  // Check if a slot belongs to the current user's bookings
  const isMyBookingSlot = useCallback((slot: TimeSlot): boolean => {
    // First check if the slot has a bookingId that matches our bookings
    if (slot.bookingId && myBookingIds.has(slot.bookingId)) {
      console.log('[Booking] Slot matches by bookingId:', slot.id, slot.bookingId)
      return true
    }
    // Fallback: check if the slot time overlaps with any of our bookings
    // A slot overlaps with a booking if they share any time (not just if slot is fully contained)
    const isMyBooking = myBookingTimeRanges.some(range => {
      const slotStart = slot.startTime.getTime()
      const slotEnd = slot.endTime.getTime()
      const rangeStart = range.start.getTime()
      const rangeEnd = range.end.getTime()
      // Overlap: slot starts before range ends AND slot ends after range starts
      const overlaps = slotStart < rangeEnd && slotEnd > rangeStart
      if (overlaps) {
        console.log('[Booking] Slot matches by time overlap:', slot.id, slot.startTime.toISOString(), '-', slot.endTime.toISOString())
      }
      return overlaps
    })
    return isMyBooking
  }, [myBookingIds, myBookingTimeRanges])

  // Fetch policy assignments to get effective policy for validation
  const {data: policyAssignmentsData} = useList<PolicyAssignment>({
    resource: BookingDataResource.POLICY_ASSIGNMENTS,
    pagination: {pageSize: 100},
    queryOptions: {enabled: !!id},
  })

  // Fetch all policies to look up by ID
  const {data: policiesData} = useList<UsagePolicy>({
    resource: BookingDataResource.POLICIES,
    pagination: {pageSize: 100},
    queryOptions: {enabled: !!id},
  })

  // Helper to look up policy by ID
  const getPolicyById = useCallback((policyId: string): UsagePolicy | null => {
    const policies = policiesData?.data ?? []
    return policies.find(p => p.id === policyId) || null
  }, [policiesData])

  // Find effective policy (resource > group > category > default)
  const effectivePolicy = useMemo((): UsagePolicy | null => {
    // First check if resource has a direct policy attached
    if (resource?.policy) {
      console.log('[Booking] Using resource direct policy:', resource.policy)
      return resource.policy
    }
    // Check usagePolicies array on resource (from VDX join table)
    if (resource?.usagePolicies && resource.usagePolicies.length > 0) {
      const firstPolicy = resource.usagePolicies[0]?.policy
      if (firstPolicy) {
        console.log('[Booking] Using resource usagePolicies[0]:', firstPolicy)
        return firstPolicy
      }
    }

    const assignments = policyAssignmentsData?.data ?? []
    const policies = policiesData?.data ?? []
    console.log('[Booking] Policy assignments:', assignments.length, 'Policies:', policies.length)

    // Debug: Log each assignment's structure
    assignments.forEach((a, i) => {
      console.log(`[Booking] Assignment ${i}:`, {
        policyId: a.policyId,
        resourceId: a.resourceId,
        groupId: a.groupId,
        categoryId: a.categoryId,
        isDefault: a.isDefault,
        hasPolicy: !!a.policy,
      })
    })

    // Helper to resolve policy from assignment
    const resolvePolicy = (assignment: PolicyAssignment): UsagePolicy | null => {
      if (assignment.policy) return assignment.policy
      if ((assignment as any).usagePolicy) return (assignment as any).usagePolicy
      if (assignment.policyId) {
        const policy = getPolicyById(assignment.policyId)
        if (policy) {
          console.log('[Booking] Looked up policy by ID:', assignment.policyId, policy)
          return policy
        }
      }
      return null
    }

    // Resource level assignment
    const resourceAssignment = assignments.find(a => a.resourceId === id)
    if (resourceAssignment) {
      const policy = resolvePolicy(resourceAssignment)
      if (policy) {
        console.log('[Booking] Using resource-level policy:', policy)
        return policy
      }
    }
    // Group level
    if (resource?.groupId) {
      const groupAssignment = assignments.find(a => a.groupId === resource.groupId)
      if (groupAssignment) {
        const policy = resolvePolicy(groupAssignment)
        if (policy) {
          console.log('[Booking] Using group-level policy:', policy)
          return policy
        }
      }
    }
    // Category level
    if (resource?.categoryId) {
      const categoryAssignment = assignments.find(a => a.categoryId === resource.categoryId)
      if (categoryAssignment) {
        const policy = resolvePolicy(categoryAssignment)
        if (policy) {
          console.log('[Booking] Using category-level policy:', policy)
          return policy
        }
      }
    }
    // Default level - check both isDefault === true and isDefault === 'true'
    const defaultAssignment = assignments.find(a => a.isDefault === true || (a as any).isDefault === 'true')
    if (defaultAssignment) {
      const policy = resolvePolicy(defaultAssignment)
      if (policy) {
        console.log('[Booking] Using default policy:', policy)
        return policy
      }
    }

    // Last resort: if there's only one assignment, try to resolve its policy
    if (assignments.length === 1) {
      const onlyAssignment = assignments[0]
      const policy = resolvePolicy(onlyAssignment)
      if (policy) {
        console.log('[Booking] Using only available policy:', policy)
        return policy
      }
    }

    console.log('[Booking] No effective policy found!')
    return null
  }, [policyAssignmentsData, policiesData, id, resource, getPolicyById])

  // Debug: Log effective policy when it changes
  React.useEffect(() => {
    if (effectivePolicy) {
      console.log('[Booking] Effective policy maxDuration:', effectivePolicy.maxDurationMinutes)
    }
    // Also check if resource has a direct policy
    if (resource?.policy) {
      console.log('[Booking] Resource has direct policy:', resource.policy)
    }
    if (resource?.usagePolicies) {
      console.log('[Booking] Resource usagePolicies:', resource.usagePolicies)
    }
  }, [effectivePolicy, resource])

  // Debug: Check slot/booking matching when both are loaded
  React.useEffect(() => {
    if (slots.length > 0 && myBookingIds.size > 0) {
      const unavailableSlots = slots.filter(s => !s.isAvailable)
      const myBookingIdArray = Array.from(myBookingIds)
      console.log('[Booking] RE-CHECK: Unavailable slots:', unavailableSlots.length, 'My booking IDs:', myBookingIdArray)

      // Check by bookingId
      const matchByBookingId = unavailableSlots.filter(s => s.bookingId && myBookingIdArray.includes(s.bookingId))
      console.log('[Booking] Slots matching by bookingId:', matchByBookingId.length)

      // Check by time overlap
      let matchByTimeOverlap = 0
      unavailableSlots.forEach(slot => {
        const overlaps = myBookingTimeRanges.some(range => {
          const slotStart = slot.startTime.getTime()
          const slotEnd = slot.endTime.getTime()
          const rangeStart = range.start.getTime()
          const rangeEnd = range.end.getTime()
          return slotStart < rangeEnd && slotEnd > rangeStart
        })
        if (overlaps) {
          matchByTimeOverlap++
          console.log('[Booking] Slot matches by time overlap:', slot.id, slot.startTime.toISOString())
        }
      })
      console.log('[Booking] Slots matching by time overlap:', matchByTimeOverlap)
    }
  }, [slots, myBookingIds, myBookingTimeRanges])

  // Check if two dates are on the same day
  const isSameDay = useCallback((date1: Date, date2: Date): boolean => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    )
  }, [])

  // Get slot range between start and end (all consecutive available slots)
  const getSlotRange = useCallback((allSlots: TimeSlot[], start: TimeSlot, end: TimeSlot): TimeSlot[] => {
    // Ensure start is before end
    const startSlot = start.startTime < end.startTime ? start : end
    const endSlot = start.startTime < end.startTime ? end : start

    // Filter slots in the same day that fall within the range
    const daySlots = allSlots.filter(s =>
      isSameDay(s.startTime, startSlot.startTime) &&
      s.startTime >= startSlot.startTime &&
      s.endTime <= endSlot.endTime
    )

    // Sort by start time
    const sortedSlots = daySlots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

    // Check all slots in range are available
    if (sortedSlots.some(s => !s.isAvailable)) {
      return [] // Invalid range - has unavailable slots
    }

    // Check for continuity - each slot must end where the next one starts (no gaps)
    for (let i = 0; i < sortedSlots.length - 1; i++) {
      const currentEnd = sortedSlots[i].endTime.getTime()
      const nextStart = sortedSlots[i + 1].startTime.getTime()
      if (currentEnd !== nextStart) {
        // There's a gap between slots (non-bookable time in between)
        return []
      }
    }

    return sortedSlots
  }, [isSameDay])

  // Computed selected range
  const selectedSlots = useMemo((): TimeSlot[] => {
    if (!selectionStart) return []
    if (!selectionEnd) return [selectionStart]

    return getSlotRange(slots, selectionStart, selectionEnd)
  }, [selectionStart, selectionEnd, slots, getSlotRange])

  // Calculate total duration of selected slots in minutes
  const calculateDuration = useCallback((slotsToCalc: TimeSlot[]): number => {
    if (slotsToCalc.length === 0) return 0
    const first = slotsToCalc[0]
    const last = slotsToCalc[slotsToCalc.length - 1]
    return Math.round((last.endTime.getTime() - first.startTime.getTime()) / (1000 * 60))
  }, [])

  // Format date for API
  const formatDateForApi = (date: Date): string => {
    return date.toISOString().split('T')[0]
  }

  // Load availability for selected date range
  const loadAvailability = useCallback(async (startDate: Date, endDate: Date) => {
    if (!id) return
    setSlotsLoading(true)
    try {
      // Calculate the number of days to fetch
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

      // Fetch availability for each day in the range
      const promises: Promise<{resourceId: string; date: string; timezone?: string; slots: TimeSlot[]}>[] = []
      for (let i = 0; i < daysDiff; i++) {
        const date = new Date(startDate)
        date.setDate(date.getDate() + i)
        promises.push(bookingService.getResourceAvailability(id, formatDateForApi(date)))
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

      // Post-process slots to mark as unavailable based on allBookingsData
      // The per-day booking fetch in getResourceAvailability may not be working correctly
      const bookingsForResource = allBookingsData?.data || []
      if (bookingsForResource.length > 0) {
        console.log('[Booking] Post-processing slots with', bookingsForResource.length, 'bookings')
        for (const slot of allSlots) {
          // Check if this slot overlaps with any booking
          const conflictingBooking = bookingsForResource.find(booking => {
            if (booking.status === 'CANCELLED') return false
            const bookingStart = new Date(booking.startTime)
            const bookingEnd = new Date(booking.endTime)
            // Overlap check: slot starts before booking ends AND slot ends after booking starts
            return slot.startTime < bookingEnd && slot.endTime > bookingStart
          })
          if (conflictingBooking) {
            slot.isAvailable = false
            slot.bookingId = conflictingBooking.id
          }
        }
      }

      // Debug: Log unavailable slots with bookingIds
      const unavailableSlots = allSlots.filter(s => !s.isAvailable)
      console.log('[Booking] Total slots loaded:', allSlots.length, 'Unavailable after post-processing:', unavailableSlots.length)
      if (unavailableSlots.length > 0) {
        console.log('[Booking] Unavailable slots:', unavailableSlots.map(s => ({
          id: s.id,
          bookingId: s.bookingId || 'NO BOOKING ID',
          time: `${s.startTime.toISOString()} - ${s.endTime.toISOString()}`
        })))
      }

      setSlots(allSlots)
    } catch (error) {
      console.error('Failed to load availability:', error)
      setSlots([])
    } finally {
      setSlotsLoading(false)
    }
  }, [id, allBookingsData])

  // Get week start (Monday)
  const getWeekStart = useCallback((date: Date): Date => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  // Load availability when date changes
  React.useEffect(() => {
    if (calendarView === 'week') {
      const weekStart = getWeekStart(selectedDate)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      loadAvailability(weekStart, weekEnd)
    } else {
      loadAvailability(selectedDate, selectedDate)
    }
  }, [selectedDate, calendarView, loadAvailability, getWeekStart])

  // Navigate to previous/next day/week
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    const days = calendarView === 'week' ? 7 : 1
    newDate.setDate(newDate.getDate() + (direction === 'next' ? days : -days))
    setSelectedDate(newDate)
    setSelectionStart(null)
    setSelectionEnd(null)
  }

  // Go to today
  const goToToday = () => {
    setSelectedDate(new Date())
    setSelectionStart(null)
    setSelectionEnd(null)
  }

  // Format time for display
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', hour12: false})
  }

  // Format date for display
  const formatDateDisplay = (date: Date): string => {
    return date.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'})
  }

  // Format date for sidebar
  const formatDateForSidebar = (date: Date): string => {
    return date.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'})
  }

  // Check if date is today
  const isDateToday = useCallback((date: Date): boolean => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }, [])

  // Generate days for the calendar
  const calendarDays = useMemo((): DayData[] => {
    const days: DayData[] = []
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    if (calendarView === 'week') {
      const weekStart = getWeekStart(selectedDate)
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart)
        date.setDate(date.getDate() + i)
        days.push({
          date,
          dayName: dayNames[i],
          dayNumber: date.getDate(),
          isToday: isDateToday(date),
          slots: slots.filter(slot => {
            const slotDate = new Date(slot.startTime)
            return slotDate.getDate() === date.getDate() &&
                   slotDate.getMonth() === date.getMonth() &&
                   slotDate.getFullYear() === date.getFullYear()
          }),
        })
      }
    } else {
      const dayIndex = (selectedDate.getDay() + 6) % 7 // Convert to Monday=0
      days.push({
        date: selectedDate,
        dayName: dayNames[dayIndex],
        dayNumber: selectedDate.getDate(),
        isToday: isDateToday(selectedDate),
        slots: slots,
      })
    }

    return days
  }, [calendarView, selectedDate, slots, getWeekStart, isDateToday])

  // Calculate slot position and width on timeline
  const getSlotStyle = useCallback((slot: TimeSlot): React.CSSProperties => {
    const startHour = 8 // Timeline starts at 8:00
    const endHour = 18 // Timeline ends at 18:00
    const totalHours = endHour - startHour

    const slotStartHour = slot.startTime.getHours() + slot.startTime.getMinutes() / 60
    const slotEndHour = slot.endTime.getHours() + slot.endTime.getMinutes() / 60

    const left = ((slotStartHour - startHour) / totalHours) * 100
    const width = ((slotEndHour - slotStartHour) / totalHours) * 100

    return {
      left: `${Math.max(0, left)}%`,
      width: `${Math.min(width, 100 - left)}%`,
    }
  }, [])

  // Get slot label
  const getSlotLabel = useCallback((slot: TimeSlot): string => {
    const startHour = slot.startTime.getHours()
    const endHour = slot.endTime.getHours()
    return `${startHour}-${endHour}`
  }, [])

  // Determine slot type for styling
  const getSlotType = useCallback((slot: TimeSlot): 'available' | 'unavailable' | 'booked' | 'myBooking' | 'selected' | 'inRange' => {
    // Check if this slot is in the selected range
    const isInSelectedRange = selectedSlots.some(s => s.id === slot.id)
    if (isInSelectedRange) {
      // If it's the start or end, mark as selected; otherwise inRange
      if (selectionStart?.id === slot.id || selectionEnd?.id === slot.id) {
        return 'selected'
      }
      return 'inRange'
    }

    // Check if this is the user's own booking
    if (!slot.isAvailable) {
      const isMyBooking = isMyBookingSlot(slot)
      if (isMyBooking) {
        console.log('[Booking] Slot is MY BOOKING:', slot.id, slot.bookingId)
        return 'myBooking'
      }
      // Check if booked by someone else (has a bookingId)
      if (slot.bookingId) {
        console.log('[Booking] Slot is BOOKED BY OTHERS:', slot.id, slot.bookingId)
        return 'booked'
      }
      // Unavailable but no bookingId = outside schedule hours
      return 'unavailable'
    }

    return 'available'
  }, [selectedSlots, selectionStart, selectionEnd, isMyBookingSlot])

  // Get slot position in range for styling (start, middle, end)
  const getSlotRangePosition = useCallback((slot: TimeSlot): 'start' | 'middle' | 'end' | null => {
    if (selectedSlots.length < 2) return null
    const index = selectedSlots.findIndex(s => s.id === slot.id)
    if (index === -1) return null
    if (index === 0) return 'start'
    if (index === selectedSlots.length - 1) return 'end'
    return 'middle'
  }, [selectedSlots])

  // Validate selection against policy constraints
  const validateSelection = useCallback((slotsToValidate: TimeSlot[]): string | null => {
    if (slotsToValidate.length === 0) return null

    const durationMinutes = calculateDuration(slotsToValidate)

    if (effectivePolicy?.minDurationMinutes && durationMinutes < effectivePolicy.minDurationMinutes) {
      return `Minimum booking duration is ${effectivePolicy.minDurationMinutes} minutes`
    }

    if (effectivePolicy?.maxDurationMinutes && durationMinutes > effectivePolicy.maxDurationMinutes) {
      return `Maximum booking duration is ${effectivePolicy.maxDurationMinutes} minutes`
    }

    return null
  }, [effectivePolicy, calculateDuration])

  // Update validation when selection changes
  React.useEffect(() => {
    const error = validateSelection(selectedSlots)
    setValidationError(error)
  }, [selectedSlots, validateSelection])

  // Track if we actually moved the mouse during drag (vs just a click)
  const hasDraggedRef = useRef(false)

  // Handle mouse down on slot (start potential drag)
  const handleSlotMouseDown = (slot: TimeSlot, e: React.MouseEvent) => {
    // Ignore clicks on unavailable slots that aren't our own
    if (!slot.isAvailable && !isMyBookingSlot(slot)) return

    e.preventDefault()
    setIsDragging(true)
    hasDraggedRef.current = false
    dragStartSlot.current = slot
  }

  // Handle mouse enter on slot (during drag)
  const handleSlotMouseEnter = (slot: TimeSlot) => {
    if (!isDragging || !dragStartSlot.current) return

    // Mark that we've actually moved to a different slot
    if (slot.id !== dragStartSlot.current.id) {
      hasDraggedRef.current = true
    }

    // Skip unavailable slots
    if (!slot.isAvailable) return

    // Only allow extending on the same day
    if (!isSameDay(slot.startTime, dragStartSlot.current.startTime)) return

    // Try to create a valid range
    const range = getSlotRange(slots, dragStartSlot.current, slot)
    if (range.length > 0) {
      // Check if within max duration
      const durationMinutes = calculateDuration(range)
      console.log('[Booking] Drag selection: duration =', durationMinutes, 'max =', effectivePolicy?.maxDurationMinutes)
      if (!effectivePolicy?.maxDurationMinutes || durationMinutes <= effectivePolicy.maxDurationMinutes) {
        setSelectionStart(dragStartSlot.current)
        setSelectionEnd(slot)
      } else {
        console.log('[Booking] Selection blocked: exceeds max duration', effectivePolicy.maxDurationMinutes)
      }
    } else {
      console.log('[Booking] Selection blocked: invalid range (gap or unavailable slots)')
    }
  }

  // Handle mouse up on slot (end drag or click)
  const handleSlotMouseUp = (slot: TimeSlot) => {
    if (!isDragging) return

    const wasDrag = hasDraggedRef.current
    setIsDragging(false)

    // Handle clicking own booking - navigate to booking details
    if (!slot.isAvailable && isMyBookingSlot(slot)) {
      navigate(`/booking/my-bookings/${slot.bookingId}`)
      dragStartSlot.current = null
      return
    }

    // Ignore clicks on unavailable slots
    if (!slot.isAvailable) {
      dragStartSlot.current = null
      return
    }

    // If we actually dragged to a different slot, the selection is already set
    if (wasDrag && dragStartSlot.current) {
      dragStartSlot.current = null
      return
    }

    // This was a single click (no drag movement)
    if (!selectionStart) {
      // First click - set start (single slot selection)
      setSelectionStart(slot)
      setSelectionEnd(null)
    } else if (!selectionEnd) {
      // Second click
      if (slot.id === selectionStart.id) {
        // Same slot - deselect
        setSelectionStart(null)
      } else if (isSameDay(slot.startTime, selectionStart.startTime)) {
        // Same day - try to set range
        const range = getSlotRange(slots, selectionStart, slot)
        if (range.length > 0) {
          // Validate against max duration policy
          const durationMinutes = calculateDuration(range)
          console.log('[Booking] Click selection: duration =', durationMinutes, 'max =', effectivePolicy?.maxDurationMinutes)
          if (effectivePolicy?.maxDurationMinutes && durationMinutes > effectivePolicy.maxDurationMinutes) {
            // Exceeds max duration - don't allow this selection
            console.log('[Booking] Click selection blocked: exceeds max duration')
            return
          }
          setSelectionEnd(slot)
        } else {
          // Invalid range (unavailable slots in between or gap) - start new selection
          console.log('[Booking] Click selection: invalid range, starting new selection')
          setSelectionStart(slot)
          setSelectionEnd(null)
        }
      } else {
        // Different day - start new selection
        setSelectionStart(slot)
        setSelectionEnd(null)
      }
    } else {
      // Already have range - start new selection
      setSelectionStart(slot)
      setSelectionEnd(null)
    }

    dragStartSlot.current = null
  }

  // Global mouse up listener to handle drag end outside slots
  React.useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false)
        hasDraggedRef.current = false
        dragStartSlot.current = null
      }
    }
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [isDragging])

  // Handle book now
  const handleBookNow = () => {
    if (selectedSlots.length === 0 || !resource) return

    const firstSlot = selectedSlots[0]
    const lastSlot = selectedSlots[selectedSlots.length - 1]

    const requiresVerification = resource.requirements && resource.requirements.length > 0
    const params = new URLSearchParams({
      resourceId: resource.id,
      slotId: firstSlot.id,
      date: formatDateForApi(firstSlot.startTime),
      title: bookingTitle,
      startTime: formatTime(firstSlot.startTime),
      endTime: formatTime(lastSlot.endTime),
    })

    // Skip verification if no requirements
    if (requiresVerification) {
      navigate(`/booking/create/verification?${params.toString()}`)
    } else {
      params.set('verified', 'not_required')
      navigate(`/booking/create/confirmation?${params.toString()}`)
    }
  }

  // Generate hour labels for timeline
  const hourLabels = useMemo(() => {
    const labels = []
    for (let hour = 8; hour <= 18; hour++) {
      labels.push(`${hour}:00`)
    }
    return labels
  }, [])

  // Get date range display
  const getDateRangeDisplay = (): string => {
    if (calendarView === 'day') {
      return formatDateDisplay(selectedDate)
    }
    const weekStart = getWeekStart(selectedDate)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    const startMonth = weekStart.toLocaleDateString('en-US', {month: 'short'})
    const endMonth = weekEnd.toLocaleDateString('en-US', {month: 'short'})

    if (startMonth === endMonth) {
      return `${startMonth} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`
    }
    return `${startMonth} ${weekStart.getDate()} - ${endMonth} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`
  }

  const hasRequirements = resource?.requirements && resource.requirements.length > 0

  if (resourceLoading) {
    return (
      <div className={styles.container}>
        <AppHeaderBar title="Loading..." />
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
        </div>
      </div>
    )
  }

  if (!resource) {
    return (
      <div className={styles.container}>
        <AppHeaderBar title="Resource Not Found" />
        <div className={styles.emptyState}>
          <h3>Resource not found</h3>
          <p>The requested resource could not be found.</p>
          <button className={styles.primaryButton} onClick={() => navigate('/booking/resources')}>
            Browse Resources
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <AppHeaderBar title={resource.name} onBack={() => navigate('/booking/resources')} />

      <div className={styles.contentWrapper}>
        {/* Main Content */}
        <div className={styles.contentMain}>
          {/* Resource Info Card */}
          <div className={styles.resourceInfoCard}>
            <div className={styles.resourceInfoHeader}>
              <div className={styles.resourceImageContainer}>
                <div className={styles.resourceImageIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              <div className={styles.resourceDetails}>
                {resource.category && (
                  <span className={styles.resourceCategory}>
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" />
                    </svg>
                    {resource.category.name}
                  </span>
                )}
                <h2 className={styles.resourceTitle}>{resource.name}</h2>
                {resource.description && <p className={styles.resourceDesc}>{resource.description}</p>}
                <div className={styles.resourceMetaGrid}>
                  {resource.capacity && (
                    <div className={styles.metaBox}>
                      <span className={styles.metaLabel}>Capacity</span>
                      <span className={styles.metaValue}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Up to {resource.capacity}
                      </span>
                    </div>
                  )}
                  <div className={styles.metaBox}>
                    <span className={styles.metaLabel}>Timezone</span>
                    <span className={styles.metaValue}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {resource.timezone}
                    </span>
                  </div>
                  <div className={styles.metaBox}>
                    <span className={styles.metaLabel}>Status</span>
                    <span className={styles.metaValue}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {resource.status === 'ACTIVE' ? 'Available' : resource.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Calendar Section */}
          <div className={styles.calendarSection}>
            <div className={styles.calendarHeader}>
              <h3 className={styles.calendarTitle}>Availability</h3>
              <div className={styles.viewToggle}>
                <button
                  className={`${styles.viewToggleBtn} ${calendarView === 'day' ? styles.active : ''}`}
                  onClick={() => setCalendarView('day')}>
                  Day
                </button>
                <button
                  className={`${styles.viewToggleBtn} ${calendarView === 'week' ? styles.active : ''}`}
                  onClick={() => setCalendarView('week')}>
                  Week
                </button>
              </div>
            </div>

            <div className={styles.calendarNav}>
              <button className={styles.navBtn} onClick={() => navigateDate('prev')}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className={styles.navDate}>{getDateRangeDisplay()}</span>
              <button className={styles.navBtn} onClick={() => navigateDate('next')}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button className={styles.todayBtn} onClick={goToToday}>Today</button>

              <div className={styles.intervalSelector}>
                <span className={styles.intervalLabel}>Interval:</span>
                <select
                  className={styles.intervalSelect}
                  value={slotInterval}
                  onChange={e => setSlotInterval(Number(e.target.value) as SlotInterval)}>
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={60}>1 hour</option>
                </select>
              </div>
            </div>

            <div className={styles.timelineContainer}>
              <div className={styles.timeline}>
                {/* Hour Labels */}
                <div className={styles.timelineHours}>
                  {hourLabels.map(hour => (
                    <span key={hour} className={styles.hourLabel}>{hour}</span>
                  ))}
                </div>

                {/* Days */}
                <div className={styles.timelineDays}>
                  {slotsLoading ? (
                    <div className={styles.loadingState}>
                      <div className={styles.spinner} />
                      <span>Loading availability...</span>
                    </div>
                  ) : (
                    calendarDays.map(day => (
                      <div key={day.date.toISOString()} className={styles.timelineDay}>
                        <div className={`${styles.dayLabel} ${day.isToday ? styles.today : ''}`}>
                          {day.dayName}<br />{day.dayNumber}
                        </div>
                        <div className={styles.daySlots}>
                          {day.slots.map(slot => {
                            const slotType = getSlotType(slot)
                            const rangePosition = getSlotRangePosition(slot)
                            const slotClasses = [
                              styles.slot,
                              slotType === 'available' && styles.slotAvailable,
                              slotType === 'unavailable' && styles.slotUnavailable,
                              slotType === 'booked' && styles.slotBooked,
                              slotType === 'myBooking' && styles.slotMyBooking,
                              slotType === 'selected' && styles.slotSelected,
                              slotType === 'inRange' && styles.slotInRange,
                              rangePosition === 'start' && styles.slotRangeStart,
                              rangePosition === 'middle' && styles.slotRangeMiddle,
                              rangePosition === 'end' && styles.slotRangeEnd,
                            ].filter(Boolean).join(' ')

                            const tooltip = slotType === 'myBooking'
                              ? `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)} (My Booking - click to view)`
                              : slotType === 'booked'
                              ? `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)} (Booked by others)`
                              : slotType === 'unavailable'
                              ? `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)} (Not available)`
                              : `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`

                            return (
                              <div
                                key={slot.id}
                                className={slotClasses}
                                style={getSlotStyle(slot)}
                                onMouseDown={(e) => handleSlotMouseDown(slot, e)}
                                onMouseEnter={() => handleSlotMouseEnter(slot)}
                                onMouseUp={() => handleSlotMouseUp(slot)}
                                title={tooltip}>
                                {getSlotLabel(slot)}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className={styles.timelineLegend}>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendDotAvailable}`} />
                Available
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendDotUnavailable}`} />
                Not bookable
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendDotBooked}`} />
                Booked
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendDotMyBooking}`} />
                My Booking
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendDotSelected}`} />
                Selected
              </div>
            </div>
          </div>
        </div>

        {/* Booking Sidebar */}
        <div className={styles.bookingSidebar}>
          <div className={styles.sidebarHeader}>
            <h3 className={styles.sidebarTitle}>Book This Resource</h3>
          </div>

          <div className={styles.sidebarBody}>
            {/* Selected Time */}
            <div className={styles.formSection}>
              <label className={styles.formLabel}>Selected Time</label>
              {selectedSlots.length > 0 ? (
                <div className={styles.selectedSlotCard}>
                  <div className={styles.slotCardBorder} />
                  <div className={styles.slotCardContent}>
                    <div className={styles.slotCardDate}>{formatDateForSidebar(selectedSlots[0].startTime)}</div>
                    <div className={styles.slotCardTime}>
                      {formatTime(selectedSlots[0].startTime)} - {formatTime(selectedSlots[selectedSlots.length - 1].endTime)}
                    </div>
                    <div className={styles.slotCardDuration}>
                      Duration: {calculateDuration(selectedSlots)} minutes
                      {selectedSlots.length > 1 && ` (${selectedSlots.length} slots)`}
                    </div>
                    {validationError && (
                      <div className={styles.slotCardError}>{validationError}</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className={`${styles.selectedSlotCard} ${styles.selectedSlotCardEmpty}`}>
                  <div className={`${styles.slotCardBorder} ${styles.slotCardBorderEmpty}`} />
                  <div className={styles.slotCardContent}>
                    <div className={styles.slotCardEmpty}>Click a slot to select a time, click again to extend</div>
                  </div>
                </div>
              )}
            </div>

            {/* Booking Title */}
            <div className={styles.formSection}>
              <label className={styles.formLabel}>Booking Title</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="e.g., Team Standup Meeting"
                value={bookingTitle}
                onChange={e => setBookingTitle(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className={styles.formSection}>
              <label className={styles.formLabel}>Description (Optional)</label>
              <textarea
                className={`${styles.formInput} ${styles.formTextarea}`}
                placeholder="Add any notes about your booking..."
                value={bookingDescription}
                onChange={e => setBookingDescription(e.target.value)}
              />
            </div>

            {/* Number of Attendees */}
            {resource.capacity && (
              <div className={styles.formSection}>
                <label className={styles.formLabel}>Number of Attendees</label>
                <input
                  type="number"
                  className={styles.formInput}
                  placeholder="1"
                  min={1}
                  max={resource.capacity}
                  value={attendees}
                  onChange={e => setAttendees(Number(e.target.value))}
                />
              </div>
            )}

            {/* Credential Requirement */}
            <div className={styles.credentialSection}>
              <div className={`${styles.credentialBorder} ${hasRequirements ? styles.credentialBorderRequired : ''}`} />
              <div className={styles.credentialContent}>
                <div className={styles.credentialHeader}>
                  <svg
                    className={`${styles.credentialIcon} ${hasRequirements ? styles.credentialIconRequired : ''}`}
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className={styles.credentialTitle}>
                    {hasRequirements ? 'Verification Required' : 'No Verification Required'}
                  </span>
                </div>
                <p className={styles.credentialDesc}>
                  {hasRequirements
                    ? 'This resource requires credential verification before booking.'
                    : "This resource doesn't require credential verification. You can book it directly."}
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              className={styles.submitButton}
              disabled={selectedSlots.length === 0 || !!validationError}
              onClick={handleBookNow}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {hasRequirements ? 'Continue to Verification' : 'Confirm Booking'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookingResourceDetailPage
