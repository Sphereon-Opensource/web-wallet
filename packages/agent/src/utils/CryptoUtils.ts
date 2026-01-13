import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { joseSignatureAlgToWebCrypto } from '@sphereon/ssi-sdk-ext.key-utils'
import { JoseSignatureAlgorithmString } from '@sphereon/ssi-types'

export const generateSalt = (): string => {
  return uuidv4()
}

export const verifySDJWTSignature = async <T>(data: string, signature: string, key: JsonWebKey): Promise<boolean> => {
  const { alg, crv, kty } = key

  if (!alg) {
    return Promise.reject(Error('Key algorithm (alg) is required'))
  }

  let algorithm: RsaHashedImportParams | EcKeyImportParams
  let verifyAlgorithm: RsaHashedImportParams | EcdsaParams | RsaPssParams

  if (kty === 'RSA') {
    const webCryptoAlg = joseSignatureAlgToWebCrypto(alg as JoseSignatureAlgorithmString)
    algorithm = webCryptoAlg as RsaHashedImportParams
    verifyAlgorithm = webCryptoAlg as RsaHashedImportParams | RsaPssParams
  } else if (kty === 'EC') {
    algorithm = {
      name: 'ECDSA',
      namedCurve: crv,
    } as EcKeyImportParams

    const webCryptoAlg = joseSignatureAlgToWebCrypto(alg as JoseSignatureAlgorithmString)
    verifyAlgorithm = {
      name: 'ECDSA',
      hash: webCryptoAlg.hash,
    }
  } else {
    return Promise.reject(Error(`Unsupported key type: ${kty}`))
  }

  const publicKey = await crypto.subtle.importKey('jwk', key, algorithm, true, ['verify'])

  return crypto.subtle.verify(verifyAlgorithm, publicKey, Buffer.from(signature, 'base64'), Buffer.from(data))
}
