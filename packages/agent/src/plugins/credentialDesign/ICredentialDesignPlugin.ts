/**
 * Credential Design plugin interface definition.
 */

import { IPluginMethodMap } from '@veramo/core'
import type { CredentialDesign } from './types'
import type {
  CredentialDesignCreateArgs,
  CredentialDesignUpdateArgs,
  CredentialDesignGetByIdArgs,
  CredentialDesignListArgs,
  CredentialDesignDeleteArgs,
  FormStepGetOrCreateArgs,
} from './types'

/**
 * Plugin methods interface for credential design operations.
 */
export interface ICredentialDesignPlugin extends IPluginMethodMap {
  /**
   * Create a new credential design.
   * Calls the insert_credential_design() PL/pgSQL function.
   */
  credentialDesignCreate(args: CredentialDesignCreateArgs): Promise<CredentialDesign>

  /**
   * Update an existing credential design.
   * Calls the update_credential_design() PL/pgSQL function.
   */
  credentialDesignUpdate(args: CredentialDesignUpdateArgs): Promise<CredentialDesign>

  /**
   * Get a credential design by its ID.
   */
  credentialDesignGetById(args: CredentialDesignGetByIdArgs): Promise<CredentialDesign | null>

  /**
   * List credential designs with optional pagination.
   */
  credentialDesignList(args: CredentialDesignListArgs): Promise<CredentialDesign[]>

  /**
   * Get total count of credential designs.
   */
  credentialDesignCount(args: CredentialDesignListArgs): Promise<number>

  /**
   * Delete a credential design by ID.
   * Uses cascade delete to remove related metadata and branding.
   */
  credentialDesignDelete(args: CredentialDesignDeleteArgs): Promise<boolean>

  /**
   * Get or create a form step for credential issuance wizard.
   */
  formStepGetOrCreate(args: FormStepGetOrCreateArgs): Promise<string>
}
