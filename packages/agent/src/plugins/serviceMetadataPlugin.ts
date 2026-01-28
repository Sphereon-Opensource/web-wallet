import { DataSource } from 'typeorm'
import { IAgentPlugin, IPluginMethodMap } from '@veramo/core'

/**
 * eInvoice internal metadata (used for inbox configuration)
 */
export interface EInvoiceMetadata {
  entityName: string
  country: string
  documentIdentifiers: string[]
  processIdentifiers: string[]
  transportType: string
  // Internal inbox configuration
  inboxName?: string
  folderName?: string
  // PEPPOL-specific
  peppolParticipantId?: string
  peppolSmpUrl?: string
  peppolAs4Endpoint?: string
  // PPF-FR-specific
  ppfPlatformId?: string
  ppfRecipientIds?: string[]
  ppfMode?: 'pdp' | 'direct' | 'via-pdp'
  ppfApiEndpoint?: string
}

/**
 * Service metadata structure for eInvoicing services
 * Note: Uses capital I in "eInvoice" to match the DID document format
 */
export interface ServiceMetadata {
  eInvoice?: EInvoiceMetadata // Capital I
  [key: string]: unknown
}

/**
 * Arguments for updating service metadata
 */
export interface UpdateServiceMetadataArgs {
  /** The service ID (includes the DID fragment) */
  serviceId: string
  /** The identifier DID that owns this service */
  did: string
  /** The metadata to store */
  metadata: ServiceMetadata
}

/**
 * Arguments for getting service metadata
 */
export interface GetServiceMetadataArgs {
  /** The service ID */
  serviceId: string
  /** The identifier DID that owns this service */
  did: string
}

/**
 * Plugin methods interface
 */
export interface IServiceMetadata extends IPluginMethodMap {
  updateServiceMetadata(args: UpdateServiceMetadataArgs): Promise<boolean>
  getServiceMetadata(args: GetServiceMetadataArgs): Promise<ServiceMetadata | null>
}

/**
 * Plugin that manages service metadata storage in the database.
 *
 * This plugin uses the `metadata` column in the service table to store
 * additional properties beyond the standard DID spec fields (id, type,
 * serviceEndpoint, description).
 *
 * This is particularly useful for eInvoicing services that require
 * additional metadata like VCT, entity name, country, document identifiers, etc.
 */
export class ServiceMetadataPlugin implements IAgentPlugin {
  readonly methods: IServiceMetadata
  readonly schema = {
    components: {
      schemas: {},
      methods: {
        updateServiceMetadata: {
          description: 'Update metadata for a DID service',
          arguments: {
            $ref: '#/components/schemas/UpdateServiceMetadataArgs',
          },
          returnType: {
            type: 'void',
          },
        },
        getServiceMetadata: {
          description: 'Get metadata for a DID service',
          arguments: {
            $ref: '#/components/schemas/GetServiceMetadataArgs',
          },
          returnType: {
            $ref: '#/components/schemas/ServiceMetadata',
          },
        },
      },
    },
  }

  private dbConnection: Promise<DataSource>

  constructor(options: { dbConnection: Promise<DataSource> }) {
    this.dbConnection = options.dbConnection

    this.methods = {
      updateServiceMetadata: this.updateServiceMetadata.bind(this),
      getServiceMetadata: this.getServiceMetadata.bind(this),
    }
  }

