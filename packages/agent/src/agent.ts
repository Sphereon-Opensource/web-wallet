import {createAgent, IAgentContext, IAgentPlugin, ProofFormat, TAgent} from '@veramo/core'
import {
  CredentialHandlerLDLocal,
  LdDefaultContexts,
  MethodNames,
  SphereonEcdsaSecp256k1RecoverySignature2020,
  SphereonEd25519Signature2018,
  SphereonEd25519Signature2020,
  SphereonJsonWebSignature2020,
} from '@sphereon/ssi-sdk.vc-handler-ld-local'
import {CredentialPlugin} from '@veramo/credential-w3c'
import {DataStore, DataStoreORM, DIDStore, KeyStore, PrivateKeyStore} from '@veramo/data-store'
import {DIDManager} from '@veramo/did-manager'
import {DIDResolverPlugin} from '@veramo/did-resolver'
import {SphereonKeyManager} from '@sphereon/ssi-sdk-ext.key-manager'
import {SecretBox} from '@veramo/kms-local'
import {SphereonKeyManagementSystem} from '@sphereon/ssi-sdk-ext.kms-local'
import {
  createDidProviders,
  createDidResolver,
  expressBuilder,
  getDefaultDID,
  getDefaultKeyRef,
  getOrCreateDIDWebFromEnv,
  getOrCreateIdentifiersFromFS,
} from './utils'
import {
  ASSET_DEFAULT_DID_METHOD,
  AUTHENTICATION_ENABLED,
  AUTHENTICATION_STRATEGY,
  AUTHORIZATION_ENABLED,
  AUTHORIZATION_GLOBAL_REQUIRE_USER_IN_ROLES,
  DB_CONNECTION_NAME, 
  DB_DATABASE_NAME,
  DB_ENCRYPTION_KEY,
  DEFAULT_MODE,
  DEFAULT_X5C,
  DID_API_BASE_PATH,
  DID_API_RESOLVE_MODE,
  INTERNAL_PORT,
  IS_CONTACT_MANAGER_ENABLED,
  IS_JWKS_HOSTING_ENABLED,
  IS_OID4VCI_ENABLED,
  IS_OID4VP_ENABLED,
  IS_STATUS_LIST_ENABLED,
  IS_VC_API_ENABLED,
  OID4VCI_API_BASE_URL,
  OID4VP_DEFINITIONS,
  STATUS_LIST_API_BASE_PATH,
  STATUS_LIST_CORRELATION_ID,
  STATUS_LIST_ID,
  VC_API_BASE_PATH,
  VC_API_DEFAULT_PROOF_FORMAT,
} from './environment'
import {VcApiServer} from '@sphereon/ssi-sdk.w3c-vc-api'
import {UniResolverApiServer} from '@sphereon/ssi-sdk.uni-resolver-registrar-api'
import {DID_PREFIX, DIDMethods, TAgentTypes} from './types'
import {DidWebServer} from '@sphereon/ssi-sdk.uni-resolver-registrar-api/dist/did-web-server'
import {StatuslistManagementApiServer} from '@sphereon/ssi-sdk.vc-status-list-issuer-rest-api'
import {ContactManagerApiServer} from '@sphereon/ssi-sdk.contact-manager-rest-api'
import {ContactManager} from '@sphereon/ssi-sdk.contact-manager'
import {
  ContactStore,
  DigitalCredentialStore,
  EventLoggerStore,
  IssuanceBrandingStore,
  PDStore,
} from '@sphereon/ssi-sdk.data-store'
import {IIssuerInstanceArgs, OID4VCIIssuer} from '@sphereon/ssi-sdk.oid4vci-issuer'
import {IIssuerInstanceOptions, IIssuerOptsPersistArgs, OID4VCIStore} from '@sphereon/ssi-sdk.oid4vci-issuer-store'
import {IOID4VCIRestAPIOpts, IRequiredContext, OID4VCIRestAPI} from '@sphereon/ssi-sdk.oid4vci-issuer-rest-api'
import {EventLogger} from '@sphereon/ssi-sdk.event-logger'
import {RemoteServerApiServer} from '@sphereon/ssi-sdk.remote-server-rest-api'
import {IssuanceBranding} from '@sphereon/ssi-sdk.issuance-branding'
import {PDManager} from '@sphereon/ssi-sdk.pd-manager'
import {LoggingEventType, StatusListDriverType} from '@sphereon/ssi-types'
import {createOID4VPRP, getDefaultOID4VPRPOptions} from './utils/oid4vp'
import {IPresentationDefinition} from '@sphereon/pex'
import {PresentationExchange} from '@sphereon/ssi-sdk.presentation-exchange'
import {ISIOPv2RPRestAPIOpts, SIOPv2RPApiServer} from '@sphereon/ssi-sdk.siopv2-oid4vp-rp-rest-api'
import {DidAuthSiopOpAuthenticator} from '@sphereon/ssi-sdk.siopv2-oid4vp-op-auth'
import {PublicKeyHosting} from '@sphereon/ssi-sdk.public-key-hosting'
import {CredentialStore} from '@sphereon/ssi-sdk.credential-store'
import {EbsiSupport} from '@sphereon/ssi-sdk.ebsi-support'
import {OID4VCIHolder} from '@sphereon/ssi-sdk.oid4vci-holder'
import {addDefaultsToOpts} from './utils/oid4vci'
import {getCredentialDataSupplier} from './utils/oid4vciCredentialSuppliers'
import {SIOPv2RP} from '@sphereon/ssi-sdk.siopv2-oid4vp-rp-auth'
import {
  CONTACT_MANAGER_API_FEATURES,
  DID_API_FEATURES,
  DID_WEB_SERVICE_FEATURES,
  oid4vciInstanceOpts,
  oid4vciMetadataOpts,
  REMOTE_SERVER_API_FEATURES,
  STATUS_LIST_API_FEATURES,
  syncDefinitionsOpts,
  VC_API_FEATURES,
} from './environment-deps'
import {dbConnection} from './database'
import {IdentifierResolution} from '@sphereon/ssi-sdk-ext.identifier-resolution'
import {JwtService} from '@sphereon/ssi-sdk-ext.jwt-service'
import {SDJwtPlugin} from '@sphereon/ssi-sdk.sd-jwt'
import {generateDigest, generateSalt, verifySDJWTSignature} from './utils/CryptoUtils'
import {animoFunkeCert, funkeTestCA, sphereonCA} from './trustanchors'
import {MDLMdoc} from '@sphereon/ssi-sdk.mdl-mdoc'
import {DataSources} from '@sphereon/ssi-sdk.agent-config'
import {StatusListPlugin} from '@sphereon/ssi-sdk.vc-status-list-issuer/dist/agent/StatusListPlugin'
import {getOrCreateConfiguredStatusList} from './utils/statuslist'

