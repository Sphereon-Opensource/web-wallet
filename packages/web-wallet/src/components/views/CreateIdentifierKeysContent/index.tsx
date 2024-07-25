import React, {FC, ReactElement} from 'react'
import {v4 as uuidv4} from 'uuid'
import {useTranslate} from '@refinedev/core'
import {ButtonIcon} from '@sphereon/ui-components.core'
import {FormView, IconButton, PrimaryButton, SecondaryButton} from '@sphereon/ui-components.ssi-react'
import addKeySchema from '../../../../src/schemas/data/addKeySchema.json' assert {type: 'json'}
import addKeyUISchema from '../../../../src/schemas/ui/addKeyUISchema.json' assert {type: 'json'}
import SelectionField from '@components/fields/SelectionField'
import style from './index.module.css'
import {useIdentifierCreateOutletContext} from '@typings/machine/identifiers/create'
import {IdentifierKey} from '@typings'
import {createAjv} from '@jsonforms/core'

const CreateIdentifierKeysContent: FC = (): ReactElement => {
  const translate = useTranslate()
  const {keys, onSetKeys, onKeyDataChange, keyData, capabilitiesInfo, identifierKeyMiddleware} = useIdentifierCreateOutletContext()
  const ajv = createAjv({useDefaults: 'empty', coerceTypes: true})

  const onAddKey = async (): Promise<void> => {
    const type = keyData?.data?.type
    if (!type || !capabilitiesInfo) {
      console.log(`No Type`, type, capabilitiesInfo)
      throw Error(`No Type`)
    }
    const identifierCapability = capabilitiesInfo.identifierCapability
    const newKey: IdentifierKey = {
      id: uuidv4(),
      type: type,
      alias: keyData?.data?.alias,
      purposes: keyData?.data?.purposes,
      readonly: false,
      capability: identifierCapability.create.keyTypes.find(keyCap => keyCap.keyType === type)!,
    }
    const newKeys = [...keys, newKey]
    onSetKeys(newKeys)

    console.log(capabilitiesInfo)
    // setFormState(undefined)
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

      return <SelectionField value={key.alias} details={details} onRemove={key.readonly ? undefined : onRemove} />
    })
  }
  const maxKeysReached = capabilitiesInfo && keys.length >= capabilitiesInfo.identifierCapability.maxKeys
  console.log(`Max keys reached`, maxKeysReached, keys.length, capabilitiesInfo?.identifierCapability.maxKeys)

  // TODO WALL-245 Info container, to notify users max keys have been reached
  return (
    <div className={style.container}>
      <div className={style.contentContainer}>
        {keys.length === 0 && (
          <div className={style.formContainer}>
            <div>
              <div className={style.titleCaption}>{translate('create_identifier_keys_title')}</div>
              <div className={style.descriptionCaption}>{translate('create_identifier_keys_description')}</div>
            </div>
            <FormView
              data={keyData?.data}
              schema={addKeySchema}
              uiSchema={addKeyUISchema}
              onFormStateChange={onKeyDataChange}
              middleware={identifierKeyMiddleware}
              ajv={ajv}
            />
            <PrimaryButton
              caption={translate('create_identifier_keys_add_key_label')}
              onClick={onAddKey}
              icon={ButtonIcon.ADD}
              disabled={maxKeysReached || (keyData?.errors !== undefined && keyData?.errors.length > 0)}
            />
          </div>
        )}
        {keys.length > 0 && (
          <div className={style.contentContainer}>
            <div className={style.formContainer}>
              <div>
                <div className={style.titleCaption}>{translate('create_identifier_keys_title')}</div>
                <div className={style.descriptionCaption}>{translate('create_identifier_keys_description')}</div>
              </div>
              {getKeyElements()}
            </div>
            {!maxKeysReached && (
              <div className={style.formContainer}>
                <div className={style.addTitleCaption}>{translate('create_identifier_keys_add_key_title')}</div>
                <FormView
                  data={keyData?.data}
                  schema={addKeySchema}
                  uiSchema={addKeyUISchema}
                  onFormStateChange={onKeyDataChange}
                  middleware={identifierKeyMiddleware}
                  ajv={ajv}
                />
                <PrimaryButton
                  caption={translate('create_identifier_keys_add_key_label')}
                  onClick={onAddKey}
                  icon={ButtonIcon.ADD}
                  disabled={maxKeysReached || (keyData?.errors !== undefined && keyData?.errors.length > 0)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default CreateIdentifierKeysContent