  /**
   * Update metadata for a DID service
   */
  private async updateServiceMetadata(args: UpdateServiceMetadataArgs): Promise<boolean> {
    const db = await this.dbConnection
    const dbType = db.driver.options.type

    // PostgreSQL jsonb column accepts JSON objects directly
    // SQLite text column needs JSON string
    const metadataValue = dbType === 'postgres' ? args.metadata : JSON.stringify(args.metadata)

    // Build list of possible service ID formats
    // Veramo may store services with different ID formats:
    // - Short fragment: "#dddd"
    // - Just fragment: "dddd"
    // - Full URI: "did:web:example.com#dddd"
    const possibleIds: string[] = []
    const serviceId = args.serviceId
    const did = args.did

    // Add the original ID
    possibleIds.push(serviceId)

    // If it starts with #, also try without #
    if (serviceId.startsWith('#')) {
      possibleIds.push(serviceId.substring(1))
    } else {
      // If it doesn't start with #, also try with #
      possibleIds.push(`#${serviceId}`)
    }

    // Also try full URI format
    const fragment = serviceId.startsWith('#') ? serviceId : `#${serviceId}`
    if (!serviceId.startsWith('did:')) {
      possibleIds.push(`${did}${fragment}`)
    }

    console.log('[ServiceMetadata] Trying to update metadata for service:', {
      originalServiceId: args.serviceId,
      did: args.did,
      possibleIds,
      metadataKeys: Object.keys(args.metadata),
    })

    // Use appropriate parameter placeholders for the database type
    const query = dbType === 'postgres'
      ? 'UPDATE service SET metadata = $1 WHERE id = $2'
      : 'UPDATE "service" SET "metadata" = ? WHERE "id" = ?'

    // Try each possible ID format
    for (const id of possibleIds) {
      const result = await db.query(query, [metadataValue, id])
      console.log(`[ServiceMetadata] Tried update with id="${id}", result:`, result)

      // Check if the update succeeded by querying the row
      const checkQuery = dbType === 'postgres'
        ? 'SELECT id, metadata FROM service WHERE id = $1'
        : 'SELECT "id", "metadata" FROM "service" WHERE "id" = ?'
      const checkResult = await db.query(checkQuery, [id])

      if (checkResult.length > 0 && checkResult[0].metadata) {
        console.log(`[ServiceMetadata] Successfully updated metadata with id="${id}"`)
        return true
      }
    }

    // If none worked, list all services for this DID to help debugging
    const listQuery = dbType === 'postgres'
      ? 'SELECT id FROM service WHERE identifier_did = $1'
      : 'SELECT "id" FROM "service" WHERE "identifier_did" = ?'
    try {
      const allServices = await db.query(listQuery, [did])
      console.log(`[ServiceMetadata] All service IDs for DID ${did}:`, allServices.map((r: any) => r.id))
    } catch (e) {
      console.log('[ServiceMetadata] Could not list services:', e)
    }

    console.log('[ServiceMetadata] WARNING: Could not find service with any ID format')
    return false
  }

  /**
   * Get metadata for a DID service
   */
  private async getServiceMetadata(args: GetServiceMetadataArgs): Promise<ServiceMetadata | null> {
    const db = await this.dbConnection
    const dbType = db.driver.options.type

    // Build list of possible service ID formats (same as updateServiceMetadata)
    const possibleIds: string[] = []
    const serviceId = args.serviceId
    const did = args.did

    possibleIds.push(serviceId)
    if (serviceId.startsWith('#')) {
      possibleIds.push(serviceId.substring(1))
    } else {
      possibleIds.push(`#${serviceId}`)
    }
    const fragment = serviceId.startsWith('#') ? serviceId : `#${serviceId}`
    if (!serviceId.startsWith('did:')) {
      possibleIds.push(`${did}${fragment}`)
    }

    // Use appropriate parameter placeholders for the database type
    const query = dbType === 'postgres'
      ? 'SELECT metadata FROM service WHERE id = $1'
      : 'SELECT "metadata" FROM "service" WHERE "id" = ?'

    // Try each possible ID format
    for (const id of possibleIds) {
      const result = await db.query(query, [id])
      if (result.length > 0 && result[0].metadata) {
        try {
          // PostgreSQL jsonb returns object directly, SQLite text needs parsing
          const metadata = result[0].metadata
          return typeof metadata === 'string' ? JSON.parse(metadata) : metadata
        } catch {
          continue
        }
      }
    }

    return null
  }
}
