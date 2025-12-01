import {CredentialSchema, CredentialUISchema} from '@/src/types'

export type StoreCredentialSchemaArgs = {
  credentialName: string
  credentialFormat: string
  schema: CredentialSchema
  uiSchema: CredentialUISchema | Array<CredentialUISchema>
  branding: CredentialDesignBranding
}

export type CredentialDesignBranding = {
  logoUrl?: string
  backgroundUrl?: string
  logoColor?: string
  backgroundColor?: string
}
