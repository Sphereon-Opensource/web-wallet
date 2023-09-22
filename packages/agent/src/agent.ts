import { createAgent, IAgentContext, IAgentPlugin, IIdentifier, ProofFormat, TAgent } from '@veramo/core'
import {
  CredentialHandlerLDLocal,
  LdDefaultContexts,
  MethodNames,
  SphereonEd25519Signature2018,
  SphereonEd25519Signature2020,
  SphereonJsonWebSignature2020,
} from '@sphereon/ssi-sdk.vc-handler-ld-local'
import { CredentialPlugin } from '@veramo/credential-w3c'
import { DataStore, DataStoreORM, DIDStore, KeyStore, PrivateKeyStore } from '@veramo/data-store'
import { DIDManager } from '@veramo/did-manager'
import { DIDResolverPlugin } from '@veramo/did-resolver'
import { SphereonKeyManager } from '@sphereon/ssi-sdk-ext.key-manager'
import { SecretBox } from '@veramo/kms-local'
import { SphereonKeyManagementSystem } from '@sphereon/ssi-sdk-ext.kms-local'
import { getDbConnection } from './database'
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
  ASSET_MANAGER_API_FEATURES,
  AUTHENTICATION_ENABLED,
  AUTHENTICATION_STRATEGY,
  AUTHORIZATION_ENABLED,
  AUTHORIZATION_GLOBAL_REQUIRE_USER_IN_ROLES,
  CONTACT_MANAGER_API_FEATURES,
  DB_CONNECTION_NAME,
  DB_DATABASE_NAME,
  DB_ENCRYPTION_KEY,
  DB_TYPE,
  DID_API_BASE_PATH,
  DID_API_FEATURES,
  DID_API_RESOLVE_MODE,
  DID_WEB_SERVICE_FEATURES,
  MEMORY_DB,
  STATUS_LIST_API_BASE_PATH,
  STATUS_LIST_API_FEATURES,
  STATUS_LIST_CORRELATION_ID,
  VC_API_BASE_PATH,
  VC_API_DEFAULT_PROOF_FORMAT,
  VC_API_FEATURES,
} from './environment'
import { VcApiServer } from '@sphereon/ssi-sdk.w3c-vc-api'
import { UniResolverApiServer } from '@sphereon/ssi-sdk.uni-resolver-registrar-api'
import { DID_PREFIX, DIDMethods, TAgentTypes } from './types'
import { DidWebServer } from '@sphereon/ssi-sdk.uni-resolver-registrar-api/dist/did-web-server'
import { MemoryKeyStore, MemoryPrivateKeyStore } from '@veramo/key-manager'
import { StatuslistManagementApiServer } from '@sphereon/ssi-sdk.vc-status-list-issuer-rest-api'
import { getOrCreateConfiguredStatusList } from './utils/statuslist'
import { ContactManagerApiServer } from '@sphereon/ssi-sdk.contact-manager-rest-api'
import { AddContactArgs, ContactManager } from '@sphereon/ssi-sdk.contact-manager'
import { v4 } from 'uuid'
import { ContactStore, CorrelationIdentifierEnum, IdentityRoleEnum, NonPersistedIdentity, PartyTypeEnum } from '@sphereon/ssi-sdk.data-store'
import { IonPublicKeyPurpose } from '@decentralized-identity/ion-sdk'

const PRIVATE_DID1_KEY_HEX = 'e0453c226bd4458740c45f0d0590e696da2fe9c5c66f81908aedd43a7b7da252'
const PRIVATE_UPDATE_KEY_HEX = '0121009becfa9caf6221dce6f4f7b55dd3376e79c4ca83ce92bd43861c2393ec'
const PRIVATE_RECOVERY_KEY_HEX = 'd39e66e720c00b244923eb861122ed25116555ae771ee9a57b749640173d7cf8'
const PRIVATE_DID2_KEY_HEX = '74213f5204ea414deb4dc2c470d1700b8cc2076ddd8d3ddb06dae08902dddd0c'
const PRIVATE_DID3_KEY_HEX = '90868704b3bb2bdd27e2e831654c4adb2ea7e4f0e090d03aa3ae38020346aa12'
const PRIVATE_DID4_KEY_HEX = 'f367873323bf0dd701ec972d8a17aee7a9dcad13bd6deb64e8653da113094261'
/**
 * Are we using a in mory database or not
 */
const mem = DB_TYPE.toLowerCase().startsWith('mem')

/**
 * Lets setup supported DID resolvers first
 */
const resolver = createDidResolver()
const dbConnection = getDbConnection(DB_DATABASE_NAME)

/**
 * Private key store, responsible for storing private keys in the database using encryption
 */
const privateKeyStore: PrivateKeyStore | MemoryPrivateKeyStore = MEMORY_DB
  ? new PrivateKeyStore(dbConnection, new SecretBox(DB_ENCRYPTION_KEY))
  : new MemoryPrivateKeyStore()

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
    //todo: We could add the GS1 contexts locally as well
    contextMaps: [LdDefaultContexts],
    suites: [new SphereonEd25519Signature2018(), new SphereonEd25519Signature2020(), new SphereonJsonWebSignature2020()],
    bindingOverrides: new Map([
      ['createVerifiableCredentialLD', MethodNames.createVerifiableCredentialLDLocal],
      ['createVerifiablePresentationLD', MethodNames.createVerifiablePresentationLDLocal],
    ]),
    keyStore: privateKeyStore,
  }),
  new ContactManager({ store: new ContactStore(dbConnection) }),
]

