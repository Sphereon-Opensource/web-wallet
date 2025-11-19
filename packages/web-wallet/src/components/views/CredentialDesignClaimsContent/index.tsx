import React, {FC, ReactElement} from 'react'
import {HttpError, useList, useTranslate} from '@refinedev/core'
import {FormView, JSONFormState, getFormViewAjv, SSITextH1Styled, SSITextH2Styled} from '@sphereon/ui-components.ssi-react'
import {useCredentialDesignerMachine, useCredentialDesignerOutletContext} from '@machines/credentials/credentialDesignerStateNavigation';
import credentialDesignerClaimStructureSchema from '../../../../src/schemas/data/credentialDesignClaimStructureSchema.json' assert {type: 'json'}
import credentialDesignerClaimStructureUISchema from '../../../../src/schemas/ui/credentialDesignClaimStructureUISchema.json' assert {type: 'json'}
import {DataResource} from '@typings'
import style from './index.module.css'

const CredentialDesignClaimsContent: FC = (): ReactElement => {
  const translate = useTranslate()
  const {credentialDesignerFormData} = useCredentialDesignerMachine()
  const {onCredentialDesignerFormDataChange} = useCredentialDesignerOutletContext()

  const credentialDesigns = useList<{ name: string }, HttpError>({ // TODO SSISDK-86 use proper type
    resource: DataResource.CREDENTIAL_DESIGNS,
  })

  const onCredentialFormInputChanged = async (state: JSONFormState): Promise<void> => {
    onCredentialDesignerFormDataChange?.(state)
  }

  if (credentialDesigns.isLoading) return <div>Loading...</div>
  if (credentialDesigns.isError) return <div>Error: {credentialDesigns.error.message}</div>

  const ajv = getFormViewAjv()
  if (!ajv.getKeyword('uniqueCredentialName')) {
      ajv.addKeyword({
        keyword: 'uniqueCredentialName',
        type: 'string',
        validate: (_: string, data: string) => {
          return !credentialDesigns.data?.data.some(credentialDesign => credentialDesign.name === data)
        },
        errors: true
      })
  }

  return (
    <div className={style.container}>
      <div>
        <SSITextH1Styled style={{width: 'fit-content'}}>{translate('design_credential_enter_claims_structure_title')}</SSITextH1Styled>
        <SSITextH2Styled style={{width: 'fit-content'}}>{translate('design_credential_enter_claims_structure_description')}</SSITextH2Styled>
      </div>
      <FormView
        schema={credentialDesignerClaimStructureSchema}
        uiSchema={credentialDesignerClaimStructureUISchema}
        data={credentialDesignerFormData?.data}
        onFormStateChange={onCredentialFormInputChanged}
        ajv={ajv}
      />
    </div>
  )
}

export default CredentialDesignClaimsContent
