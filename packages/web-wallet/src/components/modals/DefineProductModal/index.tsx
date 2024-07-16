import {useTranslate} from '@refinedev/core'
import {PrimaryButton, SecondaryButton} from '@sphereon/ui-components.ssi-react'
import React, {FC, ReactElement, useState} from 'react'
import {Country} from 'iso-3166-1/dist/iso-3166'
import CrossIcon from '@components/assets/icons/CrossIcon'
import DropDownList from '@components/lists/DropDownList'
import TextInputField from '@components/fields/TextInputField'
import {Product, ValueSelection} from '@typings'
import style from './index.module.css'
import {isNonEmptyString} from '@helpers/StringUtils'

const iso3166 = require('iso-3166-1')

type Props = {
  onClose: () => Promise<void>
  onSubmit: (product: Product) => Promise<void>
  product?: Product
  isEditing?: boolean
}

const productNatures: Array<ValueSelection> = [
  {label: 'Steenzout conform NTA 8900', value: 'Steenzout conform NTA 8900'},
  {label: 'Zeezout conform NTA 8900', value: 'Zeezout conform NTA 8900'},
  {label: 'Vacuümzout conform NTA 8900', value: 'Vacuümzout conform NTA 8900'},
]

const productSpecifications: Array<ValueSelection> = [
  {label: 'Grain distriution fine', value: 'Grain distriution fine'},
  {label: 'Grain distriution extra fine', value: 'Grain distriution extra fine'},
]

const units: Array<ValueSelection> = [{label: 'Tonne', value: 'Tonne'}]

const countries: Array<ValueSelection> = iso3166.all().map((country: Country): ValueSelection => ({label: country.country, value: country.country}))

const DefineProductModal: FC<Props> = (props: Props): ReactElement => {
  const {isEditing = false, onClose, onSubmit, product} = props
  const translate = useTranslate()
  const [productNature, setProductNature] = useState<string>(isEditing && product ? product?.productNature : '')
  const [productSpecification, setProductSpecification] = useState<string>(isEditing && product ? product?.productSpecification : '')
  const [unit, setUnit] = useState<string>(isEditing && product ? product?.unit : '')
  const [rawAmount, setRawAmount] = useState<number>(isEditing && product ? product.rawAmount : 0)
  const [countryOfOrigin, setCountryOfOrigin] = useState<string>(isEditing && product ? product?.countryOfOrigin : '')
  const [finalDeliveryDate, setFinalDeliveryDate] = useState<string>(isEditing && product ? product?.finalDeliveryDate : '')

  const onRawAmountChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const numericValue = event.target.value.replace(/[^0-9]/g, '')
    setRawAmount(Number(numericValue))
  }

  const isValidSubmission = (): boolean => {
    return [productNature, productSpecification, unit, countryOfOrigin, finalDeliveryDate].every(isNonEmptyString) && rawAmount > 0
  }

  const onSubmitClick = async (): Promise<void> => {
    const product = {
      productNature,
      productSpecification,
      unit,
      rawAmount,
      countryOfOrigin,
      finalDeliveryDate,
    }
    onSubmit(product).then(onClose)
  }

  return (
    <div className={style.overlay}>
      <div className={style.container} onClick={(event: React.MouseEvent<HTMLDivElement, MouseEvent>) => event.stopPropagation()}>
        <div className={style.headerContainer}>
          <div className={style.headerCaptionContainer}>
            <div className={style.titleCaption}>{translate('define_product_title')}</div>
            <div className={style.subTitleCaption}>{translate('define_product_subtitle')}</div>
          </div>
          <div className={style.headerCloseContainer}>
            <div className={style.closeButton} onClick={onClose}>
              <CrossIcon />
            </div>
          </div>
        </div>
        <div className={style.formContentContainer}>
          <div className={style.formRowContainer}>
            <div className={style.formFieldContainer} style={{flexGrow: 1}}>
              <div className={style.formFieldLabel}>{translate('define_product_product_nature_label')}</div>
              <DropDownList<ValueSelection>
                defaultValue={
                  isEditing && product
                    ? productNatures.find((selection: ValueSelection): boolean => selection.value === product.productNature)
                    : undefined
                }
                onChange={async (selection: ValueSelection): Promise<void> => setProductNature(selection.value)}
                options={productNatures}
                placeholder={translate('define_product_product_nature_placeholder')}
              />
            </div>
            <div className={style.formFieldContainer} style={{width: 259}}>
              <div className={style.formFieldLabel}>{translate('define_product_product_specification_label')}</div>
              <DropDownList<ValueSelection>
                defaultValue={
                  isEditing && product
                    ? productSpecifications.find((selection: ValueSelection): boolean => selection.value === product.productSpecification)
                    : undefined
                }
                onChange={async (selection: ValueSelection): Promise<void> => setProductSpecification(selection.value)}
                options={productSpecifications}
                placeholder={translate('define_product_product_specification_placeholder')}
              />
            </div>
          </div>
          <div className={style.formRowContainer}>
            <div className={style.formFieldContainer} style={{width: 256}}>
              <TextInputField
                label={{
                  caption: translate('define_product_raw_amount_label'),
                  className: style.formFieldLabel,
                }}
                onChange={onRawAmountChange}
                value={rawAmount}
                type="number"
              />
            </div>
            <div className={style.formFieldContainer} style={{width: 177}}>
              <div className={style.formFieldLabel}>{translate('define_product_unit_label')}</div>
              <DropDownList<ValueSelection>
                defaultValue={isEditing && product ? units.find((selection: ValueSelection): boolean => selection.value === product.unit) : undefined}
                onChange={async (selection: ValueSelection): Promise<void> => setUnit(selection.value)}
                options={units}
                placeholder={translate('define_product_unit_placeholder')}
              />
            </div>
          </div>
          <div className={style.formRowContainer}>
            <div className={style.formFieldContainer} style={{width: 455}}>
              <div className={style.formFieldLabel}>{translate('define_product_country_of_origin_label')}</div>
              <DropDownList<ValueSelection>
                defaultValue={
                  isEditing && product
                    ? countries.find((selection: ValueSelection): boolean => selection.value === product.countryOfOrigin)
                    : undefined
                }
                onChange={async (selection: ValueSelection): Promise<void> => setCountryOfOrigin(selection.value)}
                options={countries}
                placeholder={translate('define_product_country_of_origin_placeholder')}
              />
            </div>
          </div>
          <div className={style.formRowContainer}>
            <div className={style.formFieldContainer} style={{width: 455}}>
              <TextInputField
                label={{
                  caption: translate('define_product_final_delivery_date_label'),
                  className: style.formFieldLabel,
                }}
                onChange={async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => setFinalDeliveryDate(event.target.value)}
                value={finalDeliveryDate}
                type="date"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        </div>
        <div className={style.formButtonsContainer}>
          <SecondaryButton style={{width: 109}} caption={translate('action_back_label')} onClick={onClose} />
          <PrimaryButton
            style={{width: 180, marginLeft: 'auto'}}
            caption={isEditing ? translate('define_product_edit_product_action') : translate('define_product_add_product_action')}
            onClick={onSubmitClick}
            disabled={!isValidSubmission()}
          />
        </div>
      </div>
    </div>
  )
}

export default DefineProductModal
