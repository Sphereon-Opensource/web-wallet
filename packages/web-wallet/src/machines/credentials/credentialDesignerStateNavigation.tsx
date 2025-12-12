import React, {createContext, ReactElement, useCallback, useContext, useEffect, useState} from 'react'
import {JSONFormState} from '@sphereon/ui-components.ssi-react'
import {useNavigate, useOutletContext, useParams} from 'react-router-dom'
import {HttpError, useCreate, useOne, useTranslate, useUpdate} from '@refinedev/core'
import {toCredentialConfiguration, transformAdvancedSchema, updateOid4vciMetadata} from '@/src/services/credentials/credentialDesignService'
import {ImageAttributes} from '@sphereon/ui-components.core'
import {downloadImage, getImageDimensions, IImageDimensions} from '@sphereon/ssi-sdk.core'
import {
  CredentialDesignBrandingDTO,
  CredentialDesignDTO,
  CredentialDesignerRoute,
  CredentialSchema,
  CredentialSchemaClaim,
  CredentialUISchema,
  DataResource,
  MainRoute,
  StoreCredentialDesignArgs,
  UIContextType,
  UpdateCredentialDesignArgs,
} from '@typings'

export type CredentialDesignerContextType = UIContextType & {
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

export const CredentialDesignerContext = createContext({} as CredentialDesignerContextType)

export const useCredentialDesignerMachine = () => useContext(CredentialDesignerContext)

export const useCredentialDesignerOutletContext = () => useOutletContext<CredentialDesignerContextType>()

const getImageSizes = async (url: string): Promise<IImageDimensions | undefined> => {
  const resource = await downloadImage(url)
  if (resource) {
    return getImageDimensions(resource?.base64Content)
  }
}

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

const CredentialDesignerContextProvider = (props: any): ReactElement => {
  const {children} = props
  const {id} = useParams()
  const navigate = useNavigate()
  const {mutateAsync: createCredentialDesign} = useCreate<CredentialDesignDTO, HttpError>({
    resource: DataResource.CREDENTIAL_DESIGNS,
  })
  const {mutateAsync: updateCredentialDesign} = useUpdate<CredentialDesignDTO, HttpError>({
    resource: DataResource.CREDENTIAL_DESIGNS
  })
  const translate = useTranslate()

  const {
    data: credentialDesign,
    isLoading: credentialDesignLoading,
    isError: credentialDesignError,
  } = useOne<CredentialDesignDTO, HttpError>({
    id,
    resource: DataResource.CREDENTIAL_DESIGNS,
    queryOptions: {
      enabled: !!id,
      onSuccess: (data) => {
        // let proof_types_supported
        // try {
        //   const proofTypesSupported = data.data.metadataKeys.find(key => key.key === 'proofTypesSupported')?.values?.[0]?.textValue
        //   if (proofTypesSupported) {
        //     proof_types_supported = JSON.parse(proofTypesSupported)
        //   }
        // } catch {}
        // const vct = data.data.metadataKeys.find(key => key.key === 'vct')?.values?.[0]?.textValue
        // const scope = data.data.metadataKeys.find(key => key.key === 'scope')?.values?.[0]?.textValue
        //
        // let dataSchema
        // try {
        //   const result = data.data.schemaDefinition.find(def => def.schemaType === 'Data')?.schema
        //   if (result) {
        //     dataSchema = JSON.parse(result)
        //   }
        // } catch {
        //   dataSchema = {}
        // }
        // const isAdvancedSchema = data.data.metadataKeys.find(key => key.key === 'advancedSchema')?.values?.[0]?.booleanValue

        setCredentialDesignerDetailsFormData({
          data: {
            format: data.data.metadataKeys.find(key => key.key === 'credentialFormat')?.values?.[0]?.textValue,
            // cryptographic_binding_methods_supported: data.data.metadataKeys.find(key => key.key === 'cryptographicBindingMethodsSupported')?.values.map(value => value.textValue) ?? [],
            // credential_signing_alg_values_supported: data.data.metadataKeys.find(key => key.key === 'credentialSigningAlgValuesSupported')?.values.map(value => value.textValue) ?? [],
            // proof_types_supported: proof_types_supported ?? {},
            // ...(vct && { vct }),
            // ...(scope && { scope }),
            identifier: data.data.name
          }
        })
        // setCredentialDesignerVisualDesignFormData({
        //   data: {
        //     ...(data.data.credentialDesignBranding.backgroundImage && {
        //       background_image: {
        //         uri: data.data.credentialDesignBranding.backgroundImage.uri,
        //         //alt_text: credentialDesign.data.credentialDesignBranding.backgroundImage.altText
        //       }
        //     }),
        //     ...(data.data.credentialDesignBranding.logo && {
        //       logo: {
        //         uri: data.data.credentialDesignBranding.logo.uri,
        //         //alt_text: credentialDesign.data.credentialDesignBranding.backgroundImage.altText
        //       }
        //     }),
        //     ...(data.data.credentialDesignBranding.backgroundColor && { background_color: data.data.credentialDesignBranding.backgroundColor }),
        //     ...(data.data.credentialDesignBranding.textColor && { text_color: data.data.credentialDesignBranding.textColor })
        //   }
        // })
        // setCredentialDesignerVisualDesignBackgroundImage(data.data.credentialDesignBranding.backgroundImage)
        // setCredentialDesignerVisualDesignLogo(data.data.credentialDesignBranding.logo)
        // setCredentialDesignerClaimsFormData({ data: isAdvancedSchema ? dataSchema : transformAdvancedSchema(dataSchema), errors: [] })
      },
    },
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
      },
      "identifier": "bram"
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

  // useEffect(() => {
  //   if (!credentialDesign) {
  //     return
  //   }
  //
  //   let proof_types_supported
  //   try {
  //     const proofTypesSupported = credentialDesign.data.metadataKeys.find(key => key.key === 'proofTypesSupported')?.values?.[0]?.textValue
  //     if (proofTypesSupported) {
  //       proof_types_supported = JSON.parse(proofTypesSupported)
  //     }
  //   } catch {}
  //   const vct = credentialDesign.data.metadataKeys.find(key => key.key === 'vct')?.values?.[0]?.textValue
  //   const scope = credentialDesign.data.metadataKeys.find(key => key.key === 'scope')?.values?.[0]?.textValue
  //
  //   let dataSchema
  //   try {
  //     const result = credentialDesign.data.schemaDefinition.find(def => def.schemaType === 'Data')?.schema
  //     if (result) {
  //       dataSchema = JSON.parse(result)
  //     }
  //   } catch {
  //     dataSchema = {}
  //   }
  //   const isAdvancedSchema = credentialDesign.data.metadataKeys.find(key => key.key === 'advancedSchema')?.values?.[0]?.booleanValue
  //
  //   setCredentialDesignerDetailsFormData({
  //     data: {
  //       format: credentialDesign.data.metadataKeys.find(key => key.key === 'credentialFormat')?.values?.[0]?.textValue,
  //       cryptographic_binding_methods_supported: credentialDesign.data.metadataKeys.find(key => key.key === 'cryptographicBindingMethodsSupported')?.values.map(value => value.textValue) ?? [],
  //       credential_signing_alg_values_supported: credentialDesign.data.metadataKeys.find(key => key.key === 'credentialSigningAlgValuesSupported')?.values.map(value => value.textValue) ?? [],
  //       proof_types_supported: proof_types_supported ?? {},
  //       ...(vct && { vct }),
  //       ...(scope && { scope }),
  //       identifier: credentialDesign.data.name
  //     }
  //   })
  //   setCredentialDesignerVisualDesignFormData({
  //     data: {
  //       ...(credentialDesign.data.credentialDesignBranding.backgroundImage && {
  //         background_image: {
  //           uri: credentialDesign.data.credentialDesignBranding.backgroundImage.uri,
  //           //alt_text: credentialDesign.data.credentialDesignBranding.backgroundImage.altText
  //         }
  //       }),
  //       ...(credentialDesign.data.credentialDesignBranding.logo && {
  //         logo: {
  //           uri: credentialDesign.data.credentialDesignBranding.logo.uri,
  //           //alt_text: credentialDesign.data.credentialDesignBranding.backgroundImage.altText
  //         }
  //       }),
  //       ...(credentialDesign.data.credentialDesignBranding.backgroundColor && { background_color: credentialDesign.data.credentialDesignBranding.backgroundColor }),
  //       ...(credentialDesign.data.credentialDesignBranding.textColor && { text_color: credentialDesign.data.credentialDesignBranding.textColor })
  //     }
  //   })
  //   setCredentialDesignerVisualDesignBackgroundImage(credentialDesign.data.credentialDesignBranding.backgroundImage)
  //   setCredentialDesignerVisualDesignLogo(credentialDesign.data.credentialDesignBranding.logo)
  //   setCredentialDesignerClaimsFormData({ data: isAdvancedSchema ? dataSchema : transformAdvancedSchema(dataSchema), errors: [] })
  // }, [credentialDesign])

  const maxInteractiveSteps = 3
  const maxAutoSteps = 1

  useEffect(() => {
    void credentialDesignNavigationListener(step, navigate)

    // const handlePopstate = (): void => {
    //   if (step > 0) {
    //     setStep(step - maxAutoSteps)
    //     // FIXME for now just resetting everything as we do not have support yet to rehydrate the fields again
    //     setCredentialDesignerDetailsFormData({
    //       data: {
    //         "format": "dc+sd-jwt",
    //         "cryptographic_binding_methods_supported": [
    //           "did:web",
    //           "did:jwk",
    //         ],
    //         "credential_signing_alg_values_supported": [
    //           "ES256"
    //         ],
    //         "proof_types_supported": {
    //           "jwt": {
    //             "proof_signing_alg_values_supported": [
    //               "ES256"
    //             ]
    //           }
    //         }
    //       }
    //     })
    //     setCredentialDesignerClaimsFormData({
    //       data: {
    //         credentialClaims: [
    //           {}
    //         ]
    //       }
    //     })
    //     setCredentialDesignerVisualDesignFormData({
    //       data: {
    //         "background_color": "#7276f7",
    //         "text_color": "#fbfbfb"
    //       }
    //     })
    //   }
    // }
    // window.addEventListener('popstate', handlePopstate)
    // return (): void => {
    //   window.removeEventListener('popstate', handlePopstate)
    // }
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
    } else if (credentialDesignerClaimsFormData?.data && credentialDesignerDetailsFormData.data) {
      await buildCredentialSchemas(credentialDesignerClaimsFormData.data)
        .then(buildResult => {
          if (id) {
            onUpdate({
              id,
              name: credentialDesignerDetailsFormData.data.identifier,
              schema: buildResult.schema,
              uiSchema: buildResult.uiSchema,
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
          } else {
            onCreate({
              name: credentialDesignerDetailsFormData.data.identifier,
              schema: buildResult.schema,
              uiSchema: buildResult.uiSchema,
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
          }
          return buildResult
        })
        .then((buildResult) => {
            const credentialConfiguration = toCredentialConfiguration({
              identifier: credentialDesignerDetailsFormData.data.identifier,
              schema: buildResult.schema,
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
            void updateOid4vciMetadata(credentialDesignerDetailsFormData.data.identifier, credentialConfiguration)
        })

      navigate(`${MainRoute.CREDENTIALS}/${MainRoute.DESIGNS}`)
    }
  }, [step, credentialDesignerClaimsFormData, credentialDesignerDetailsFormData])

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

  const buildCredentialSchemas = async (
    claims: any
  ): Promise<{schema: CredentialSchema; uiSchema: CredentialUISchema | Array<CredentialUISchema>}> => {
    const schema: CredentialSchema = "credentialClaims" in claims ? buildCredentialSchema(claims.credentialClaims) : claims
    const uiSchema = "credentialClaims" in claims ? buildCredentialUISchema(claims.credentialClaims) : buildCredentialUISchema(claims)

    return {schema, uiSchema}
  }

  const buildCredentialSchema = (claims: Array<CredentialSchemaClaim>): CredentialSchema => {
    const properties: Record<string, any> = {}
    const requiredFields: Array<string> = []

    claims.forEach((claim): void => {
      if (claim.type === 'object' && claim.properties) {
        properties[claim.claimName] = buildCredentialSchema(claim.properties)
      } else if (claim.type === 'array') {
        properties[claim.claimName] = {
          type: 'array',
          items: { type: 'string' }
        }
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

  const normalizeSchemaInput = (input: any): Array<{ name: string; schema: any }> => {
    if (Array.isArray(input)) {
      return input.map((claim) => ({
        name: claim.claimName,
        schema: claim
      }))
    }

    if (input?.type === 'object' && input?.properties && !Array.isArray(input.properties)) {
      return Object.entries(input.properties).map(([name, schema]) => ({
        name,
        schema
      }))
    }

    return []
  }

  const buildCredentialUISchema = (
    input: any,
    basePath: string = '#/properties',
    isRoot: boolean = true,
  ): CredentialUISchema | Array<CredentialUISchema> => {

    const elements: CredentialUISchema[] = []
    const normalized = normalizeSchemaInput(input)

    normalized.forEach(({ name, schema }) => {
      const path = `${basePath}/${name}`
      const isObject = schema.type === 'object' && schema.properties

      if (isObject) {
        const nextInput = Array.isArray(schema.properties)
          ? schema.properties
          : schema

        elements.push({
          type: 'Group',
          label: name,
          elements: buildCredentialUISchema(nextInput, `${path}/properties`, false) as CredentialUISchema[]
        })
      } else {
        elements.push({
          type: 'Control',
          label: name,
          scope: path
        })
      }
    })

    return isRoot
      ? { type: 'VerticalLayout', elements }
      : elements
  }

  const onCreate = async (args: StoreCredentialDesignArgs): Promise<void> => {
    await createCredentialDesign({ values: args })
  }

  const onUpdate = async (args: UpdateCredentialDesignArgs): Promise<void> => {
    await updateCredentialDesign({ id: args.id, values: args })
  }

  if (id !== undefined && credentialDesignError) {
    return <div>{translate('data_provider_error_message')}</div>
  }

  if (id !== undefined && credentialDesignLoading) {
    return <div>{translate('data_provider_loading_message')}</div>
  }

  return (
    <CredentialDesignerContext.Provider
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
        editData: credentialDesign?.data
      }}>
      {children}
    </CredentialDesignerContext.Provider>
  )
}
export default CredentialDesignerContextProvider
