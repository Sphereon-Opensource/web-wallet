import {CredentialRole} from '@sphereon/ssi-sdk.credential-store';
import {EbsiAccessTokenOpts} from '@sphereon/ssi-sdk.ebsi-support/src/did/types';
import agent from '@agent';
import {RegisterDidOnLedgerArgs} from '@typings';

export const registerDidEbsiOnLedger = async (args: RegisterDidOnLedgerArgs): Promise<void> => {
    const { credentialIssuer, did } = args

    // For now only accepting ebsi dids
    if (!did.toLowerCase().startsWith('did:ebsi')) {
        return Promise.reject(Error(`Did ${did} is not a valid ebsi did`))
    }

    const identifier  = await agent.didManagerGet({ did })
    const clientId = process?.env?.NEXT_PUBLIC_CLIENT_ID ?? `${window.location.protocol}//${window.location.hostname}`
    const jwksUri = `${clientId}/.well-known/jwks/dids/${identifier.did}`
    const accessTokenOpts: EbsiAccessTokenOpts = {
        attestationToOnboardCredentialRole: CredentialRole.HOLDER,
        redirectUri: jwksUri,
        jwksUri,
        credentialIssuer,
        clientId,
        environment: 'conformance'// TODO we need to derive this from the identifier
    }

    await agent.ebsiCreateDidOnLedger({
        identifier,
        accessTokenOpts
    })
}
