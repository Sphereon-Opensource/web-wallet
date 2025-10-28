import React, {FC, ReactElement, useEffect, useState} from 'react'
import {useTranslate} from '@refinedev/core'
import {FormView} from '@sphereon/ui-components.ssi-react'
import {createAjv} from '@jsonforms/core'
import agent from '@agent'
import {TKeyType} from '@veramo/core'
import editIdentifierSchema from '../../../../src/schemas/data/editIdentifierSchema.json' assert {type: 'json'}
import editIdentifierUISchema from '../../../../src/schemas/ui/editIdentifierUISchema.json' assert {type: 'json'}
import {useIdentifierEditOutletContext} from '@typings/machine/identifiers/edit'
import style from './index.module.css'

type KeyOption = {
  kid: string
  type: TKeyType
  identifierDid: string
}

const EditIdentifierSelectTypeContent: FC = (): ReactElement => {
  const translate = useTranslate()
  const {onIdentifierDataChange, identifierData, identifierMiddleware} = useIdentifierEditOutletContext()
  const [schema, setSchema] = useState<any>(null)
  const ajv = createAjv({coerceTypes: true})

  useEffect(() => {
    const fetchWebKeys = async () => {
      try {
        const identifiers = await agent.didManagerFind()
        const webIdentifiers = identifiers.filter(id => id.did.startsWith('did:web'))

        const keys: KeyOption[] = []
        for (const identifier of webIdentifiers) {
          if (identifier.keys) {
            for (const key of identifier.keys) {
              keys.push({
                kid: key.kid,
                type: key.type as TKeyType,
                identifierDid: identifier.did,
              })
            }
          }
        }

        // Clone the imported schema and add dynamic key options
        const updatedSchema = JSON.parse(JSON.stringify(editIdentifierSchema))
        updatedSchema.properties.selectedKeyId.oneOf = keys.map(key => ({
          const: key.kid,
          title: `${key.type} - ${key.kid.substring(0, 20)}... (${key.identifierDid.substring(0, 30)}...)`,
        }))

        setSchema(updatedSchema)
      } catch (error) {
        console.error('Error fetching web keys:', error)
      }
    }

    fetchWebKeys()
  }, [])

  if (!schema) {
    return <div className={style.container}>Loading...</div>
  }

  return (
    <div className={style.container}>
      <div className={style.titleCaption}>{translate('edit_identifier_title')}</div>
      <FormView
        schema={schema}
        uiSchema={editIdentifierUISchema}
        data={identifierData?.data}
        onFormStateChange={onIdentifierDataChange}
        ajv={ajv}
        middleware={identifierMiddleware}
      />
    </div>
  )
}

export default EditIdentifierSelectTypeContent
