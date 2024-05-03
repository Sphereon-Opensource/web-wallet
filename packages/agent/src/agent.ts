import {
    createAgent,
    DIDDocument,
    IAgentContext,
    IAgentPlugin,
    TAgent,
} from '@veramo/core'
import {
    CredentialHandlerLDLocal,
    LdDefaultContexts,
    MethodNames,
    SphereonEcdsaSecp256k1RecoverySignature2020,
    SphereonEd25519Signature2018,
    SphereonEd25519Signature2020,
    SphereonJsonWebSignature2020
} from '@sphereon/ssi-sdk.vc-handler-ld-local'
import {CredentialPlugin} from '@veramo/credential-w3c'
import {DataStore, DataStoreORM, DIDStore, KeyStore, PrivateKeyStore} from '@veramo/data-store'
import {DIDManager} from '@veramo/did-manager'
import {DIDResolverPlugin} from '@veramo/did-resolver'
import {SphereonKeyManager} from '@sphereon/ssi-sdk-ext.key-manager'
import {SecretBox} from '@veramo/kms-local'
import {SphereonKeyManagementSystem} from '@sphereon/ssi-sdk-ext.kms-local'
import {getDbConnection} from './database'
import {
    createDidProviders,
    createDidResolver,
    expressBuilder,
    getDefaultDID,
    getDefaultKid,
    getOrCreateDIDsFromFS,
    getOrCreateDIDWebFromEnv,
} from './utils'
import {
    ASSET_DEFAULT_DID_METHOD,
    AUTHENTICATION_ENABLED,
    AUTHENTICATION_STRATEGY,
    AUTHORIZATION_ENABLED,
    AUTHORIZATION_GLOBAL_REQUIRE_USER_IN_ROLES,
    CONTACT_MANAGER_API_FEATURES,
    DB_CONNECTION_NAME,
    DB_ENCRYPTION_KEY,
    DB_TYPE,
    DID_API_BASE_PATH,
    DID_API_FEATURES,
    DID_API_RESOLVE_MODE,
    DID_WEB_SERVICE_FEATURES,
    OID4VCI_API_BASE_URL,
    oid4vciInstanceOpts,
    oid4vciMetadataOpts,
    REMOTE_SERVER_API_FEATURES,
    STATUS_LIST_API_BASE_PATH,
    STATUS_LIST_API_FEATURES,
    STATUS_LIST_CORRELATION_ID,
    STATUS_LIST_ISSUER,
    VC_API_BASE_PATH,
    VC_API_DEFAULT_PROOF_FORMAT,
    VC_API_FEATURES,
} from './environment'
import {VcApiServer} from '@sphereon/ssi-sdk.w3c-vc-api'
import {UniResolverApiServer} from '@sphereon/ssi-sdk.uni-resolver-registrar-api'
import {DID_PREFIX, DIDMethods, TAgentTypes} from './types'
import {DidWebServer} from '@sphereon/ssi-sdk.uni-resolver-registrar-api/dist/did-web-server'
import {StatuslistManagementApiServer} from '@sphereon/ssi-sdk.vc-status-list-issuer-rest-api'
import {ContactManagerApiServer} from '@sphereon/ssi-sdk.contact-manager-rest-api'
import {ContactManager} from '@sphereon/ssi-sdk.contact-manager'
import {ContactStore, EventLoggerStore} from '@sphereon/ssi-sdk.data-store'
import {IIssuerInstanceArgs, OID4VCIIssuer} from '@sphereon/ssi-sdk.oid4vci-issuer'
import {OID4VCIStore} from '@sphereon/ssi-sdk.oid4vci-issuer-store'
import {IRequiredContext, OID4VCIRestAPI} from '@sphereon/ssi-sdk.oid4vci-issuer-rest-api'
import {
    CredentialDataSupplierArgs,
    CredentialDataSupplierResult,
    CredentialSignerCallback
} from '@sphereon/oid4vci-issuer'
import {getCredentialByIdOrHash, LoggingEventType} from "@sphereon/ssi-sdk.core";
import {IOID4VCIRestAPIOpts} from "@sphereon/ssi-sdk.oid4vci-issuer-rest-api/src/OID4VCIRestAPI"
import {CredentialMapper, OriginalVerifiableCredential} from "@sphereon/ssi-types";
import {EventLogger} from "@sphereon/ssi-sdk.event-logger";
import {RemoteServerApiServer} from "@sphereon/ssi-sdk.remote-server-rest-api";

/**
 * Lets setup supported DID resolvers first
 */
const resolver = createDidResolver()
export const dbConnection = getDbConnection(DB_CONNECTION_NAME)

/**
 * Private key store, responsible for storing private keys in the database using encryption
 */
const privateKeyStore: PrivateKeyStore = new PrivateKeyStore(dbConnection, new SecretBox(DB_ENCRYPTION_KEY))


