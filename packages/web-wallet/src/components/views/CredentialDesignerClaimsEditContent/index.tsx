import React, {FC, ReactElement} from 'react'
import {useTranslate} from '@refinedev/core'
import {TabViewRoute} from '@sphereon/ui-components.core'
import {FormView, JSONFormState, SSITabView, SSITextH1Styled, SSITextH2Styled} from '@sphereon/ui-components.ssi-react'
import JsonEditor from '@components/editors/JsonEditor'
import {useCredentialDesignerEditOutletContext} from '@machines/credentials/credentialDesignerEditStateNavigation'
import credentialDesignerClaimStructureSchema from '../../../../src/schemas/data/credentialDesignerClaimStructureSchema.json' assert {type: 'json'}
import credentialDesignerClaimStructureUISchema from '../../../../src/schemas/ui/credentialDesignerClaimStructureUISchema.json' assert {type: 'json'}
import style from './index.module.css'

const CredentialDesignerClaimsEditContent: FC = (): ReactElement => {
  const translate = useTranslate()
  const {isAdvancedMode, onModeChange, credentialDesignerClaimsFormData, onCredentialDesignerClaimsFormDataChange} =
    useCredentialDesignerEditOutletContext()

  const onCredentialFormInputChange = async (state: JSONFormState): Promise<void> => {
    onCredentialDesignerClaimsFormDataChange?.(state)
  }

  const getDefaultContent = (): ReactElement => {
    return (
      <div className={style.container}>
        <div>
          <SSITextH1Styled style={{width: 'fit-content'}}>{translate('design_credential_claims_structure_title')}</SSITextH1Styled>
          <SSITextH2Styled style={{width: 'fit-content'}}>{translate('design_credential_claims_structure_description')}</SSITextH2Styled>
        </div>
        <FormView
          schema={credentialDesignerClaimStructureSchema}
          uiSchema={credentialDesignerClaimStructureUISchema}
          data={credentialDesignerClaimsFormData?.data}
          onFormStateChange={onCredentialFormInputChange}
        />
      </div>
    )
  }

  const getDefaultAdvancedContent = (): ReactElement => {
    return (
      <div className={style.container}>
        <div>
          <SSITextH1Styled style={{width: 'fit-content'}}>{translate('design_credential_claims_structure_title')}</SSITextH1Styled>
          <SSITextH2Styled style={{width: 'fit-content'}}>{translate('design_credential_claims_structure_description')}</SSITextH2Styled>
        </div>
        <JsonEditor
          initialPayload={JSON.stringify(credentialDesignerClaimsFormData?.data ?? {}, null, 2)}
          onEditorContentChanged={(value: string) => {
            try {
              const data = JSON.parse(value)
              void onCredentialFormInputChange({...credentialDesignerClaimsFormData, data})
            } catch {}
          }}
        />
      </div>
    )
  }

  const onRouteChange = async (): Promise<void> => {
    void onModeChange()
  }

  const routes: Array<TabViewRoute> = [
    {
      key: 'default',
      title: translate('design_credential_visual_mode_label'),
      content: getDefaultContent,
    },
    {
      key: 'advanced',
      title: translate('design_credential_advanced_mode_label'),
      content: getDefaultAdvancedContent,
    },
  ]

  return <SSITabView activeRoute={isAdvancedMode ? 'advanced' : 'default'} onRouteChange={onRouteChange} routes={routes} />
}

export default CredentialDesignerClaimsEditContent
