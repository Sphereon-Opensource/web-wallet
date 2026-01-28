import React, {FC, ReactElement, useEffect, useState} from 'react'
import {useTranslate} from '@refinedev/core'
import {CreateElementArgs, QRRenderingProps, QRType, URIData, ValueResult} from '@sphereon/ssi-sdk.qr-code-generator'
import Debug, {Debugger} from 'debug'
import {getAgent} from '../../../agent'
import {CredentialExchangeView, CredentialPreviewItem} from '../../views/CredentialExchangeView'
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
  /** Optional credential preview items to display */
  credentials?: CredentialPreviewItem[]
}

const CredentialOfferModal: FC<Props> = (props: Props): ReactElement => {
  const {qrValueGenerator, onClose, onSubmitQr, onSubmitUrl, initialTab, credentials, rendering} = props
  const translate = useTranslate()

  const [qrCodeElement, setQrCodeElement] = useState<ReactElement>()
  const [qrValue, setQrValue] = useState<QRValueResult | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [activeTab, setActiveTab] = useState<'qr' | 'url'>(initialTab)

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
        size: 200,
        ...rendering,
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

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleOpenInWallet = (url: string) => {
    if (activeTab === 'url') {
      onSubmitUrl?.(url)
    }
  }

  // Track active tab from the CredentialExchangeView
  // We need this to know which button action to perform in the footer
  const handleTabChange = (tab: 'qr' | 'url') => {
    setActiveTab(tab)
  }

  return (
    <div className={style.overlay} onClick={handleOverlayClick}>
      <div className={style.modal}>
        {/* Header */}
        <div className={style.header}>
          <div className={style.headerContent}>
            <h2 className={style.title}>{translate('credential_offer_modal_title', 'Get Your Credential')}</h2>
          </div>
          <button className={style.closeButton} onClick={() => onClose()} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error State */}
        {error ? (
          <div className={style.errorContainer}>
            <svg className={style.errorIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className={style.errorText}>{error.message}</p>
          </div>
        ) : (
          /* Credential Exchange View */
          <CredentialExchangeView
            mode="issuance"
            qrUri={qrValue?.uriValue || ''}
            initialTab={initialTab}
            showUrlTab={true}
            credentials={credentials}
            qrElement={qrCodeElement}
            qrLoading={!qrCodeElement}
            onOpenInWallet={handleOpenInWallet}
            className={style.exchangeView}
          />
        )}

        {/* Footer */}
        <div className={style.footer}>
          <button className={style.buttonSecondary} onClick={() => onClose()}>
            {translate('credential_offer_cancel', 'Cancel')}
          </button>
          <button
            className={style.buttonPrimary}
            onClick={() => onSubmitQr?.()}
            disabled={!qrCodeElement}
          >
            {translate('credential_offer_done', 'Done')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CredentialOfferModal
