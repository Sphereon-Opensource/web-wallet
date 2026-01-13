import React, {FC, ReactElement} from 'react'
import {useTranslate} from '@refinedev/core'
import {FormView} from '@sphereon/ui-components.ssi-react'
import {createAjv} from '@jsonforms/core'
import editIdentifierUISchema from '../../../../src/schemas/ui/editIdentifierUISchema.json' assert {type: 'json'}
import {useIdentifiersEditContext} from '@typings/machine/identifiers/edit'
import style from './index.module.css'

const EditIdentifierContent: FC = (): ReactElement => {
  const translate = useTranslate()
  const {onIdentifierDataChange, identifierData, identifierMiddleware, identifierSchema, isLoading} = useIdentifiersEditContext()
  const ajv = createAjv({coerceTypes: true})

  if (isLoading || !identifierSchema) {
    return <div className={style.container}>Loading...</div>
  }

  return (
    <div className={style.container}>
      <div className={style.titleCaption}>{translate('identifiers_overview_fields_actions_edit')}</div>
      <FormView
        schema={identifierSchema}
        uiSchema={editIdentifierUISchema}
        data={identifierData?.data}
        onFormStateChange={onIdentifierDataChange}
        ajv={ajv}
        middleware={identifierMiddleware}
      />
    </div>
  )
}

export default EditIdentifierContent
