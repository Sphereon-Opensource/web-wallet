import { TAgent } from '@veramo/core'
import { TAgentTypes } from '../types'
import { hasInboxContext, linkCredentialToInbox } from './inboxCredentialHandler'
import { CredentialRole } from '@sphereon/ssi-types'
import { CredentialCorrelationType, type AddDigitalCredential } from '@sphereon/ssi-sdk.credential-store'

/**
 * Processes credentials after successful OID4VP verification.
 *
 * This function should be called after a successful VP verification
 * when there is inbox context for the correlation ID. It extracts
 * credentials from the verified presentation and links them to the inbox.
 *
 * @param agent - The agent instance
 * @param correlationId - The correlation ID from the OID4VP flow
 * @param queryId - The DCQL query ID used for verification
 * @returns true if credentials were successfully processed
 */
export async function processVerifiedPresentation(
  agent: TAgent<TAgentTypes>,
  correlationId: string,
  queryId?: string
): Promise<boolean> {
  // Check if this verification has inbox context
  if (!hasInboxContext(correlationId)) {
    console.log(`[Inbox] No inbox context for correlation ${correlationId}, skipping credential processing`)
    return false
  }

  try {
    // Get the verification response state which contains the verified presentation
    const authResponseState = await agent.siopGetAuthResponseState({
      correlationId,
      queryId,
      errorOnNotFound: false,
    })

    if (!authResponseState) {
      console.warn(`[Inbox] No auth response state found for correlation ${correlationId}`)
      return false
    }

    console.log(`[Inbox] Processing verified presentation for correlation ${correlationId}`)
    console.log(`[Inbox] Auth response state status: ${authResponseState.status}`)

    // Extract verified data from the response state
    const verifiedData = authResponseState.verifiedData
    if (!verifiedData) {
      console.warn(`[Inbox] No verified data in auth response state`)
      return false
    }

    console.log(`[Inbox] Verified data keys: ${Object.keys(verifiedData).join(', ')}`)

    // Extract credentials from the VP token
    // The verifiedData contains authorization_response.vp_token which has the presentation(s)
    const vpToken = verifiedData.authorization_response?.vp_token
    if (!vpToken) {
      console.warn(`[Inbox] No vp_token in verified data`)
      return false
    }

    // VP token can be a single presentation or an array
    const presentations = Array.isArray(vpToken) ? vpToken : [vpToken]
    console.log(`[Inbox] Found ${presentations.length} presentation(s)`)

    let credentialsLinked = 0

    for (const presentation of presentations) {
      // Each presentation can be:
      // - SD-JWT string (compact format)
      // - JWT string (compact VP token)
      // - Object with verifiableCredential array

      const credentials = extractCredentialsFromPresentation(presentation)
      console.log(`[Inbox] Extracted ${credentials.length} credential(s) from presentation`)

      for (const credential of credentials) {
        try {
          // Store the credential in the credential store
          const credentialToStore: AddDigitalCredential = {
            rawDocument: typeof credential === 'string' ? credential : JSON.stringify(credential),
            issuerCorrelationId: 'unknown', // Will be determined from the credential
            issuerCorrelationType: CredentialCorrelationType.DID,
            credentialRole: CredentialRole.VERIFIER, // We received this credential
            isIssuerSigned: true, // Credentials are pre-signed
          }

          console.log(`[Inbox] Storing received credential`)
          const storedCredential = await agent.crsAddCredential({
            credential: credentialToStore,
          })
          console.log(`[Inbox] Credential stored with id: ${storedCredential.id}, hash: ${storedCredential.hash}`)

          // Link the credential to the inbox
          const linked = await linkCredentialToInbox(agent, correlationId, storedCredential.hash)
          if (linked) {
            credentialsLinked++
            console.log(`[Inbox] Successfully linked credential ${storedCredential.hash} to inbox`)
          }
        } catch (error) {
          console.error(`[Inbox] Error storing/linking credential:`, error)
        }
      }
    }

    console.log(`[Inbox] Total credentials linked: ${credentialsLinked}`)
    return credentialsLinked > 0
  } catch (error) {
    console.error(`[Inbox] Error processing verified presentation:`, error)
    return false
  }
}

/**
 * Extract credentials from a presentation.
 * Handles SD-JWT, JWT, and JSON-LD presentations.
 */
function extractCredentialsFromPresentation(presentation: any): any[] {
  // If it's a string, it could be:
  // - SD-JWT presentation (contains ~)
  // - JWT VP token
  if (typeof presentation === 'string') {
    // SD-JWT presentation format: header.payload.signature~disclosure1~disclosure2...~kb_jwt
    // For SD-JWT VCs in presentations, the credential is the full string itself
    if (presentation.includes('~')) {
      console.log(`[Inbox] Detected SD-JWT presentation format`)
      // For SD-JWT, the presentation IS the credential (with disclosures)
      // The KB-JWT at the end binds it to the presentation
      // We want to store the full SD-JWT VC with disclosures
      return [presentation]
    }

    // JWT VP token - decode to get verifiableCredential
    try {
      const parts = presentation.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
        if (payload.vp?.verifiableCredential) {
          console.log(`[Inbox] Detected JWT VP with verifiableCredential array`)
          return Array.isArray(payload.vp.verifiableCredential)
            ? payload.vp.verifiableCredential
            : [payload.vp.verifiableCredential]
        }
      }
    } catch {
      // Not a valid JWT, return as-is
    }

    return [presentation]
  }

  // If it's an object, check for verifiableCredential property
  if (presentation && typeof presentation === 'object') {
    if (presentation.verifiableCredential) {
      console.log(`[Inbox] Detected JSON-LD VP with verifiableCredential`)
      return Array.isArray(presentation.verifiableCredential)
        ? presentation.verifiableCredential
        : [presentation.verifiableCredential]
    }

    // DCQL response format - credentials are in credential_sets
    if (presentation.credential_sets) {
      console.log(`[Inbox] Detected DCQL response format with credential_sets`)
      const credentials: any[] = []
      for (const set of presentation.credential_sets) {
        if (set.credentials) {
          credentials.push(...set.credentials)
        }
      }
      return credentials
    }

    // DCQL vp_token format - credentials organized by query ID
    // Format: { "query-id": ["credential1", "credential2", ...], ... }
    // Check if the object has string keys with array values containing credential strings
    const keys = Object.keys(presentation)
    if (keys.length > 0) {
      const allKeysHaveArrays = keys.every(key => Array.isArray(presentation[key]))
      if (allKeysHaveArrays) {
        console.log(`[Inbox] Detected DCQL vp_token format with query IDs: ${keys.join(', ')}`)
        const credentials: any[] = []
        for (const key of keys) {
          credentials.push(...presentation[key])
        }
        return credentials
      }
    }

    // Single credential object
    if (presentation.type || presentation.vct) {
      return [presentation]
    }
  }

  console.log(`[Inbox] Unknown presentation format, returning as-is`)
  return [presentation]
}
