/**
 * Row mapping utilities for Forms entities.
 */

import type {
  FormDefinition,
  FormStep,
  FormSchemaDefinition,
  FormMetaDataSet,
  FormMetaDataKey,
  FormMetaDataValue,
  Machine,
} from '../types'

/**
 * Map a database row to a FormDefinition entity.
 */
export function mapFormDefinitionRow(row: Record<string, unknown>): FormDefinition {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | null,
    tenant_id: row.tenant_id as string | null,
    machine_id: row.machine_id as string | null,
    machine: row.machine ? mapMachineRow(row.machine as Record<string, unknown>) : null,
    form_steps: (row.form_steps as FormStep[]) || [],
  }
}

/**
 * Map a database row to a Machine entity.
 */
export function mapMachineRow(row: Record<string, unknown>): Machine {
  return {
    id: row.id as string,
    name: row.name as string,
    tenant_id: row.tenant_id as string | null,
    persistence: row.persistence as boolean | null,
  }
}

/**
 * Map a database row to a FormStep entity.
 */
export function mapFormStepRow(row: Record<string, unknown>): FormStep {
  return {
    id: row.id as string,
    form_id: row.form_id as string,
    // PostgreSQL may return numeric columns as strings, so ensure we parse them
    step_nr: typeof row.step_nr === 'string' ? parseInt(row.step_nr, 10) : (row.step_nr as number),
    order: typeof row.order === 'string' ? parseInt(row.order, 10) : (row.order as number),
    schema_definitions: row.schema_definitions as FormSchemaDefinition[] | undefined,
  }
}

/**
 * Map a database row to a FormSchemaDefinition entity.
 */
export function mapSchemaDefinitionRow(row: Record<string, unknown>): FormSchemaDefinition {
  return {
    id: row.id as string,
    correlation_id: row.correlation_id as string,
    schema_type: row.schema_type as 'Data' | 'UI_Form',
    entity_type: row.entity_type as string,
    schema: row.schema as string,
    tenant_id: row.tenant_id as string | null,
    extends_id: row.extends_id as string | null,
    meta_data_set_id: row.meta_data_set_id as string | null,
    meta_data_set: row.meta_data_set ? mapMetaDataSetRow(row.meta_data_set as Record<string, unknown>) : null,
  }
}

/**
 * Map a database row to a FormMetaDataSet entity.
 */
export function mapMetaDataSetRow(row: Record<string, unknown>): FormMetaDataSet {
  return {
    id: row.id as string,
    name: row.name as string,
    tenant_id: row.tenant_id as string | null,
    meta_data_keys: (row.meta_data_keys as FormMetaDataKey[]) || [],
  }
}

/**
 * Map a database row to a FormMetaDataKey entity.
 */
export function mapMetaDataKeyRow(row: Record<string, unknown>): FormMetaDataKey {
  return {
    id: row.id as string,
    set_id: row.set_id as string,
    key: row.key as string,
    value_type: row.value_type as 'Text' | 'Number' | 'Boolean' | 'Date',
    meta_data_values: (row.meta_data_values as FormMetaDataValue[]) || [],
  }
}

/**
 * Map a database row to a FormMetaDataValue entity.
 */
export function mapMetaDataValueRow(row: Record<string, unknown>): FormMetaDataValue {
  return {
    id: row.id as string,
    key_id: row.key_id as string,
    index: row.index as number,
    text_value: row.text_value as string | null,
    number_value: row.number_value as number | null,
    boolean_value: row.boolean_value as boolean | null,
    date_value: row.date_value ? new Date(row.date_value as string) : null,
  }
}
