import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'

export const generateSalt = (): string => {
  return uuidv4()
}

export const getCryptoDigestAlgorithm = (algorithm: string): string => {
  switch (algorithm.toUpperCase()) {
    case 'SHA256':
    case 'SHA-256':
      return 'sha256'
    case 'SHA384':
    case 'SHA-384':
      return 'sha384'
    case 'SHA512':
    case 'SHA-512':
      return 'sha512'
    default:
      throw new Error(`crypto algorithm: ${algorithm} not supported`)
  }
}

export const verifySDJWTSignature = async <T>(data: string, signature: string, key: JsonWebKey): Promise<Awaited<Promise<boolean>>> => {
  const {alg, crv, kty} = key

  let algorithm: RsaHashedImportParams | EcKeyImportParams
  let algorithmName: string

  if (kty === 'RSA') {
    algorithmName = alg || 'RSASSA-PKCS1-v1_5'
    algorithm = {
      name: algorithmName,
      hash: 'SHA-256',
    }
  } else if (kty === 'EC') {
    let ecAlg = alg
    if (ecAlg === 'ES256' || (ecAlg === undefined && crv === 'P-256')) {
      ecAlg = 'ECDSA' // FIXME Funke
    }
    algorithmName = ecAlg as string
    algorithm = {
      name: algorithmName,
      namedCurve: crv,
    } as EcKeyImportParams
  } else {
    return Promise.reject(Error(`Unsupported key type: ${kty}`))
  }

  const publicKey = await crypto.subtle.importKey('jwk', key, algorithm, true, ['verify'])

  return Promise.resolve(
    crypto.subtle.verify(
      {name: algorithmName, hash: 'SHA-256'},
      publicKey,
      Buffer.from(signature, 'base64'),
      Buffer.from(data),
    ),
  )
}
