import {
  CredentialDefinitionJwtVcJsonLdAndLdpVcV1_0_15,
  CredentialsSupportedDisplay, OID4VCICredentialFormat, ProofTypesSupported,
} from '@sphereon/oid4vci-common'
import {CredentialSchema} from '@/src/types'

export type ToCredentialConfigurationArgs = {
  schema: CredentialSchema
  options: CredentialConfigurationOptions
  branding?: CredentialsSupportedDisplay[] | undefined
}

export type CredentialConfigurationOptionsCommon = {
  scope?: string
  cryptographicBindingMethodsSupported?: Array<string>
  credentialSigningAlgValuesSupported?: Array<string>
  proofTypesSupported?: ProofTypesSupported
}

export type CredentialConfigurationOptions =
  | (CredentialConfigurationOptionsCommon & {
  format: 'dc+sd-jwt' | 'vc+sd-jwt'
  vct: string
})
  | (CredentialConfigurationOptionsCommon & {
  format: 'jwt_vc_json' | 'jwt_vc'
  types: string[]
})
  | (CredentialConfigurationOptionsCommon & {
  format: 'ldp_vc' | 'jwt_vc_json-ld'
  credentialDefinition: CredentialDefinitionJwtVcJsonLdAndLdpVcV1_0_15
})
  | (CredentialConfigurationOptionsCommon & {
  format: 'mso_mdoc'
  doctype: string
})
