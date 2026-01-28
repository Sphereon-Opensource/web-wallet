import React, {FC, ReactElement, useCallback, useEffect, useState} from 'react'
import {useNavigate, useSearchParams} from 'react-router-dom'
import {useOne} from '@refinedev/core'
import {ProgressStepIndicator, PrimaryButton, SecondaryButton} from '@sphereon/ui-components.ssi-react'
import {CreateElementArgs, QRType, URIData, ValueResult} from '@sphereon/ssi-sdk.qr-code-generator'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import {CredentialExchangeView, CredentialExchangeStatus, CredentialPreviewItem} from '@components/views/CredentialExchangeView'
import {BookingDataResource, BookingResource} from '@typings'
import {bookingService} from '@/src/dataProviders/bookingDataProvider'
import {getAgent} from '@/src/agent'
import styles from './verification.module.css'

const BookingVerificationPage: FC = (): ReactElement => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const resourceId = searchParams.get('resourceId')
  const slotId = searchParams.get('slotId')
  const date = searchParams.get('date')
  const title = searchParams.get('title') || ''
  const startTime = searchParams.get('startTime') || ''
  const endTime = searchParams.get('endTime') || ''

  const [verificationStatus, setVerificationStatus] = useState<CredentialExchangeStatus>('idle')
  const [qrUri, setQrUri] = useState<string | null>(null)
  const [deeplink, setDeeplink] = useState<string | null>(null)
  const [verificationId, setVerificationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [qrCodeElement, setQrCodeElement] = useState<ReactElement | null>(null)

  // Fetch resource details
  const {data: resourceData, isLoading: resourceLoading} = useOne<BookingResource>({
    resource: BookingDataResource.RESOURCES,
    id: resourceId!,
    queryOptions: {enabled: !!resourceId},
  })

  const resource = resourceData?.data

  const steps = [
    {title: 'Select Time', description: 'Choose your slot'},
    {title: 'Verify Credentials', description: 'Prove eligibility'},
    {title: 'Confirmation', description: 'Review & confirm'},
  ]

  const currentStep = 2 // Verification is step 2

  // Start verification process
  const startVerification = useCallback(async () => {
    if (!resourceId || !resource?.requirements?.length) return

    setVerificationStatus('loading')
    setError(null)

    try {
      const result = await bookingService.startVerification(resourceId)
      setQrUri(result.qrUri)
      setDeeplink(result.deeplink)
      setVerificationId(result.verificationId)
      setVerificationStatus('pending')
    } catch (err) {
      console.error('Failed to start verification:', err)
      setError('Failed to start verification process. Please try again.')
      setVerificationStatus('failed')
    }
  }, [resourceId, resource?.requirements?.length])

  // Poll verification status
  useEffect(() => {
    if (verificationStatus !== 'pending' || !verificationId) return

    const pollInterval = setInterval(async () => {
      try {
        const status = await bookingService.getVerificationStatus(verificationId)
        if (status.status === 'VERIFIED') {
          setVerificationStatus('verified')
          clearInterval(pollInterval)
          // Navigate to confirmation after brief delay
          setTimeout(() => {
            const params = new URLSearchParams({
              resourceId: resourceId!,
              slotId: slotId!,
              date: date!,
              title,
              startTime,
              endTime,
              verified: 'true',
            })
            navigate(`/booking/create/confirmation?${params.toString()}`)
          }, 1500)
        } else if (status.status === 'FAILED') {
          setVerificationStatus('failed')
          setError('Verification failed. Please try again.')
          clearInterval(pollInterval)
        } else if (status.status === 'EXPIRED') {
          setVerificationStatus('expired')
          setError('Verification expired. Please start again.')
          clearInterval(pollInterval)
        }
      } catch (err) {
        console.error('Failed to check verification status:', err)
      }
    }, 2000)

    return () => clearInterval(pollInterval)
  }, [verificationStatus, verificationId, resourceId, slotId, date, title, startTime, endTime, navigate])

  // Start verification when resource loads
  useEffect(() => {
    if (resource && resource.requirements && resource.requirements.length > 0 && verificationStatus === 'idle') {
      startVerification()
    }
  }, [resource, verificationStatus, startVerification])

  // Render QR code when qrUri is available
  useEffect(() => {
    if (!qrUri || !verificationId) {
      setQrCodeElement(null)
      return
    }

    const renderQRCode = async () => {
      try {
        const agent = getAgent()
        const qrProps: CreateElementArgs<QRType.URI, URIData> = {
          data: {
            type: QRType.URI,
            object: qrUri,
            id: verificationId,
          },
          onGenerate: (result: ValueResult<QRType.URI, URIData>) => {
            console.log('[Verification] QR code generated:', result.id)
          },
          renderingProps: {
            fgColor: '#051349',
            level: 'L',
            size: 200,
          },
        }
        const qrElement = await agent.qrURIElement(qrProps)
        setQrCodeElement(qrElement)
      } catch (err) {
        console.error('[Verification] Failed to render QR code:', err)
        setQrCodeElement(null)
      }
    }

    renderQRCode()
  }, [qrUri, verificationId])

  // If no requirements, skip verification
  useEffect(() => {
    if (resource && (!resource.requirements || resource.requirements.length === 0)) {
      const params = new URLSearchParams({
        resourceId: resourceId!,
        slotId: slotId!,
        date: date!,
        title,
        startTime,
        endTime,
        verified: 'false',
      })
      navigate(`/booking/create/confirmation?${params.toString()}`, {replace: true})
    }
  }, [resource, resourceId, slotId, date, title, startTime, endTime, navigate])

  const handleOpenInWallet = (url: string) => {
    if (url) {
      window.location.href = url
    } else if (deeplink) {
      window.location.href = deeplink
    }
  }

  const handleRetry = () => {
    setVerificationStatus('idle')
    setQrUri(null)
    setDeeplink(null)
    setVerificationId(null)
    setError(null)
    startVerification()
  }

  const handleSkip = () => {
    // Allow skipping for demo purposes - in production this would be disabled
    const params = new URLSearchParams({
      resourceId: resourceId!,
      slotId: slotId!,
      date: date!,
      title,
      startTime,
      endTime,
      verified: 'skipped',
    })
    navigate(`/booking/create/confirmation?${params.toString()}`)
  }

  const handleBack = async () => {
    navigate(`/booking/resources/${resourceId}`)
  }

  const handleContinue = async () => {
    const params = new URLSearchParams({
      resourceId: resourceId!,
      slotId: slotId!,
      date: date!,
      title,
      startTime,
      endTime,
      verified: 'true',
    })
    navigate(`/booking/create/confirmation?${params.toString()}`)
  }

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'})
  }

  // Format time slot display
  const formatTimeSlot = () => {
    if (startTime && endTime) {
      return `${startTime} - ${endTime}`
    }
    return 'Selected time slot'
  }

  // Build credential preview items from requirements
  const credentialPreviewItems: CredentialPreviewItem[] =
    resource?.requirements?.map(req => ({
      id: req.id,
      name: req.description || 'Credential',
      type: 'Verifiable Credential',
      backgroundColor: '#7276F7',
      isMandatory: req.isMandatory,
    })) || []

  // Build status message
  const getStatusMessage = (): string => {
    if (error) return error
    switch (verificationStatus) {
      case 'loading':
        return 'Preparing verification request...'
      case 'pending':
        return 'Waiting for verification... Please scan the QR code with your wallet.'
      case 'verified':
        return 'Verification successful! Redirecting to confirmation...'
      case 'failed':
        return 'Verification failed.'
      case 'expired':
        return 'Verification expired.'
      default:
        return ''
    }
  }

  if (resourceLoading) {
    return (
      <div className={styles.container}>
        <PageHeaderBar path="Booking / Verification" />
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
          <PrimaryButton caption="Browse Resources" onClick={async () => navigate('/booking/resources')} />
        </div>
      </div>
    )
  }

  // Show CredentialExchangeView for all active states
  const showExchangeView = verificationStatus !== 'idle'

  return (
    <div className={styles.container}>
      <PageHeaderBar path={`Booking / ${resource.name} / Verification`} />

      <div className={styles.contentContainer}>
        <div className={styles.outletContainer}>
          {/* Step Header */}
          <div className={styles.stepHeader}>
            <h2 className={styles.stepHeaderTitle}>Verify Your Credentials</h2>
            <p className={styles.stepHeaderSubtitle}>
              {resource.name} &bull; {formatDate(date || '')} &bull; {formatTimeSlot()}
            </p>
          </div>

          {/* Credential Exchange View */}
          {showExchangeView && (
            <CredentialExchangeView
              mode="verification"
              qrUri={qrUri || ''}
              deeplink={deeplink || undefined}
              showUrlTab={true}
              qrElement={qrCodeElement}
              qrLoading={verificationStatus === 'loading' || !qrCodeElement}
              credentials={credentialPreviewItems}
              status={verificationStatus}
              statusMessage={getStatusMessage()}
              onOpenInWallet={handleOpenInWallet}
              onRetry={handleRetry}
            />
          )}

          {/* Button Row */}
          <div className={styles.buttonsContainer}>
            <SecondaryButton caption="Back" onClick={handleBack} style={{width: 109}} />
            {verificationStatus === 'pending' && (
              <button className={styles.skipButton} onClick={handleSkip}>
                Skip for now (Demo)
              </button>
            )}
            <PrimaryButton
              caption="Continue"
              onClick={handleContinue}
              disabled={verificationStatus !== 'verified'}
              style={{width: 180, marginLeft: 'auto'}}
            />
          </div>
        </div>

        <ProgressStepIndicator steps={steps} activeStep={currentStep} />
      </div>
    </div>
  )
}

export default BookingVerificationPage
