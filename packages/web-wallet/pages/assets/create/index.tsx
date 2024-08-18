import {useTranslate} from '@refinedev/core'
import {ProgressStepIndicator, PrimaryButton, SecondaryButton} from '@sphereon/ui-components.ssi-react'
import React from 'react'
import DefineProductModal from '@components/modals/DefineProductModal'
import {useAssetMachine} from '@typings'
import style from './index.module.css'
import {Outlet} from 'react-router-dom'
import {staticPropsWithSST} from '@/src/i18n/server'

const FINISH_STEP = 4

const AssetsCreatePage: React.FC = () => {
  const translate = useTranslate()
  const {
    onBack,
    onNext,
    onOwnerContactChanged,
    onAssetNameChanged,
    onProductChanged,
    onShowModal,
    onEditProduct,
    onCloseModal,
    step,
    maxInteractiveSteps,
    onAddFile,
    onFilePermissionChange,
    contacts,
    showDefineProductModal,
    isEditingProduct,
    context,
    disabled,
  } = useAssetMachine()
  const {product} = {...context}

  return (
    <div className={style.container}>
      {showDefineProductModal && (
        <DefineProductModal onClose={onCloseModal} onSubmit={onProductChanged} product={product} isEditing={isEditingProduct} />
      )}

      <div className={style.stepsContainer}>
        <div className={style.headerContainer}>
          <div className={style.pathCaption}>{translate('asset_overview_path_label')}</div>
          <div className={style.currentPathCaption}>{translate('asset_create_title')}</div>
        </div>
        <div className={style.stepsContentContainer}>
          {step <= maxInteractiveSteps && (
            <div className={style.stepsCaption}>
              {translate('steps_label', {
                step,
                maxSteps: maxInteractiveSteps,
              })}
            </div>
          )}
          <Outlet
            context={{context, onOwnerContactChanged, contacts, onAssetNameChanged, onShowModal, onEditProduct, onAddFile, onFilePermissionChange}}
          />
          <div className={style.buttonsContainer}>
            <SecondaryButton style={{width: 180}} caption={translate('action_back_label')} onClick={onBack} />
            <PrimaryButton
              style={{width: 180, marginLeft: 'auto'}}
              caption={step === FINISH_STEP ? translate('action_finish_label') : translate('action_proceed_label')}
              onClick={onNext}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
      <div className={style.stepsGuideContainer}>
        <ProgressStepIndicator
          steps={[
            {
              title: translate('asset_create_contact_step_title'),
              description: translate('asset_create_contact_step_description'),
            },
            {
              title: translate('asset_create_product_step_title'),
              description: translate('asset_create_product_step_description'),
            },
            {
              title: translate('asset_create_documents_step_title'),
              description: translate('asset_create_documents_step_description'),
            },
            {
              title: translate('asset_create_summary_step_title'),
              description: translate('asset_create_summary_step_description'),
            },
          ]}
          activeStep={step}
        />
      </div>
    </div>
  )
}

export const getStaticProps = staticPropsWithSST

export default AssetsCreatePage
