import React, {FC, ReactElement, useCallback, useEffect, useState} from 'react'
import {useNavigate, useSearchParams} from 'react-router-dom'
import {useOne} from '@refinedev/core'
import {CredentialMiniCardView, ProgressStepIndicator, PrimaryButton, SecondaryButton} from '@sphereon/ui-components.ssi-react'
import {CreateElementArgs, QRType, URIData, ValueResult} from '@sphereon/ssi-sdk.qr-code-generator'
import {RotateLoader} from 'react-spinners'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import {BookingDataResource, BookingResource} from '@typings'
import {bookingService} from '@/src/dataProviders/bookingDataProvider'
import {getAgent} from '@/src/agent'
import styles from './verification.module.css'

type VerificationStatus = 'idle' | 'loading' | 'pending' | 'verified' | 'failed' | 'expired'

const BookingVerificationPage: FC = (): ReactElement => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const resourceId = searchParams.get('resourceId')
  const slotId = searchParams.get('slotId')
  const date = searchParams.get('date')
  const title = searchParams.get('title') || ''
  const startTime = searchParams.get('startTime') || ''
  const endTime = searchParams.get('endTime') || ''

  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('idle')
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

  const handleOpenInWallet = () => {
    if (deeplink) {
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

  const handleBack = () => {
    navigate(`/booking/resources/${resourceId}`)
  }

  const handleContinue = () => {
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
          <PrimaryButton caption="Browse Resources" onClick={() => navigate('/booking/resources')} />
        </div>
      </div>
    )
  }

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

          {/* Verification Card */}
          {(verificationStatus === 'loading' || verificationStatus === 'pending') && (
            <div className={styles.verificationCard}>
              <div className={styles.verificationContent}>
                {/* QR Section */}
                <div className={styles.qrSection}>
                  {verificationStatus === 'loading' ? (
                    <div className={styles.qrCode}>
                      <div className={styles.loadingSpinner} />
                    </div>
                  ) : (
                    <>
                      <div className={styles.qrCode}>
                        {qrCodeElement ? (
                          <div className={styles.qrCodeWrapper}>{qrCodeElement}</div>
                        ) : qrUri ? (
                          <div className={styles.qrPlaceholder}>
                            <RotateLoader size={12} color={'#7276F7'} />
                          </div>
                        ) : (
                          <div className={styles.qrPlaceholder}>
                            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <span className={styles.qrLabel}>Scan with your wallet app</span>

                      {/* Deeplink button below QR code */}
                      <div className={styles.orDivider}>
                        <span className={styles.orLine}></span>
                        <span className={styles.orText}>or</span>
                        <span className={styles.orLine}></span>
                      </div>
                      <button className={styles.deeplinkBtn} onClick={handleOpenInWallet}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Open in Wallet App
                      </button>
                    </>
                  )}
                </div>

                {/* Verification Info */}
                <div className={styles.verificationInfo}>
                  <h3 className={styles.verificationTitle}>Required Credentials</h3>
                  <p className={styles.verificationDesc}>Scan the QR code or open your wallet to verify.</p>

                  {/* Requirement List (Credential Minicards) */}
                  <div className={styles.requirementList}>
                    {resource.requirements?.map(req => (
                      <div key={req.id} className={styles.credentialCard}>
                        <div className={styles.credentialMiniCard}>
                          <CredentialMiniCardView backgroundColor="#7276F7" />
                        </div>
                        <div className={styles.credentialInfo}>
                          <span className={styles.credentialName}>{req.description || 'Credential'}</span>
                          <span className={styles.credentialType}>Verifiable Credential</span>
                        </div>
                        {req.isMandatory && <span className={styles.credentialBadge}>Required</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Status Section */}
          {verificationStatus === 'loading' && (
            <div className={styles.statusSection}>
              <div className={styles.statusSpinner} />
              <span className={styles.statusText}>Preparing verification request...</span>
            </div>
          )}

          {verificationStatus === 'pending' && (
            <div className={styles.statusSection}>
              <div className={styles.statusSpinner} />
              <span className={styles.statusText}>Waiting for verification... Please scan the QR code with your wallet.</span>
            </div>
          )}

          {verificationStatus === 'verified' && (
            <div className={`${styles.statusSection} ${styles.statusSuccess}`}>
              <svg className={styles.successIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              <span className={styles.statusText}>Verification successful! Redirecting to confirmation...</span>
            </div>
          )}

          {(verificationStatus === 'failed' || verificationStatus === 'expired') && (
            <div className={`${styles.statusSection} ${styles.statusError}`}>
              <svg className={styles.errorIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
              <span className={styles.statusText}>
                {verificationStatus === 'expired' ? 'Verification expired.' : 'Verification failed.'} {error}
              </span>
              <button className={styles.retryButton} onClick={handleRetry}>
                Try Again
              </button>
            </div>
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
