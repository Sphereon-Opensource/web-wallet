import React, {FC} from 'react'
import {Outlet} from 'react-router-dom'
import {useTranslate} from '@refinedev/core'
import {PrimaryButton, ProgressStepIndicator} from '@sphereon/ui-components.ssi-react'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import {staticPropsWithSST} from '@/src/i18n/server'
import {useCredentialDesignerMachine} from '@machines/credentials/credentialDesignerStateNavigation'
import style from './index.module.css'

const CredentialDesignerCreatePage: FC = () => {
  const translate = useTranslate()
  const {
    disabled,
    credentialDesignFormData,
    step,
    maxInteractiveSteps,
    onCredentialDesignerFormDataChange,
    onNext
  } = useCredentialDesignerMachine()

  return (
    <div className={style.container}>
      <PageHeaderBar path={translate('design_credential_path_label')} />
      <div className={style.contentContainer}>
        <div className={style.outletContainer}>
          <Outlet
            context={{
              credentialDesignFormData,
              onCredentialDesignerFormDataChange,
            }}
          />
          <PrimaryButton
            style={{width: 180, marginLeft: 'auto'}}
            caption={translate('action_proceed_label')}
            onClick={onNext}
            disabled={disabled}
          />
        </div>
        <ProgressStepIndicator
          steps={[
            {
              title: translate('design_credential_enter_claims_structure_step_title'),
              description: translate('design_credential_enter_claims_structure_step_description'),
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
