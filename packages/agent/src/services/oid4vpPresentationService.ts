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

    // Step 1: Store the SD-JWT credential in the credential store
    // The SDK will compute the hash, documentType, documentFormat from the rawDocument
    // isIssuerSigned=true indicates this is an already-signed credential (SD-JWT is already signed)
    const credentialToStore: AddDigitalCredential = {
      rawDocument: credential,
      issuerCorrelationId: holderDid,
      issuerCorrelationType: CredentialCorrelationType.DID,
      subjectCorrelationId: holderDid,
      subjectCorrelationType: CredentialCorrelationType.DID,
      credentialRole: CredentialRole.HOLDER,
      isIssuerSigned: true,
    }

    console.log(`${prefix} Storing credential in credential store`)
    const storedCredential = await agent.crsAddCredential({
      credential: credentialToStore,
    })
    console.log(`${prefix} Credential stored with id: ${storedCredential.id}`)

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
      console.log(`${prefix} Authorization request parsed, correlationId: ${authorizationRequestData.correlationId}`)
    } catch (error: any) {
      console.error(`${prefix} Failed to parse authorization request:`, error)
      return { success: false, error: `Failed to parse authorization request: ${error.message}` }
    }

    // Step 3: Get the holder's identifier for signing
    const holderIdentifier = await getIdentifier(holderDid)
    if (!holderIdentifier) {
      return { success: false, error: 'Could not get holder identifier' }
    }

    // Step 4: Retrieve the credential as a UniqueDigitalCredential
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
      console.error(`${prefix} Failed to send OID4VP response:`, error)
      return { success: false, error: `Failed to send OID4VP response: ${error.message}` }
    }
  } catch (error: any) {
    console.error(`${prefix} Error in OID4VP presentation:`, error)
    return { success: false, error: error.message }
  }
}

export default completeOid4vpPresentation
