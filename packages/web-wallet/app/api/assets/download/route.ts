import {NextRequest, NextResponse} from 'next/server'
import {auth} from 'auth'
import {randomUUID} from 'crypto'

/**
 * Download registry entry
 */
interface DownloadEntry {
  url?: string
  digestMultibase?: string
  filename: string
  createdAt: number
  userId: string
}

/**
 * In-memory download registry
 * Maps download keys to their entries
 */
const downloadRegistry = new Map<string, DownloadEntry>()

/**
 * Download expiry time in milliseconds (60 hours = 3600 minutes)
 */
const DOWNLOAD_EXPIRY_MS = 3600 * 60 * 1000

/**
 * Cleanup interval (run every 10 minutes)
 */
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000

/**
 * Prune expired download entries
 */
function pruneExpiredEntries(): void {
  const now = Date.now()
  let pruned = 0
  for (const [key, entry] of downloadRegistry.entries()) {
    if (now - entry.createdAt > DOWNLOAD_EXPIRY_MS) {
      downloadRegistry.delete(key)
      pruned++
    }
  }
  if (pruned > 0) {
    console.log(`[API/assets/download] Pruned ${pruned} expired download entries`)
  }
}

// Start cleanup interval (only in non-edge runtime)
if (typeof setInterval !== 'undefined') {
  setInterval(pruneExpiredEntries, CLEANUP_INTERVAL_MS)
}

/**
 * API Route: POST /api/assets/download
 *
 * Registers a download request and returns a download key.
 * The key can then be used with GET to perform the actual download.
 *
 * SECURITY: Requires authentication.
 *
 * Request body:
 * - url?: string - The URL to download from (external evidence URL)
 * - digestMultibase?: string - If provided, downloads from agent's asset store
 * - filename: string - Filename for the download
 *
 * Response:
 * - key: string - The download key to use with GET
 * - expiresIn: number - Seconds until the key expires
 */
export async function POST(request: NextRequest) {
  // Check authentication
  const session = await auth()
  if (!session?.user) {
    console.warn('[API/assets/download] Unauthorized access attempt')
    return NextResponse.json(
      {error: 'Authentication required'},
      {status: 401}
    )
  }

  try {
    const body = await request.json()
    const {url, digestMultibase, filename} = body

    if (!url && !digestMultibase) {
      return NextResponse.json(
        {error: 'Either url or digestMultibase is required'},
        {status: 400}
      )
    }

    if (!filename) {
      return NextResponse.json(
        {error: 'filename is required'},
        {status: 400}
      )
    }

    // Prune expired entries on each registration
    pruneExpiredEntries()

    // Generate download key
    const key = randomUUID()

    // Register the download
    downloadRegistry.set(key, {
      url,
      digestMultibase,
      filename,
      createdAt: Date.now(),
      userId: session.user.id || session.user.email || 'unknown',
    })

    console.log(`[API/assets/download] Registered download key ${key} for user ${session.user.email}`)

    return NextResponse.json({
      key,
      expiresIn: Math.floor(DOWNLOAD_EXPIRY_MS / 1000),
    })
  } catch (error) {
    console.error('[API/assets/download] Error registering download:', error)
    return NextResponse.json(
      {error: error instanceof Error ? error.message : 'Unknown error'},
      {status: 500}
    )
  }
}

/**
 * API Route: GET /api/assets/download?key=xxx
 *
 * Performs the actual download using a registered download key.
 *
 * SECURITY: Requires authentication and valid download key.
 *
 * Query params:
 * - key: string - The download key from POST
 */
export async function GET(request: NextRequest) {
  // Check authentication
  const session = await auth()
  if (!session?.user) {
    console.warn('[API/assets/download] Unauthorized download attempt')
    return NextResponse.json(
      {error: 'Authentication required'},
      {status: 401}
    )
  }

  try {
    const {searchParams} = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json(
        {error: 'Download key is required'},
        {status: 400}
      )
    }

    // Look up the download entry
    const entry = downloadRegistry.get(key)
    if (!entry) {
      return NextResponse.json(
        {error: 'Download key not found or expired'},
        {status: 404}
      )
    }

    // Check if expired
    if (Date.now() - entry.createdAt > DOWNLOAD_EXPIRY_MS) {
      downloadRegistry.delete(key)
      return NextResponse.json(
        {error: 'Download key has expired'},
        {status: 410}
      )
    }

    // Determine the target URL
    let targetUrl: string
    if (entry.digestMultibase) {
      // Download from agent's asset store
      const agentBaseUrl = process.env.NEXT_PUBLIC_AGENT_BASE_URL ||
        process.env.BROWSER_PUBLIC_AGENT_BASE_URL ||
        'http://localhost:5010'
      targetUrl = `${agentBaseUrl}/api/assets/${entry.digestMultibase}`
    } else if (entry.url) {
      targetUrl = entry.url
    } else {
      return NextResponse.json(
        {error: 'No valid download source'},
        {status: 400}
      )
    }

    console.log(`[API/assets/download] Downloading ${entry.filename} for user ${session.user.email}`)

    // Fetch the file
    const response = await fetch(targetUrl)

    if (!response.ok) {
      console.error('[API/assets/download] Failed to fetch:', response.status, response.statusText)
      return NextResponse.json(
        {error: `Failed to fetch file: ${response.status} ${response.statusText}`},
        {status: response.status}
      )
    }

    // Get the content
    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const contentLength = response.headers.get('content-length')
    const arrayBuffer = await response.arrayBuffer()

    // Create response with proper headers for download
    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set('Content-Disposition', `attachment; filename="${entry.filename}"`)
    if (contentLength) {
      headers.set('Content-Length', contentLength)
    }

    // Optionally remove the key after successful download (one-time use)
    // Uncomment the following line to make keys single-use:
    // downloadRegistry.delete(key)

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error('[API/assets/download] Error:', error)
    return NextResponse.json(
      {error: error instanceof Error ? error.message : 'Unknown error'},
      {status: 500}
    )
  }
}
