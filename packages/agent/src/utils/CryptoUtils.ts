import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { joseSignatureAlgToWebCrypto } from '@sphereon/ssi-sdk-ext.key-utils'
import { JoseSignatureAlgorithmString } from '@sphereon/ssi-types'

export const generateSalt = (): string => {
  return uuidv4()
}

const resolveEffectiveAlg = (key: JsonWebKey): JoseSignatureAlgorithmString => {
  const { alg, crv, kty } = key

  if (alg) {
    return alg as JoseSignatureAlgorithmString
  }

  if (kty === 'EC') {
    switch (crv) {
      case 'P-256':
        return 'ES256'
      case 'P-384':
        return 'ES384'
      case 'P-521':
        return 'ES512'
      case 'secp256k1':
        return 'ES256K'
      default:
        throw Error(`Unsupported EC curve: ${crv}`)
    }
  }

  if (kty === 'OKP') {
    switch (crv) {
      case 'Ed25519':
      case 'Ed448':
        return 'EdDSA'
      case 'X25519':
      case 'X448':
        throw Error(`Curve ${crv} is for key agreement, not signatures`)
      default:
        throw Error(`Unsupported OKP curve: ${crv}`)
    }
  }

  throw Error(`Key algorithm (alg) is required for key type: ${kty}`)
}

export const verifySDJWTSignature = async <T>(data: string, signature: string, key: JsonWebKey): Promise<boolean> => {
  const { crv, kty } = key
  const effectiveAlg = resolveEffectiveAlg(key)

  let algorithm: RsaHashedImportParams | EcKeyImportParams | Algorithm
  let verifyAlgorithm: RsaHashedImportParams | EcdsaParams | RsaPssParams | Algorithm

  if (kty === 'RSA') {
    const webCryptoAlg = joseSignatureAlgToWebCrypto(effectiveAlg)
    algorithm = webCryptoAlg as RsaHashedImportParams
    verifyAlgorithm = webCryptoAlg as RsaHashedImportParams | RsaPssParams
  } else if (kty === 'EC') {
    algorithm = {
      name: 'ECDSA',
      namedCurve: crv,
    } as EcKeyImportParams

    const webCryptoAlg = joseSignatureAlgToWebCrypto(effectiveAlg)
    verifyAlgorithm = {
      name: 'ECDSA',
      hash: webCryptoAlg.hash,
    }
  } else if (kty === 'OKP') {
    if (effectiveAlg !== 'EdDSA') {
      return Promise.reject(Error(`Unsupported OKP algorithm: ${effectiveAlg}`))
    }

    if (crv !== 'Ed25519' && crv !== 'Ed448') {
      return Promise.reject(Error(`Unsupported OKP curve: ${crv}`))
    }

    algorithm = { name: crv }
    verifyAlgorithm = { name: crv }
  } else {
    return Promise.reject(Error(`Unsupported key type: ${kty}`))
  }

  const publicKey = await crypto.subtle.importKey('jwk', key, algorithm, true, ['verify'])

  return crypto.subtle.verify(verifyAlgorithm, publicKey, Buffer.from(signature, 'base64'), Buffer.from(data))
}
