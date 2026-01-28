import React, {ChangeEvent, FC, ReactElement, useState} from 'react'
import {useTranslate} from '@refinedev/core'
import {CredentialMiniCardView} from '@sphereon/ui-components.ssi-react'
import {CredentialExchangeViewProps} from './types'
import styles from './index.module.css'

const urlRegex =
  /^(https?:\/\/)(([a-z\d]([a-z\d-]*[a-z\d])?\.)+[a-z]{2,}|localhost|([a-z\d]([a-z\d-]*[a-z\d])?\.local)|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(\#[-a-z\d_]*)?$/i

// SVG Icons as components
const QrCodeIcon: FC = () => (
  <svg className={styles.tabIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
)

const LinkIcon: FC = () => (
  <svg className={styles.tabIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
)

const CopyIcon: FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

const CheckIcon: FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const SuccessIcon: FC<{className?: string}> = ({className}) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M9 12l2 2 4-4" />
  </svg>
)

const ErrorIcon: FC<{className?: string}> = ({className}) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M15 9l-6 6M9 9l6 6" />
  </svg>
)

const CredentialExchangeView: FC<CredentialExchangeViewProps> = (props): ReactElement => {
  const {
    mode,
    qrUri,
    deeplink,
    initialTab = 'qr',
    showUrlTab = mode === 'issuance',
    credentials,
    status,
    statusMessage,
    onCopyUrl,
    onOpenInWallet,
    onRetry,
    className,
    qrElement,
    qrLoading = false,
    title,
    subtitle,
    credentialSectionTitle,
  } = props

  const translate = useTranslate()
  const [activeTab, setActiveTab] = useState<'qr' | 'url'>(initialTab)
  const [webWalletAddressValue, setWebWalletAddressValue] = useState<string>('')
  const [copied, setCopied] = useState(false)

  const isUrlValid = webWalletAddressValue.length > 0 && urlRegex.test(webWalletAddressValue)

  const mergeQueryParams = (url1: string, url2: string): string => {
    if (!urlRegex.test(url1)) {
      throw new Error('Web wallet address must be a valid https:// url')
    }
    const webWalletUrl = new URL(url1)
    const walletParams = new URLSearchParams(webWalletUrl.search)
    const queryParamsStartIndex = url2.indexOf('?')
    if (queryParamsStartIndex !== -1) {
      const qrParams = new URLSearchParams(url2.substring(queryParamsStartIndex))
      qrParams.forEach((value, key) => {
        walletParams.set(key, value)
      })
    }
    webWalletUrl.search = walletParams.toString()
    return webWalletUrl.toString()
  }

  const buildWalletUrl = (): string => {
    if (!webWalletAddressValue) {
      throw new Error('Web wallet address must not be empty')
    }
    if (!qrUri) {
      throw new Error('URI unavailable')
    }
    const queryString = qrUri.split('://')[1] ?? ''
    return mergeQueryParams(webWalletAddressValue, queryString)
  }

  const onWebWalletAddressChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setWebWalletAddressValue(('' + event.target.value).trim())
  }

  const handleCopyUrl = async () => {
    try {
      const url = buildWalletUrl()
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      onCopyUrl?.()
    } catch (err) {
      console.error('Failed to copy URL:', err)
    }
  }

  const handleOpenInWallet = () => {
    if (activeTab === 'url' && isUrlValid) {
      const url = buildWalletUrl()
      onOpenInWallet?.(url)
    } else if (deeplink) {
      onOpenInWallet?.(deeplink)
    }
  }

  // Get titles based on mode
  const getCredentialSectionTitle = () => {
    if (credentialSectionTitle) return credentialSectionTitle
    return mode === 'issuance'
      ? translate('credential_exchange_section_issuance', 'Credential to Issue')
      : translate('credential_exchange_section_verification', 'Required Credentials')
  }

  const getSubtitle = () => {
    if (subtitle) return subtitle
    return mode === 'issuance'
      ? translate('credential_exchange_subtitle_issuance', 'Choose how you want to receive your credential')
      : translate('credential_exchange_subtitle_verification', 'Choose how you want to verify your credential')
  }

  // Credential Preview Section
  const renderCredentialPreview = () => {
    if (!credentials || credentials.length === 0) return null

    return (
      <div className={styles.credentialPreview}>
        <div className={styles.credentialPreviewTitle}>{getCredentialSectionTitle()}</div>
        <div className={styles.credentialPreviewList}>
          {credentials.map(cred => (
            <div key={cred.id} className={styles.credentialPreviewItem}>
              <div className={styles.credentialMiniCard}>
                <CredentialMiniCardView backgroundColor={cred.backgroundColor || '#7276F7'} logo={cred.logo} />
              </div>
              <div className={styles.credentialPreviewInfo}>
                <span className={styles.credentialPreviewName}>{cred.name}</span>
                {cred.type && <span className={styles.credentialPreviewType}>{cred.type}</span>}
              </div>
              {cred.isMandatory && (
                <span className={styles.mandatoryBadge}>{translate('credential_exchange_required', 'Required')}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // QR Tab Content
  const renderQrContent = () => (
    <div className={styles.qrContainer}>
      {qrLoading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} />
          <p className={styles.loadingText}>{translate('credential_exchange_loading', 'Generating QR code...')}</p>
        </div>
      ) : qrElement ? (
        <>
          <div className={styles.qrCodeWrapper}>{qrElement}</div>
          <div className={styles.qrInstructions}>
            <p className={styles.qrInstructionsTitle}>
              {translate('credential_exchange_qr_instructions_title', 'Scan with your wallet app')}
            </p>
            <p className={styles.qrInstructionsText}>
              {mode === 'issuance'
                ? translate('credential_exchange_qr_instructions_issuance', 'Open your mobile wallet app and scan this QR code to receive the credential.')
                : translate('credential_exchange_qr_instructions_verification', 'Open your mobile wallet app and scan this QR code to present your credential.')}
            </p>
          </div>
        </>
      ) : (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} />
          <p className={styles.loadingText}>{translate('credential_exchange_loading', 'Generating QR code...')}</p>
        </div>
      )}
    </div>
  )

  // URL Tab Content
  const renderUrlContent = () => (
    <div className={styles.urlContainer}>
      <div className={styles.urlInputWrapper}>
        <label className={styles.urlLabel}>{translate('credential_exchange_url_label', 'Web Wallet Address')}</label>
        <input
          type="text"
          className={styles.urlInput}
          value={webWalletAddressValue}
          onChange={onWebWalletAddressChange}
          placeholder={translate('credential_exchange_url_placeholder', 'https://wallet.example.com') as string}
        />
        <p className={styles.urlHint}>
          {mode === 'issuance'
            ? translate('credential_exchange_url_hint_issuance', 'Enter the URL of your web wallet to generate a direct link for receiving the credential.')
            : translate('credential_exchange_url_hint_verification', 'Enter the URL of your web wallet to generate a direct link for verification.')}
        </p>
      </div>

      {isUrlValid && qrUri && (
        <div className={styles.generatedUrlSection}>
          <span className={styles.generatedUrlLabel}>{translate('credential_exchange_generated_url', 'Generated URL')}</span>
          <div className={styles.generatedUrlBox}>
            <span className={styles.generatedUrl}>{buildWalletUrl()}</span>
            <button
              className={`${styles.copyButton} ${copied ? styles.copyButtonSuccess : ''}`}
              onClick={handleCopyUrl}
              title="Copy URL"
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
          </div>
        </div>
      )}
    </div>
  )

  // Status Indicator
  const renderStatusIndicator = () => {
    if (!status || status === 'idle') return null

    const statusClassName = `${styles.statusSection} ${styles[`status${status.charAt(0).toUpperCase()}${status.slice(1)}`] || ''}`

    return (
      <div className={statusClassName}>
        {(status === 'loading' || status === 'pending') && <div className={styles.statusSpinner} />}
        {status === 'verified' && <SuccessIcon className={`${styles.statusIcon} ${styles.statusIconSuccess}`} />}
        {(status === 'failed' || status === 'expired') && <ErrorIcon className={`${styles.statusIcon} ${styles.statusIconError}`} />}
        <span className={styles.statusText}>
          {statusMessage ||
            (status === 'loading' && translate('credential_exchange_status_loading', 'Preparing...')) ||
            (status === 'pending' && translate('credential_exchange_status_pending', 'Waiting for response...')) ||
            (status === 'verified' && translate('credential_exchange_status_verified', 'Verification successful!')) ||
            (status === 'failed' && translate('credential_exchange_status_failed', 'Verification failed.')) ||
            (status === 'expired' && translate('credential_exchange_status_expired', 'Verification expired.'))}
        </span>
        {(status === 'failed' || status === 'expired') && onRetry && (
          <button className={styles.retryButton} onClick={onRetry}>
            {translate('credential_exchange_retry', 'Try Again')}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={`${styles.container} ${className || ''}`}>
      {/* Credential Preview - Always at top when credentials exist */}
      {renderCredentialPreview()}

      {/* Subtitle - Above tabs */}
      <p className={styles.subtitle}>{getSubtitle()}</p>

      {/* Tabs */}
      {showUrlTab && (
        <>
          <div className={styles.tabsContainer}>
            <button
              className={`${styles.tab} ${activeTab === 'qr' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('qr')}
            >
              <QrCodeIcon />
              {translate('credential_exchange_tab_qr', 'QR Code')}
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'url' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('url')}
            >
              <LinkIcon />
              {translate('credential_exchange_tab_url', 'Wallet URL')}
            </button>
          </div>
          <div className={styles.contentDivider} />
        </>
      )}

      {/* Content */}
      <div className={styles.content}>
        {showUrlTab ? (
          activeTab === 'qr' ? renderQrContent() : renderUrlContent()
        ) : (
          renderQrContent()
        )}
      </div>

      {/* Status Indicator */}
      {renderStatusIndicator()}
    </div>
  )
}

export default CredentialExchangeView
export {CredentialExchangeView}
export type {CredentialExchangeViewProps, CredentialExchangeMode, CredentialExchangeStatus, CredentialPreviewItem} from './types'
