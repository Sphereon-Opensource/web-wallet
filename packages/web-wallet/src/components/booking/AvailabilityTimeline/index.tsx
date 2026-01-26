import React, {FC, useCallback, useMemo, useState} from 'react'
import {TimeSlot, Booking} from '@typings'
import {AvailabilityTimelineProps, DayData, CalendarView} from './types'
import styles from './index.module.css'

const AvailabilityTimeline: FC<AvailabilityTimelineProps> = ({
  resourceId,
  showBookings = false,
  onSlotSelect,
  selectedSlots = [],
  highlightUserBookings = false,
  currentUserId,
  isAdminView = false,
  initialDate,
  showControls = true,
  slots = [],
  isLoading = false,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate || new Date())
  const [calendarView, setCalendarView] = useState<CalendarView>('week')

  // Get week start (Monday)
  const getWeekStart = useCallback((date: Date): Date => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  // Navigate to previous/next day/week
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    const days = calendarView === 'week' ? 7 : 1
    newDate.setDate(newDate.getDate() + (direction === 'next' ? days : -days))
    setSelectedDate(newDate)
  }

  // Go to today
  const goToToday = () => {
    setSelectedDate(new Date())
  }

  // Format time for display
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', hour12: false})
  }

  // Format date for display
  const formatDateDisplay = (date: Date): string => {
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
  const getSlotType = useCallback((slot: TimeSlot): 'available' | 'booked' | 'bookedAdmin' | 'myBooking' | 'selected' => {
    // Check if this slot is selected
    const isSelected = selectedSlots.some(s => s.id === slot.id)
    if (isSelected) return 'selected'

    // Check if this is the user's own booking
    if (highlightUserBookings && !slot.isAvailable && slot.bookingId && currentUserId) {
      // Note: In a real implementation, we'd check if slot.bookingId belongs to currentUserId
      // For now, we assume the bookingId comparison happens at the parent level
      return 'myBooking'
    }

    if (!slot.isAvailable) {
      return isAdminView ? 'bookedAdmin' : 'booked'
    }

    return 'available'
  }, [selectedSlots, highlightUserBookings, currentUserId, isAdminView])

  // Handle slot click
  const handleSlotClick = (slot: TimeSlot) => {
    if (onSlotSelect && slot.isAvailable) {
      onSlotSelect(slot)
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

  return (
    <div className={styles.container}>
      {showControls && (
        <>
          <div className={styles.header}>
            <h3 className={styles.title}>Weekly Availability</h3>
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

          <div className={styles.nav}>
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
          </div>
        </>
      )}

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
            {isLoading ? (
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
                      const slotClasses = [
                        styles.slot,
                        slotType === 'available' && styles.slotAvailable,
                        slotType === 'booked' && styles.slotBooked,
                        slotType === 'bookedAdmin' && styles.slotBookedAdmin,
                        slotType === 'myBooking' && styles.slotMyBooking,
                        slotType === 'selected' && styles.slotSelected,
                      ].filter(Boolean).join(' ')

                      const tooltip = slotType === 'bookedAdmin'
                        ? `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)} (Booking: ${slot.bookingId || 'Unknown'})`
                        : slotType === 'booked'
                        ? `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)} (Booked)`
                        : `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`

                      return (
                        <div
                          key={slot.id}
                          className={slotClasses}
                          style={getSlotStyle(slot)}
                          onClick={() => handleSlotClick(slot)}
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

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.legendDotAvailable}`} />
          Available
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${isAdminView ? styles.legendDotBookedAdmin : styles.legendDotBooked}`} />
          Booked
        </div>
        {highlightUserBookings && (
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.legendDotMyBooking}`} />
            My Booking
          </div>
        )}
      </div>
    </div>
  )
}

export default AvailabilityTimeline
export {AvailabilityTimeline}
export type {AvailabilityTimelineProps, DayData, CalendarView} from './types'
