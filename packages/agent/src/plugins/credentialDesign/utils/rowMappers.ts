/**
 * Row mapping utilities for Credential Design entities.
 */

import type { CredentialDesign, CredentialDesignBranding, MetaDataKey, SchemaDefinition } from '../types'

/**
 * Map a database row to a CredentialDesign entity.
 * Used for queries that return aggregated JSON data.
 */
export function mapCredentialDesignRow(row: Record<string, unknown>): CredentialDesign {
  return {
    id: row.id as string,
    tenant_id: row.tenant_id as string | null,
    name: row.name as string,
    meta_data_keys: (row.meta_data_keys as MetaDataKey[]) || [],
    schema_definition: (row.schema_definition as SchemaDefinition[]) || [],
    credential_design_branding: row.credential_design_branding as CredentialDesignBranding | null,
  }
}

/**
 * Map the result from insert_credential_design() or update_credential_design() RPC.
 * The functions return JSONB which may need parsing.
 */
export function mapCredentialDesignFromRpc(result: unknown): CredentialDesign {
  // Handle if result is already parsed or needs parsing
  const data = typeof result === 'string' ? JSON.parse(result) : result

  // Filter out null values from meta_data_keys array (the RPC includes null for optional keys)
  const metaDataKeys = Array.isArray(data.meta_data_keys)
    ? data.meta_data_keys.filter((key: unknown) => key !== null)
    : []

  return {
    id: data.id,
    tenant_id: data.tenant_id,
    name: data.name,
    meta_data_keys: metaDataKeys,
    schema_definition: data.schema_definition || [],
    credential_design_branding: data.credential_design_branding || null,
  }
}
