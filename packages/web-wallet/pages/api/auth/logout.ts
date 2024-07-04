import {NextApiRequest, NextApiResponse} from 'next'
import process from 'process'

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  if (!process.env.NEXTAUTH_URL) {
    throw new Error('Environment var NEXTAUTH_URL must be set')
  }
  let path = `${process.env.OIDC_ISSUER}/protocol/openid-connect/logout?redirect_uri=${encodeURIComponent(process.env.NEXTAUTH_URL)}&client_id=${process.env.OIDC_CLIENT_ID}`
  res.status(200).json({path})
}
