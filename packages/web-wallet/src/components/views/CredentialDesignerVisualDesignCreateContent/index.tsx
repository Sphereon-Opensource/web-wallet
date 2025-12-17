import React, {FC, ReactElement} from 'react'
import {useTranslate} from '@refinedev/core'
import {TabViewRoute} from '@sphereon/ui-components.core'
import {FormView, JSONFormState, SSITabView, SSITextH1Styled, SSITextH2Styled} from '@sphereon/ui-components.ssi-react'
import JsonEditor from '@components/editors/JsonEditor'
import {useCredentialDesignerCreateOutletContext} from '@machines/credentials/credentialDesignerCreateStateNavigation';
import credentialDesignerVisualDesignSchema from '../../../../src/schemas/data/credentialDesignerVisualDesignSchema.json' assert {type: 'json'}
import credentialDesignerVisualDesignUISchema from '../../../../src/schemas/ui/credentialDesignerVisualDesignUISchema.json' assert {type: 'json'}
import style from './index.module.css'

const CredentialDesignerVisualDesignCreateContent: FC = (): ReactElement => {
  const translate = useTranslate()
  const {
    isAdvancedMode,
    onModeChange,
    credentialDesignerVisualDesignFormData,
    onCredentialDesignerVisualDesignFormDataChange
  } = useCredentialDesignerCreateOutletContext()

  const onCredentialFormInputChange = async (state: JSONFormState): Promise<void> => {
    onCredentialDesignerVisualDesignFormDataChange?.(state)
  }

  const getDefaultContent = (): ReactElement => {
    return <div className={style.container}>
      <div>
        <SSITextH1Styled style={{width: 'fit-content'}}>{translate('design_credential_visual_design_title')}</SSITextH1Styled>
        <SSITextH2Styled style={{width: 'fit-content'}}>{translate('design_credential_visual_design_description')}</SSITextH2Styled>
      </div>
      <FormView
        schema={credentialDesignerVisualDesignSchema}
        uiSchema={credentialDesignerVisualDesignUISchema}
        data={credentialDesignerVisualDesignFormData?.data}
        onFormStateChange={onCredentialFormInputChange}
      />
    </div>
  }

  const getDefaultAdvancedContent = (): ReactElement => {
    return <div className={style.container}>
      <div>
        <SSITextH1Styled style={{width: 'fit-content'}}>{translate('design_credential_visual_design_title')}</SSITextH1Styled>
        <SSITextH2Styled style={{width: 'fit-content'}}>{translate('design_credential_visual_design_description')}</SSITextH2Styled>
      </div>
      <JsonEditor
        initialPayload={JSON.stringify(credentialDesignerVisualDesignFormData?.data ?? {}, null, 2)}
        onEditorContentChanged={(value: string) => {
          try {
            const data = JSON.parse(value)
            void onCredentialFormInputChange({ ...credentialDesignerVisualDesignFormData, data })
          } catch { }
        }}
      />
    </div>
  }

  const onRouteChange = async (key: string): Promise<void> => {
    void onModeChange()
  }

  const routes: Array<TabViewRoute> = [
    {
      key: "default",
      title: translate('design_credential_visual_mode_label'),
      content: getDefaultContent,
    },
    {
      key: "advanced",
      title: translate('design_credential_advanced_mode_label'),
      content: getDefaultAdvancedContent,
    }
  ]

  return (
    <SSITabView
      activeRoute={isAdvancedMode ? "advanced" : "default"}
      onRouteChange={onRouteChange}
      routes={routes}
    />
  )
}

export default CredentialDesignerVisualDesignCreateContent