const maintenanceMode:boolean = process.env.RUN_MODE === 'maintenance'

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
        suites: [new SphereonEd25519Signature2018(), new SphereonEd25519Signature2020(), new SphereonJsonWebSignature2020(), new SphereonEcdsaSecp256k1RecoverySignature2020()],
        bindingOverrides: new Map([
            ['createVerifiableCredentialLD', MethodNames.createVerifiableCredentialLDLocal],
            ['createVerifiablePresentationLD', MethodNames.createVerifiablePresentationLDLocal],
        ]),
        keyStore: privateKeyStore,
    }),
    new ContactManager({store: new ContactStore(dbConnection)}),
    new OID4VCIStore({
        importIssuerOpts: oid4vciInstanceOpts.asArray,
        importMetadatas: oid4vciMetadataOpts.asArray,
    }),
    new OID4VCIIssuer({
        resolveOpts: {
            resolver
        }
    }),
    new EventLogger({
        eventTypes: [LoggingEventType.AUDIT],
        store: new EventLoggerStore(dbConnection),
    }),
]

/**
 * Create the agent with a context and export it, so it is available for the rest of the code, or code using this module
 */
const agent = createAgent<TAgentTypes>({
    plugins,
}) as TAgent<TAgentTypes>
export default agent
export const context: IAgentContext<TAgentTypes> = {agent}

/**
 * Import/creates DIDs from configurations files and environment. They then get stored in the database.
 * Also assign default DID and Key Identifier values. Whenever a DID or KID is not explicitly defined,
 * the defaults will be used
 */
await getOrCreateDIDWebFromEnv().catch((e) => console.log(`ERROR env: ${e}`))
await getOrCreateDIDsFromFS().catch((e) => console.log(`ERROR dids: ${e}`))

const defaultDID = await getDefaultDID()
console.log(`[DID] default DID: ${defaultDID}`)
const defaultKid = await getDefaultKid({did: defaultDID})
console.log(`[DID] default key identifier: ${defaultKid}`)
if (!defaultDID || !defaultKid) {
    console.log('[DID] Agent has no default DID and Key Identifier!')
}

/**
 * Build a common express REST API configuration first, used by the exposed Routers/Services below
 */
const expressSupport = expressBuilder().build({startListening: false})

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

/**
 * Enable the Verifiable Credentials API
 */
if (VC_API_FEATURES.length > 0) {
    new VcApiServer({
        agent,
        expressSupport,
        opts: {
            endpointOpts: {
                globalAuth,
                basePath: VC_API_BASE_PATH
            },
            issueCredentialOpts: {
                enableFeatures: VC_API_FEATURES,
                proofFormat: 'jwt',//VC_API_DEFAULT_PROOF_FORMAT as ProofFormat,
                persistIssuedCredentials: VC_API_FEATURES.includes('vc-persist'),
            },
        },
    })
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
                    defaultMethod: ASSET_DEFAULT_DID_METHOD
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
            globalAuth,
            endpointOpts: {
                enabled: DID_WEB_SERVICE_FEATURES.includes('did-web-global-resolution'),
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
if (CONTACT_MANAGER_API_FEATURES.length > 0) {
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
if (REMOTE_SERVER_API_FEATURES.length > 0) {
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
            }
        }
    })
}


OID4VCIRestAPI.init({
    opts: {
        baseUrl: OID4VCI_API_BASE_URL,
        endpointOpts: {},
    } as IOID4VCIRestAPIOpts,
    context: context as unknown as IRequiredContext,
    issuerInstanceArgs: {
        credentialIssuer: OID4VCI_API_BASE_URL,
        storeId: '_default', // TODO configurable?
        namespace: 'oid4vci' // TODO configurable?
    } as IIssuerInstanceArgs,
    credentialDataSupplier: async (args: CredentialDataSupplierArgs): Promise<CredentialDataSupplierResult> => {
        console.log('CredentialDataSupplierArgs', JSON.stringify(args))
        const hashOrId = args.credentialDataSupplierInput?.hashOrId ?? ''
        const credentialResult = await getCredentialByIdOrHash(context, hashOrId) // as unknown because IContactManager is not in IRequiredContext of the oid4vci-issuer-rest-api module
        if (!credentialResult?.vc) {
            throw Error(`Could not get credential for id ${hashOrId}`)
        }
        const credential = CredentialMapper.storedCredentialToOriginalFormat(credentialResult.vc as OriginalVerifiableCredential)
        const signCallback: CredentialSignerCallback<DIDDocument> = () => Promise.resolve(credential)
        // fixme: the argument on credential should be a W3CCredential not an ICredential
        return {credential: CredentialMapper.toUniformCredential(credential), format: args.credentialRequest.format, signCallback}
    },
    expressSupport
})

if(!maintenanceMode) {
    expressSupport.start()
}
