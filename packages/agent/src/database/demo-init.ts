import {
    createAgent,
    DIDDocument,
    IAgentContext,
    IAgentPlugin,
    ProofFormat,
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
import {getDefaultDID} from '../utils'
import {STATUS_LIST_ISSUER} from '../environment'
import {getOrCreateConfiguredStatusList} from '../utils/statuslist'
import {addContacts} from "../database/contact-fixtures";

const defaultDID = await getDefaultDID()

await addContacts().catch((e) => console.log(`Error: ${e}`)).then(() => {
        getOrCreateConfiguredStatusList({
            issuer: STATUS_LIST_ISSUER ?? defaultDID,
        }).catch((e) => console.log(`ERROR statuslist ${e}`))
    }
)

console.log('Demo data initialized');

process.exit(0);