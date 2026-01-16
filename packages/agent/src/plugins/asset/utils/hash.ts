/**
 * Hash computation utilities for content-addressable storage.
 */

import * as crypto from 'crypto'
import { bytesToBase58 } from '@sphereon/ssi-sdk.core'
import type { AssetHashAlgorithm } from '../types'

/**
 * Compute hash of a buffer and return as multibase (base58btc) encoded string.
 *
 * Per W3C VC Data Integrity specification, digestMultibase uses multibase encoding.
 * We use base58btc encoding with 'z' prefix for compact representation.
 *
 * @param buffer - The buffer to hash
 * @param algorithm - The hash algorithm to use (default: sha256)
 * @returns The multibase encoded hash string (z-prefixed base58btc)
 *
 * @see https://www.w3.org/TR/vc-data-integrity/
 * @see https://github.com/multiformats/multibase
 */
export function computeDigestMultibase(buffer: Buffer, algorithm: AssetHashAlgorithm = 'sha256'): string {
  const hash = crypto.createHash(algorithm).update(buffer).digest()
  // Multibase: 'z' prefix indicates base58btc encoding
  return 'z' + bytesToBase58(new Uint8Array(hash))
}

/**
 * Verify that a buffer matches an expected digest.
 *
 * @param buffer - The buffer to verify
 * @param expectedDigest - The expected multibase digest
 * @param algorithm - The hash algorithm to use (default: sha256)
 * @returns True if the digest matches
 */
export function verifyDigest(
  buffer: Buffer,
  expectedDigest: string,
  algorithm: AssetHashAlgorithm = 'sha256'
): boolean {
  const computedDigest = computeDigestMultibase(buffer, algorithm)
  return computedDigest === expectedDigest
}
