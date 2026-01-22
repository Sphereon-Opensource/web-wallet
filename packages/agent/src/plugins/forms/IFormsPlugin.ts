/**
 * Forms plugin interface definition.
 */

import { IPluginMethodMap } from '@veramo/core'
import type { FormDefinition, FormSchemaDefinition, FormStep } from './types'
import type {
  FormDefinitionGetByIdArgs,
  FormDefinitionGetByNameArgs,
  FormDefinitionListArgs,
  SchemaDefinitionGetByFormStepArgs,
  FormStepGetByIdArgs,
} from './types'

/**
 * Plugin methods interface for form operations.
 */
export interface IFormsPlugin extends IPluginMethodMap {
  /**
   * Get a form definition by ID.
   */
  formDefinitionGetById(args: FormDefinitionGetByIdArgs): Promise<FormDefinition | null>

  /**
   * Get a form definition by name.
   */
  formDefinitionGetByName(args: FormDefinitionGetByNameArgs): Promise<FormDefinition | null>

  /**
   * List form definitions with pagination.
   */
  formDefinitionList(args: FormDefinitionListArgs): Promise<FormDefinition[]>

  /**
   * Get schema definitions for a form step.
   */
  schemaDefinitionGetByFormStep(args: SchemaDefinitionGetByFormStepArgs): Promise<FormSchemaDefinition[]>

  /**
   * Get a form step by ID.
   */
  formStepGetById(args: FormStepGetByIdArgs): Promise<FormStep | null>
}
