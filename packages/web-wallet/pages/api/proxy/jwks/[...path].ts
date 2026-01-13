import type {NextApiRequest, NextApiResponse} from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const agentBaseUrl = process.env.BROWSER_PUBLIC_AGENT_BASE_URL
  const path = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path

  const targetUrl = `${agentBaseUrl}/.well-known/jwks/${path}`

  try {
    // Create a proper Headers object
    const headers = new Headers()

    // Copy relevant headers, filtering out problematic ones
    Object.entries(req.headers).forEach(([key, value]) => {
      // Skip host and connection headers as they'll be set by fetch
      if (key.toLowerCase() === 'host' || key.toLowerCase() === 'connection') {
        return
      }

      if (value) {
        if (Array.isArray(value)) {
          value.forEach(v => headers.append(key, v))
        } else {
          headers.set(key, value)
        }
      }
    })

    // Set the correct host for the target
    headers.set('host', new URL(targetUrl).host)

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
    })

    const data = await response.json()
    res.status(response.status).json(data)
  } catch (error) {
    res.status(500).json({error: 'Proxy failed'})
  }
}
