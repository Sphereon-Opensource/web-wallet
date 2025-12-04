import React, {FC, ReactElement} from 'react'
import {useTranslate} from '@refinedev/core'
import {TabViewRoute} from '@sphereon/ui-components.core'
import {FormView, JSONFormState, SSITabView, SSITextH1Styled, SSITextH2Styled, getFormViewAjv} from '@sphereon/ui-components.ssi-react'
import JsonEditor from '@components/editors/JsonEditor'
import {useCredentialDesignerOutletContext} from '@machines/credentials/credentialDesignerStateNavigation';
import credentialDesignerVisualDesignSchema from '../../../../src/schemas/data/credentialDesignerVisualDesignSchema.json' assert {type: 'json'}
import credentialDesignerVisualDesignUISchema from '../../../../src/schemas/ui/credentialDesignerVisualDesignUISchema.json' assert {type: 'json'}
import style from './index.module.css'

const CredentialDesignerDetailsContent: FC = (): ReactElement => {
  const translate = useTranslate()
  const {
    advancedMode,
    onModeChange,
    credentialDesignerVisualDesignFormData,
    onCredentialDesignerVisualDesignFormDataChange
  } = useCredentialDesignerOutletContext()

  const onCredentialFormInputChange = async (state: JSONFormState): Promise<void> => {
    onCredentialDesignerVisualDesignFormDataChange?.(state)
  }

  const ajv = getFormViewAjv()
  if (!ajv.getKeyword('noEmptyObject')) {
    ajv.addKeyword({
      keyword: 'noEmptyObject',
      modifying: true,
      validate: (
        schema: object,
        data: any,
        parentSchema,
        dataCxt
      ): boolean => {
        if (typeof data === 'object') {
          if (!dataCxt?.parentData || dataCxt.parentDataProperty === undefined) {
            return true;
          }
          if (Object.keys(data).length === 0) {
            delete dataCxt.parentData[dataCxt.parentDataProperty];
          }
          return true;
        }
        return false;
      }
    });
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
        config={{
          hideRequiredAsterisk: true
        }}
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
      activeRoute={advancedMode ? "advanced" : "default"}
      onRouteChange={onRouteChange}
      routes={routes}
    />
  )
}

export default CredentialDesignerDetailsContent
