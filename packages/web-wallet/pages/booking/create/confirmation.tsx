import React, {FC, ReactElement, useEffect, useState} from 'react'
import {useNavigate, useSearchParams} from 'react-router-dom'
import {useCreate, useOne} from '@refinedev/core'
import {ProgressStepIndicator, PrimaryButton, SecondaryButton} from '@sphereon/ui-components.ssi-react'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import {BookingDataResource, BookingResource} from '@typings'
import styles from './confirmation.module.css'

const BookingConfirmationPage: FC = (): ReactElement => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const resourceId = searchParams.get('resourceId')
  const slotId = searchParams.get('slotId')
  const date = searchParams.get('date')
  const title = searchParams.get('title') || ''
  const startTime = searchParams.get('startTime') || ''
  const endTime = searchParams.get('endTime') || ''
  const verified = searchParams.get('verified')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingComplete, setBookingComplete] = useState(false)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const {mutate: createBooking} = useCreate()

  // Fetch resource details
  const {data: resourceData, isLoading: resourceLoading} = useOne<BookingResource>({
    resource: BookingDataResource.RESOURCES,
    id: resourceId!,
    queryOptions: {enabled: !!resourceId},
  })

  const resource = resourceData?.data

  // Get slot details from the service (mock)
  const [slotDetails, setSlotDetails] = useState<{startTime: Date; endTime: Date} | null>(null)

  useEffect(() => {
    if (resourceId && date) {
      // Use startTime/endTime from URL params if available
      if (startTime && endTime) {
        const slotDate = new Date(date)
        const [startH, startM] = startTime.split(':').map(Number)
        const [endH, endM] = endTime.split(':').map(Number)
        const start = new Date(slotDate)
        start.setHours(startH, startM, 0, 0)
        const end = new Date(slotDate)
        end.setHours(endH, endM, 0, 0)
        setSlotDetails({startTime: start, endTime: end})
      } else {
        // Fallback: simulate slot details from slotId
        const slotIndex = parseInt(slotId?.split('-')[1] || '0', 10)
        const slotDate = new Date(date)
        const startHour = 8 + Math.floor(slotIndex / 2)
        const startMinute = (slotIndex % 2) * 30
        slotDate.setHours(startHour, startMinute, 0, 0)
        const endDate = new Date(slotDate)
        endDate.setMinutes(endDate.getMinutes() + 30)
        setSlotDetails({startTime: slotDate, endTime: endDate})
      }
    }
  }, [resourceId, date, slotId, startTime, endTime])

  const hasVerificationStep = resource?.requirements && resource.requirements.length > 0

  // Generate steps based on whether verification is required
  const steps = hasVerificationStep
    ? [
        {title: 'Select Time', description: 'Choose your slot'},
        {title: 'Verify Credentials', description: 'Prove eligibility'},
        {title: 'Confirmation', description: 'Review & confirm'},
      ]
    : [
        {title: 'Select Time', description: 'Choose your slot'},
        {title: 'Confirmation', description: 'Review & confirm'},
      ]

  const currentStep = bookingComplete ? steps.length : steps.length

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  const handleConfirmBooking = async () => {
    if (!resourceId || !slotId || !date || !slotDetails) return

    setIsSubmitting(true)
    setError(null)

    createBooking(
      {
        resource: BookingDataResource.BOOKINGS,
        values: {
          resourceId,
          title: title || `Booking - ${resource?.name}`,
          startTime: slotDetails.startTime.toISOString(),
          endTime: slotDetails.endTime.toISOString(),
          status: 'CONFIRMED',
          bookingType: 'USER_RESERVATION',
        },
      },
      {
        onSuccess: data => {
          setBookingId(data.data?.id?.toString() || 'booking-new-' + Date.now())
          setBookingComplete(true)
          setIsSubmitting(false)
        },
        onError: err => {
          console.error('Failed to create booking:', err)
          setError(err.message || 'Failed to create booking. Please try again.')
          setIsSubmitting(false)
        },
      },
    )
  }

  const handleViewBookings = () => {
    navigate('/booking/my-bookings')
  }

  const handleBookAnother = () => {
    navigate('/booking/resources')
  }

  const handleBack = () => {
    if (resource?.requirements && resource.requirements.length > 0) {
      navigate(-1)
    } else {
      navigate(`/booking/resources/${resourceId}`)
    }
  }

  if (resourceLoading) {
    return (
      <div className={styles.container}>
        <PageHeaderBar path={`Booking / ${resource?.name || 'Loading...'}`} />
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner} />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!resource) {
    return (
      <div className={styles.container}>
        <PageHeaderBar path="Booking / Not Found" />
        <div className={styles.errorState}>
          <h3>Resource not found</h3>
          <PrimaryButton caption="Browse Resources" onClick={() => navigate('/booking/resources')} />
        </div>
      </div>
    )
  }

  if (bookingComplete) {
    return (
      <div className={styles.container}>
        <PageHeaderBar path={`Booking / ${resource.name} / Complete`} />
        <div className={styles.contentContainer}>
          <div className={styles.outletContainer}>
            {/* Success Content */}
            <div className={styles.successCard}>
              <div className={styles.successIcon}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <h2 className={styles.successTitle}>Booking Confirmed!</h2>
              <p className={styles.successSubtitle}>Your booking has been successfully created.</p>

              <div className={styles.summaryCard}>
                <div className={styles.summaryGrid}>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Resource</span>
                    <span className={styles.summaryValue}>{resource.name}</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Category</span>
                    <span className={styles.summaryValue}>{resource.category?.name || 'General'}</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Date</span>
                    <span className={styles.summaryValue}>{formatDate(date!)}</span>
                  </div>
                  {slotDetails && (
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Time</span>
                      <span className={styles.summaryValue}>
                        {formatTime(slotDetails.startTime)} - {formatTime(slotDetails.endTime)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.successActions}>
                <PrimaryButton caption="View My Bookings" onClick={handleViewBookings} style={{width: '100%'}} />
                <SecondaryButton caption="Book Another Resource" onClick={handleBookAnother} style={{width: '100%'}} />
              </div>
            </div>
          </div>
          <ProgressStepIndicator steps={steps} activeStep={currentStep} />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <PageHeaderBar path={`Booking / ${resource.name} / Confirmation`} />

      <div className={styles.contentContainer}>
        <div className={styles.outletContainer}>
          {/* Step Header */}
          <div className={styles.stepHeader}>
            <h2 className={styles.stepHeaderTitle}>Review & Confirm</h2>
            <p className={styles.stepHeaderSubtitle}>Please review the details before confirming your booking.</p>
          </div>

          {/* Booking Summary Card */}
          <div className={styles.summaryCard}>
            <h3 className={styles.cardTitle}>Booking Details</h3>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Resource</span>
                <span className={styles.summaryValue}>{resource.name}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Category</span>
                <span className={styles.summaryValue}>{resource.category?.name || 'General'}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Date</span>
                <span className={styles.summaryValue}>{formatDate(date!)}</span>
              </div>
              {slotDetails && (
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Time</span>
                  <span className={styles.summaryValue}>
                    {formatTime(slotDetails.startTime)} - {formatTime(slotDetails.endTime)}
                  </span>
                </div>
              )}
              {title && (
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Title</span>
                  <span className={styles.summaryValue}>{title}</span>
                </div>
              )}
              {verified === 'true' && (
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Verification</span>
                  <span className={`${styles.summaryValue} ${styles.verified}`}>Credentials Verified</span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className={styles.errorMessage}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Button Row */}
          <div className={styles.buttonsContainer}>
            <SecondaryButton caption="Back" onClick={handleBack} disabled={isSubmitting} style={{width: 109}} />
            <PrimaryButton
              caption={isSubmitting ? 'Creating...' : 'Confirm Booking'}
              onClick={handleConfirmBooking}
              disabled={isSubmitting}
              style={{width: 180, marginLeft: 'auto'}}
            />
          </div>
        </div>

        <ProgressStepIndicator steps={steps} activeStep={currentStep} />
      </div>
    </div>
  )
}

export default BookingConfirmationPage
