/**
 * Forms entity types.
 */

/**
 * Machine definition for form workflows.
 */
export interface Machine {
  id: string
  name: string
  tenant_id?: string | null
  persistence?: boolean | null
}

/**
 * Schema definition entity.
 */
export interface FormSchemaDefinition {
  id: string
  correlation_id: string
  schema_type: 'Data' | 'UI_Form'
  entity_type: string
  schema: string
  tenant_id?: string | null
  extends_id?: string | null
  meta_data_set_id?: string | null
  meta_data_set?: FormMetaDataSet | null
}

/**
 * Metadata value entity.
 */
export interface FormMetaDataValue {
  id: string
  key_id: string
  index: number
  text_value?: string | null
  number_value?: number | null
  boolean_value?: boolean | null
  date_value?: Date | null
}

/**
 * Metadata keys entity.
 */
export interface FormMetaDataKey {
  id: string
  set_id: string
  key: string
  value_type: 'Text' | 'Number' | 'Boolean' | 'Date'
  meta_data_values: FormMetaDataValue[]
}

/**
 * Metadata set entity.
 */
export interface FormMetaDataSet {
  id: string
  name: string
  tenant_id?: string | null
  meta_data_keys: FormMetaDataKey[]
}

/**
 * Form step entity.
 */
export interface FormStep {
  id: string
  form_id: string
  step_nr: number
  order: number
  schema_definitions?: FormSchemaDefinition[]
}

/**
 * Form definition entity.
 */
export interface FormDefinition {
  id: string
  name: string
  description?: string | null
  tenant_id?: string | null
  machine_id?: string | null
  machine?: Machine | null
  form_steps: FormStep[]
}
