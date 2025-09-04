import { CredentialDataSupplier, CredentialDataSupplierArgs, CredentialDataSupplierResult, CredentialSignerCallback } from '@sphereon/oid4vci-issuer'
import { TemplateVCGenerator } from './templateManager'
import {CredentialRequestV1_0_15, getTypesFromRequest} from '@sphereon/oid4vci-common'
import { CONF_PATH } from '../environment-vars'
import { CredentialSupplierConfigWithTemplateSupport } from '../types'
import { normalizeFilePath } from './generic'
import agent from '../agent'
import { CredentialRole } from '@sphereon/ssi-sdk.data-store'
import {CredentialMapper, ICredential, OriginalVerifiableCredential, W3CVerifiableCredential} from '@sphereon/ssi-types'
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

    let credential: ICredential | W3CVerifiableCredential | undefined = undefined

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
      credential = CredentialMapper.storedCredentialToOriginalFormat(
        credentialResult.originalVerifiableCredential as OriginalVerifiableCredential,
      )

      // Since this is an already issued credential we are looking up from our store, we provide a signer that does nothing
      const signCallback: CredentialSignerCallback = () => Promise.resolve(credential as W3CVerifiableCredential)
      return {
        credential: credential as ICredential,
        format: args.format,
        signCallback,
      }
    } else if ('credentialPayload' in credentialDataSupplierInput && credentialDataSupplierInput.credentialPayload) {
      let types: string[]
      if ('credential_identifier' in args.credentialRequest) {
        if (!args.credentialRequest.credential_identifier || args.credentialRequest.credential_identifier.length === 0) {
          throw Error('credential_identifier may not be blank')
        }
        types = [args.credentialRequest.credential_identifier]
      } else {
        types = getTypesFromRequest(args.credentialRequest, args.format)
      }

      const credentialPayload = credentialDataSupplierInput.credentialPayload as CredentialPayload
      console.log('-------------> credentialPayload', credentialPayload)
      if (types.includes('VerifiableCredential') && !credentialPayload.type?.includes('VerifiableCredential')) {
        credentialPayload.type = [...types]
      } else if (Array.isArray(credentialPayload.type) && !('vct' in credentialPayload)) {
        credentialPayload.vct = credentialPayload.type[0]
      } else if (!credentialRequest.proof || !credentialRequest.proof.jwt) {
        throw Error(`Credential request proof was missing`)
      }
      if (!credentialPayload.credentialSubject?.id && !('vct' in credentialPayload)) {
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
      credential = credentialPayload as ICredential
    }

    const credentialSupplierConfig = args.credentialSupplierConfig as CredentialSupplierConfigWithTemplateSupport
    const requestedConfigId = (credentialRequest as CredentialRequestV1_0_15).credential_configuration_id
    if (credentialSupplierConfig.template_mappings) {
      const templateMapping = credentialSupplierConfig.template_mappings.find((mapping) => {
        if(!mapping.credential_config_ids) {
          return Promise.reject(Error("credential_config_ids field not found in template mapping. (Make sure you converted credential_types to credential_config_ids.)"))
        }
        return mapping.credential_config_ids.find((credential_config_id) =>
            credential_config_id === requestedConfigId)
        },
      )
      if (templateMapping) {
        const templatePath = normalizeFilePath(CONF_PATH, credentialSupplierConfig?.templates_base_dir, templateMapping.template_path)
        credential = templateVCGenerator.generateCredential(templatePath, credential ?? args.credentialDataSupplierInput)
        if (!credential) {
          throw new Error(`Credential generation failed for template ${templatePath}`)
        }
        return Promise.resolve({
          format: templateMapping.format || args.format,
          credential: credential,
        } as unknown as CredentialDataSupplierResult)
      } else {
        throw new Error(`No template mapping could be found for config id ${requestedConfigId}`)
      }
    }
    if (credential) {
      return Promise.resolve({credential})
    }
    throw new Error(
      `The credential supplier could not find a match for the requested credential ${requestedConfigId}. The issuer correlationId is ${this.issuerCorrelationId}`,
    )
  }
}
