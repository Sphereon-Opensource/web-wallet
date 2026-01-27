import { Resolver } from 'did-resolver'
import { getDidJwkResolver } from '@sphereon/ssi-sdk-ext.did-resolver-jwk'
import { getResolver as getDidWebResolver } from 'web-did-resolver'
import { getResolver as getDidEbsiResolver } from '@sphereon/ssi-sdk-ext.did-resolver-ebsi'
import { getResolver as getDidKeyResolver } from '@sphereon/ssi-sdk-ext.did-resolver-key'
import { WebDIDProvider } from '@sphereon/ssi-sdk-ext.did-provider-web'
import { JwkDIDProvider } from '@sphereon/ssi-sdk-ext.did-provider-jwk'
import agent, { context } from '../agent'
import { DIDDocumentSection, IIdentifier } from '@veramo/core'
import { DID_PREFIX, DIDMethods, IIdentifierConfigResult, KMS } from '../index'
import { getAgentResolver, mapIdentifierKeysToDocWithJwkSupport } from '@sphereon/ssi-sdk-ext.did-utils'
import { generatePrivateKeyHex, TKeyType, toJwk } from '@sphereon/ssi-sdk-ext.key-utils'

import {
  DEFAULT_DID,
  DEFAULT_KID,
  DEFAULT_MODE,
  IDENTIFIER_IMPORT_MODE,
  DID_WEB_CERT_CHAIN_PEM,
  DID_WEB_CERT_PEM,
  DID_WEB_DID,
  DID_WEB_KID,
  DID_WEB_PRIVATE_KEY_PEM,
} from '../environment-vars'
import { EbsiDidProvider } from '@sphereon/ssi-sdk.ebsi-support'

import { identifierOptConfigs } from '../environment-vars-with-deps'
import { ensureManagedIdentifierResult, ManagedIdentifierResult } from '@sphereon/ssi-sdk-ext.identifier-resolution'

export function createDidResolver() {
  return new Resolver({
    ...getDidJwkResolver(),
    ...getDidKeyResolver(),
    ...getDidWebResolver(),
    ...getDidEbsiResolver(),
  })
}

export async function createDidProviders() {
  const { SphereonKeyDidProvider } = await import('@sphereon/ssi-sdk-ext.did-provider-key')

  return {
    [`${DID_PREFIX}:${DIDMethods.DID_WEB}`]: new WebDIDProvider({
      defaultKms: KMS.LOCAL,
    }),
    [`${DID_PREFIX}:${DIDMethods.DID_JWK}`]: new JwkDIDProvider({
      defaultKms: KMS.LOCAL,
    }),
    [`${DID_PREFIX}:${DIDMethods.DID_KEY}`]: new SphereonKeyDidProvider({
      defaultKms: KMS.LOCAL,
    }),
    [`${DID_PREFIX}:${DIDMethods.DID_EBSI}`]: new EbsiDidProvider({
      defaultKms: KMS.LOCAL,
    }),
  }
}

export async function getIdentifier(did: string): Promise<IIdentifier | undefined> {
  return await agent.didManagerGet({ did }).catch((e) => {
    console.log(`DID ${did} not available in agent`)
    return undefined
  })
}

export async function getDefaultDID(): Promise<string | undefined> {
  if (DEFAULT_MODE.toLowerCase() !== 'did') {
    return
  } else if (DEFAULT_DID) {
    return DEFAULT_DID
  }

  return agent.didManagerFind().then((ids) => {
    if (!ids || ids.length === 0) {
      return Promise.reject(
        Error('Could not find a suitable default did identifier. (did:web:localhost is not suitable because RSA keys are not supported)'),
      )
    }

    // Prefer DIDs that have keys (can be used for signing) and are not localhost
    const idWithKeys: IIdentifier | undefined = ids.find(
      (value: IIdentifier) => value.did !== 'did:web:localhost' && value.keys && value.keys.length > 0
    )

    if (idWithKeys) {
      console.log(`[DID] Selected default DID with ${idWithKeys.keys.length} key(s): ${idWithKeys.did}`)
      return idWithKeys.did
    }

    // Fallback to any non-localhost DID (may not have keys for signing)
    const id: IIdentifier | undefined = ids.find((value: IIdentifier) => value.did !== 'did:web:localhost')
    if (id === undefined) {
      return Promise.reject(
        Error('Could not find a suitable default did identifier. (did:web:localhost is not suitable because RSA keys are not supported)'),
      )
    }

    console.warn(`[DID] Warning: Selected DID ${id.did} has no keys - signing operations may fail`)
    return id.did
  })
}