/**
 * Lets setup supported DID resolvers first
 */
const resolver = createDidResolver()

/**
 * Private key store, responsible for storing private keys in the database using encryption
 */
const privateKeyStore: PrivateKeyStore = new PrivateKeyStore(dbConnection, new SecretBox(DB_ENCRYPTION_KEY))

const cliMode: boolean = process.env.RUN_MODE === 'cli'

/**
 * Define Agent plugins being used. The plugins come from Sphereon's SSI-SDK and Veramo.
 */
const plugins: IAgentPlugin[] = [
  new DataStore(dbConnection),
  new DataStoreORM(dbConnection),
  new SphereonKeyManager({
    store: new KeyStore(dbConnection),
    kms: {
      local: new SphereonKeyManagementSystem(privateKeyStore),
    },
  }),
  new DIDManager({
    store: new DIDStore(dbConnection),
    defaultProvider: `${DID_PREFIX}:${DIDMethods.DID_WEB}`,
    providers: createDidProviders(),
  }),
  new DIDResolverPlugin({
    resolver,
  }),
  new CredentialPlugin(),
  new CredentialHandlerLDLocal({
    //todo: We could add the SPHEREON contexts locally as well
    contextMaps: [LdDefaultContexts],
    suites: [
      new SphereonEd25519Signature2018(),
      new SphereonEd25519Signature2020(),
      new SphereonJsonWebSignature2020(),
      new SphereonEcdsaSecp256k1RecoverySignature2020(),
    ],
    bindingOverrides: new Map([
      ['createVerifiableCredentialLD', MethodNames.createVerifiableCredentialLDLocal],
      ['createVerifiablePresentationLD', MethodNames.createVerifiablePresentationLDLocal],
    ]),
    keyStore: privateKeyStore,
  }),
  new ContactManager({ store: new ContactStore(dbConnection) }),
  new IssuanceBranding({ store: new IssuanceBrandingStore(dbConnection) }),
  new EventLogger({
    eventTypes: [LoggingEventType.AUDIT],
    store: new EventLoggerStore(dbConnection),
  }),
  new PDManager({
    store: new PDStore(dbConnection),
  }),
  new CredentialStore({ store: new DigitalCredentialStore(dbConnection) }),
  new DidAuthSiopOpAuthenticator(),
  new OID4VCIHolder({ hasher: generateDigest }),
  new EbsiSupport(),
  // The Animo funke cert is self-signed and not issued by a CA. Since we perform strict checks on certs, we blindly trust if for the Funke
  new MDLMdoc({ trustAnchors: [sphereonCA, funkeTestCA], opts: { blindlyTrustedAnchors: [animoFunkeCert] } }),
  new IdentifierResolution(),
  new JwtService(),
  new SDJwtPlugin({
    hasher: generateDigest,
    saltGenerator: generateSalt,
    verifySignature: verifySDJWTSignature,
  }),
  new StatusListPlugin({
    instances: [{
      id: STATUS_LIST_ID,
      driverType: StatusListDriverType.AGENT_TYPEORM,
      dataSource: dbConnection,
    }], defaultInstanceId: STATUS_LIST_ID, allDataSources: DataSources.singleInstance(),
  }),
]

