/**
 * Credential Design entity types.
 *
 * These types match the structure returned by the PL/pgSQL functions
 * insert_credential_design() and update_credential_design().
 */

/**
 * Image dimensions for branding images.
 */
export interface ImageDimensions {
  id: string
  width: number
  height: number
}

/**
 * Image attributes including URI and optional dimensions.
 */
export interface ImageAttributes {
  id: string
  uri: string
  dimensions?: ImageDimensions | null
}

/**
 * Metadata value entry.
 */
export interface MetaDataValue {
  id: string
  index: number
  key_id: string
  text_value?: string | null
  boolean_value?: boolean | null
}

/**
 * Metadata key with associated values.
 */
export interface MetaDataKey {
  id: string
  key: string
  set_id: string
  value_type: 'Text' | 'Boolean' | 'Number'
  meta_data_values: MetaDataValue[]
}

/**
 * Form step to schema definition mapping.
 */
export interface FormStepToSchemaDefinition {
  form_step_id: string
  schema_definition_id: string
}

/**
 * Schema definition for credential design.
 */
export interface SchemaDefinition {
  id: string
  schema: Record<string, unknown>
  tenant_id?: string | null
  extends_id?: string | null
  entity_type: string
  schema_type: 'Data' | 'UI_Form'
  correlation_id: string
  meta_data_set_id: string
  form_step_to_schema_definition?: FormStepToSchemaDefinition[]
}

/**
 * Branding configuration for credential design.
 */
export interface CredentialDesignBranding {
  id: string
  logo?: ImageAttributes | null
  background_image?: ImageAttributes | null
  text_color?: string | null
  background_color?: string | null
  meta_data_set_id: string
}

/**
 * Complete credential design entity as returned from database.
 */
export interface CredentialDesign {
  id: string
  tenant_id?: string | null
  name: string
  meta_data_keys: MetaDataKey[]
  schema_definition: SchemaDefinition[]
  credential_design_branding?: CredentialDesignBranding | null
}

/**
 * Branding input for create/update operations.
 */
export interface CredentialDesignBrandingInput {
  logo?: {
    uri: string
    dimensions?: {
      width: number
      height: number
    }
  } | null
  background_image?: {
    uri: string
    dimensions?: {
      width: number
      height: number
    }
  } | null
  text_color?: string | null
  background_color?: string | null
}

/**
 * Credential configuration options.
 */
export interface CredentialConfigurationOptions {
  format: string
  vct?: string | null
  scope?: string | null
  cryptographicBindingMethodsSupported?: string[]
  credentialSigningAlgValuesSupported?: string[]
  proofTypesSupported?: Record<string, unknown>
}
