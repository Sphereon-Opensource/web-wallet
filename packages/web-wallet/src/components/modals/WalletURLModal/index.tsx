import React, {ChangeEvent, FC, ReactElement, useState} from 'react'
import style from './index.module.css'
import CrossIcon from '@components/assets/icons/CrossIcon'
import {useTranslate} from '@refinedev/core'
import {PrimaryButton} from '@sphereon/ui-components.ssi-react'
import {QRRenderingProps} from '@sphereon/ssi-sdk.qr-code-generator'
import {RotateLoader} from 'react-spinners'
import Debug, {Debugger} from 'debug'
import TextInputField from '@components/fields/TextInputField'

const debug: Debugger = Debug('sphereon:ui-components:qr')

export type QRValueResult = {
  id: string;
  uriValue: string;
  expiryInSec?: number;
  onExpiry: (expired: QRValueResult) => Promise<void>
}

/**
 * TODO: Move to UI-Components
 */
interface Props {
  rendering?: QRRenderingProps
  defaultExpiryInSec?: number
  qrValueGenerator: (args: {} & Record<string, any>) => Promise<QRValueResult>
  onClose: () => Promise<void>
  onSubmit: (walletUrl: string) => Promise<void>
}

const urlRegex = /^(https?:\/\/)(([a-z\d]([a-z\d-]*[a-z\d])?\.)+[a-z]{2,}|localhost|([a-z\d]([a-z\d-]*[a-z\d])?\.local)|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(\#[-a-z\d_]*)?$/i


const WalletURLModal: FC<Props> = (props: Props): ReactElement => {
  const {qrValueGenerator, onClose, onSubmit} = props
  const translate = useTranslate()
  const [webWalletAddressValue, setWebWalletAddressValue] = useState<string>('')
  const [credentialOfferURI, setCredentialOfferURI] = useState<QRValueResult | null>(null)
  const [error, setError] = useState<Error | null>(null)

  function mergeQueryParams(url1: string, url2: string) {
    if (!urlRegex.test(url1)) {
      throw new Error('Web wallet address must be a valid https:// url')
    }
    // Extract the base URL and any existing query parameters from webWalletAddressValue
    const webWalletUrl = new URL(url1)
    const walletParams = new URLSearchParams(webWalletUrl.search)

    // Extract the query parameters from qrData.object
    const queryParamsStartIndex = url2.indexOf('?')
    const qrParams = new URLSearchParams(url2.substring(queryParamsStartIndex))

    // Merge parameters: qrParams will overwrite existing params in walletParams
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
    if (!credentialOfferURI || !credentialOfferURI.uriValue) {
      throw new Error('Credential offer URI unavailable')
    }

    const queryString = credentialOfferURI.uriValue.split('://')[1] ?? '' // FIXME
    return mergeQueryParams(webWalletAddressValue, queryString)
  }
  
  const onWebWalletAddressChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    setWebWalletAddressValue(('' + event.target.value).trim())
  }

  if (!credentialOfferURI) {
    qrValueGenerator({}).then(newQrValue => {
      setCredentialOfferURI(newQrValue)
    })
  }

  return (
    <div className={style.overlay}>
      <div className={style.container}
           onClick={(event: React.MouseEvent<HTMLDivElement, MouseEvent>) => event.stopPropagation()}>
        <div className={style.headerContainer}>
          <div className={style.headerCaptionContainer}>
            <div className={style.titleCaption}>{translate('credential_wallet_url_title')}</div>
            <div className={style.subTitleCaption}>{translate('credential_wallet_url_subtitle')}</div>
          </div>
          <div className={style.headerCloseContainer}>
            <div className={style.closeButton} onClick={onClose}>
              <CrossIcon />
            </div>
          </div>
        </div>
      </div>

      <div className={style.urlContainer}>
        {error ? <div>{error.message}</div> : credentialOfferURI
          ? <div>
            <TextInputField
              label={{
                caption: translate('credential_wallet_url'),
              }}
              style={{ width: '80%' }}
              type={'text'}
              value={webWalletAddressValue}
              onChange={onWebWalletAddressChange}
            />
          </div>
          : <RotateLoader size={15} color={'#7276F7'} />}
      </div>

      <div className={style.formButtonsContainer}>
        <PrimaryButton
          style={{width: 180, marginLeft: 'auto'}}
          caption={translate('credential_wallet_url_get_credential_action')}
          disabled={webWalletAddressValue.length === 0
            || !urlRegex.test(webWalletAddressValue)}
          onClick={() => onSubmit(buildCredentialOfferURI())}
        />
      </div>
    </div>
  )
}

export default WalletURLModal
