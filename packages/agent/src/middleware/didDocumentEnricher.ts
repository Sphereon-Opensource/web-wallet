import { Request, Response, NextFunction } from 'express'
import { DataSource } from 'typeorm'

/**
 * Middleware that enriches DID documents with service metadata.
 *
 * Veramo's service table only stores standard DID document service properties
 * (id, type, serviceEndpoint, description). We store additional properties
 * like eInvoiceMethod and eInvoice data in a separate `metadata` column.
 *
 * This middleware intercepts DID document responses and merges the metadata
 * back into the service objects, so the full eInvoice configuration is
 * included in the served DID document.
 */
export function createDidDocumentEnricherMiddleware(dbConnection: Promise<DataSource>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    console.log('[DIDEnricher] Middleware hit for:', req.path)
    // Store original json method
    const originalJson = res.json.bind(res)

    // Override json method to intercept DID document responses
    // Use type assertion since we handle async responses internally
    res.json = function(body: any): Response {
      console.log('[DIDEnricher] res.json called, body keys:', body ? Object.keys(body) : 'null')
      // Check if this looks like a DID document response
      if (body && body.didDocument && body.didDocument.service && Array.isArray(body.didDocument.service)) {
        // Enrich services with metadata asynchronously
        void enrichServicesWithMetadata(body.didDocument.service, dbConnection)
          .then((enrichedServices) => {
            body.didDocument.service = enrichedServices
            originalJson(body)
          })
          .catch((error) => {
            console.error('[DIDEnricher] Error enriching services:', error)
            originalJson(body)
          })
        return res
      } else if (body && body.service && Array.isArray(body.service) && body.id && body.id.startsWith('did:')) {
        // Direct DID document (without wrapper)
        void enrichServicesWithMetadata(body.service, dbConnection)
          .then((enrichedServices) => {
            body.service = enrichedServices
            originalJson(body)
          })
          .catch((error) => {
            console.error('[DIDEnricher] Error enriching services:', error)
            originalJson(body)
          })
        return res
      } else {
        return originalJson(body)
      }
    }

    next()
  }
}

/**
 * Enrich service objects with metadata from the database
 */
async function enrichServicesWithMetadata(services: any[], dbConnection: Promise<DataSource>): Promise<any[]> {
  if (!services || services.length === 0) {
    return services
  }

  try {
    const db = await dbConnection
    const dbType = db.driver.options.type

    // Get all service IDs
    const serviceIds = services.map(s => {
      // Service ID in DID doc may be full URI (did:web:...#peppol) or just fragment (#peppol)
      const id = s.id || ''
      return id.includes('#') ? id.split('#').pop() : id
    }).filter(Boolean)

    if (serviceIds.length === 0) {
      return services
    }

    // Service IDs in DB include the fragment prefix (#)
    const fragmentIds = serviceIds.map(id => `#${id}`)

    // Query metadata for all services
    // Build query with correct placeholder syntax for database type
    let result: any[]
    if (dbType === 'postgres') {
      const placeholders = fragmentIds.map((_, i) => `$${i + 1}`).join(', ')
      const placeholders2 = serviceIds.map((_, i) => `$${i + 1 + fragmentIds.length}`).join(', ')
      result = await db.query(
        `SELECT id, metadata FROM service WHERE id IN (${placeholders}) OR id IN (${placeholders2})`,
        [...fragmentIds, ...serviceIds]
      )
    } else {
      // SQLite uses ? placeholders
      const placeholders = fragmentIds.map(() => '?').join(', ')
      const placeholders2 = serviceIds.map(() => '?').join(', ')
      result = await db.query(
        `SELECT "id", "metadata" FROM "service" WHERE "id" IN (${placeholders}) OR "id" IN (${placeholders2})`,
        [...fragmentIds, ...serviceIds]
      )
    }

    console.log('[DIDEnricher] Looking for service IDs:', { fragmentIds, serviceIds })
    console.log('[DIDEnricher] Query result rows:', result.length)

    // Build a map of service ID -> metadata
    const metadataMap = new Map<string, any>()
    for (const row of result) {
      console.log('[DIDEnricher] Row:', { id: row.id, hasMetadata: !!row.metadata, metadata: row.metadata })
      if (row.metadata) {
        const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
        // Store with fragment ID (without #) for easier lookup
        const key = row.id.startsWith('#') ? row.id.substring(1) : row.id
        metadataMap.set(key, metadata)
        console.log('[DIDEnricher] Added to map:', { key, metadata })
      }
    }

    // Enrich services with metadata
    return services.map(service => {
      const id = service.id || ''
      const key = id.includes('#') ? id.split('#').pop() : id

      if (key && metadataMap.has(key)) {
        const metadata = metadataMap.get(key)

        // Merge metadata into service
        const enrichedService = { ...service }

        // Add eInvoiceMethod if present in metadata
        if (metadata.eInvoiceMethod) {
          enrichedService.eInvoiceMethod = metadata.eInvoiceMethod
        }

        // Add eInvoice if present in metadata
        if (metadata.eInvoice) {
          // Ensure it's an array
          enrichedService.eInvoice = Array.isArray(metadata.eInvoice)
            ? metadata.eInvoice
            : [metadata.eInvoice]
        }

        return enrichedService
      }

      return service
    })
  } catch (error) {
    console.error('[DIDEnricher] Database error:', error)
    return services
  }
}
