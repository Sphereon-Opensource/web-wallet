import React, {FC, ReactElement, useEffect, useState} from 'react'
import style from './index.module.css'
import CrossIcon from '@components/assets/icons/CrossIcon'
import {useTranslate} from '@refinedev/core'
import {PrimaryButton} from '@sphereon/ui-components.ssi-react'
import {CreateElementArgs, QRType, URIData, ValueResult} from '@sphereon/ssi-sdk.qr-code-generator'
import agent from '../../../agent'
import {RotateLoader} from 'react-spinners'
import {QRRenderingProps} from '@sphereon/ssi-sdk.qr-code-generator'
import Debug, {Debugger} from 'debug'

const debug: Debugger = Debug('sphereon:ui-components:qr')

export type QRValueResult = {id: string; uriValue: string; expiryInSec?: number; onExpiry: (expired: QRValueResult) => Promise<void>}

/**
 * TODO: Move to UI-Components
 */
interface Props {
  rendering?: QRRenderingProps
  defaultExpiryInSec?: number
  qrValueGenerator: (args: {} & Record<string, any>) => Promise<QRValueResult>
  onClose: () => Promise<void>
  onSubmit: () => Promise<void>
}

const QRCodeModal: FC<Props> = (props: Props): ReactElement => {
  const {qrValueGenerator, onClose, onSubmit} = props
  const translate = useTranslate()
  const [qrCodeElement, setQrCodeElement] = useState<ReactElement>()
  const [qrValue, setQrValue] = useState<QRValueResult | null>(null)
  const [error, setError] = useState<Error | null>(null)

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
        // bgColor: 'yellow',
        fgColor: '#051349',
        level: 'L',
        size: 290,
        ...props.rendering,
      },
    }
    debug(`QR elements; props: `, qrProps)
    return qrProps
  }

  useEffect(() => {
    const renderQRCode = () => {
      agent
        .qrURIElement(createQRCodeElement())
        .then((code: ReactElement) => setQrCodeElement(code))
        .catch(error => {
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

  if (!qrValue) {
    qrValueGenerator({}).then(newQrValue => {
      setQrValue(newQrValue)
    })
  }

  return (
    <div className={style.overlay}>
      <div className={style.container} onClick={(event: React.MouseEvent<HTMLDivElement, MouseEvent>) => event.stopPropagation()}>
        <div className={style.headerContainer}>
          <div className={style.headerCaptionContainer}>
            <div className={style.titleCaption}>{translate('credential_qr_code_title')}</div>
            <div className={style.subTitleCaption}>{translate('credential_qr_code_subtitle')}</div>
          </div>
          <div className={style.headerCloseContainer}>
            <div className={style.closeButton} onClick={onClose}>
              <CrossIcon />
            </div>
          </div>
        </div>
      </div>

      <div className={style.qrCode}>
        {error ? <div>{error.message}</div> : qrCodeElement ? <div>{qrCodeElement}</div> : <RotateLoader size={15} color={'#7276F7'} />}
      </div>

      <div className={style.formButtonsContainer}>
        <PrimaryButton
          style={{width: 180, marginLeft: 'auto'}}
          caption={translate('credential_qr_code_get_credential_action')}
          onClick={() => onSubmit()}
        />
      </div>
    </div>
  )
}

export default QRCodeModal
