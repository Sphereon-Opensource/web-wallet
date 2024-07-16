import React, {FC} from 'react'
import style from './index.module.css'
import {useTranslate} from '@refinedev/core'
import {ProgressStepIndicator, PrimaryButton, SecondaryButton} from '@sphereon/ui-components.ssi-react'
import {Outlet} from 'react-router-dom'
import {useOrganizationContactMachine} from '@typings'
import {staticPropsWithSST} from '../../../src/i18n/server'

const FINISH_STEP = 3

const OrganizationContactsCreatePage: FC = () => {
  const translate = useTranslate()
  const {
    context,
    onNext,
    onBack,
    onDisplayNameChanged,
    onLegalNameChanged,
    onEmailAddressChanged,
    onPhoneNumberChanged,
    onStreetNameNameChanged,
    onStreetNumberChanged,
    onPostalCodeChanged,
    onCityNameChanged,
    onProvinceNameChanged,
    onCountryCodeChanged,
    onBuildingNameChanged,
    disabled,
    step,
    maxInteractiveSteps,
  } = useOrganizationContactMachine()

  return (
    <div className={style.container}>
      <div className={style.contactCreateContainer}>
        <div className={style.headerContainer}>
          <div className={style.pathCaption}>{translate('contacts_overview_path_label')}</div>
          <div className={style.currentPathCaption}>{translate('contacts_create_title')}</div>
        </div>
        <div className={style.contactCreateContentContainer}>
          {step <= maxInteractiveSteps && (
            <div className={style.contactCreateCaption}>
              {translate('steps_label', {
                step,
                maxSteps: maxInteractiveSteps,
              })}
            </div>
          )}
          <Outlet
            context={{
              onLegalNameChanged,
              onDisplayNameChanged,
              onEmailAddressChanged,
              onPhoneNumberChanged,
              onStreetNameNameChanged,
              onStreetNumberChanged,
              onPostalCodeChanged,
              onCityNameChanged,
              onProvinceNameChanged,
              onCountryCodeChanged,
              onBuildingNameChanged,
              context,
            }}
          />
          <div className={style.buttonsContainer}>
            <SecondaryButton style={{width: 109}} caption={translate('action_back_label')} onClick={onBack} />
            <PrimaryButton
              style={{width: 180, marginLeft: 'auto'}}
              caption={step === FINISH_STEP ? translate('action_finish_label') : translate('action_proceed_label')}
              onClick={onNext}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
      <div className={style.contactCreateGuideContainer}>
        <ProgressStepIndicator
          steps={[
            {
              title: translate('contact_create_contact_type_title'),
              description: translate('contact_create_contact_type_description'),
            },
            {
              title: translate('contact_create_address_title'),
              description: translate('contact_create_address_description'),
            },
            {
              title: translate('contact_create_summary_step_title'),
              description: translate('contact_create_summary_step_description'),
            },
          ]}
          activeStep={step}
        />
      </div>
    </div>
  )
}

export const getStaticProps = staticPropsWithSST

export default OrganizationContactsCreatePage
