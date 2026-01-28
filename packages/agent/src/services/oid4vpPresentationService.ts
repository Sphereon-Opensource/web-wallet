/**
 * OID4VP Presentation Service
 *
 * Shared service for completing OID4VP presentation flows.
 * Used by eInvoice API and Outbox API for sending credentials via OID4VP.
 */

import { TAgent } from '@veramo/core'
import { TAgentTypes } from '../types'
import { getIdentifier } from '../utils'
import { CredentialCorrelationType, type AddDigitalCredential } from '@sphereon/ssi-sdk.credential-store'
import { CredentialRole } from '@sphereon/ssi-types'
import type { Siopv2AuthorizationRequestData } from '@sphereon/ssi-sdk.siopv2-oid4vp-op-auth'
import { v4 as uuidv4 } from 'uuid'

/**
 * Known client_id prefixes as defined in the OID4VP specification.
 * These prefixes indicate how to interpret the client_id value.
 */
const KNOWN_CLIENT_ID_PREFIXES = [
  'decentralized_identifier',
  'x509_san_dns',
  'x509_san_uri',
  'verifier_attestation',
]

/**
 * Strip known OID4VP client_id prefixes from a client identifier.
 *
 * Examples:
 * - "decentralized_identifier:did:web:example.com" -> "did:web:example.com"
 * - "x509_san_dns:example.com" -> "example.com"
 * - "did:web:example.com" -> "did:web:example.com" (no prefix, unchanged)
 */
function stripClientIdPrefix(clientId: string | undefined): string | undefined {
  if (!clientId) return clientId

  for (const prefix of KNOWN_CLIENT_ID_PREFIXES) {
    if (clientId.startsWith(`${prefix}:`)) {
      return clientId.substring(prefix.length + 1)
    }
  }

  return clientId
}

export interface Oid4vpPresentationResult {
  success: boolean
  error?: string
}

export interface Oid4vpPresentationOptions {
  /** Logging prefix for console messages (e.g., '[eInvoice]' or '[Outbox]') */
  logPrefix?: string
}

/**
 * Complete the OID4VP presentation flow using the SDK's SIOP OP holder methods.
 *
 * Flow:
 * 1. Store the credential in the credential store
 * 2. Use siopGetSiopRequest to parse the authorization request
 * 3. Use siopSendResponse to send the VP token
 *
 * @param agent - The Veramo agent instance
 * @param requestUri - The OID4VP authorization request URI
 * @param credential - The credential string (SD-JWT or other format)
 * @param holderDid - The holder's DID for signing
 * @param options - Optional configuration
 * @returns Result indicating success or failure with error message
 */
