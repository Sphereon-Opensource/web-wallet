import {FormDefinitionDTO, SchemaDefinitionDTO, SchemaType} from '@typings'
import {ByFormName, ById, FormsService} from '../../services/forms/FormsService'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {CredentialFormSelectionType} from '@sphereon/ui-components.ssi-react'

export function useForms(args: ById | ByFormName) {
  const [formDefDTO, setFormDefDTO] = useState<FormDefinitionDTO | null>(null)
  const [credentialTypes, setCredentialTypes] = useState<Array<CredentialFormSelectionType> | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const service = useMemo(() => new FormsService(), [])
  const memoizedArgs = useMemo(() => args, [JSON.stringify(args)])

  useEffect(() => {
    setLoading(true)
    service
      .getFormDefinition(memoizedArgs)
      .then(async formDef => {
        setFormDefDTO(formDef)
        // Pre-fetch credential types with OID4VCI filtering for step 1 (issue credential wizard)
        try {
          const types = await service.getCredentialFormSelectionTypes(formDef, 1, true)
          setCredentialTypes(types)
        } catch (e) {
          console.warn('Failed to load credential types:', e)
          setCredentialTypes([])
        }
      })
      .catch(error => {
        setError(`Failed to load form definition: ${error.message}`)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [memoizedArgs, service])

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
    [formDefDTO, service],
  )

  const getCredentialFormSelectionType = useCallback(
    (formStepNr: number): Array<CredentialFormSelectionType> => {
      if (!formDefDTO) {
        throw Error('useForm not loaded yet')
      }
      // Return pre-fetched credential types for step 1, or empty array if not loaded yet
      if (formStepNr === 1 && credentialTypes !== null) {
        return credentialTypes
      }
      // For other steps, return empty (they should use async method if needed)
      return credentialTypes ?? []
    },
    [formDefDTO, credentialTypes],
  )

  return {get: getFormDefinition, selectSchemaDefinitions, getCredentialFormSelectionType, loading, error}
}
