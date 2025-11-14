import React, {FC, ReactElement} from 'react'
import {v4 as uuidv4} from 'uuid'
import {useTranslate, useList} from '@refinedev/core'
import {ButtonIcon} from '@sphereon/ui-components.core'
import {FormView, IconButton, PrimaryButton, SecondaryButton} from '@sphereon/ui-components.ssi-react'
import addKeySchema from '../../../../src/schemas/data/addKeySchema.json' assert {type: 'json'}
import addKeyUISchema from '../../../../src/schemas/ui/addKeyUISchema.json' assert {type: 'json'}
import SelectionField from '@components/fields/SelectionField'
import style from './index.module.css'
import {useIdentifierCreateOutletContext} from '@typings/machine/identifiers/create'
import {DataResource, IdentifierKey} from '@typings'
import {createAjv} from '@jsonforms/core'
import {ManagedKeyInfo} from '@veramo/core'

const CreateIdentifierKeysContent: FC = (): ReactElement => {
  const translate = useTranslate()
  const {
    keys,
    onSetKeys,
    onKeyDataChange,
    keyData,
    capabilitiesInfo,
    identifierKeyMiddleware,
    keySchema,
  } = useIdentifierCreateOutletContext()
  const ajv = createAjv({useDefaults: 'empty', coerceTypes: true})

  // Fetch available keys from the key manager
  const {data: keysData} = useList<ManagedKeyInfo>({
    resource: DataResource.KEYS,
    pagination: {
      mode: 'off',
    },
  })

  // Use dynamic schema if available, otherwise fall back to static schema
  const schema = keySchema || addKeySchema

  const onAddKey = async (): Promise<void> => {
    if (!capabilitiesInfo) {
      console.log(`No capabilitiesInfo`, capabilitiesInfo)
      throw Error(`No capabilitiesInfo`)
    }

    const action = keyData?.data?.action
    const identifierCapability = capabilitiesInfo.identifierCapability

    let newKey: IdentifierKey

    if (action === 'select') {
      // When selecting an existing key
      const selectedKeyId = keyData?.data?.selectedKeyId
      if (!selectedKeyId) {
        console.log(`No selectedKeyId`)
        throw Error(`No selected key`)
      }

      // Find the key info from keysData
      const keyInfo = keysData?.data?.find((key: ManagedKeyInfo) => key.kid === selectedKeyId)
      if (!keyInfo) {
        throw Error(`Key with id ${selectedKeyId} not found`)
      }

      console.log(`Adding existing key with kid: ${keyInfo.kid}`)

      newKey = {
        id: uuidv4(),
        type: keyInfo.type,
        alias: keyInfo.meta?.alias || keyInfo.kid,
        kid: keyInfo.kid,
        purposes: ['assertionMethod', 'authentication'], // Default purposes, could be made configurable
        readonly: false,
        capability: identifierCapability.create.keyTypes.find(keyCap => keyCap.keyType === keyInfo.type)!,
      }
    } else {
      // When generating a new key
      const type = keyData?.data?.type
      if (!type) {
        console.log(`No Type`, type)
        throw Error(`No Type`)
      }

      console.log(`Generating new key of type: ${type}`)

      newKey = {
        id: uuidv4(),
        type: type,
        alias: keyData?.data?.alias,
        purposes: keyData?.data?.purposes,
        readonly: false,
        capability: identifierCapability.create.keyTypes.find(keyCap => keyCap.keyType === type)!,
      }
    }

    const newKeys = [...keys, newKey]
    console.log(`Updated keys array:`, newKeys)
    onSetKeys(newKeys)
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

      return <SelectionField key={key.id} value={key.alias} details={details}
                             onRemove={key.readonly ? undefined : onRemove} />
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
              schema={schema}
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
                  schema={schema}
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
