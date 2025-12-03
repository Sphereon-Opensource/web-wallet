import {CredentialsSupportedDisplay, OID4VCICredentialFormat, ProofTypesSupported} from '@sphereon/oid4vci-common'
import {CredentialSchema} from '@/src/types'

export type ToCredentialConfigurationArgs = {
  identifier: string
  schema: CredentialSchema
  options: CredentialConfigurationOptions
  branding?: CredentialsSupportedDisplay[] | undefined
}

export type CredentialConfigurationOptions = {
  format: OID4VCICredentialFormat | string
  scope?: string
  cryptographicBindingMethodsSupported?: Array<string>
  credentialSigningAlgValuesSupported?: Array<string>
  proofTypesSupported?: ProofTypesSupported
  vct?: string
}

export type SdJwtFormatOptions = CredentialConfigurationOptionsCommon & {
  format: 'dc+sd-jwt' | 'vc+sd-jwt';
  vct: string;
};

export type JsonLDFormatOptions = CredentialConfigurationOptionsCommon & {
  format: 'ldp_vc' | 'jwt_vc_json-ld'
  credentialDefinition: CredentialDefinitionJwtVcJsonLdAndLdpVcV1_0_15
}

export type JWTFormatOptions = CredentialConfigurationOptionsCommon & {
  format: 'jwt_vc_json' | 'jwt_vc'
  types: string[]
}

export type MdocFormatOptions = CredentialConfigurationOptionsCommon & {
  format: 'mso_mdoc'
  doctype: string
}
export type CredentialConfigurationOptions =
  | SdJwtFormatOptions
  | JsonLDFormatOptions
  | JWTFormatOptions
  | MdocFormatOptions
