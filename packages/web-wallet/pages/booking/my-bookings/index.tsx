import React, {FC, ReactElement, useMemo, useState, useCallback} from 'react'
import {useList, useInvalidate} from '@refinedev/core'
import {useNavigate} from 'react-router-dom'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import {ListPageHeader, TabItem} from '@components/tables'
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal'
import {Booking, BookingDataResource} from '@typings'
import {bookingService} from '@/src/dataProviders/bookingDataProvider'
import styles from './index.module.css'

type StatusFilter = 'all' | 'upcoming' | 'past' | 'cancelled'

const STATUS_TABS: {value: StatusFilter; label: string}[] = [
  {value: 'upcoming', label: 'Upcoming'},
  {value: 'past', label: 'Past'},
  {value: 'cancelled', label: 'Cancelled'},
  {value: 'all', label: 'All'},
]

const MyBookingsPage: FC = (): ReactElement => {
  const navigate = useNavigate()
  const invalidate = useInvalidate()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('upcoming')
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

  // Fetch user's bookings
  const {data: bookingsData, isLoading} = useList<Booking>({
    resource: BookingDataResource.BOOKINGS,
    pagination: {pageSize: 100},
  })

  const bookings = bookingsData?.data ?? []

  // Filter bookings by status
  const getFilteredBookings = useCallback(
    (filter: StatusFilter): Booking[] => {
      const now = new Date()
      return bookings.filter(booking => {
        const startTime = new Date(booking.startTime)
        switch (filter) {
          case 'upcoming':
            return startTime > now && booking.status !== 'CANCELLED'
          case 'past':
            return startTime <= now && booking.status !== 'CANCELLED'
          case 'cancelled':
            return booking.status === 'CANCELLED'
          default:
            return true
        }
      })
    },
    [bookings],
  )

  const filteredBookings = useMemo(() => getFilteredBookings(statusFilter), [getFilteredBookings, statusFilter])

  // Get count for each status
  const getStatusCount = useCallback(
    (status: StatusFilter): number => {
      return getFilteredBookings(status).length
    },
    [getFilteredBookings],
  )

  // Build tabs for ListPageHeader
  const headerTabs: TabItem[] = useMemo(() => {
    return STATUS_TABS.map(tab => ({
      id: tab.value,
      label: tab.label,
      count: getStatusCount(tab.value),
      icon:
        tab.value === 'upcoming' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        ) : tab.value === 'past' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        ) : tab.value === 'cancelled' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        ),
    }))
  }, [getStatusCount])

  const formatDateTime = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDateRange = (start: string, end: string): string => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const startStr = startDate.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', hour12: false})
    const endStr = endDate.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', hour12: false})
    return `${startStr} - ${endStr}`
  }

  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'CONFIRMED':
        return styles.statusConfirmed
      case 'PENDING':
        return styles.statusPending
      case 'CANCELLED':
        return styles.statusCancelled
      case 'COMPLETED':
        return styles.statusCompleted
      default:
        return ''
    }
  }

  const handleViewResource = (resourceId: string) => {
    navigate(`/booking/resources/${resourceId}`)
  }

  const handleCancelClick = (booking: Booking) => {
    setBookingToCancel(booking)
    setCancelModalOpen(true)
  }

  const handleCancelConfirm = async () => {
    if (!bookingToCancel) return

    setIsCancelling(true)
    try {
      await bookingService.cancelBooking(bookingToCancel.id)
      // Refresh the bookings list
      await invalidate({
        resource: BookingDataResource.BOOKINGS,
        invalidates: ['list'],
      })
      setCancelModalOpen(false)
      setBookingToCancel(null)
    } catch (error) {
      console.error('Failed to cancel booking:', error)
      // TODO: Show error toast
    } finally {
      setIsCancelling(false)
    }
  }

  const handleCancelModalClose = () => {
    setCancelModalOpen(false)
    setBookingToCancel(null)
  }

  return (
    <div className={styles.container}>
      <AppHeaderBar title="My Bookings" />

      <div className={styles.mainLayout}>
        <div className={styles.contentArea}>
          {/* Header with tabs */}
          <ListPageHeader
            tabs={headerTabs}
            activeTab={statusFilter}
            onTabChange={tabId => setStatusFilter(tabId as StatusFilter)}
          />

          {/* Bookings List */}
          <div className={styles.content}>
            {isLoading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner} />
                <p>Loading your bookings...</p>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                </div>
                <div className={styles.emptyStateTitle}>No bookings found</div>
                <div className={styles.emptyStateDescription}>
                  {statusFilter === 'upcoming'
                    ? "You don't have any upcoming bookings"
                    : statusFilter === 'past'
                      ? "You don't have any past bookings"
                      : statusFilter === 'cancelled'
                        ? "You don't have any cancelled bookings"
                        : "You haven't made any bookings yet"}
                </div>
                <button className={styles.emptyStateButton} onClick={() => navigate('/booking/resources')}>
                  Browse Resources
                </button>
              </div>
            ) : (
              <div className={styles.bookingsList}>
                {filteredBookings.map(booking => (
                  <div key={booking.id} className={styles.bookingCard}>
                    <div className={styles.bookingHeader}>
                      <div className={styles.bookingDate}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <path d="M16 2v4M8 2v4M3 10h18" />
                        </svg>
                        <span>{formatDateTime(booking.startTime)}</span>
                      </div>
                      <span className={`${styles.statusBadge} ${getStatusClass(booking.status)}`}>{booking.status}</span>
                    </div>

                    <div className={styles.bookingBody}>
                      <h3 className={styles.bookingTitle}>{booking.title || 'Untitled Booking'}</h3>
                      {booking.resource && (
                        <div className={styles.resourceInfo}>
                          <span className={styles.resourceName}>{booking.resource.name}</span>
                          {booking.resource.category && (
                            <span className={styles.categoryBadge}>{booking.resource.category.name}</span>
                          )}
                        </div>
                      )}
                      <div className={styles.bookingMeta}>
                        <div className={styles.metaItem}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6l4 2" />
                          </svg>
                          <span>{formatDateRange(booking.startTime, booking.endTime)}</span>
                        </div>
                        {booking.proofStatus !== 'NOT_REQUIRED' && (
                          <div className={styles.metaItem}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                              {booking.proofStatus === 'VERIFIED' && <path d="M9 12l2 2 4-4" />}
                            </svg>
                            <span>{booking.proofStatus === 'VERIFIED' ? 'Verified' : 'Verification pending'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.bookingActions}>
                      {booking.resource && (
                        <button className={styles.secondaryButton} onClick={() => handleViewResource(booking.resource!.id)}>
                          View Resource
                        </button>
                      )}
                      {booking.status === 'CONFIRMED' && new Date(booking.startTime) > new Date() && (
                        <button className={styles.dangerButton} onClick={() => handleCancelClick(booking)}>
                          Cancel Booking
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Booking Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={cancelModalOpen}
        onCancel={handleCancelModalClose}
        onConfirm={handleCancelConfirm}
        isLoading={isCancelling}
        title="Cancel Booking"
        message={
          bookingToCancel
            ? `Are you sure you want to cancel "${bookingToCancel.title || 'this booking'}" for ${bookingToCancel.resource?.name || 'this resource'}?`
            : 'Are you sure you want to cancel this booking?'
        }
        confirmText="Cancel Booking"
      />
    </div>
  )
}

export default MyBookingsPage
