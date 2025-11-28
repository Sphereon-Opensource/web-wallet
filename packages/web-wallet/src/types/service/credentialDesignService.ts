import {CredentialsSupportedDisplay, OID4VCICredentialFormat, ProofTypesSupported} from '@sphereon/oid4vci-common'
import {CredentialSchema} from '@/src/types'

export type ToCredentialConfigurationArgs = {
  schema: CredentialSchema
  options: CredentialConfigurationOptions
  branding?: CredentialsSupportedDisplay[] | undefined
}

export type CredentialConfigurationOptions = { // TODO type
  //id: string // TODO optional and what it is?
  format: OID4VCICredentialFormat | string
  scope?: string
  cryptographicBindingMethodsSupported?: Array<string>
  credentialSigningAlgValuesSupported?: Array<string>
  proofTypesSupported?: ProofTypesSupported
  vct?: string
}
