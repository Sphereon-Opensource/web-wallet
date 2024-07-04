import React, {FC, ReactElement} from 'react'
import {useTranslate} from '@refinedev/core'
import {FormView} from '@sphereon/ui-components.ssi-react'
import addIdentifierSchema from '../../../../src/schemas/data/addIdentifierSchema.json' assert {type: 'json'}
import addIdentifierUISchema from '../../../../src/schemas/ui/addIdentifierUISchema.json' assert {type: 'json'}
// @ts-ignore // FIXME WALL-245 path complaining
import {useIdentifierCreateOutletContext} from '@types/machine/identifiers/create'
import style from './index.module.css'

const CreateIdentifierSelectTypeContent: FC = (): ReactElement => {
  const translate = useTranslate()
  const {onIdentifierDataChange, identifierData} = useIdentifierCreateOutletContext()

  return (
    <div className={style.container}>
      <div className={style.titleCaption}>{translate('create_identifier_select_type_title')}</div>
      <FormView
        schema={addIdentifierSchema}
        uiSchema={addIdentifierUISchema}
        data={identifierData?.data}
        onFormStateChange={onIdentifierDataChange}
      />
    </div>
  )
}

export default CreateIdentifierSelectTypeContent
