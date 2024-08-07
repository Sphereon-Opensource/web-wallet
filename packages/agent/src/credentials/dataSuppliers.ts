import { CredentialDataSupplierArgs, CredentialDataSupplierResult, CredentialSignerCallback } from '@sphereon/oid4vci-issuer'
import { getTypesFromRequest } from '@sphereon/oid4vci-common'
import { CredentialPayload, DIDDocument } from '@veramo/core'
import { CredentialMapper, ICredential, OriginalVerifiableCredential } from '@sphereon/ssi-types'
import agent, { context } from '../agent'
import { decodeJWT } from 'did-jwt'
import { CredentialRole } from '@sphereon/ssi-sdk.data-store'

export async function defaultCredentialDataSupplier(args: CredentialDataSupplierArgs): Promise<CredentialDataSupplierResult> {
  const { credentialDataSupplierInput, credentialRequest, credentialOffer, issuerState, preAuthorizedCode } = args
  if (!credentialDataSupplierInput) {
    throw Error(`Agent needs a credential data supplier input upfront`)
  }
  const types: string[] = getTypesFromRequest(credentialRequest, { filterVerifiableCredential: true })

  if ('hashOrId' in credentialDataSupplierInput && !!credentialDataSupplierInput.hashOrId) {
    const hashOrId = credentialDataSupplierInput?.hashOrId as string
    // todo: move to new credential storage implementation
    const credentialResult = await agent.crsGetUniqueCredentialByIdOrHash({
      credentialRole: CredentialRole.HOLDER,
      idOrHash: hashOrId,
    })
    if (!credentialResult?.originalVerifiableCredential) {
      throw Error(`Could not get credential for id ${hashOrId}`)
    }
    const credential = CredentialMapper.storedCredentialToOriginalFormat(
      credentialResult.originalVerifiableCredential as OriginalVerifiableCredential,
    )

    // Since this is an already issued credential we are looking up from our store, we provide a signer that does nothing
    const signCallback: CredentialSignerCallback<DIDDocument> = () => Promise.resolve(credential)
    return {
      credential: credential as ICredential,
      format: args.credentialRequest.format,
      signCallback,
    }
  } else if ('credentialPayload' in credentialDataSupplierInput && credentialDataSupplierInput.credentialPayload) {
    const credentialPayload = credentialDataSupplierInput.credentialPayload as CredentialPayload
    console.log('-------------> credentialPayload', credentialPayload)
    if (types.includes('VerifiableCredential') && !credentialPayload.type?.includes('VerifiableCredential')) {
      credentialPayload.type = [...types]
    } else if (!Array.isArray(credentialPayload.type)) {
      // TODO do we need this? credentialPayload.type is optional and credentialRequest.credential_identifier supplies the type
      throw Error(`Could not infer credential types from offer, or supplied credential payload`)
    } else if (!credentialRequest.proof || !credentialRequest.proof.jwt) {
      throw Error(`Credential request proof was missing`)
    }
    if (!credentialPayload.credentialSubject?.id) {
      credentialPayload.credentialSubject = {
        ...credentialPayload.credentialSubject,
        ...{},
      }
      const decodedJwt = decodeJWT(credentialRequest.proof!.jwt)
      const { header, data } = decodedJwt
      const kid = header.kid
      if (!kid) {
        throw Error('No kid value found')
      }
      const did = kid.split('#')[0] as string
      if (!did || !did.startsWith('did:')) {
        throw Error(`invalid DID supplied as subject ${did}`)
      }
      credentialPayload.credentialSubject.id = did
    }
    const credential = credentialPayload as ICredential
    return { credential }
  }
  // todo: Probably wise to also include the template issuer concept from the OID4VCI demo repo
  throw Error(
    `Current credential data supplier only knows how to handle issuing credentials from a credentialPayload or existing Credential ID/hash value`,
  )
}
