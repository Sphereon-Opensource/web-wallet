import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Migration to update eInvoice service endpoints to the new format.
 *
 * Old format:
 * - type: "einv-direct", "einv-peppol", "einv-ppf-fr", or "urn:org:fides:einv-*:1"
 * - metadata: { einvoice: { ... } } (lowercase, object)
 *
 * New format:
 * - type: "eInvoice" (always)
 * - metadata: { eInvoiceMethod: "Direct"|"Peppol"|"PPF-FR", eInvoice: [ { ... } ] } (capital I, array)
 *
 * This migration:
 * 1. Identifies services with old eInvoice type patterns
 * 2. Maps old types to new eInvoiceMethod values
 * 3. Updates type to "eInvoice"
 * 4. Adds eInvoiceMethod to metadata
 * 5. Renames einvoice to eInvoice and converts to array format
 */
export class MigrateEInvoiceServiceFormat1738000000000 implements MigrationInterface {
  name = 'MigrateEInvoiceServiceFormat1738000000000'

  // Map old type values to new eInvoiceMethod values
  private readonly typeMapping: Record<string, string> = {
    // Legacy type values
    'einv-direct': 'Direct',
    'einv-peppol': 'Peppol',
    'einv-ppf-fr': 'PPF-FR',
    // URN-based type values
    'urn:org:fides:einv-direct:1': 'Direct',
    'urn:org:fides:einv-peppol:1': 'Peppol',
    'urn:org:fides:einv-ppf-fr:1': 'PPF-FR',
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, check if service table exists
    const serviceTable = await queryRunner.getTable('service')
    if (!serviceTable) {
      console.log('[Migration] Service table does not exist, skipping eInvoice migration')
      return
    }

    // Get all services that need to be migrated
    const services = await queryRunner.query(`
      SELECT id, type, metadata
      FROM service
      WHERE type IN ('einv-direct', 'einv-peppol', 'einv-ppf-fr',
                     'urn:org:fides:einv-direct:1', 'urn:org:fides:einv-peppol:1', 'urn:org:fides:einv-ppf-fr:1')
         OR type LIKE 'einv-%'
         OR type LIKE 'urn:org:fides:einv-%'
    `)

    if (services.length === 0) {
      console.log('[Migration] No eInvoice services found to migrate')
      return
    }

    console.log(`[Migration] Found ${services.length} eInvoice services to migrate`)

    for (const service of services) {
      const oldType = service.type
      let eInvoiceMethod = 'Direct' // Default to Direct

      // Determine eInvoiceMethod from old type
      if (this.typeMapping[oldType]) {
        eInvoiceMethod = this.typeMapping[oldType]
      } else if (oldType.toLowerCase().includes('peppol')) {
        eInvoiceMethod = 'Peppol'
      } else if (oldType.toLowerCase().includes('ppf')) {
        eInvoiceMethod = 'PPF-FR'
      }

      // Parse existing metadata
      let metadata = service.metadata || {}
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata)
        } catch {
          metadata = {}
        }
      }

      // Add eInvoiceMethod to metadata
      metadata.eInvoiceMethod = eInvoiceMethod

      // Rename einvoice to eInvoice and ensure it's an array
      if (metadata.einvoice !== undefined) {
        const einvoiceData = metadata.einvoice
        // Convert to array if it's an object
        metadata.eInvoice = Array.isArray(einvoiceData) ? einvoiceData : [einvoiceData]
        delete metadata.einvoice
      } else if (metadata.eInvoice !== undefined && !Array.isArray(metadata.eInvoice)) {
        // Already has eInvoice but not as array
        metadata.eInvoice = [metadata.eInvoice]
      }

      // Update the service record
      await queryRunner.query(
        `UPDATE service SET type = $1, metadata = $2 WHERE id = $3`,
        ['eInvoice', JSON.stringify(metadata), service.id]
      )

      console.log(`[Migration] Migrated service ${service.id}: ${oldType} -> eInvoice (eInvoiceMethod: ${eInvoiceMethod})`)
    }

    console.log(`[Migration] Successfully migrated ${services.length} eInvoice services`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Get all eInvoice services
    const services = await queryRunner.query(`
      SELECT id, metadata
      FROM service
      WHERE type = 'eInvoice'
    `)

    if (services.length === 0) {
      console.log('[Migration] No eInvoice services found to revert')
      return
    }

    console.log(`[Migration] Found ${services.length} eInvoice services to revert`)

    // Reverse mapping
    const reverseMapping: Record<string, string> = {
      'Direct': 'einv-direct',
      'Peppol': 'einv-peppol',
      'PPF-FR': 'einv-ppf-fr',
    }

    for (const service of services) {
      let metadata = service.metadata || {}
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata)
        } catch {
          metadata = {}
        }
      }

      // Get old type from eInvoiceMethod
      const eInvoiceMethod = metadata.eInvoiceMethod || 'Direct'
      const oldType = reverseMapping[eInvoiceMethod] || 'einv-direct'

      // Rename eInvoice back to einvoice and convert to object
      if (metadata.eInvoice !== undefined) {
        const eInvoiceData = metadata.eInvoice
        // Convert array to single object (take first element)
        metadata.einvoice = Array.isArray(eInvoiceData) && eInvoiceData.length > 0 ? eInvoiceData[0] : eInvoiceData
        delete metadata.eInvoice
      }

      // Remove eInvoiceMethod from metadata
      delete metadata.eInvoiceMethod

      // Update the service record
      await queryRunner.query(
        `UPDATE service SET type = $1, metadata = $2 WHERE id = $3`,
        [oldType, JSON.stringify(metadata), service.id]
      )

      console.log(`[Migration] Reverted service ${service.id}: eInvoice -> ${oldType}`)
    }

    console.log(`[Migration] Successfully reverted ${services.length} eInvoice services`)
  }
}
