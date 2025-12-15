import React, {createContext, ReactElement, useCallback, useContext, useEffect, useState} from 'react'
import {JSONFormState} from '@sphereon/ui-components.ssi-react'
import {useNavigate, useOutletContext} from 'react-router-dom'
import {HttpError, useCreate} from '@refinedev/core'
import {toCredentialConfiguration, updateOid4vciMetadata} from '@/src/services/credentials/credentialDesignService'
import {ImageAttributes} from '@sphereon/ui-components.core'
import { buildCredentialSchemas } from '@/src/helpers/SchemaUtils'
import {
  CredentialDesignBrandingDTO,
  CredentialDesignDTO,
  CredentialDesignerRoute,
  DataResource,
  MainRoute,
  StoreCredentialDesignArgs,
  UIContextType
} from '@typings'
import {getImageSizes} from '@helpers/Images';

export type CredentialDesignerCreateContextType = UIContextType & {
  isAdvancedMode: boolean
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

export const CredentialDesignerCreateContext = createContext({} as CredentialDesignerCreateContextType)

export const useCredentialDesignerCreateMachine = () => useContext(CredentialDesignerCreateContext)

export const useCredentialDesignerCreateOutletContext = () => useOutletContext<CredentialDesignerCreateContextType>()

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

const CredentialDesignerCreateContextProvider = (props: any): ReactElement => {
  const {children} = props
  const navigate = useNavigate()
  const {mutateAsync: createCredentialDesign} = useCreate<CredentialDesignDTO, HttpError>({
    resource: DataResource.CREDENTIAL_DESIGNS,
  })
  const [step, setStep] = useState<number>(1)
  const [isAdvancedMode, setIsAdvancedMode] = useState<boolean>(false)
  const [disabled, setDisabled] = useState<boolean>(true)
  const [credentialDesignerDetailsFormData, setCredentialDesignerDetailsFormData] = useState<JSONFormState>({
    data: {
      "format": "dc+sd-jwt",
      "cryptographic_binding_methods_supported": [
        "did:web",
        "did:jwk",
      ],
      "credential_signing_alg_values_supported": [
        "ES256"
      ],
      "proof_types_supported": {
        "jwt": {
          "proof_signing_alg_values_supported": [
            "ES256"
          ]
        }
      }
    }
  })
  const [credentialDesignerClaimsFormData, setCredentialDesignerClaimsFormData] = useState<JSONFormState>({
    data: {
      credentialClaims: [
        {}
      ]
    }
  })
  const [credentialDesignerVisualDesignFormData, setCredentialDesignerVisualDesignFormData] = useState<JSONFormState>({
    data: {
      "background_color": "#7276f7",
      "text_color": "#fbfbfb"
    }
  })
  const [credentialDesignerVisualDesignBackgroundImage, setCredentialDesignerVisualDesignBackgroundImage] = useState<ImageAttributes | undefined>()
  const [credentialDesignerVisualDesignLogo, setCredentialDesignerVisualDesignLogo] = useState<ImageAttributes | undefined>()
  const maxInteractiveSteps = 3
  const maxAutoSteps = 1

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
        ? ((credentialDesignerClaimsFormData?.errors?.length ?? 0) > 0 || !noEmptyPropertiesRecursive(credentialDesignerClaimsFormData?.data?.credentialClaims ?? []))
        : false

      setDisabled(disabled)
      if (disabled) {
        console.warn(credentialDesignerClaimsFormData?.errors)
      }
    } else {
      setDisabled(false)
    }
  }, [step, credentialDesignerClaimsFormData, credentialDesignerDetailsFormData, credentialDesignerVisualDesignFormData])

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
    } else if (
        credentialDesignerDetailsFormData?.data !== undefined &&
        credentialDesignerVisualDesignFormData?.data !== undefined &&
        credentialDesignerClaimsFormData?.data !== undefined
    ) {
      const schemas = await buildCredentialSchemas(credentialDesignerClaimsFormData.data)
      await onCreate({
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
        isAdvancedSchema: !("credentialClaims" in credentialDesignerClaimsFormData.data)
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
          scope: credentialDesignerDetailsFormData.data.scope
        }
      })
      await updateOid4vciMetadata(credentialDesignerDetailsFormData.data.identifier, credentialConfiguration)
      navigate(`${MainRoute.CREDENTIALS}/${MainRoute.DESIGNS}`)
    }
  }, [
    step,
    credentialDesignerClaimsFormData,
    credentialDesignerDetailsFormData,
    credentialDesignerVisualDesignFormData
  ])

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

    if (credentialDesignerVisualDesignFormData.data.background_image?.uri !== state.data.background_image?.uri) {
      if (state.data.background_image?.uri) {
        getImageSizes(state.data.background_image?.uri)
          .then(dimensions =>
            setCredentialDesignerVisualDesignBackgroundImage({
              uri: state.data.background_image?.uri,
              ...(dimensions && {
                dimensions: {
                  width: dimensions.width,
                  height: dimensions.height
                }
              })
            })
          )
          .catch(() => setCredentialDesignerVisualDesignBackgroundImage({
            uri: state.data.background_image?.uri
          }))
      } else {
        setCredentialDesignerVisualDesignBackgroundImage(undefined)
      }
    }

    if (credentialDesignerVisualDesignFormData.data.logo?.uri !== state.data.logo?.uri) {
      if (state.data.logo?.uri) {
        getImageSizes(state.data.logo?.uri)
          .then(dimensions =>
            setCredentialDesignerVisualDesignLogo({
              uri: state.data.logo?.uri,
              ...(dimensions && {
                dimensions: {
                  width: dimensions.width,
                  height: dimensions.height
                }
              })
            })
          )
          .catch(() => setCredentialDesignerVisualDesignLogo({
            uri: state.data.logo?.uri
          }))
      } else {
        setCredentialDesignerVisualDesignLogo(undefined)
      }
    }
  }

  const onCreate = async (args: StoreCredentialDesignArgs): Promise<void> => {
    await createCredentialDesign({ values: args })
  }

  return (
    <CredentialDesignerCreateContext.Provider
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
        onCredentialDesignerVisualDesignFormDataChange
      }}>
      {children}
    </CredentialDesignerCreateContext.Provider>
  )
}

export default CredentialDesignerCreateContextProvider
