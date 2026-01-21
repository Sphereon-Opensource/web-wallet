import React, {FC} from 'react'
import style from './index.module.css'
import {useTranslate} from '@refinedev/core'
import {ProgressStepIndicator, PrimaryButton, SecondaryButton} from '@sphereon/ui-components.ssi-react'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import {Outlet} from 'react-router-dom'
import {useNaturalPersonMachine} from '@typings'
import {staticPropsWithSST} from '@/src/i18n/server'

const ContactsCreatePage: FC = () => {
  const translate = useTranslate()
  const {
    context,
    onNext,
    onBack,
    onFirstNameChanged,
    onLastNameChanged,
    onMiddleNameChanged,
    onEmailAddressChanged,
    onPhoneNumberChanged,
    onSetOrganization,
    onSetRole,
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
  } = useNaturalPersonMachine()

  return (
    <div className={style.container}>
      <PageHeaderBar path={translate('contact_create_person_path_label', 'Contacts / Add Individual')} />
      <div className={style.contentContainer}>
        <div className={style.outletContainer}>
          <Outlet
            context={{
              onFirstNameChanged,
              onMiddleNameChanged,
              onLastNameChanged,
              onEmailAddressChanged,
              onPhoneNumberChanged,
              onSetOrganization,
              onSetRole,
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
            {step > 1 && (
              <SecondaryButton
                style={{width: 109}}
                caption={translate('action_back_label', 'Back')}
                onClick={onBack}
              />
            )}
            <PrimaryButton
              style={{width: 180, marginLeft: 'auto'}}
              caption={step === maxInteractiveSteps ? translate('action_finish_label', 'Finish') : translate('action_proceed_label', 'Next')}
              onClick={onNext}
              disabled={disabled}
            />
          </div>
        </div>
        <ProgressStepIndicator
          steps={[
            {
              title: translate('contact_create_natural_person_step_title', 'Personal Info'),
              description: translate('contact_create_natural_person_step_description', 'Enter personal details'),
            },
            {
              title: translate('contact_create_address_title', 'Address'),
              description: translate('contact_create_address_description', 'Enter physical address'),
            },
            {
              title: translate('contact_create_organization_step_title', 'Organization'),
              description: translate('contact_create_organization_step_description', 'Link to organization'),
            },
            {
              title: translate('contact_create_role_step_title', 'Role'),
              description: translate('contact_create_role_step_description', 'Assign contact role'),
            },
            {
              title: translate('contact_create_summary_step_title', 'Review'),
              description: translate('contact_create_summary_step_description', 'Review and confirm'),
            },
          ]}
          activeStep={step}
        />
      </div>
    </div>
  )
}

export const getStaticProps = async ({locale = 'en'}: {locale?: string}) => staticPropsWithSST({locale})

export default ContactsCreatePage
