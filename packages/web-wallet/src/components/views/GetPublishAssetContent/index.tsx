import React, {ReactElement} from 'react'
import style from '../../../../pages/assets/create/index.module.css'
import {SSIActivityIndicator} from '@sphereon/ui-components.ssi-react'
import {useTranslate} from '@refinedev/core'

const GetPublishAssetContent = (): ReactElement => {
  const translate = useTranslate()
  return (
    <div className={style.contentContainer}>
      <div className={style.publishingContainer}>
        <div className={style.publishingAssetLabel}>{translate('asset_create_publishing_asset_label')}</div>
        <SSIActivityIndicator size={100} color={'#7276F7'} />
      </div>
    </div>
  )
}

export default GetPublishAssetContent
