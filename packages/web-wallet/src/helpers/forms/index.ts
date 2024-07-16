import {FormDefinitionDTO, SchemaDefinitionDTO, SchemaType} from '@typings'
import {ByFormName, ById, FormsService} from '../../services/forms/FormsService'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {CredentialFormSelectionType} from '@sphereon/ui-components.ssi-react'

export function useForms(args: ById | ByFormName) {
  const [formDefDTO, setFormDefDTO] = useState<FormDefinitionDTO | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const service = new FormsService()
  const memoizedArgs = useMemo(() => args, [JSON.stringify(args)])

  useEffect(() => {
    setLoading(true)
    service
      .getFormDefinition(memoizedArgs)
      .then(setFormDefDTO)
      .catch(error => {
        setError(`Failed to load form definition: ${error.message}`)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [memoizedArgs])

  const getFormDefinition = useCallback(() => {
    return formDefDTO
  }, [formDefDTO])

  const selectSchemaDefinitions = useCallback(
    (formStepNr: number, schemaType?: SchemaType): Array<SchemaDefinitionDTO> => {
      if (!formDefDTO) {
        return []
      }
      return service.selectSchemaDefinitions(formDefDTO, formStepNr, schemaType)
    },
    [formDefDTO],
  )

  const getCredentialFormSelectionType = useCallback(
    (formStepNr: number): Array<CredentialFormSelectionType> => {
      if (!formDefDTO) {
        throw Error('useForm not loaded yet')
      }
      return service.getCredentialFormSelectionTypes(formDefDTO, formStepNr)
    },
    [formDefDTO],
  )

  return {get: getFormDefinition, selectSchemaDefinitions, getCredentialFormSelectionType, loading, error}
}
