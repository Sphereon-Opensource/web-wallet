import {CredentialSchema, CredentialUISchema} from '@/src/types'

export type StoreCredentialSchemaArgs = {
  identifier: string
  credentialFormat: string
  schema: CredentialSchema
  uiSchema: CredentialUISchema | Array<CredentialUISchema>
  branding: CredentialDesignBranding
}

export type CredentialDesignBranding = {
  logoUri?: string
  backgroundUri?: string
  logoColor?: string
  backgroundColor?: string
}
