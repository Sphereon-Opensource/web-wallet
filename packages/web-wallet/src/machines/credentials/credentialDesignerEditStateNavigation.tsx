import React, {createContext, ReactElement, useCallback, useContext, useEffect, useState} from 'react'
import {JSONFormState} from '@sphereon/ui-components.ssi-react'
import {useNavigate, useOutletContext, useParams} from 'react-router-dom'
import {HttpError, useOne, useTranslate, useUpdate} from '@refinedev/core'
import {toCredentialConfiguration, updateOid4vciMetadata} from '@/src/services/credentials/credentialDesignService'
import {ImageAttributes} from '@sphereon/ui-components.core'
import {buildCredentialSchemas, noEmptyPropertiesRecursive, transformAdvancedSchema} from '@helpers/SchemaUtils'
import {getImageSizes} from '@helpers/Images'
import {
  CredentialDesignBrandingDTO,
  CredentialDesignDTO,
  CredentialDesignerRoute,
  DataResource,
  MainRoute,
  UIContextType,
  UpdateCredentialDesignArgs,
} from '@typings'

export type CredentialDesignerEditContextType = UIContextType & {
  isAdvancedMode: boolean
  editData?: CredentialDesignDTO
  onModeChange: () => Promise<void>
  credentialDesignerDetailsFormData?: JSONFormState
  onCredentialDesignerDetailsFormDataChange: (state: JSONFormState) => Promise<void>
  credentialDesignerClaimsFormData?: JSONFormState
  onCredentialDesignerClaimsFormDataChange: (state: JSONFormState) => Promise<void>
  credentialDesignerVisualDesignFormData?: JSONFormState
  credentialDesignerVisualDesignBackgroundImage?: ImageAttributes
  credentialDesignerVisualDesignLogo?: ImageAttributes
  onCredentialDesignerVisualDesignFormDataChange: (state: JSONFormState) => Promise<void>
}

export const CredentialDesignerEditContext = createContext({} as CredentialDesignerEditContextType)

export const useCredentialDesignerEditMachine = () => useContext(CredentialDesignerEditContext)

export const useCredentialDesignerEditOutletContext = () => useOutletContext<CredentialDesignerEditContextType>()

const credentialDesignNavigationListener = async (step: number, navigate: any): Promise<void> => {
  switch (step) {
    case 1:
      return navigate(CredentialDesignerRoute.DETAILS)
    case 2:
      return navigate(CredentialDesignerRoute.VISUAL_DESIGN)
    case 3:
      return navigate(CredentialDesignerRoute.CLAIMS)
    default:
      return Promise.reject('issue credential step exceeds maximum steps')
  }
}

