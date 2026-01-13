import type {NextApiRequest, NextApiResponse} from 'next'

type EnvResponse = {
  [key: string]: string
}

export default function handler(req: NextApiRequest, res: NextApiResponse<EnvResponse>) {
  // Filter and return only BROWSER_PUBLIC_ environment variables
  const browserEnv = Object.keys(process.env)
    .filter(key => key.startsWith('BROWSER_PUBLIC_'))
    .reduce((acc, key) => {
      acc[key] = process.env[key] || ''
      return acc
    }, {} as EnvResponse)

  // Cache for 1 hour in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200')
  }

  res.status(200).json(browserEnv)
}
