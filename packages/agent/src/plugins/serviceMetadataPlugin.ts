import { DataSource } from 'typeorm'
import { IAgentPlugin, IPluginMethodMap } from '@veramo/core'

/**
 * Service metadata structure for eInvoicing services
 */
export interface ServiceMetadata {
  einvoice?: {
    vct: string
    entityName: string
    country: string
    documentIdentifiers: string[]
    processIdentifiers: string[]
    transportType: string
    endpoint?: string
    peppolParticipantId?: string
    peppolSmpUrl?: string
    peppolAs4Endpoint?: string
    ppfPlatformId?: string
    ppfRecipientIds?: string[]
    ppfMode?: 'pdp' | 'direct' | 'via-pdp'
    ppfApiEndpoint?: string
  }
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

    // Use appropriate parameter placeholders for the database type
    // PostgreSQL uses $1, $2; SQLite uses ?, ?
    const query = dbType === 'postgres'
      ? 'UPDATE service SET metadata = $1 WHERE id = $2'
      : 'UPDATE "service" SET "metadata" = ? WHERE "id" = ?'

    await db.query(query, [metadataValue, args.serviceId])

    console.log('Updated metadata for service ' + args.serviceId)
    return true
  }

  /**
   * Get metadata for a DID service
   */
  private async getServiceMetadata(args: GetServiceMetadataArgs): Promise<ServiceMetadata | null> {
    const db = await this.dbConnection
    const dbType = db.driver.options.type

    // Use appropriate parameter placeholders for the database type
    const query = dbType === 'postgres'
      ? 'SELECT metadata FROM service WHERE id = $1'
      : 'SELECT "metadata" FROM "service" WHERE "id" = ?'

    const result = await db.query(query, [args.serviceId])

    if (result.length === 0 || !result[0].metadata) {
      return null
    }

    try {
      // PostgreSQL jsonb returns object directly, SQLite text needs parsing
      const metadata = result[0].metadata
      return typeof metadata === 'string' ? JSON.parse(metadata) : metadata
    } catch {
      return null
    }
  }
}
