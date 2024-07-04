import React, {FC, ReactElement} from 'react'
import {v4 as uuidv4} from 'uuid'
import {useTranslate} from '@refinedev/core'
import {ButtonIcon} from '@sphereon/ui-components.core'
import {FormView, IconButton} from '@sphereon/ui-components.ssi-react'
import addKeySchema from '../../../../src/schemas/data/addKeySchema.json' assert {type: 'json'}
import addKeyUISchema from '../../../../src/schemas/ui/addKeyUISchema.json' assert {type: 'json'}
import SelectionField from '@components/fields/SelectionField'
// @ts-ignore // FIXME WALL-245 path complaining
import {IdentifierKey, useIdentifierCreateOutletContext} from '@types/machine/identifiers/create'
import style from './index.module.css'

const CreateIdentifierKeysContent: FC = (): ReactElement => {
  const translate = useTranslate()
  const {keys, onSetKeys, onKeyDataChange, keyData} = useIdentifierCreateOutletContext()

  const onAddKey = async (): Promise<void> => {
    const newKey: IdentifierKey = {
      id: uuidv4(),
      type: keyData?.data?.type,
      alias: keyData?.data?.alias,
      purposes: keyData?.data?.purposes,
    }
    onSetKeys(prevKeys => [...prevKeys, newKey])
    // TODO WALL-245 fix
    //setFormState(undefined)
  }

  const onRemoveKey = async (id: string): Promise<void> => {
    onSetKeys(prevKeys => prevKeys.filter(key => key.id !== id))
  }

  const getKeyElements = (): Array<ReactElement> => {
    return keys.map(key => {
      const onRemove = async (): Promise<void> => {
        await onRemoveKey(key.id)
      }

      const details = [
        {title: translate('create_identifier_keys_card_key_type_label'), value: key.type},
        {title: translate('create_identifier_keys_card_key_purpose_label'), value: key.purposes.join(', ')},
      ]

      return <SelectionField value={key.alias} details={details} onRemove={onRemove} />
    })
  }

  // TODO WALL-245 enable multiple keys
  return (
    <div className={style.container}>
      <div className={style.contentContainer}>
        {/*{keys.length === 0 &&*/}
        <div className={style.formContainer}>
          <div>
            <div className={style.titleCaption}>{translate('create_identifier_keys_title')}</div>
            <div className={style.descriptionCaption}>{translate('create_identifier_keys_description')}</div>
          </div>
          <FormView data={keyData?.data} schema={addKeySchema} uiSchema={addKeyUISchema} onFormStateChange={onKeyDataChange} />
        </div>
        {/*}*/}
        {/*{keys.length > 0 &&*/}
        {/*    <div className={style.contentContainer}>*/}
        {/*        <div className={style.formContainer}>*/}
        {/*            <div>*/}
        {/*                <div className={style.titleCaption}>{translate('create_identifier_keys_title')}</div>*/}
        {/*                <div className={style.descriptionCaption}>{translate('create_identifier_keys_description')}</div>*/}
        {/*            </div>*/}
        {/*            {getKeyElements()}*/}
        {/*        </div>*/}
        {/*        <div className={style.formContainer}>*/}
        {/*            <div className={style.addTitleCaption}>{translate('create_identifier_service_endpoints_title')}</div>*/}
        {/*            <FormView*/}
        {/*                data={keyData?.data}*/}
        {/*                schema={generateKeySchema}*/}
        {/*                uiSchema={generateKeyUISchema}*/}
        {/*                onFormStateChange={onKeyDataChange}*/}
        {/*            />*/}
        {/*        </div>*/}
        {/*    </div>*/}
        {/*}*/}
        {/*{keyData?.data?.action &&*/}
        {/*    <div className={style.addContainer}>*/}
        {/*        <IconButton*/}
        {/*            icon={ButtonIcon.ADD}*/}
        {/*            onClick={onAddKey}*/}
        {/*            disabled={keyData?.errors !== undefined && keyData?.errors.length > 0}*/}
        {/*        />*/}
        {/*        <div*/}
        {/*            className={style.addAnotherTitleCaption}*/}
        {/*            style={{opacity: (keyData?.errors !== undefined && keyData?.errors.length > 0) ? 0.5 : 1}}*/}
        {/*        >*/}
        {/*            {translate('create_identifier_keys_add_another_key_label')}*/}
        {/*        </div>*/}
        {/*    </div>*/}
        {/*}*/}
      </div>
    </div>
  )
}

export default CreateIdentifierKeysContent
