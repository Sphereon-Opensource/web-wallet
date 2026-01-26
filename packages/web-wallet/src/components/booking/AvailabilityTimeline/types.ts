import {TimeSlot} from '@typings'

export interface AvailabilityTimelineProps {
  resourceId: string
  /** Show booking blocks with details (admin view) */
  showBookings?: boolean
  /** Handler when a slot is clicked */
  onSlotSelect?: (slot: TimeSlot) => void
  /** Currently selected slots */
  selectedSlots?: TimeSlot[]
  /** Highlight current user's bookings */
  highlightUserBookings?: boolean
  /** Current user ID for highlighting own bookings */
  currentUserId?: string
  /** Admin view shows more details like booking names and users */
  isAdminView?: boolean
  /** Initial date to display */
  initialDate?: Date
  /** Whether to show the navigation controls */
  showControls?: boolean
  /** All slots for this resource (if already loaded) */
  slots?: TimeSlot[]
  /** Loading state */
  isLoading?: boolean
}

export interface DayData {
  date: Date
  dayName: string
  dayNumber: number
  isToday: boolean
  slots: TimeSlot[]
}

export type CalendarView = 'day' | 'week'