let oid4vpRP: SIOPv2RP | undefined

if (!cliMode) {
  if (IS_OID4VCI_ENABLED) {
    plugins.push(
      new OID4VCIStore({
        importIssuerOpts: oid4vciInstanceOpts.asArray,
        importMetadatas: oid4vciMetadataOpts.asArray,
      }),
    )
    plugins.push(
      new OID4VCIIssuer({
        resolveOpts: {
          resolver,
        },
      }),
    )
  }

  oid4vpRP = IS_OID4VP_ENABLED ? await createOID4VPRP({ resolver }) : undefined
  if (oid4vpRP) {
    plugins.push(oid4vpRP)
    plugins.push(new PresentationExchange())
  }
}

/**
 * Create the agent with a context and export it, so it is available for the rest of the code, or code using this module
 */
const agent = createAgent<TAgentTypes>({
  plugins,
}) as TAgent<TAgentTypes>
export default agent
export const context: IAgentContext<TAgentTypes> = { agent }

let defaultDID: string | undefined
let defaultKid: string | undefined
if (!cliMode) {
  /**
   * Import/creates DIDs from configurations files and environment. They then get stored in the database.
   * Also assign default DID and Key Identifier values. Whenever a DID or KID is not explicitly defined,
   * the defaults will be used
   */
  await getOrCreateDIDWebFromEnv().catch((e) => console.log(`ERROR env: ${e}`))
  await getOrCreateIdentifiersFromFS().catch((e) => console.log(`ERROR dids: ${e}`))

  defaultDID = await getDefaultDID()
  if (defaultDID) {
    console.log(`[DID] default DID: ${defaultDID}`)
  }
  defaultKid = await getDefaultKeyRef({ did: defaultDID })
  console.log(`[DID] default key identifier: ${defaultKid}`)
  if ((DEFAULT_MODE.toLowerCase() === 'did' && !defaultDID) || !defaultKid) {
    console.warn('[DID] Agent has no default DID and Key Identifier!')
  }

  const oid4vpOpts = IS_OID4VP_ENABLED ? await getDefaultOID4VPRPOptions({ did: defaultDID, x5c: DEFAULT_X5C, resolver }) : undefined
  if (oid4vpOpts && oid4vpRP) {
    oid4vpRP.setDefaultOpts(oid4vpOpts, context)
  }
} else {
  defaultDID = undefined
  defaultKid = undefined
}

/**
 * Build a common express REST API configuration first, used by the exposed Routers/Services below
 */
const expressSupport = expressBuilder().build({ startListening: false })

/**
 * Authentication and authorization settings
 */
const globalAuth = {
  authentication: {
    enabled: AUTHENTICATION_ENABLED,
    strategy: AUTHENTICATION_STRATEGY,
  },
  authorization: {
    enabled: AUTHORIZATION_ENABLED,
    requireUserInRoles: AUTHORIZATION_GLOBAL_REQUIRE_USER_IN_ROLES,
  },
}

