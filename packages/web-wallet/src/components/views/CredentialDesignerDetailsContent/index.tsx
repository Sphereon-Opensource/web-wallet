import React, {FC, ReactElement} from 'react'
import {HttpError, useList, useTranslate} from '@refinedev/core'
import {TabViewRoute} from '@sphereon/ui-components.core'
import {FormView, getFormViewAjv, JSONFormState, SSITabView, SSITextH1Styled, SSITextH2Styled} from '@sphereon/ui-components.ssi-react'
import JsonEditor from '@components/editors/JsonEditor'
import {useCredentialDesignerOutletContext} from '@machines/credentials/credentialDesignerStateNavigation';
import credentialDesignDetailsSchema from '../../../../src/schemas/data/credentialDesignerDetailsSchema.json' assert {type: 'json'}
import credentialDesignDetailsUiSchema from '../../../../src/schemas/ui/credentialDesignerDetailsUISchema.json' assert {type: 'json'}
import {DataResource} from '@typings'
import style from './index.module.css'

const CredentialDesignerDetailsContent: FC = (): ReactElement => {
  const translate = useTranslate()
  const {
      advancedMode,
      onModeChange,
      credentialDesignerDetailsFormData,
      onCredentialDesignerDetailsFormDataChange
  } = useCredentialDesignerOutletContext()

  const credentialDesigns = useList<{ name: string }, HttpError>({ // TODO SSISDK-86 use proper type
    resource: DataResource.CREDENTIAL_DESIGNS,
  })

  const onCredentialFormInputChange = async (state: JSONFormState): Promise<void> => {
    onCredentialDesignerDetailsFormDataChange?.(state)
  }

  if (credentialDesigns.isLoading) return <div>Loading...</div>
  if (credentialDesigns.isError) return <div>Error: {credentialDesigns.error.message}</div>

  const ajv = getFormViewAjv()
  if (!ajv.getKeyword('uniqueValue')) {
    ajv.addKeyword({
      keyword: 'uniqueValue',
      type: 'string',
      validate: (_: string, data: string) => {
        return !credentialDesigns.data?.data.some(credentialDesign => credentialDesign.name === data)
      },
      errors: true
    })
  }

  const advancedValidator = (content: string): string | null => {
    try {
      const data = JSON.parse(content)

      if (typeof data["identifier"] !== "string" || data["identifier"].trim() === "") {
        return 'Missing identifier'
      }

      if (typeof data["format"] !== "string" || data["format"].trim() === "") {
        return 'Missing format'
      }
      const allowedFormats = [
        "jwt_vc",
        "ldp_vc",
        "vc+jwt",
        "dc+sd-jwt",
        "jwt",
        "ldp",
        "mso_mdoc"
      ] as const
      if (!allowedFormats.includes(data.format)) {
        return 'Invalid format'
      }

      return null
    } catch (error) {
      return error instanceof Error ? error.message : 'Validation failed'
    }
  }

  const getDefaultContent = (): ReactElement => {
    return <div className={style.container}>
      <div>
        <SSITextH1Styled style={{width: 'fit-content'}}>{translate('design_credential_details_title')}</SSITextH1Styled>
        <SSITextH2Styled style={{width: 'fit-content'}}>{translate('design_credential_details_description')}</SSITextH2Styled>
      </div>
      <FormView
        schema={credentialDesignDetailsSchema}
        uiSchema={credentialDesignDetailsUiSchema}
        data={credentialDesignerDetailsFormData?.data}
        onFormStateChange={onCredentialFormInputChange}
        ajv={ajv}
      />
    </div>
  }

  const getDefaultAdvancedContent = (): ReactElement => {
    return <div className={style.container}>
        <div>
            <SSITextH1Styled style={{width: 'fit-content'}}>{translate('design_credential_details_title')}</SSITextH1Styled>
            <SSITextH2Styled style={{width: 'fit-content'}}>{translate('design_credential_details_description')}</SSITextH2Styled>
        </div>
        <JsonEditor
            initialPayload={JSON.stringify(credentialDesignerDetailsFormData?.data ?? {}, null, 2)}
            onEditorContentChanged={(value: string) => {
                try {
                    const data = JSON.parse(value)
                    void onCredentialFormInputChange({ ...credentialDesignerDetailsFormData, data })
                } catch { }
            }}
            customValidator={advancedValidator}
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
