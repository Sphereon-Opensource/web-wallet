import React, {ChangeEvent, FC, ReactElement, useEffect, useState} from 'react'
import {useTranslate} from '@refinedev/core'
import {CreateElementArgs, QRRenderingProps, QRType, URIData, ValueResult} from '@sphereon/ssi-sdk.qr-code-generator'
import {RotateLoader} from 'react-spinners'
import Debug, {Debugger} from 'debug'
import {getAgent} from '../../../agent'
import style from './index.module.css'

const debug: Debugger = Debug('sphereon:ui-components:credential-offer')

export type QRValueResult = {
  id: string
  uriValue: string
  expiryInSec?: number
  onExpiry: (expired: QRValueResult) => Promise<void>
}

interface Props {
  initialTab: 'qr' | 'url'
  rendering?: QRRenderingProps
  defaultExpiryInSec?: number
  qrValueGenerator: (args: {} & Record<string, any>) => Promise<QRValueResult>
  onClose: () => Promise<void>
  onSubmitQr?: () => Promise<void>
  onSubmitUrl?: (walletUrl: string) => Promise<void>
}

const urlRegex =
  /^(https?:\/\/)(([a-z\d]([a-z\d-]*[a-z\d])?\.)+[a-z]{2,}|localhost|([a-z\d]([a-z\d-]*[a-z\d])?\.local)|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(\#[-a-z\d_]*)?$/i

const CredentialOfferModal: FC<Props> = (props: Props): ReactElement => {
  const {qrValueGenerator, onClose, onSubmitQr, onSubmitUrl, initialTab} = props
  const translate = useTranslate()

  const [activeTab, setActiveTab] = useState<'qr' | 'url'>(initialTab)
  const [qrCodeElement, setQrCodeElement] = useState<ReactElement>()
  const [qrValue, setQrValue] = useState<QRValueResult | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [webWalletAddressValue, setWebWalletAddressValue] = useState<string>('')
  const [copied, setCopied] = useState(false)

  function createQRCodeElement(): CreateElementArgs<QRType.URI, URIData> {
    if (!qrValue) {
      throw Error('No QR value present')
    }
    const {id, uriValue} = qrValue
    const qrProps: CreateElementArgs<QRType.URI, URIData> = {
      data: {
        type: QRType.URI,
        object: uriValue,
        id,
      },
      onGenerate: (result: ValueResult<QRType.URI, URIData>) => {
        debug(JSON.stringify(result))
      },
      renderingProps: {
        fgColor: '#051349',
        level: 'L',
        size: 240,
        ...props.rendering,
      },
    }
    debug(`QR elements; props: `, qrProps)
    return qrProps
  }

  useEffect(() => {
    const renderQRCode = () => {
      getAgent()
        .qrURIElement(createQRCodeElement())
        .then((code: ReactElement) => setQrCodeElement(code))
        .catch((error) => {
          debug(error)
          setError(error)
        })
    }
    if (!qrValue) {
      return
    }
    renderQRCode()
    return () => {
      if (typeof qrValue?.onExpiry === 'function') {
        qrValue.onExpiry(qrValue)
      }
    }
  }, [qrValue])

  useEffect(() => {
    if (!qrValue) {
      qrValueGenerator({})
        .then((newQrValue) => {
          setQrValue(newQrValue)
        })
        .catch((err) => {
          setError(err)
        })
    }
  }, [qrValue, qrValueGenerator])

  function mergeQueryParams(url1: string, url2: string) {
    if (!urlRegex.test(url1)) {
      throw new Error('Web wallet address must be a valid https:// url')
    }
    const webWalletUrl = new URL(url1)
    const walletParams = new URLSearchParams(webWalletUrl.search)
    const queryParamsStartIndex = url2.indexOf('?')
    const qrParams = new URLSearchParams(url2.substring(queryParamsStartIndex))
    qrParams.forEach((value, key) => {
      walletParams.set(key, value)
    })
    webWalletUrl.search = walletParams.toString()
    return webWalletUrl.toString()
  }

  const buildCredentialOfferURI = (): string => {
    if (!webWalletAddressValue) {
      throw new Error('Web wallet address must not be empty')
    }
    if (!qrValue || !qrValue.uriValue) {
      throw new Error('Credential offer URI unavailable')
    }
    const queryString = qrValue.uriValue.split('://')[1] ?? ''
    return mergeQueryParams(webWalletAddressValue, queryString)
  }

  const onWebWalletAddressChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setWebWalletAddressValue(('' + event.target.value).trim())
  }

  const handleCopyUrl = async () => {
    try {
      const url = buildCredentialOfferURI()
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy URL:', err)
    }
  }

  const isUrlValid = webWalletAddressValue.length > 0 && urlRegex.test(webWalletAddressValue)

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className={style.overlay} onClick={handleOverlayClick}>
      <div className={style.modal}>
        {/* Header */}
        <div className={style.header}>
          <div className={style.headerContent}>
            <h2 className={style.title}>{translate('credential_offer_modal_title', 'Get Your Credential')}</h2>
            <p className={style.subtitle}>{translate('credential_offer_modal_subtitle', 'Choose how you want to receive your credential')}</p>
          </div>
          <button className={style.closeButton} onClick={() => onClose()} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className={style.tabsContainer}>
          <button className={`${style.tab} ${activeTab === 'qr' ? style.tabActive : ''}`} onClick={() => setActiveTab('qr')}>
            <svg className={style.tabIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            {translate('credential_offer_tab_qr', 'QR Code')}
          </button>
          <button className={`${style.tab} ${activeTab === 'url' ? style.tabActive : ''}`} onClick={() => setActiveTab('url')}>
            <svg className={style.tabIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            {translate('credential_offer_tab_url', 'Wallet URL')}
          </button>
        </div>

        <div className={style.contentDivider} />

        {/* Content */}
        <div className={style.content}>
          {error ? (
            <div className={style.errorContainer}>
              <svg className={style.errorIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className={style.errorText}>{error.message}</p>
            </div>
          ) : activeTab === 'qr' ? (
            <div className={style.qrContainer}>
              {qrCodeElement ? (
                <>
                  <div className={style.qrCodeWrapper}>{qrCodeElement}</div>
                  <div className={style.qrInstructions}>
                    <p className={style.qrInstructionsTitle}>
                      {translate('credential_offer_qr_instructions_title', 'Scan with your wallet app')}
                    </p>
                    <p className={style.qrInstructionsText}>
                      {translate(
                        'credential_offer_qr_instructions_text',
                        'Open your mobile wallet app and scan this QR code to receive the credential.'
                      )}
                    </p>
                  </div>
                </>
              ) : (
                <div className={style.loadingContainer}>
                  <RotateLoader size={12} color={'#4f46e5'} />
                  <p className={style.loadingText}>{translate('credential_offer_loading', 'Generating QR code...')}</p>
                </div>
              )}
            </div>
          ) : (
            <div className={style.urlContainer}>
              <div className={style.urlInputWrapper}>
                <label className={style.urlLabel}>{translate('credential_offer_url_label', 'Web Wallet Address')}</label>
                <input
                  type="text"
                  className={style.urlInput}
                  value={webWalletAddressValue}
                  onChange={onWebWalletAddressChange}
                  placeholder={translate('credential_offer_url_placeholder', 'https://wallet.example.com') as string}
                />
                <p className={style.urlHint}>
                  {translate('credential_offer_url_hint', 'Enter the URL of your web wallet to generate a direct link for receiving the credential.')}
                </p>
              </div>

              {isUrlValid && qrValue && (
                <div className={style.generatedUrlSection}>
                  <span className={style.generatedUrlLabel}>{translate('credential_offer_generated_url', 'Generated URL')}</span>
                  <div className={style.generatedUrlBox}>
                    <span className={style.generatedUrl}>{buildCredentialOfferURI()}</span>
                    <button className={`${style.copyButton} ${copied ? style.copyButtonSuccess : ''}`} onClick={handleCopyUrl} title="Copy URL">
                      {copied ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={style.footer}>
          <button className={style.buttonSecondary} onClick={() => onClose()}>
            {translate('credential_offer_cancel', 'Cancel')}
          </button>
          {activeTab === 'qr' ? (
            <button className={style.buttonPrimary} onClick={() => onSubmitQr?.()} disabled={!qrCodeElement}>
              {translate('credential_offer_done', 'Done')}
            </button>
          ) : (
            <button
              className={style.buttonPrimary}
              onClick={() => onSubmitUrl?.(buildCredentialOfferURI())}
              disabled={!isUrlValid || !qrValue}
            >
              {translate('credential_offer_open_wallet', 'Open in Wallet')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default CredentialOfferModal
