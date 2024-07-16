import React, {FC} from 'react'
import style from './index.module.css'
import TextInputField from '@components/fields/TextInputField'
import {useTranslate} from '@refinedev/core'
import {useNaturalPersonOutletContext} from '@typings'

//TODO: https://sphereon.atlassian.net/browse/DPP-124
const CreateNaturalPersonRoleContent: FC = () => {
  const translate = useTranslate()
  const {context, onSetRole} = useNaturalPersonOutletContext()
  const {role} = {...context}
  return (
    <div className={style.createNaturalPersonFormContainer}>
      <div>
        <div className={style.titleCaption}>{translate('natural_person_create_personal_info_title')}</div>
        <div className={style.subTitleCaption}>{translate('natural_person_create_personal_info_subtitle')}</div>
      </div>
      <TextInputField
        label={{
          caption: 'Role',
        }}
        onChange={onSetRole}
        value={role}
        placeholder={'Your role'}
      />
    </div>
  )
}

export default CreateNaturalPersonRoleContent
