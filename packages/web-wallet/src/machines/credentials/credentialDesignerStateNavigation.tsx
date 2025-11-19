import React, {createContext, ReactElement, useCallback, useContext, useEffect, useState} from 'react'
import {JSONFormState} from '@sphereon/ui-components.ssi-react'
import {useNavigate, useOutletContext} from 'react-router-dom'
import {HttpError, useCreate} from '@refinedev/core'
import {
  CredentialDesignerRoute,
  CredentialSchema,
  CredentialSchemaClaim,
  CredentialUISchema,
  DataResource, MainRoute,
  UIContextType
} from '@typings'

export type CredentialDesignerContextType = UIContextType & {
  credentialDesignerFormData?: JSONFormState
  onCredentialDesignerFormDataChange: (state: JSONFormState) => Promise<void>
}

export const CredentialDesignerContext = createContext({} as CredentialDesignerContextType)

export const useCredentialDesignerMachine = () => useContext(CredentialDesignerContext)

export const useCredentialDesignerOutletContext = () => useOutletContext<CredentialDesignerContextType>()

const credentialDesignNavigationListener = async (step: number, navigate: any): Promise<void> => {
  switch (step) {
    case 1:
      return navigate(CredentialDesignerRoute.CLAIMS)
    default:
      return Promise.reject('issue credential step exceeds maximum steps')
  }
}

const CredentialDesignerContextProvider = (props: any): ReactElement => {
  const {children} = props
  const navigate = useNavigate()
  const [step, setStep] = useState<number>(1)
  const [disabled, setDisabled] = useState<boolean>(true)
  const [credentialDesignerFormData, setCredentialDesignerFormData] = useState<JSONFormState | undefined>()

  const {mutateAsync} = useCreate<{form_id: string}, HttpError>({ // TODO SSISDK-86 use proper type
    resource: DataResource.CREDENTIAL_DESIGNS,
  })

  const maxInteractiveSteps = 1
  const maxAutoSteps = 1

  useEffect(() => {
    void credentialDesignNavigationListener(step, navigate)

    const handlePopstate = (): void => {
      if (step > 0) {
        setStep(step - maxAutoSteps)
        // FIXME for now just resetting everything as we do not have support yet to rehydrate the fields again
        setCredentialDesignerFormData(undefined)
      }
    }
    window.addEventListener('popstate', handlePopstate)
    return (): void => {
      window.removeEventListener('popstate', handlePopstate)
    }
  }, [step])

  useEffect((): void => {
    if (step === 1) {
      const disabled =
        (credentialDesignerFormData?.errors?.length ?? 0) > 0 ||
        !noEmptyPropertiesRecursive(credentialDesignerFormData?.data?.credentialClaims ?? []);

      setDisabled(disabled)
      if (disabled) {
        console.warn(credentialDesignerFormData?.errors)
      }
    } else {
      setDisabled(false)
    }
  }, [step, credentialDesignerFormData])

  const noEmptyPropertiesRecursive = (items: Array<any>): boolean => {
    return items.every(item => {
      const itemType = item.type;

      if (itemType !== 'object') {
        return true
      }

      if (!Array.isArray(item.properties) || item.properties.length === 0) {
        return false
      }

      return noEmptyPropertiesRecursive(item.properties)
    })
  }

  const onNext = useCallback(async (): Promise<void> => {
    const nextStep: number = step + maxAutoSteps
    if (nextStep <= maxInteractiveSteps) {
      setStep(nextStep)
    } else if (credentialDesignerFormData?.data.credentialClaims) {
      await buildCredentialSchemas(credentialDesignerFormData.data.credentialClaims)
        .then(buildResult => storeCredentialSchema({
          credentialName: credentialDesignerFormData.data.credentialName,
          schema: buildResult.schema,
          uiSchema: buildResult.uiSchema
        }).then(() => navigate(MainRoute.CREDENTIALS))) // TODO when we have a credential design overview, we should navigate there
    }
  }, [step, credentialDesignerFormData])

  const onBack = useCallback(async (): Promise<void> => {
    const nextStep: number = step - maxAutoSteps
    if (nextStep >= 1) {
      setStep(nextStep)
    }
  }, [step])

  const onCredentialDesignerFormDataChange = async (state: JSONFormState): Promise<void> => {
    setCredentialDesignerFormData(state)
  }

  const buildCredentialSchemas = async (
    claims: Array<CredentialSchemaClaim>,
  ): Promise<{schema: CredentialSchema; uiSchema: CredentialUISchema | Array<CredentialUISchema>}> => {
    const schema = buildCredentialSchema(claims)
    const uiSchema = buildCredentialUISchema(claims)

    return {schema, uiSchema}
  }

  const buildCredentialSchema = (claims: Array<CredentialSchemaClaim>): CredentialSchema => {
    const properties: Record<string, any> = {}
    const requiredFields: Array<string> = []

    claims.forEach((claim): void => {
      if (claim.type === 'object' && claim.properties) {
        properties[claim.claimName] = buildCredentialSchema(claim.properties)
      } else {
        properties[claim.claimName] = {type: claim.type}
      }

      if (claim.required) {
        requiredFields.push(claim.claimName)
      }
    })

    return {
      type: 'object',
      properties,
      ...(requiredFields.length > 0 && {required: requiredFields}),
    }
  }

  const buildCredentialUISchema = (
    claims: Array<CredentialSchemaClaim>,
    basePath: string = '#/properties',
    isRoot: boolean = true,
  ): CredentialUISchema | Array<CredentialUISchema> => {
    const elements: Array<CredentialUISchema> = []

    claims.forEach((claim): void => {
      const currentPath = `${basePath}/${claim.claimName}`

      if (claim.type === 'object' && claim.properties) {
        elements.push({
          type: 'Group',
          label: claim.claimName,
          elements: buildCredentialUISchema(claim.properties, `${currentPath}/properties`, false) as Array<CredentialUISchema>,
        })
      } else {
        elements.push({
          type: 'Control',
          label: claim.claimName,
          scope: currentPath,
        })
      }
    })

    return isRoot
      ? {
          type: 'VerticalLayout',
          elements,
        }
      : elements
  }

  const storeCredentialSchema = async (args: {credentialName: string, schema: CredentialSchema; uiSchema: CredentialUISchema | Array<CredentialUISchema>}) => {
    const {credentialName, schema, uiSchema} = args
    await mutateAsync({
      values: {
        credentialName,
        schema,
        uiSchema
      }
    })
  }

  return (
    <CredentialDesignerContext.Provider
      value={{
        onBack,
        onNext,
        disabled,
        step,
        maxInteractiveSteps,
        credentialDesignerFormData,
        onCredentialDesignerFormDataChange,
      }}>
      {children}
    </CredentialDesignerContext.Provider>
  )
}
export default CredentialDesignerContextProvider