export async function getDefaultKeyRef({
  did,
  verificationMethodName,
  verificationMethodFallback,
}: {
  did?: string
  verificationMethodName?: DIDDocumentSection
  verificationMethodFallback?: boolean
}): Promise<string | undefined> {
  if (DEFAULT_KID) {
    return DEFAULT_KID
  }
  if (DEFAULT_MODE.toLowerCase() === 'x5c') {
    return Promise.reject(Error(`Mode ${DEFAULT_MODE}, requires a DEFAULT_KID to be set`))
  }
  const targetDid = did ?? (await getDefaultDID())
  if (!targetDid) {
    return undefined
  }
  const identifier = await getIdentifier(targetDid)
  if (!identifier) {
    return undefined
  }
  const didDocument =
    (await getAgentResolver(context)
      .resolve(identifier.did)
      .then((result) => result.didDocument ?? undefined)) ?? undefined
  let keys = await mapIdentifierKeysToDocWithJwkSupport(
    { identifier, vmRelationship: verificationMethodName ?? 'assertionMethod', didDocument },
    context,
  )
  if (keys.length === 0 && (verificationMethodFallback === undefined || verificationMethodFallback)) {
    keys = await mapIdentifierKeysToDocWithJwkSupport(
      {
        identifier,
        vmRelationship: 'verificationMethod',
        didDocument,
      },
      context,
    )
  }
  if (keys.length === 0) {
    return undefined
  }
  return keys[0].kid
}

export async function getOrCreateDIDWebFromEnv(): Promise<IIdentifierConfigResult[]> {
  if (!IDENTIFIER_IMPORT_MODE.toLowerCase().includes('env') || DEFAULT_MODE !== 'did') {
    return []
  }
  const did = DID_WEB_DID
  let identifier = did ? await getIdentifier(did) : undefined

  if (identifier) {
    console.log(`Identifier exists for DID ${did}`)
    console.log(`${JSON.stringify(identifier)}`)
    identifier.keys.map((key: { kid: any; publicKeyHex: any; type: any }) =>
      console.log(`kid: ${key.kid}:\r\n ` + JSON.stringify(toJwk(key.publicKeyHex, key.type), null, 2)),
    )
  } else {
    if (!DID_WEB_KID || !DID_WEB_PRIVATE_KEY_PEM || !DID_WEB_CERT_PEM || !DID_WEB_CERT_CHAIN_PEM) {
      throw Error('Not all required environment variables are present for importing a did:web from environment')
    }
    identifier = await agent.didManagerCreate({
      provider: 'did:web',
      alias: DID_WEB_DID,
      options: {
        keys: [
          {
            key: {
              type: 'RSA',
              kid: DID_WEB_DID,
            },
            x509: {
              certPEM: DID_WEB_CERT_PEM,
              privateKeyPEM: DID_WEB_PRIVATE_KEY_PEM,
              certificateChainPEM: DID_WEB_CERT_CHAIN_PEM,
            },
          },
        ],
      },
    })
  }
  console.log(`${JSON.stringify(identifier, null, 2)}`)

  return [{ identifier: { identifier } }] as IIdentifierConfigResult[]
}

/**
 * Add eInvoicing service endpoints to a DID document.
 * This enables the DID to receive eInvoices via the inbox endpoint.
 *
 * Services added:
 * - type: "eInvoice", subType: "Direct" - Direct eInvoicing capability
 */
export async function addEInvoicingServicesToDID(did: string, baseUrl?: string): Promise<void> {
  const identifier = await getIdentifier(did)
  if (!identifier) {
    console.log(`[eInvoice] Cannot add services: DID ${did} not found`)
    return
  }

  // Determine the base URL for the inbox endpoint
  const inboxBaseUrl = baseUrl || process.env.OID4VP_AGENT_BASE_URI || `http://localhost:${process.env.PORT ?? 5000}`

  // Check if eInvoicing service already exists (check both old and new formats)
  const existingService = identifier.services?.find(
    (s) => s.type === 'eInvoice' || s.type === 'urn:org:fides:einv-direct:1' || s.type === 'einv-direct' || s.type === 'EInvoiceInbox'
  )

  if (existingService) {
    console.log(`[eInvoice] eInvoicing service already exists for DID ${did}`)
    return
  }

  // Add the Direct eInvoicing capability service using new format
  try {
    await agent.didManagerAddService({
      did,
      service: {
        id: `${did}#einvoice-direct`,
        type: 'eInvoice',
        serviceEndpoint: `${inboxBaseUrl}/inbox/invoices/direct-inbox`,
        // Additional properties stored in metadata by Veramo
        subType: 'Direct',
        eInvoice: [{
          entityName: 'Default',
          country: 'NL',
          documentIdentifiers: ['urn:oasis:names:specification:ubl:schema:xsd:Invoice-2'],
          processIdentifiers: ['urn:fdc:peppol.eu:2017:poacc:billing:01:1.0'],
          transportType: 'HTTP',
        }],
      } as any,
    })
    console.log(`[eInvoice] Added Direct eInvoicing service to DID ${did}`)
  } catch (error: any) {
    // Service might already exist in the DB but not in-memory identifier
    if (!error.message?.includes('already exists')) {
      console.error(`[eInvoice] Failed to add eInvoicing service: ${error.message}`)
    }
  }
}