const CredentialDesignerEditContextProvider = (props: any): ReactElement => {
  const {children} = props
  const {id} = useParams()
  const navigate = useNavigate()
  const {mutateAsync: updateCredentialDesign} = useUpdate<CredentialDesignDTO, HttpError>({
    resource: DataResource.CREDENTIAL_DESIGNS,
  })
  const translate = useTranslate()

  const {
    data: credentialDesign,
    isLoading: credentialDesignLoading,
    isFetching: credentialDesignFetching,
    isError: credentialDesignError,
  } = useOne<CredentialDesignDTO, HttpError>({
    id,
    resource: DataResource.CREDENTIAL_DESIGNS,
    queryOptions: {
      refetchOnMount: 'always',
      cacheTime: 0,
    },
  })
  const [step, setStep] = useState<number>(1)
  const [isAdvancedMode, setIsAdvancedMode] = useState<boolean>(false)
  const [disabled, setDisabled] = useState<boolean>(true)
  const [credentialDesignerDetailsFormData, setCredentialDesignerDetailsFormData] = useState<JSONFormState | undefined>(undefined)
  const [credentialDesignerClaimsFormData, setCredentialDesignerClaimsFormData] = useState<JSONFormState | undefined>(undefined)
  const [credentialDesignerVisualDesignFormData, setCredentialDesignerVisualDesignFormData] = useState<JSONFormState | undefined>(undefined)
  const [credentialDesignerVisualDesignBackgroundImage, setCredentialDesignerVisualDesignBackgroundImage] = useState<ImageAttributes | undefined>()
  const [credentialDesignerVisualDesignLogo, setCredentialDesignerVisualDesignLogo] = useState<ImageAttributes | undefined>()
  const maxInteractiveSteps = 3
  const maxAutoSteps = 1

  useEffect((): void => {
    if (!credentialDesign) {
      return
    }

    let proof_types_supported
    try {
      const proofTypesSupported = credentialDesign.data.metadataKeys.find(key => key.key === 'proofTypesSupported')?.values?.[0]?.textValue
      if (proofTypesSupported) {
        proof_types_supported = JSON.parse(proofTypesSupported)
      }
    } catch {}
    const vct = credentialDesign.data.metadataKeys.find(key => key.key === 'vct')?.values?.[0]?.textValue
    const scope = credentialDesign.data.metadataKeys.find(key => key.key === 'scope')?.values?.[0]?.textValue

    let dataSchema
    try {
      const result = credentialDesign.data.schemaDefinition.find(def => def.schemaType === 'Data')?.schema
      if (result) {
        dataSchema = JSON.parse(result)
      }
    } catch {
      dataSchema = {}
    }
    const isAdvancedSchema = credentialDesign.data.metadataKeys.find(key => key.key === 'advancedSchema')?.values?.[0]?.booleanValue

    setCredentialDesignerDetailsFormData({
      data: {
        format: credentialDesign.data.metadataKeys.find(key => key.key === 'credentialFormat')?.values?.[0]?.textValue,
        cryptographic_binding_methods_supported:
          credentialDesign.data.metadataKeys.find(key => key.key === 'cryptographicBindingMethodsSupported')?.values.map(value => value.textValue) ??
          [],
        credential_signing_alg_values_supported:
          credentialDesign.data.metadataKeys.find(key => key.key === 'credentialSigningAlgValuesSupported')?.values.map(value => value.textValue) ??
          [],
        proof_types_supported: proof_types_supported ?? {},
        ...(vct && {vct}),
        ...(scope && {scope}),
        identifier: credentialDesign.data.name,
      },
    })
    setCredentialDesignerVisualDesignFormData({
      data: {
        ...(credentialDesign.data.credentialDesignBranding?.backgroundImage && {
          background_image: {
            uri: credentialDesign.data.credentialDesignBranding.backgroundImage.uri,
          },
        }),
        ...(credentialDesign.data.credentialDesignBranding?.logo && {
          logo: {
            uri: credentialDesign.data.credentialDesignBranding.logo.uri,
          },
        }),
        ...(credentialDesign.data.credentialDesignBranding?.backgroundColor && {
          background_color: credentialDesign.data.credentialDesignBranding.backgroundColor,
        }),
        ...(credentialDesign.data.credentialDesignBranding?.textColor && {text_color: credentialDesign.data.credentialDesignBranding.textColor}),
      },
    })
    setCredentialDesignerVisualDesignBackgroundImage(credentialDesign.data.credentialDesignBranding?.backgroundImage)
    setCredentialDesignerVisualDesignLogo(credentialDesign.data.credentialDesignBranding?.logo)
    setCredentialDesignerClaimsFormData({data: isAdvancedSchema ? dataSchema : transformAdvancedSchema(dataSchema), errors: []})
  }, [credentialDesign])

  useEffect((): void => {
    void credentialDesignNavigationListener(step, navigate)
  }, [step])

  useEffect((): void => {
    if (step === 1) {
      const disabled = (credentialDesignerDetailsFormData?.errors?.length ?? 0) > 0
      setDisabled(disabled)
      if (disabled) {
        console.warn(credentialDesignerDetailsFormData?.errors)
      }
    } else if (step === 2) {
      const disabled = (credentialDesignerVisualDesignFormData?.errors?.length ?? 0) > 0
      setDisabled(disabled)
      if (disabled) {
        console.warn(credentialDesignerVisualDesignFormData?.errors)
      }
    } else if (step === 3) {
      const disabled = !isAdvancedMode
        ? (credentialDesignerClaimsFormData?.errors?.length ?? 0) > 0 ||
          !noEmptyPropertiesRecursive(credentialDesignerClaimsFormData?.data?.credentialClaims ?? [])
        : false
      setDisabled(disabled)
      if (disabled) {
        console.warn(credentialDesignerClaimsFormData?.errors)
      }
    } else {
      setDisabled(false)
    }
  }, [step, credentialDesignerClaimsFormData, credentialDesignerDetailsFormData, credentialDesignerVisualDesignFormData])

  const onNext = useCallback(async (): Promise<void> => {
    const nextStep: number = step + maxAutoSteps
    if (nextStep <= maxInteractiveSteps) {
      setStep(nextStep)
    } else if (
      credentialDesignerDetailsFormData?.data !== undefined &&
      credentialDesignerVisualDesignFormData?.data !== undefined &&
      credentialDesignerClaimsFormData?.data !== undefined &&
      id
    ) {
      const schemas = await buildCredentialSchemas(credentialDesignerClaimsFormData.data)
      await onUpdate({
        id,
        name: credentialDesignerDetailsFormData.data.identifier,
        schema: schemas.schema,
        uiSchema: schemas.uiSchema,
        branding: new CredentialDesignBrandingDTO({
          backgroundColor: credentialDesignerVisualDesignFormData.data?.background_color,
          textColor: credentialDesignerVisualDesignFormData.data?.text_color,
          backgroundImage: credentialDesignerVisualDesignBackgroundImage,
          logo: credentialDesignerVisualDesignLogo,
        }),
        options: {
          format: credentialDesignerDetailsFormData.data.format,
          credentialSigningAlgValuesSupported: credentialDesignerDetailsFormData.data.credential_signing_alg_values_supported,
          vct: credentialDesignerDetailsFormData.data.vct ?? credentialDesignerDetailsFormData.data.identifier,
          cryptographicBindingMethodsSupported: credentialDesignerDetailsFormData.data.cryptographic_binding_methods_supported,
          proofTypesSupported: credentialDesignerDetailsFormData.data.proof_types_supported,
          scope: credentialDesignerDetailsFormData.data.scope,
        },
        isAdvancedSchema: !('credentialClaims' in credentialDesignerClaimsFormData.data),
      })
      const credentialConfiguration = toCredentialConfiguration({
        identifier: credentialDesignerDetailsFormData.data.identifier,
        schema: schemas.schema,
        branding: credentialDesignerVisualDesignFormData.data,
        options: {
          format: credentialDesignerDetailsFormData.data.format,
          credentialSigningAlgValuesSupported: credentialDesignerDetailsFormData.data.credential_signing_alg_values_supported,
          vct: credentialDesignerDetailsFormData.data.vct ?? credentialDesignerDetailsFormData.data.identifier,
          cryptographicBindingMethodsSupported: credentialDesignerDetailsFormData.data.cryptographic_binding_methods_supported,
          proofTypesSupported: credentialDesignerDetailsFormData.data.proof_types_supported,
          scope: credentialDesignerDetailsFormData.data.scope,
        },
      })
      await updateOid4vciMetadata(credentialDesignerDetailsFormData.data.identifier, credentialConfiguration, credentialDesign?.data?.name)

      navigate(`${MainRoute.CREDENTIALS}/${MainRoute.DESIGNS}`)
    }
  }, [step, credentialDesignerClaimsFormData, credentialDesignerDetailsFormData, credentialDesignerVisualDesignFormData])

  const onBack = useCallback(async (): Promise<void> => {
    const nextStep: number = step - maxAutoSteps
    if (nextStep >= 1) {
      setStep(nextStep)
    }
  }, [step])

  const onModeChange = useCallback(async (): Promise<void> => {
    setIsAdvancedMode(prev => !prev)
  }, [isAdvancedMode])

  const onCredentialDesignerDetailsFormDataChange = async (state: JSONFormState): Promise<void> => {
    setCredentialDesignerDetailsFormData(state)
  }

  const onCredentialDesignerClaimsFormDataChange = async (state: JSONFormState): Promise<void> => {
    setCredentialDesignerClaimsFormData(state)
  }

  const onCredentialDesignerVisualDesignFormDataChange = async (state: JSONFormState): Promise<void> => {
    if (state.data.background_image && Object.keys(state.data.background_image).length === 0) {
      delete state.data.background_image
    }

    if (state.data.logo && Object.keys(state.data.logo).length === 0) {
      delete state.data.logo
    }

    setCredentialDesignerVisualDesignFormData(state)

    if (credentialDesignerVisualDesignFormData?.data.background_image?.uri !== state.data.background_image?.uri) {
      if (state.data.background_image?.uri) {
        getImageSizes(state.data.background_image?.uri)
          .then(dimensions =>
            setCredentialDesignerVisualDesignBackgroundImage({
              uri: state.data.background_image?.uri,
              ...(dimensions && {
                dimensions: {
                  width: dimensions.width,
                  height: dimensions.height,
                },
              }),
            }),
          )
          .catch(() =>
            setCredentialDesignerVisualDesignBackgroundImage({
              uri: state.data.background_image?.uri,
            }),
          )
      } else {
        setCredentialDesignerVisualDesignBackgroundImage(undefined)
      }
    }

    if (credentialDesignerVisualDesignFormData?.data.logo?.uri !== state.data.logo?.uri) {
      if (state.data.logo?.uri) {
        getImageSizes(state.data.logo?.uri)
          .then(dimensions =>
            setCredentialDesignerVisualDesignLogo({
              uri: state.data.logo?.uri,
              ...(dimensions && {
                dimensions: {
                  width: dimensions.width,
                  height: dimensions.height,
                },
              }),
            }),
          )
          .catch(() =>
            setCredentialDesignerVisualDesignLogo({
              uri: state.data.logo?.uri,
            }),
          )
      } else {
        setCredentialDesignerVisualDesignLogo(undefined)
      }
    }
  }

  const onUpdate = async (args: UpdateCredentialDesignArgs): Promise<void> => {
    await updateCredentialDesign({id: args.id, values: args})
  }

  if (credentialDesignError) {
    return <div>{translate('data_provider_error_message')}</div>
  }

  if (
    credentialDesignLoading ||
    credentialDesignFetching ||
    credentialDesignerDetailsFormData?.data === undefined ||
    credentialDesignerVisualDesignFormData?.data === undefined ||
    credentialDesignerClaimsFormData?.data === undefined
  ) {
    return <div>{translate('data_provider_loading_message')}</div>
  }

  return (
    <CredentialDesignerEditContext.Provider
      value={{
        onBack,
        onNext,
        disabled,
        step,
        isAdvancedMode,
        onModeChange,
        maxInteractiveSteps,
        credentialDesignerClaimsFormData,
        onCredentialDesignerClaimsFormDataChange,
        credentialDesignerDetailsFormData,
        onCredentialDesignerDetailsFormDataChange,
        credentialDesignerVisualDesignFormData,
        credentialDesignerVisualDesignBackgroundImage,
        credentialDesignerVisualDesignLogo,
        onCredentialDesignerVisualDesignFormDataChange,
        editData: credentialDesign?.data,
      }}>
      {children}
    </CredentialDesignerEditContext.Provider>
  )
}

export default CredentialDesignerEditContextProvider
