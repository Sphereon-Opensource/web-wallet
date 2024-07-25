import React, {ReactElement} from 'react'
import style from '../../../../pages/assets/create/index.module.css'
import TextInputField from '@components/fields/TextInputField'
import SelectionField from '@components/fields/SelectionField'
import {useTranslate} from '@refinedev/core'
import {useAssetOutletContext} from '@typings'

const DefineAssetProductContent = (): ReactElement => {
  const translate = useTranslate()
  const {context, onAssetNameChanged, onShowModal, onEditProduct} = useAssetOutletContext()
  const {assetName, product} = {...context}
  return (
    <div className={style.contentContainer}>
      <div className={style.titleCaption}>{translate('asset_create_define_product_title')}</div>
      <div className={style.subTitleCaption}>{translate('asset_create_define_product_subtitle')}</div>
      <TextInputField
        style={{width: 455, marginBottom: 46}}
        onChange={onAssetNameChanged}
        value={assetName}
        placeholder={translate('asset_create_asset_name_placeholder')}
      />
      <div className={style.addProductContainer} onClick={onShowModal}>
        <div className={style.addProductCaption}>{translate('asset_create_add_product_action')}</div>
      </div>
      {product && <SelectionField value={product?.productNature} onEdit={onEditProduct} />}
    </div>
  )
}

export default DefineAssetProductContent
