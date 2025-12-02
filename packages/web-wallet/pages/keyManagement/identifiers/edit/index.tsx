import React, {FC} from 'react'
import {useTranslate} from '@refinedev/core'
import {PrimaryButton, ProgressStepIndicator, SecondaryButton} from '@sphereon/ui-components.ssi-react'
import {Outlet} from 'react-router-dom'
import {useIdentifiersEditContext} from '@typings/machine/identifiers/edit'
import style from './index.module.css'
import {staticPropsWithSST} from '@/src/i18n/server'

const IdentifierEditPage: FC = () => {
  const translate = useTranslate()

  const {
    onNext,
    onBack,
    disabled,
    step,
    maxInteractiveSteps,
    capabilitiesInfo,
    onIdentifierDataChange,
    identifierData,
    serviceEndpoints,
    onSetServiceEndpoints,
    serviceEndpointData,
    onServiceEndpointChange,
    identifierMiddleware,
  } = useIdentifiersEditContext()

  const steps = [
    {
      title: translate('create_identifier_add_keys_step_title'),
      description: translate('create_identifier_add_keys_step_description'),
      required: true,
    },
    {
      title: translate('create_identifier_add_service_endpoint_step_title'),
      description: translate('create_identifier_add_service_endpoint_step_description'),
      required: false,
    },
  ]

  return (
    <div className={style.container}>
      <div className={style.editIdentifierContainer}>
        <div className={style.headerContainer}>
          <div className={style.pathCaption}>{translate('create_identifier_path_label')}</div>
          <div className={style.currentPathCaption}>{translate('identifiers_overview_fields_actions_edit')}</div>
        </div>
        <div className={style.identifierEditContentContainer}>
          <Outlet
            context={{
              onIdentifierDataChange,
              identifierData,
              serviceEndpoints,
              onSetServiceEndpoints,
              serviceEndpointData,
              onServiceEndpointChange,
              identifierMiddleware,
              capabilitiesInfo,
            }}
          />
          <div className={style.buttonsContainer}>
            <SecondaryButton caption={translate('action_back_label')} onClick={onBack} />
            <PrimaryButton
              style={{marginLeft: 'auto'}}
              caption={
                step === maxInteractiveSteps
                  ? translate('action_update_label')
                  : translate('action_proceed_label')
              }
              onClick={onNext}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
      <div className={style.identifierEditGuideContainer}>
        <ProgressStepIndicator steps={steps} activeStep={step} />
      </div>
    </div>
  )
}

export const getStaticProps = async ({locale = 'en'}: {locale?: string}) =>
  staticPropsWithSST({locale})

export default IdentifierEditPage