if (!cliMode) {
  /**
   * Enable the Verifiable Credentials API
   */
  if (IS_VC_API_ENABLED && VC_API_FEATURES.length > 0) {
    new VcApiServer({
      agent,
      expressSupport,
      opts: {
        endpointOpts: {
          globalAuth,
          basePath: VC_API_BASE_PATH,
        },
        issueCredentialOpts: {
          enableFeatures: VC_API_FEATURES,
          proofFormat: VC_API_DEFAULT_PROOF_FORMAT as ProofFormat,
          persistIssuedCredentials: VC_API_FEATURES.includes('vc-persist'),
        },
      },
    })
  }

  if (IS_OID4VP_ENABLED) {
    if (!expressSupport) {
      throw Error('Express support needs to be configured when exposing OID4VP')
    }
    const opts: ISIOPv2RPRestAPIOpts = {
      enableFeatures: ['siop', 'rp-status'],
      endpointOpts: {
        basePath: process.env.OID4VP_AGENT_BASE_PATH ?? '',
        globalAuth: {
          authentication: {
            enabled: false,
            strategy: 'bearer-auth',
          },
          secureSiopEndpoints: false,
        },
        webappCreateAuthRequest: {
          webappBaseURI: process.env.OID4VP_WEBAPP_BASE_URI ?? `http://localhost:${INTERNAL_PORT}`,
          siopBaseURI: process.env.OID4VP_AGENT_BASE_URI ?? `http://localhost:${INTERNAL_PORT}`,
        },
        webappAuthStatus: {
          // webappBaseURI: process.env.OID4VP_WEBAPP_BASE_URI ?? `http://localhost:${INTERNAL_PORT}`,
        },
        webappDeleteAuthRequest: {
          // webappBaseURI: process.env.OID4VP_WEBAPP_BASE_URI ?? `http://localhost:${INTERNAL_PORT}`,
        },
        siopGetAuthRequest: {
          // siopBaseURI: process.env.OID4VP_AGENT_BASE_URI ?? `http://localhost:${INTERNAL_PORT}`,
        },
        siopVerifyAuthResponse: {
          // siopBaseURI: process.env.OID4VP_AGENT_BASE_URI ?? `http://localhost:${INTERNAL_PORT}`,
        },
      },
    }
    new SIOPv2RPApiServer({ agent, expressSupport, opts })
    console.log('[OID4VP] SIOPv2 and OID4VP started: ' + (process.env.OID4VP_AGENT_BASE_URI ?? `http://localhost:${INTERNAL_PORT}`))
  }

  /**
   * Enable the Universal Resolver and Registrar Service
   */
  if (DID_API_FEATURES.length > 0) {
    new UniResolverApiServer({
      agent,
      expressSupport,
      opts: {
        endpointOpts: {
          globalAuth,
          basePath: DID_API_BASE_PATH,
          createDid: {
            noErrorOnExistingDid: true,
            storeSecrets: true,
            defaultMethod: ASSET_DEFAULT_DID_METHOD,
          },
          resolveDid: {
            // @ts-ignore
            mode: DID_API_RESOLVE_MODE ?? 'hybrid',
          },
        },
        enableFeatures: DID_API_FEATURES,
      },
    })
  }

  /**
   * Allow for hosting of DID:web did.json files, to allow for easy integration of custodial DIDs
   */
  if (DID_WEB_SERVICE_FEATURES.length > 0) {
    new DidWebServer({
      agent,
      expressSupport,
      opts: {
        // TODO: This does limit hosting to the frontend only, whilst the agent could be behind multiple reverse proxy
        // Reason is that nextjs rewrites return the internal IP address instead of the original
        // ...(process?.env?.NEXT_PUBLIC_CLIENT_ID && {hostname: process.env.NEXT_PUBLIC_CLIENT_ID.replace('https://', '').replace('http://', '')}),
        globalAuth,
        endpointOpts: {
          enabled: DID_WEB_SERVICE_FEATURES.includes('did-web-global-resolution'),
          // TODO: This does limit hosting to the frontend only, whilst the agent could be behind multiple reverse proxy
          // Reason is that nextjs rewrites return the internal IP address instead of the original
          ...(process?.env?.NEXT_PUBLIC_CLIENT_ID && { hostname: process.env.NEXT_PUBLIC_CLIENT_ID.replace('https://', '').replace('http://', '') }),
        },
        enableFeatures: DID_WEB_SERVICE_FEATURES,
      },
    })
  }

  /**
   * Allow for statusList endpoints
   */
  if (STATUS_LIST_API_FEATURES.length > 0) {
    new StatuslistManagementApiServer({
      agent,
      expressSupport,
      opts: {
        endpointOpts: {
          globalAuth,
          basePath: STATUS_LIST_API_BASE_PATH ?? '',
          vcApiCredentialStatus: {
            dbName: DB_CONNECTION_NAME,
            disableGlobalAuth: true,
            correlationId: STATUS_LIST_CORRELATION_ID,
          },
          getStatusList: {
            dbName: DB_CONNECTION_NAME,
          },
          createStatusList: {
            dbName: DB_CONNECTION_NAME,
          },
        },
        enableFeatures: STATUS_LIST_API_FEATURES,
      },
    })
  }

  /**
   * Enable the Contact Manager API
   */
  if (IS_CONTACT_MANAGER_ENABLED && CONTACT_MANAGER_API_FEATURES.length > 0) {
    new ContactManagerApiServer({
      opts: {
        endpointOpts: {
          globalAuth: {
            authentication: {
              enabled: false,
            },
          },
        },
        enableFeatures: CONTACT_MANAGER_API_FEATURES,
      },
      expressSupport,
      agent,
    })
  }

  /**
   * Enable the Veramo remote server API
   */
  if (expressSupport && REMOTE_SERVER_API_FEATURES.length > 0) {
    new RemoteServerApiServer({
      agent,
      expressSupport,
      opts: {
        exposedMethods: REMOTE_SERVER_API_FEATURES,
        endpointOpts: {
          globalAuth: {
            authentication: {
              enabled: false,
            },
          },
        },
      },
    })
  }

  if (IS_OID4VCI_ENABLED) {
    oid4vciInstanceOpts.asArray.map(async (opts) =>
      issuerPersistToInstanceOpts(opts).then(async (instanceOpt) => {
        void OID4VCIRestAPI.init({
          opts: {
            baseUrl: OID4VCI_API_BASE_URL,
            endpointOpts: {},
          } as IOID4VCIRestAPIOpts,
          context: context as unknown as IRequiredContext,
          issuerInstanceArgs: {
            credentialIssuer: OID4VCI_API_BASE_URL,
            storeId: '_default', // TODO configurable?
            namespace: 'oid4vci', // TODO configurable?
          } as IIssuerInstanceArgs,
          //credentialDataSupplier: defaultCredentialDataSupplier,
          credentialDataSupplier: getCredentialDataSupplier(instanceOpt.credentialIssuer),
          expressSupport,
        })
      }),
    )
  }

  if (IS_JWKS_HOSTING_ENABLED) {
    new PublicKeyHosting({ agent, expressSupport, opts: { hostingOpts: { enableFeatures: ['did-jwks', 'all-jwks'] } } })
  }


  if (IS_STATUS_LIST_ENABLED) {
    new StatuslistManagementApiServer({
      opts: {
        endpointOpts: {
          globalAuth: {
            authentication: {
              enabled: false,
              // strategy: bearerStrategy,
            },
          },
          vcApiCredentialStatus: {
            dbName: DB_DATABASE_NAME,
            disableGlobalAuth: true,
            correlationId: 'status_list_default',
          },
          getStatusList: {
            dbName: DB_DATABASE_NAME,
          },
          createStatusList: {
            dbName: DB_DATABASE_NAME,
          },
        },
        enableFeatures: ['w3c-vc-api-credential-status', 'status-list-hosting', 'status-list-management'],
      },
      expressSupport,
      agent,
    })

    await getOrCreateConfiguredStatusList({issuer: defaultDID, keyRef: defaultKid}).catch(e => console.log(`ERROR statuslist`, e))
  }


  // Import presentation definitions from disk.
  const definitionsToImport: Array<IPresentationDefinition> = syncDefinitionsOpts.asArray.filter((definition) => {
    const { id, name } = definition ?? {}
    if (definition && (OID4VP_DEFINITIONS.length === 0 || OID4VP_DEFINITIONS.includes(id) || (name && OID4VP_DEFINITIONS.includes(name)))) {
      console.log(`[OID4VP] Enabling Presentation Definition with name '${name ?? '<none>'}' and id '${id}'`)
      return true
    }
    return false
  })
  if (definitionsToImport.length > 0) {
    await agent.siopImportDefinitions({
      definitions: definitionsToImport,
      versionControlMode: 'AutoIncrement', // This is the default, but just to indicate here it exists
    })
  }

  if (expressSupport) {
    expressSupport.start()
  }
}

export async function issuerPersistToInstanceOpts(opt: IIssuerOptsPersistArgs): Promise<IIssuerInstanceOptions> {
  const issuerOpts = await addDefaultsToOpts(opt.issuerOpts)
  return {
    credentialIssuer: opt.correlationId,
    issuerOpts,
    storeId: opt.storeId,
    storeNamespace: opt.namespace,
  }
}
