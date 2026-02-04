import {NextApiRequest, NextApiResponse} from 'next'
import axios from 'axios'
import type {Party} from '@sphereon/ssi-sdk.data-store-types'

export default async function handler(req: NextApiRequest, res: NextApiResponse<Party[]>) {
  const url = process.env.CONTACT_DATA_PROVIDER_BASE_URL ? process.env.CONTACT_DATA_PROVIDER_BASE_URL + '/parties' : 'http://localhost:5010/parties'

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Get session by calling the NextAuth session endpoint internally
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  try {
    const sessionRes = await fetch(`${baseUrl}/api/auth/session`, {
      headers: {cookie: req.headers.cookie ?? ''},
    })

    if (sessionRes.ok) {
      const session = await sessionRes.json()
      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`
      }
    }
  } catch (e) {
    console.error('[parties] Failed to fetch session:', e)
  }

  try {
    switch (req.method) {
      case 'GET':
        const getResp = await axios.get(url, {headers})
        return res.status(200).json(getResp.data)
      case 'POST':
        const postResp = await axios.post(url, req.body, {headers})
        return res.status(200).json(postResp.data)
      default:
        return res.status(405).end()
    }
  } catch (e: any) {
    console.error('[parties] Error:', e.message)
    return res.status(e.response?.status ?? 500).json(e.response?.data ?? {error: e.message})
  }
}
