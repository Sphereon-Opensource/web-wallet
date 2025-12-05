import {NextApiRequest, NextApiResponse} from 'next'
import axios from 'axios'
import type {Party} from '@sphereon/ssi-sdk.data-store-types'

export default function handler(req: NextApiRequest, res: NextApiResponse<Party[]>) {
  // Server-side: use process.env directly
  const url = process.env.CONTACT_DATA_PROVIDER_BASE_URL
    ? process.env.CONTACT_DATA_PROVIDER_BASE_URL + '/parties'
    : 'http://localhost:5010/parties'
  switch (req.method) {
    case 'GET':
      axios.get(url).then(resp => {
        res.status(200).json(resp.data)
      })
      break
    case 'POST':
      axios
        .post(url, req.body, {
          headers: {
            'Content-Type': 'application/json',
          },
        })
        .then(resp => {
          res.status(200).json(resp.data)
        })
      break
  }
}
