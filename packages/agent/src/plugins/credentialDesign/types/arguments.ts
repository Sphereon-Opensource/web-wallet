/**
 * Argument types for Credential Design plugin methods.
 */

import type { CredentialDesignBrandingInput, CredentialConfigurationOptions } from './entities'

/**
 * Arguments for creating a credential design.
 */
export interface CredentialDesignCreateArgs {
  /** Display name / identifier for the credential design */
  name: string
  /** JSON Schema for the credential data */
  schema: Record<string, unknown>
  /** UI Schema for rendering the credential form */
  uiSchema: Record<string, unknown> | Array<Record<string, unknown>>
  /** Credential format options */
  options: CredentialConfigurationOptions
  /** Whether this uses an advanced schema */
  isAdvancedSchema?: boolean
  /** Optional branding configuration */
  branding?: CredentialDesignBrandingInput | null
  /** Optional form step ID (created if not provided) */
  formStepId?: string
  /** Optional status list URI for credential revocation */
  statusListUri?: string
}

/**
 * Arguments for updating a credential design.
 */
export interface CredentialDesignUpdateArgs {
  /** ID of the credential design to update */
  id: string
  /** New display name / identifier */
  name: string
  /** Updated JSON Schema */
  schema: Record<string, unknown>
  /** Updated UI Schema */
  uiSchema: Record<string, unknown> | Array<Record<string, unknown>>
  /** Updated credential format options */
  options: CredentialConfigurationOptions
  /** Whether this uses an advanced schema */
  isAdvancedSchema?: boolean
  /** Updated branding configuration */
  branding?: CredentialDesignBrandingInput | null
}

/**
 * Arguments for getting a credential design by ID.
 */
export interface CredentialDesignGetByIdArgs {
  id: string
}

/**
 * Arguments for listing credential designs.
 */
export interface CredentialDesignListArgs {
  /** Filter by tenant ID */
  tenantId?: string
  /** Maximum number of results */
  limit?: number
  /** Pagination offset */
  offset?: number
}

/**
 * Arguments for deleting a credential design.
 */
export interface CredentialDesignDeleteArgs {
  id: string
}

/**
 * Arguments for getting or creating a form step.
 */
export interface FormStepGetOrCreateArgs {
  formId: string
}
