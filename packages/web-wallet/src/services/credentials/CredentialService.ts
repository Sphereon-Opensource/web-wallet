import {CredentialPayload} from '@veramo/core'
import {JsonSchema} from '@jsonforms/core'
import {QRValueResult} from '@components/modals/QRCodeModal'
import {
  IOID4VCIClientCreateOfferUriRequestArgs,
  IOID4VCIClientCreateOfferUriResponse,
} from '@sphereon/ssi-sdk.oid4vci-issuer-rest-client'
import {getAgent} from '@agent'
import Debug, {Debugger} from 'debug'
import {CommonCredentialOfferFormat} from '@sphereon/oid4vci-common'
import {v4 as uuidv4} from 'uuid'
import {CredentialSupplierConfigWithCredentialPayload, CredentialSupplierConfigWithHashOrId} from '@typings'

const debug: Debugger = Debug('sphereon:cloud-wallet:credentialService')


function isHashOrId(
  credentialDataSupplierInput: {hashOrId: string} | {credentialPayload: Partial<CredentialPayload>},
): credentialDataSupplierInput is CredentialSupplierConfigWithHashOrId {
  return 'hashOrId' in credentialDataSupplierInput && !!credentialDataSupplierInput.hashOrId
}

function isCredentialPayload(
  credentialDataSupplierInput: {hashOrId: string} | {credentialPayload: Partial<CredentialPayload>},
): credentialDataSupplierInput is CredentialSupplierConfigWithCredentialPayload {
  return 'credentialPayload' in credentialDataSupplierInput && !!credentialDataSupplierInput.credentialPayload
}
export const createCredentialPayloadWithSchema = (
  args: {
    schemaOpts?: {
      credentialSchema?: string
      schema?: JsonSchema
    }
    payload: Omit<CredentialPayload, 'issuer'>
  },
  additionalData?: Partial<CredentialPayload>,
) => {
  const {schemaOpts, payload} = args
  const {credentialSchema, schema} = schemaOpts ?? {}

  // Merge schema defaults into the payload
  const payloadWithDefaults = schema ? mergeSchemaDefaults(payload, schema) : payload

  const mergedPayload: Partial<CredentialPayload> = {
    ...payloadWithDefaults,
    ...(credentialSchema && {credentialSchema}),
    ...additionalData,
  }
  if (!mergedPayload.id) {
    mergedPayload.id = `urn:uuid:${uuidv4()}`
  }

  return {
    payload: mergedPayload,
    schema,
    id: mergedPayload.id,
  }
}


function mergeSchemaDefaults(data: any, schema: JsonSchema): any {
  if (!schema.properties) return data

  const result = {...data}

  for (const [key, propSchema] of Object.entries(schema.properties)) {
    const typedPropSchema = propSchema as JsonSchema

    if (!(key in result) && 'default' in typedPropSchema) {
      result[key] = typedPropSchema.default
    } else if (key in result && typedPropSchema.type === 'object' && typedPropSchema.properties) {
      result[key] = mergeSchemaDefaults(result[key] || {}, typedPropSchema)
    } else if (!(key in result) && typedPropSchema.type === 'object' && typedPropSchema.properties) {
      result[key] = mergeSchemaDefaults({}, typedPropSchema)
    }
  }

  return result
}


export async function qrValueGenerator(
  credentialDataSupplierInput: CredentialSupplierConfigWithHashOrId | CredentialSupplierConfigWithCredentialPayload,
  opts: {
    preAuthorizedCode?: string
    userPinRequired?: boolean
    credentials?: (CommonCredentialOfferFormat | string)[]
  },
): Promise<QRValueResult> {
  let id: string
  if (isCredentialPayload(credentialDataSupplierInput)) {
    id = credentialDataSupplierInput.credentialPayload.id ?? uuidv4()
  } else if (isHashOrId(credentialDataSupplierInput)) {
    id = credentialDataSupplierInput.hashOrId
  } else {
    throw Error(`No id present for the offer`)
  }
  const offer = await createOID4VCIOffer(credentialDataSupplierInput, opts)
  const uriValue = offer.uri
  return {
    uriValue,
    id,
    expiryInSec: 30,
    onExpiry: (expired: QRValueResult) => Promise.resolve(debug(`Expiry would be called here: `, expired)),
  }
}

export async function createOID4VCIOffer(
  credentialDataSupplierInput: CredentialSupplierConfigWithHashOrId | CredentialSupplierConfigWithCredentialPayload,
  opts: {
    preAuthorizedCode?: string
    userPinRequired?: boolean
    credentials?: (CommonCredentialOfferFormat | string)[]
  },
): Promise<IOID4VCIClientCreateOfferUriResponse> {
  debug(`VCI offer credential data supplier input: `, credentialDataSupplierInput, opts)
  const preAuthorizedCode = opts.preAuthorizedCode ?? uuidv4()
  let credentialTypes: (CommonCredentialOfferFormat | string)[] = opts.credentials ?? []
  if (!credentialTypes || credentialTypes.length === 0) {
    if (isHashOrId(credentialDataSupplierInput)) {
      throw Error(`Cannot create an offer for id ${credentialDataSupplierInput.hashOrId} given no type or credential formats have been supplied`)
    }
    if (!isCredentialPayload(credentialDataSupplierInput)) {
      throw Error(`Cannot create an offer as no hash, id of an existing credential or the payload of a new credential is supplied`)
    }
    if (!credentialDataSupplierInput.credentialPayload.type) {
      throw Error(`Cannot create an offer as the payload of the new credential didn't contain a type`)
    }
    credentialTypes = credentialDataSupplierInput.credentialPayload.type as string[]
  }
  credentialTypes = credentialTypes.filter(type => type !== 'VerifiableCredential') // We don't need VerifiableCredential in the QR

  const uriData: IOID4VCIClientCreateOfferUriResponse = await getAgent().oid4vciClientCreateOfferUri({
    credential_configuration_ids: credentialTypes,
    grants: {
      'urn:ietf:params:oauth:grant-type:pre-authorized_code': {
        'pre-authorized_code': preAuthorizedCode,
        ...(opts.userPinRequired && {
          tx_code: {
            //todo: maybe read this from the env
            description: "Please provide the code that you've received via email.",
          },
        }),
      },
    },
    credentialDataSupplierInput: {
      ...credentialDataSupplierInput,
    },
    credentials: credentialTypes,
    //fixme: this should be removed.the agent already knows the issuer and therefore we shouldn't require this
  } as unknown as IOID4VCIClientCreateOfferUriRequestArgs)
  debug(`VCI offer input for agent: `, uriData)
  return uriData
}
