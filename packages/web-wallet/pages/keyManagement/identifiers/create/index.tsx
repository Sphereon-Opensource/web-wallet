import React, {FC} from 'react'
import {useTranslate} from '@refinedev/core'
import {PrimaryButton, ProgressStepIndicator, SecondaryButton} from '@sphereon/ui-components.ssi-react'
import {Outlet} from 'react-router-dom'
import {useIdentifiersCreateMachine} from '@typings/machine/identifiers/create'
import style from './index.module.css'
import {staticPropsWithSST} from '@/src/i18n/server'

const IdentifierCreatePage: FC = () => {
  const translate = useTranslate()

  const {
    onNext,
    onBack,
    capabilitiesInfo,
    onIdentifierDataChange,
    identifierData,
    keys,
    onSetKeys,
    onKeyDataChange,
    keyData,
    serviceEndpoints,
    onSetServiceEndpoints,
    serviceEndpointData,
    onServiceEndpointChange,
    disabled,
    step,
    maxInteractiveSteps,
    identifierMiddleware,
    identifierKeyMiddleware,
  } = useIdentifiersCreateMachine()

  const steps = [
    {
      title: translate('create_identifier_select_type_step_title'),
      description: translate('create_identifier_select_type_step_description'),
      required: true,
    },
    {
      title: translate('create_identifier_add_keys_step_title'),
      description: translate('create_identifier_add_keys_step_description'),
    },
  ]
  if (capabilitiesInfo?.identifierCapability?.serviceEndpoints !== false) {
    steps.push({
      title: translate('create_identifier_add_service_endpoint_step_title'),
      description: translate('create_identifier_add_service_endpoint_step_description'),
      required: false,
    })
  }
  steps.push({
    title: translate('create_identifier_summary_step_title'),
    description: translate('create_identifier_summary_step_description'),
  })

  return (
    <div className={style.container}>
      <div className={style.createIdentifierContainer}>
        <div className={style.headerContainer}>
          <div className={style.pathCaption}>{translate('create_identifier_path_label')}</div>
          <div className={style.currentPathCaption}>{translate('create_identifier_title')}</div>
        </div>
        <div className={style.identifierCreateContentContainer}>
          <Outlet
            context={{
              onIdentifierDataChange,
              identifierData,
              keys,
              onSetKeys,
              onKeyDataChange,
              keyData,
              serviceEndpoints,
              onSetServiceEndpoints,
              serviceEndpointData,
              onServiceEndpointChange,
              identifierMiddleware,
              identifierKeyMiddleware,
              capabilitiesInfo,
            }}
          />
          <div className={style.buttonsContainer}>
            <SecondaryButton caption={translate('action_back_label')} onClick={onBack} />
            <PrimaryButton
              style={{marginLeft: 'auto'}}
              caption={step === maxInteractiveSteps ? translate('create_identifier_create_action_label') : translate('action_proceed_label')}
              onClick={onNext}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
      <div className={style.identifierCreateGuideContainer}>
        <ProgressStepIndicator steps={steps} activeStep={step} />
      </div>
    </div>
  )
}

export const getStaticProps = staticPropsWithSST

export default IdentifierCreatePage
