/**
 * Argument types for Forms plugin methods.
 */

/**
 * Arguments for getting a form definition by ID.
 */
export interface FormDefinitionGetByIdArgs {
  id: string
}

/**
 * Arguments for getting a form definition by name.
 */
export interface FormDefinitionGetByNameArgs {
  name: string
  tenantId?: string
}

/**
 * Arguments for listing form definitions.
 */
export interface FormDefinitionListArgs {
  tenantId?: string
  limit?: number
  offset?: number
}

/**
 * Arguments for getting schema definitions by form step ID.
 */
export interface SchemaDefinitionGetByFormStepArgs {
  formStepId: string
}

/**
 * Arguments for getting a form step by ID.
 */
export interface FormStepGetByIdArgs {
  id: string
}