/**
 * Create the agent with a context and export it, so it is available for the rest of the code, or code using this module
 */
const agent = createAgent<TAgentTypes>({
  plugins,
}) as TAgent<TAgentTypes>
export default agent
export const context: IAgentContext<TAgentTypes> = { agent }

/**
 * Import/creates DIDs from configurations files and environment. They then get stored in the database.
 * Also assign default DID and Key Identifier values. Whenever a DID or KID is not explicitly defined,
 * the defaults will be used
 */
await getOrCreateDIDWebFromEnv().catch((e) => console.log(`ERROR ${e}`))
await getOrCreateDIDsFromFS().catch((e) => console.log(`ERROR ${e}`))

const defaultDID = await getDefaultDID()
console.log(`[DID] default DID: ${defaultDID}`)
const defaultKid = await getDefaultKid({ did: defaultDID })
console.log(`[DID] default key identifier: ${defaultKid}`)
if (!defaultDID || !defaultKid) {
  console.log('[DID] Agent has no default DID and Key Identifier!')
}

/**
 * Build a common express REST API configuration first, used by the exposed Routers/Services below
 */
const expressSupport = expressBuilder().build({ startListening: false })

function existingDidConfig(anchor: boolean = false, kid: string, privateDIDKeyHex: String) {
  return {
    options: {
      anchor,
      recoveryKey: {
        kid: 'recovery-test2',
        key: {
          privateKeyHex: PRIVATE_RECOVERY_KEY_HEX,
        },
      },
      updateKey: {
        kid: 'update-test2',
        key: {
          privateKeyHex: PRIVATE_UPDATE_KEY_HEX,
        },
      },
      verificationMethods: [
        {
          kid,
          purposes: [IonPublicKeyPurpose.Authentication, IonPublicKeyPurpose.AssertionMethod],
          key: {
            privateKeyHex: privateDIDKeyHex,
          },
        },
      ],
    },
  }
}

const generateIdentity = (contact: Record<string, any>, didKeyIdentifier: IIdentifier): NonPersistedIdentity => {
  return {
    alias: didKeyIdentifier.alias,
    roles: [IdentityRoleEnum.ISSUER],
    identifier: {
      type: CorrelationIdentifierEnum.DID,
      correlationId: didKeyIdentifier.did,
    },
  } as NonPersistedIdentity
}

async function addContacts() {
  try {
    const ctPeople = await agent.cmAddContactType({
      name: 'people',
      type: PartyTypeEnum.NATURAL_PERSON,
      tenantId: v4(),
    })

    const ctOrganizations = await agent.cmAddContactType({
      name: 'organizations',
      type: PartyTypeEnum.ORGANIZATION,
      tenantId: v4(),
    })

    const persona1 = {
      firstName: 'Viola',
      middleName: 'D.',
      lastName: 'Kemp',
      displayName: 'Viola Kemp',
      contactType: ctPeople,
      uri: 'example.com',
    } as AddContactArgs

    let didKeyIdentifier = await agent.didManagerCreate(existingDidConfig(false, 'bram', PRIVATE_DID1_KEY_HEX))
    persona1.identities = [generateIdentity(persona1, didKeyIdentifier)]
    await agent.cmAddContact(persona1)

    const persona2 = {
      firstName: 'Kevin',
      middleName: 'T.',
      lastName: 'Bloomer',
      displayName: 'Kevin Bloomer',
      contactType: ctPeople,
      uri: 'example.com',
    } as AddContactArgs

    didKeyIdentifier = await agent.didManagerCreate(existingDidConfig(false, 'kraak', PRIVATE_DID2_KEY_HEX))
    persona2.identities = [generateIdentity(persona2, didKeyIdentifier)]
    await agent.cmAddContact(persona2)

    const organization1 = {
      legalName: 'Sphereon International',
      displayName: 'Sphereon B.V.',
      contactType: ctOrganizations,
      uri: 'sphereon.com',
    } as AddContactArgs

    didKeyIdentifier = await agent.didManagerCreate(existingDidConfig(false, 'sphereon', PRIVATE_DID3_KEY_HEX))
    organization1.identities = [generateIdentity(organization1, didKeyIdentifier)]
    await agent.cmAddContact(organization1)

    const organization2 = {
      legalName: 'Kamer van verkoophandel',
      displayName: 'Kamer van koophandel',
      contactType: ctOrganizations,
      uri: 'kvk.nl',
    } as AddContactArgs

    didKeyIdentifier = await agent.didManagerCreate(existingDidConfig(false, 'kvk', PRIVATE_DID4_KEY_HEX))
    organization2.identities = [generateIdentity(organization2, didKeyIdentifier)]
    await agent.cmAddContact(organization2)
  } catch (e) {
    console.log(e)
  }
}

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

/**
 * Enable the Verifiable Credentials API
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
          dbName: DB_DATABASE_NAME,
          disableGlobalAuth: true,
          correlationId: STATUS_LIST_CORRELATION_ID,
        },
        getStatusList: {
          dbName: DB_DATABASE_NAME,
        },
        createStatusList: {
          dbName: DB_DATABASE_NAME,
        },
      },
      enableFeatures: STATUS_LIST_API_FEATURES,
    },
  })
}

await getOrCreateConfiguredStatusList({
  issuer: defaultDID,
  keyRef: defaultKid,
}).catch((e) => console.log(`ERROR ${e}`))

await addContacts().catch((e) => console.log(`Error: ${e}`))

expressSupport.start()