export async function completeOid4vpPresentation(
  agent: TAgent<TAgentTypes>,
  requestUri: string,
  credential: string,
  holderDid: string,
  options?: Oid4vpPresentationOptions
): Promise<Oid4vpPresentationResult> {
  const prefix = options?.logPrefix ?? '[OID4VP]'

  try {
    console.log(`${prefix} Starting OID4VP presentation using SDK methods`)

    // Step 1: Get the holder's identifier first - we need the kmsKeyRef for storing the credential
    const holderIdentifier = await getIdentifier(holderDid)
    if (!holderIdentifier) {
      return { success: false, error: `Could not get holder identifier for DID: ${holderDid}. Make sure this DID is registered in the local DID manager.` }
    }

    // Verify the identifier has keys for signing
    if (!holderIdentifier.keys || holderIdentifier.keys.length === 0) {
      return { success: false, error: `Identifier for DID ${holderDid} has no keys. The DID exists but private keys are not available for signing. Make sure the DID was created with keys or import the private keys.` }
    }

    // Get the kmsKeyRef from the holder's first key
    const kmsKeyRef = holderIdentifier.keys[0].kid
    console.log(`${prefix} Holder identifier found with ${holderIdentifier.keys.length} key(s), using kmsKeyRef: ${kmsKeyRef}`)

    // Step 2: Store the SD-JWT credential in the credential store
    // The SDK will compute the hash, documentType, documentFormat from the rawDocument
    // isIssuerSigned=true indicates this is an already-signed credential (SD-JWT is already signed)
    // IMPORTANT: kmsKeyRef must be provided so the SDK can find the signing key later
    const credentialToStore: AddDigitalCredential = {
      rawDocument: credential,
      issuerCorrelationId: holderDid,
      issuerCorrelationType: CredentialCorrelationType.DID,
      subjectCorrelationId: holderDid,
      subjectCorrelationType: CredentialCorrelationType.DID,
      credentialRole: CredentialRole.HOLDER,
      isIssuerSigned: true,
      kmsKeyRef,
      identifierMethod: 'did',
    }

    console.log(`${prefix} Storing credential in credential store`)
    const storedCredential = await agent.crsAddCredential({
      credential: credentialToStore,
    })
    console.log(`${prefix} Credential stored with id: ${storedCredential.id}, kmsKeyRef: ${kmsKeyRef}`)

    // Step 2: Use SDK's siopGetSiopRequest to parse the authorization request
    console.log(`${prefix} Calling siopGetSiopRequest with URL: ${requestUri}`)
    let authorizationRequestData: Siopv2AuthorizationRequestData

    // Create a session config for the OID4VP holder flow
    const sessionId = `oid4vp-${Date.now()}`
    const stateId = uuidv4()
    const didAuthConfig = {
      id: sessionId,
      sessionId,
      stateId,
      redirectUrl: requestUri,
      idOpts: {
        method: 'did' as const,
        identifier: holderDid,
      },
    }

    try {
      authorizationRequestData = await agent.siopGetSiopRequest({
        url: requestUri,
        didAuthConfig,
      })

      // Log the full authorization request data structure for debugging
      console.log(`${prefix} ========== Authorization Request Data ==========`)
      console.log(`${prefix} Full authorizationRequestData keys: ${Object.keys(authorizationRequestData).join(', ')}`)
      console.log(`${prefix} correlationId: ${authorizationRequestData.correlationId}`)
      console.log(`${prefix} name: ${authorizationRequestData.name}`)
      console.log(`${prefix} clientId: ${authorizationRequestData.clientId}`)
      console.log(`${prefix} uri (response endpoint): ${authorizationRequestData.uri}`)
      console.log(`${prefix} Full object: ${JSON.stringify(authorizationRequestData, null, 2)}`)
      console.log(`${prefix} ================================================`)

      // Get the session to inspect the full verified authorization request
      try {
        const session = await agent.siopGetOPSession({ sessionId })
        const verifiedRequest = await session.getAuthorizationRequest()
        console.log(`${prefix} ========== Verified Authorization Request ==========`)
        console.log(`${prefix} responseURI: ${verifiedRequest.responseURI}`)
        console.log(`${prefix} responseURIType: ${verifiedRequest.responseURIType}`)
        console.log(`${prefix} issuer: ${verifiedRequest.issuer}`)
        console.log(`${prefix} correlationId: ${verifiedRequest.correlationId}`)

        // Check the request object payload (from JWT)
        const requestObjectPayload = verifiedRequest.requestObject?.getPayload()
        if (requestObjectPayload) {
          console.log(`${prefix} ========== Request Object Payload (from JWT) ==========`)
          console.log(`${prefix} response_uri: ${requestObjectPayload.response_uri}`)
          console.log(`${prefix} response_mode: ${requestObjectPayload.response_mode}`)
          console.log(`${prefix} client_id: ${requestObjectPayload.client_id}`)
          console.log(`${prefix} nonce: ${requestObjectPayload.nonce}`)
          console.log(`${prefix} state: ${requestObjectPayload.state}`)
        } else {
          console.log(`${prefix} WARNING: No request object payload (JWT not parsed?)`)
        }

        // Check the authorization request payload (from URL params)
        console.log(`${prefix} ========== Authorization Request Payload (from URL) ==========`)
        console.log(`${prefix} response_uri: ${verifiedRequest.authorizationRequestPayload?.response_uri}`)
        console.log(`${prefix} request_uri: ${verifiedRequest.authorizationRequestPayload?.request_uri}`)
        console.log(`${prefix} client_id: ${verifiedRequest.authorizationRequestPayload?.client_id}`)
        console.log(`${prefix} ================================================`)
      } catch (sessionError: any) {
        console.log(`${prefix} Could not get session for detailed logging: ${sessionError.message}`)
      }

      // Strip known OID4VP client_id prefixes (e.g., "decentralized_identifier:") before the SDK
      // tries to resolve the verifier's DID. The SDK expects a plain DID, not a prefixed client_id.
      const strippedClientId = stripClientIdPrefix(authorizationRequestData.clientId)
      if (strippedClientId !== authorizationRequestData.clientId) {
        console.log(`${prefix} Stripped client_id prefix: ${authorizationRequestData.clientId} -> ${strippedClientId}`)
        authorizationRequestData.clientId = strippedClientId
      }
    } catch (error: any) {
      console.error(`${prefix} Failed to parse authorization request:`, error)
      return { success: false, error: `Failed to parse authorization request: ${error.message}` }
    }

    // Step 3: Retrieve the credential as a UniqueDigitalCredential
    console.log(`${prefix} Retrieving credential with id: ${storedCredential.id}, hash: ${storedCredential.hash}`)
    const uniqueCredential = await agent.crsGetUniqueCredentialByIdOrHash({
      credentialRole: CredentialRole.HOLDER,
      idOrHash: storedCredential.hash,
    })

    if (!uniqueCredential) {
      return { success: false, error: 'Could not retrieve stored credential' }
    }

    console.log(`${prefix} UniqueCredential keys: ${Object.keys(uniqueCredential).join(', ')}`)
    console.log(`${prefix} Has digitalCredential: ${'digitalCredential' in uniqueCredential}`)
    console.log(`${prefix} Calling siopSendResponse with holder: ${holderDid}`)

    try {
      console.log(`${prefix} Sending OID4VP response...`)
      console.log(`${prefix}   - Holder DID: ${holderDid}`)
      console.log(`${prefix}   - Verifier client_id: ${authorizationRequestData.clientId}`)
      console.log(`${prefix}   - Response URI: ${authorizationRequestData.uri}`)

      const response = await agent.siopSendResponse({
        didAuthConfig,
        authorizationRequestData,
        selectedCredentials: [uniqueCredential],
        idOpts: {
          method: 'did',
          identifier: holderDid,
        },
      })

      console.log(`${prefix} OID4VP response sent successfully`)
      console.log(`${prefix} Response URL: ${response.url}`)

      return { success: true }
    } catch (error: any) {
      // Log detailed error information to help debug identifier lookup issues
      console.error(`${prefix} Failed to send OID4VP response:`, error)
      console.error(`${prefix} Error stack:`, error.stack)
      console.error(`${prefix} Holder DID was: ${holderDid}`)
      console.error(`${prefix} Verifier client_id was: ${authorizationRequestData.clientId}`)

      // Check if this might be a DID resolution issue for the verifier
      if (error.message?.includes('Identifier not found')) {
        console.error(`${prefix} This error typically means the SDK tried to look up a DID in the local store that doesn't exist there.`)
        console.error(`${prefix} The verifier's DID (${authorizationRequestData.clientId}) may need to be resolved via the universal resolver instead.`)
      }

      return { success: false, error: `Failed to send OID4VP response: ${error.message}` }
    }
  } catch (error: any) {
    console.error(`${prefix} Error in OID4VP presentation:`, error)
    return { success: false, error: error.message }
  }
}

export default completeOid4vpPresentation
