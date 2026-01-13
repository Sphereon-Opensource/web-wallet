import { CredentialDataSupplier, CredentialDataSupplierArgs, CredentialDataSupplierResult, CredentialSignerCallback } from '@sphereon/oid4vci-issuer'
import { TemplateVCGenerator } from './templateManager'
import { CredentialRequestV1_0_15, OID4VCICredentialFormat, ProofOfPossession } from '@sphereon/oid4vci-common'
import { CONF_PATH } from '../environment-vars'
import {
  CredentialSupplierConfigWithCredentialPayload,
  CredentialSupplierConfigWithHashOrId,
  CredentialSupplierConfigWithTemplateSupport,
} from '../types'
import { normalizeFilePath } from './generic'
import agent from '../agent'
import {
  CredentialMapper,
  CredentialRole,
  ICredential,
  OriginalVerifiableCredential,
  SdJwtDecodedVerifiableCredentialPayload,
  W3CVerifiableCredential,
} from '@sphereon/ssi-types'
import { CredentialPayload } from '@veramo/core'
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

  /**
   * Normalizes proof/proofs parameters from credential request into an array of ProofOfPossession objects.
   * Validates mutual exclusivity and handles both v13 (proof) and v15 (proofs) formats.
   */
  private normalizeProofs(credentialRequest: CredentialRequestV1_0_15): ProofOfPossession[] {
    const credReq = credentialRequest as CredentialRequestV1_0_15

    // Validate request structure (mutually exclusive)
    if (credReq.proof && credReq.proofs) {
      throw Error('Credential request may not contain both proof and proofs parameters')
    }

    // Normalize candidates into a single array of ProofOfPossession objects
    const proofCandidates: ProofOfPossession[] = []

    if (credReq.proof) {
      proofCandidates.push(credReq.proof)
    } else if (credReq.proofs) {
      // Handle "proofs": prioritize 'jwt' as it's the only fully supported type
      if (Array.isArray(credReq.proofs.jwt)) {
        // Map to ProofOfPossession objects, handling both string and object formats
        for (const jwtProof of credReq.proofs.jwt) {
          if (typeof jwtProof === 'string') {
            // Handle case where jwt array contains strings instead of ProofOfPossession objects
            proofCandidates.push({
              proof_type: 'jwt',
              jwt: jwtProof,
            })
          } else if (jwtProof && typeof jwtProof === 'object' && 'jwt' in jwtProof) {
            // Handle proper ProofOfPossession object
            proofCandidates.push(jwtProof)
          }
        }
      }

      // Check if there are no supported proofs found
      if (proofCandidates.length === 0) {
        const availableTypes = Object.keys(credReq.proofs).join(', ')
        throw Error(`No supported proof types found in request. Available: [${availableTypes}]`)
      }
    }

    // If no proof or proofs provided, return empty array (validation handled by caller if needed)
    return proofCandidates
  }

  // TODO Refactor, this is the TemplateCredentialDataSupplier & defaultCredentialDataSupplier smacked together
  public async generateCredentialData(args: CredentialDataSupplierArgs): Promise<CredentialDataSupplierResult> {
    const { credentialRequest } = args
    const credentialDataSupplierInput = args.credentialDataSupplierInput as
      | CredentialSupplierConfigWithCredentialPayload
      | CredentialSupplierConfigWithHashOrId
    if (!credentialDataSupplierInput) {
      throw Error(`Agent needs a credential data supplier input upfront`)
    }

    // Path 1: Already-issued credential from storage (no reformatting needed)
    if ('hashOrId' in credentialDataSupplierInput && credentialDataSupplierInput.hashOrId) {
      const credentialResult = await agent.crsGetUniqueCredentialByIdOrHash({
        credentialRole: CredentialRole.HOLDER,
        idOrHash: credentialDataSupplierInput.hashOrId as string,
      })
      if (!credentialResult?.originalVerifiableCredential) {
        throw Error(`Could not get credential for id ${credentialDataSupplierInput.hashOrId}`)
      }
      const credential = CredentialMapper.storedCredentialToOriginalFormat(
        credentialResult.originalVerifiableCredential as OriginalVerifiableCredential,
      )
      const signCallback: CredentialSignerCallback = () => Promise.resolve(credential as W3CVerifiableCredential)
      return {
        credential: credential as ICredential,
        format: args.format,
        signCallback,
      }
    }

    let credential: ICredential | W3CVerifiableCredential | undefined

    // Path 2: From credential payload
    if ('credentialPayload' in credentialDataSupplierInput && credentialDataSupplierInput.credentialPayload) {
      const credentialPayload = credentialDataSupplierInput.credentialPayload as CredentialPayload
      console.log('-------------> credentialPayload', credentialPayload)

      // Normalize proof/proofs into array of candidates
      const proofCandidates = this.normalizeProofs(credentialRequest)

      if (!Array.isArray(credentialPayload.type) || 'vct' in credentialPayload) {
        if (proofCandidates.length === 0 || !proofCandidates[0]?.jwt) {
          throw Error('Credential request proof was missing')
        }
      }
      if (!credentialPayload.credentialSubject?.id && !('vct' in credentialPayload)) {
        if (proofCandidates.length === 0 || !proofCandidates[0]?.jwt) {
          throw Error('Proof of possession is required. No proof or proofs value present in credential request')
        }

        // Try to decode JWT proofs in order until one succeeds
        let decodedJwt: ReturnType<typeof decodeJWT> | undefined
        let kid: string | undefined
        const decodeErrors: string[] = []

        for (const proof of proofCandidates) {
          try {
            decodedJwt = decodeJWT(proof.jwt)
            kid = decodedJwt.header.kid
            if (kid) {
              break
            }
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error)
            decodeErrors.push(msg)
          }
        }

        if (!kid) {
          const errorMsg = decodeErrors.length > 0 ? `No kid value found. Decode errors: ${decodeErrors.join('; ')}` : 'No kid value found'
          throw Error(errorMsg)
        }

        const did = kid.split('#')[0] as string
        if (!did || !did.startsWith('did:')) {
          throw Error(`invalid DID supplied as subject ${did}`)
        }
        credentialPayload.credentialSubject = {
          ...credentialPayload.credentialSubject,
          id: did,
        }
      }
      credential = credentialPayload as ICredential
    }

    // FIXME!!! Temp hack to see that the credential data is probably coming from the web wallet's JSON schema generator already providing a valid credential payload
    if (!('credentialGenerationMethod' in credentialDataSupplierInput) || credentialDataSupplierInput.credentialGenerationMethod !== 'JSON_SCHEMA') {
      // TODO === CredentialGenerationMethod.TEMPLATE when demo's fixed
      const credentialSupplierConfig = args.credentialSupplierConfig as CredentialSupplierConfigWithTemplateSupport
      const requestedConfigId = (credentialRequest as CredentialRequestV1_0_15).credential_configuration_id
      if (credentialSupplierConfig.template_mappings) {
        const templateMapping = credentialSupplierConfig.template_mappings.find((mapping) => {
          if (!mapping.credential_config_ids) {
            throw Error('credential_config_ids field not found in template mapping')
          }
          return requestedConfigId && mapping.credential_config_ids.includes(requestedConfigId)
        })

        if (templateMapping) {
          const templatePath = normalizeFilePath(CONF_PATH, credentialSupplierConfig.templates_base_dir, templateMapping.template_path)
          credential = templateVCGenerator.generateCredential(templatePath, credential ?? args.credentialDataSupplierInput)
          if (!credential) {
            throw new Error(`Credential generation failed for template ${templatePath}`)
          }
          return {
            format: (templateMapping.format || args.format) as OID4VCICredentialFormat,
            credential: this.formatCredential(credential, (templateMapping.format || args.format) as OID4VCICredentialFormat) as ICredential,
          }
        }
      }
      throw new Error(`No template mapping found for config id ${requestedConfigId}`)
    }

    if (!credential) {
      throw new Error(`Could not generate credential for issuer ${this.issuerCorrelationId}`)
    }

    return {
      format: args.format,
      credential: this.formatCredential(credential, args.format) as ICredential,
    }
  }

  private formatCredential(credential: ICredential | W3CVerifiableCredential, format: OID4VCICredentialFormat) {
    if (typeof credential === 'string') {
      return credential
    }

    const formattedCredential: ICredential | SdJwtDecodedVerifiableCredentialPayload = {
      ...(credential as ICredential),
    }

    // credential.type to vct
    switch (format) {
      case 'dc+sd-jwt':
      case 'vc+sd-jwt': {
        const cred = credential as ICredential

        if ((!('vct' in formattedCredential) || formattedCredential.vct === 'VerifiableCredential') && cred.type && Array.isArray(cred.type)) {
          const types = cred.type as string[]
          const vct = types.filter((value) => value !== 'VerifiableCredential').find((value) => !!value)
          if (vct) {
            ;(formattedCredential as any).vct = vct
          }
        }

        // Merge credentialSubject children in to root
        if (cred.credentialSubject && typeof cred.credentialSubject === 'object' && !Array.isArray(cred.credentialSubject)) {
          Object.assign(formattedCredential, cred.credentialSubject)
          delete (formattedCredential as Partial<ICredential>).credentialSubject
        }
        break
      }
    }

    // remove type for non-json types
    switch (format) {
      case 'dc+sd-jwt':
      case 'vc+sd-jwt':
      case 'mso_mdoc':
      case 'jwt_vc':
        delete (formattedCredential as Partial<ICredential>).type
        break
    }

    // Add missing context for json types
    switch (format) {
      case 'jwt_vc_json':
      case 'jwt_vc_json-ld':
      case 'ldp_vc':
        if (!('@context' in formattedCredential)) {
          ;(formattedCredential as any)['@context'] = 'https://www.w3.org/2018/credentials/v1'
        }
        break
    }
    return formattedCredential
  }
}
