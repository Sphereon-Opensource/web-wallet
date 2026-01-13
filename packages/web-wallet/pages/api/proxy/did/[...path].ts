import type {NextApiRequest, NextApiResponse} from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const agentBaseUrl = process.env.BROWSER_PUBLIC_AGENT_BASE_URL
  const path = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path

  const targetUrl = `${agentBaseUrl}/${path}`

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })

    const data = await response.json()
    res.status(response.status).json(data)
  } catch (error) {
    res.status(500).json({error: 'Proxy failed'})
  }
}
