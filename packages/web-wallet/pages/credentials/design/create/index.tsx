import React, {FC} from 'react'
import {Outlet} from 'react-router-dom'
import {useTranslate} from '@refinedev/core'
import {PrimaryButton, ProgressStepIndicator, SecondaryButton} from '@sphereon/ui-components.ssi-react'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import {staticPropsWithSST} from '@/src/i18n/server'
import {useCredentialDesignerMachine} from '@machines/credentials/credentialDesignerStateNavigation'
import style from './index.module.css'

const CredentialDesignerCreatePage: FC = () => {
  const translate = useTranslate()
  const {
    advancedMode,
    onModeChange,
    disabled,
    credentialDesignerDetailsFormData,
    onCredentialDesignerDetailsFormDataChange,
    credentialDesignerVisualDesignFormData,
    onCredentialDesignerVisualDesignFormDataChange,
    credentialDesignerClaimsFormData,
    onCredentialDesignerClaimsFormDataChange,
    step,
    maxInteractiveSteps,
    onBack,
    onNext
  } = useCredentialDesignerMachine()

  return (
    <div className={style.container}>
      <PageHeaderBar path={translate('design_credential_path_label')} />
      <div className={style.contentContainer}>
        <div className={style.outletContainer}>
          <Outlet
            context={{
              advancedMode,
              onModeChange,
              credentialDesignerDetailsFormData,
              onCredentialDesignerDetailsFormDataChange,
              credentialDesignerVisualDesignFormData,
              onCredentialDesignerVisualDesignFormDataChange,
              credentialDesignerClaimsFormData,
              onCredentialDesignerClaimsFormDataChange
            }}
          />
          <div style={{display: 'flex', flexDirection: 'row'}}>
            {step > 1 &&
              <SecondaryButton
                style={{width: 180}}
                caption={translate('action_back_label')}
                onClick={onBack}
              />
            }
            <PrimaryButton
              style={{width: 180, marginLeft: 'auto'}}
              caption={step === maxInteractiveSteps ? translate('action_publish_label') : translate('action_proceed_label')}
              onClick={onNext}
              disabled={disabled}
            />
          </div>
        </div>
        <ProgressStepIndicator
          steps={[
            {
              title: translate('design_credential_details_step_title'),
              description: translate('design_credential_details_step_description'),
            },
            {
              title: translate('design_credential_visual_design_step_title'),
              description: translate('design_credential_visual_design_step_description'),
            },
            {
              title: translate('design_credential_claims_structure_step_title'),
              description: translate('design_credential_claims_structure_step_description'),
            }
          ]}
          activeStep={step}
        />
      </div>
    </div>
  )
}

export const getStaticProps = async ({locale = 'en'}: {locale?: string}) =>
  staticPropsWithSST({locale})

export default CredentialDesignerCreatePage
