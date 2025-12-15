import React, {FC, ReactElement} from 'react'
import {Outlet} from 'react-router-dom'
import {useTranslate} from '@refinedev/core'
import {PrimaryButton, ProgressStepIndicator, SecondaryButton} from '@sphereon/ui-components.ssi-react'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import {staticPropsWithSST} from '@/src/i18n/server'
import {useCredentialDesignerEditMachine} from '@machines/credentials/credentialDesignerEditStateNavigation'
import CredentialDesignerLivePreviewView from '@components/views/CredentialDesignerLivePreviewView'
import style from './index.module.css'

const CredentialDesignerEditPage: FC = (): ReactElement => {
  const translate = useTranslate()
  const {
    isAdvancedMode,
    onModeChange,
    disabled,
    credentialDesignerDetailsFormData,
    onCredentialDesignerDetailsFormDataChange,
    credentialDesignerVisualDesignFormData,
    onCredentialDesignerVisualDesignFormDataChange,
    credentialDesignerClaimsFormData,
    onCredentialDesignerClaimsFormDataChange,
    credentialDesignerVisualDesignBackgroundImage,
    credentialDesignerVisualDesignLogo,
    step,
    maxInteractiveSteps,
    onBack,
    onNext,
    editData
  } = useCredentialDesignerEditMachine()

  return (
    <div className={style.container}>
      <PageHeaderBar path={translate('design_credential_path_label')} />
      <div className={style.contentContainer}>
        <div className={style.outletContainer}>
          <Outlet
            context={{
              isAdvancedMode,
              onModeChange,
              credentialDesignerDetailsFormData,
              onCredentialDesignerDetailsFormDataChange,
              credentialDesignerVisualDesignFormData,
              onCredentialDesignerVisualDesignFormDataChange,
              credentialDesignerClaimsFormData,
              onCredentialDesignerClaimsFormDataChange,
              credentialDesignerVisualDesignBackgroundImage,
              credentialDesignerVisualDesignLogo,
              editData
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
              caption={step === maxInteractiveSteps
                ? editData
                  ? translate('action_save_label')
                  : translate('action_publish_label')
                : translate('action_proceed_label')
              }
              onClick={onNext}
              disabled={disabled}
            />
          </div>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 24}}>
          <CredentialDesignerLivePreviewView
            backgroundImage={credentialDesignerVisualDesignBackgroundImage}
            backgroundColor={credentialDesignerVisualDesignFormData?.data.background_color}
            logo={credentialDesignerVisualDesignLogo}
            textColor={credentialDesignerVisualDesignFormData?.data.text_color}
            style={{marginTop: 47}}
          />
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
    </div>
  )
}

export const getStaticProps = async ({locale = 'en'}: {locale?: string}) =>
  staticPropsWithSST({locale})

export default CredentialDesignerEditPage