export async function getOrCreateIdentifiersFromFS(): Promise<IIdentifierConfigResult[]> {
  if (!IDENTIFIER_IMPORT_MODE.toLowerCase().includes('file')) {
    return []
  }

  const result = identifierOptConfigs.asArray.map(async (identifierConfig: IIdentifierConfigResult) => {
    let identifier: ManagedIdentifierResult | undefined
    let { privateKeyHex, kmsKeyRef } = identifierConfig
    if (identifierConfig.identifier) {
      identifier = await ensureManagedIdentifierResult(identifierConfig.identifier, context)
    } else if (identifierConfig.x5c) {
      if (!privateKeyHex && !kmsKeyRef) {
        return Promise.reject(Error(`When using x5c mode a private key or kmsKeyRef needs to be provided when configuring the RP from config files`))
      }
      if (privateKeyHex && !kmsKeyRef) {
        try {
          const key = await context.agent.keyManagerImport({
            type: 'Secp256r1', // TODO: Derive key from x5c
            kms: 'local',
            privateKeyHex,
            meta: { x509: { x5c: identifierConfig.x5c } },
          })
          kmsKeyRef = key.kid
        } catch (error: any) {
          console.log(error)
        }
      }
      identifier = await context.agent.identifierManagedGetByX5c({ identifier: identifierConfig.x5c, kmsKeyRef })
    } else if (identifierConfig.did || identifierConfig.createArgs?.provider?.startsWith('did:')) {
      console.log(`DID config found for: ${identifierConfig.did}`)
      const did = identifierConfig.did
      try {
        identifier = did ? await context.agent.identifierManagedGetByDid({ identifier: did, offlineWhenNoDIDRegistered: true }) : undefined
      } catch (error) {
        console.log(error)
      }

      if (identifier) {
        console.log(`Identifier exists for DID ${did}`)
        console.log(`${JSON.stringify(identifier.identifier)}`)

        void (identifier.identifier as IIdentifier).keys.map((key: { kid: any; publicKeyHex: any; type: any }) =>
          console.log(`kid: ${key.kid}:\r\n ` + JSON.stringify(toJwk(key.publicKeyHex, key.type), null, 2)),
        )
      } else {
        console.log(`No identifier for DID ${did} exists yet. Will create the DID...`)
        let args = identifierConfig.createArgs
        if (!args) {
          args = { options: {} }
        }

        if (!privateKeyHex && !did?.startsWith('did:web')) {
          let type: TKeyType = 'Secp256r1'
          if (args.options) {
            if ('type' in args.options && args.options.type) {
              type = args.options.type as TKeyType
            } else if ('keyType' in args.options && args.options.keyType) {
              type = args.options.keyType as TKeyType
            }
          }
          privateKeyHex = await generatePrivateKeyHex(type)
        }

        if (privateKeyHex) {
          if (args.options && !('key' in args.options)) {
            // @ts-ignore
            args.options['key'] = { privateKeyHex }
          } else if (
            args.options &&
            'key' in args.options &&
            args.options.key &&
            typeof args.options?.key === 'object' &&
            !('privateKeyHex' in args.options.key)
          ) {
            // @ts-ignore
            args.options.key['privateKeyHex'] = privateKeyHex
          }
        }
        const didIdentifier = await agent.didManagerCreate(args)
        if (!did) {
          console.error('TODO: write did config object to did folder')
          console.error('Please adjust your did config file and add the "did" value to it: "did": "' + didIdentifier.did + '"')
          console.error(JSON.stringify(identifier, null, 2))
          throw Error('Exit. Please see instructions')
        }
        didIdentifier.keys.map((key) => console.log(`kid: ${key.kid}:\r\n ` + JSON.stringify(toJwk(key.publicKeyHex, key.type), null, 2)))
        console.log(`Identifier created for DID ${did}`)
      }
    }

    console.log(`${JSON.stringify(identifier, null, 2)}`)

    return { ...identifierConfig, identifier } as IIdentifierConfigResult
  })
  return Promise.all(result)
}
