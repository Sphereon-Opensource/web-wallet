import { CredentialDataSupplier, CredentialDataSupplierArgs, CredentialDataSupplierResult, CredentialSignerCallback } from '@sphereon/oid4vci-issuer'
import { TemplateVCGenerator } from './templateManager'
import { getTypesFromRequest } from '@sphereon/oid4vci-common'
import { CONF_PATH } from '../environment-vars'
import { CredentialSupplierConfigWithTemplateSupport } from '../types'
import { normalizeFilePath } from './generic'
import agent from '../agent'
import { CredentialRole } from '@sphereon/ssi-sdk.data-store'
import { CredentialMapper, ICredential, OriginalVerifiableCredential } from '@sphereon/ssi-types'
import { CredentialPayload, DIDDocument } from '@veramo/core'
import { decodeJWT } from 'did-jwt'

const templateVCGenerator = new TemplateVCGenerator()

export function getCredentialDataSupplier(issuerCorrelationId: string): CredentialDataSupplier {
  const templateCredentialDataSupplier = new TemplateCredentialDataSupplier(issuerCorrelationId)
  return templateCredentialDataSupplier.generateCredentialData.bind(templateCredentialDataSupplier)
}

class TemplateCredentialDataSupplier {
  private readonly issuerCorrelationId: string

  constructor(correlationId: string) {
    this.issuerCorrelationId = correlationId
  }

  // TODO Refactor, this is the TemplateCredentialDataSupplier & defaultCredentialDataSupplier smacked together
  public async generateCredentialData(args: CredentialDataSupplierArgs): Promise<CredentialDataSupplierResult> {
    const { credentialDataSupplierInput, credentialRequest, credentialOffer, issuerState, preAuthorizedCode } = args
    if (!credentialDataSupplierInput) {
      throw Error(`Agent needs a credential data supplier input upfront`)
    }

    let types: string[]
    if ('credential_identifier' in args.credentialRequest) {
      if (!args.credentialRequest.credential_identifier || args.credentialRequest.credential_identifier.length === 0) {
        throw Error('credential_identifier may not be blank')
      }
      types = [args.credentialRequest.credential_identifier]
    } else {
      types = getTypesFromRequest(args.credentialRequest)
    }

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

    const credentialSupplierConfig = args.credentialSupplierConfig as CredentialSupplierConfigWithTemplateSupport
    if (credentialSupplierConfig.template_mappings) {
      const templateMapping = credentialSupplierConfig.template_mappings.find((mapping) =>
        mapping.credential_types.some((type) => type !== 'VerifiableCredential' && types.includes(type)),
      )
      if (templateMapping) {
        const templatePath = normalizeFilePath(CONF_PATH, credentialSupplierConfig?.templates_base_dir, templateMapping.template_path)
        const credential = templateVCGenerator.generateCredential(templatePath, args.credentialDataSupplierInput)
        if (!credential) {
          throw new Error(`Credential generation failed for template ${templatePath}`)
        }
        return Promise.resolve({
          format: templateMapping.format || args.credentialRequest.format,
          credential: credential,
        } as unknown as CredentialDataSupplierResult)
      } else {
        throw new Error(`No template mapping could be found for types ${types.join(', ')}`)
      }
    }
    throw new Error(
      `The credential supplier could not find a match for the requested credential types ${types.join(', ')}. The issuer correlationId is ${this.issuerCorrelationId}`,
    )
  }
}
