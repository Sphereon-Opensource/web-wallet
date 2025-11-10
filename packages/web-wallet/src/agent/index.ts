import {getDidJwkResolver} from '@sphereon/ssi-sdk-ext.did-resolver-jwk'
import {eventLoggerAuditMethods} from '@sphereon/ssi-sdk.event-logger'
import {sphereonKeyManagerMethods} from '@sphereon/ssi-sdk-ext.key-manager'
import {VcApiIssuerClient} from '@sphereon/ssi-sdk.w3c-vc-api-issuer-rest-client'
import {QrCodeProvider} from '@sphereon/ssi-sdk.qr-code-generator'
import {
  defaultHasher,
  LinkHandlerEventType,
  LinkHandlerPlugin,
  LinkHandlers,
  LogLinkHandler,
} from '@sphereon/ssi-sdk.core'
import {OID4VCIRestClient} from '@sphereon/ssi-sdk.oid4vci-issuer-rest-client'
import {createAgent, IAgentContext, IAgentPlugin, TAgent} from '@veramo/core'
import {getResolver as getDidKeyResolver} from '@sphereon/ssi-sdk-ext.did-resolver-key'
import {DIDResolverPlugin} from '@veramo/did-resolver'
import {AgentRestClient} from '@veramo/remote-client'
import {Resolver} from 'did-resolver'
import {ebsiSupportMethods} from '@sphereon/ssi-sdk.ebsi-support'
import {getAgentBaseUrl, getVcApiCredentialIssueUrl, getVcApiUrl} from './environment'
import {OID4VCIHolder, oid4vciHolderContextMethods, OID4VCIHolderLinkHandler} from '@sphereon/ssi-sdk.oid4vci-holder'
import {contactManagerMethods} from '@sphereon/ssi-sdk.contact-manager'
import {issuanceBrandingMethods} from '@sphereon/ssi-sdk.issuance-branding'
import {pdManagerMethods} from '@sphereon/ssi-sdk.pd-manager'
import {getResolver as getDidWebResolver} from 'web-did-resolver'
import {oid4vciStateNavigationListener} from '@machines/oid4vci/oid4vciStateNavigation'
import {AuthorizationRequestOpts, PARMode} from '@sphereon/oid4vci-common'
import {getClientId, getOid4vciDefaultRedirectUri, OID4VCI_CODE_URL_REGEX} from '@/app'
import {TAgentTypes} from '@typings'
import {
  DidAuthSiopOpAuthenticator,
  didAuthSiopOpAuthenticatorMethods,
  OID4VPCallbackStateListener,
  Siopv2OID4VPLinkHandler,
} from '@sphereon/ssi-sdk.siopv2-oid4vp-op-auth'
import {vpStateCallbacks} from '@machines/siopv2/siopv2StateNavigation'
import {credentialStoreMethods} from '@sphereon/ssi-sdk.credential-store'
import {IdentifierResolution, identifierResolutionContextMethods} from '@sphereon/ssi-sdk-ext.identifier-resolution'
import {SDJwtPlugin, sdJwtPluginContextMethods} from '@sphereon/ssi-sdk.sd-jwt'
import {JwtService, jwtServiceContextMethods} from '@sphereon/ssi-sdk-ext.jwt-service'
import {generateSalt, verifySDJWTSignature} from '@helpers/CryptoUtils'
import {credentialValidationMethods} from '@sphereon/ssi-sdk.credential-validation'

export const resolver = new Resolver({
  ...getDidKeyResolver(),
  ...getDidJwkResolver(),
  ...getDidWebResolver(),
})

export const linkHandlers: LinkHandlers = new LinkHandlers().add(new LogLinkHandler())

let _agent: TAgent<TAgentTypes> | null = null
let _agentContext: IAgentContext<TAgentTypes> | null = null

const createAgentInstance = (): TAgent<TAgentTypes> => {
const plugins: IAgentPlugin[] = [
  new DIDResolverPlugin({
    resolver,
  }),
  new VcApiIssuerClient({
    issueUrl: getVcApiCredentialIssueUrl(),
    authorizationToken: 'test',
  }),
  new OID4VCIRestClient({
    baseUrl: getVcApiUrl(),
    authentication: {
      enabled: false,
    },
  }),
  new DidAuthSiopOpAuthenticator(),
  new QrCodeProvider(),
  new AgentRestClient({
    url: getAgentBaseUrl(),
    enabledMethods: [
      ...issuanceBrandingMethods,
      ...eventLoggerAuditMethods,
      ...oid4vciHolderContextMethods,
      ...didAuthSiopOpAuthenticatorMethods,
      ...ebsiSupportMethods,
      ...pdManagerMethods,
      ...credentialStoreMethods,
      'crsGetUniqueCredentials',
      ...contactManagerMethods,
      ...sphereonKeyManagerMethods,
      // fixme: import from respective modules
      ...sdJwtPluginContextMethods,
      ...jwtServiceContextMethods,
      ...identifierResolutionContextMethods,
      ...credentialValidationMethods,
      'didManagerCreate',
      'didManagerFind',
      'didManagerGet',
      'didManagerSetAlias',
      'didManagerRemoveKey',
      'didManagerAddKey',
      'didManagerAddService',
      'didManagerRemoveService',
      'createSdJwtVc',
      'createSdJwtPresentation',
      'verifySdJwtVc',
      'verifySdJwtPresentation',
      'identifierManagedGet',
      'identifierManagedGetByDid',
      'identifierManagedGetByKid',
      'identifierManagedGetByJwk',
      'identifierManagedGetByX5c',
      'identifierManagedGetByKey',
      'identifierExternalResolve',
      'identifierExternalResolveByDid',
      'identifierExternalResolveByX5c',
      'jwtPrepareJws',
      'jwtCreateJwsJsonGeneralSignature',
      'jwtCreateJwsJsonFlattenedSignature',
      'jwtCreateJwsCompactSignature',
      'jwtVerifyJwsCompactSignature',
    ],
  }),
  new OID4VCIHolder({
    hasher: defaultHasher,
  }),
  new LinkHandlerPlugin({
    eventTypes: [LinkHandlerEventType.LINK_HANDLER_URL],
    handlers: linkHandlers,
  }),
  new IdentifierResolution(),
  new JwtService(),
  new SDJwtPlugin({
    hasher: defaultHasher,
    saltGenerator: generateSalt,
    verifySignature: verifySDJWTSignature,
  }),
]

  return createAgent<TAgentTypes>({
  plugins,
})
}

const addLinkListeners = (linkHandlers: LinkHandlers, context: IAgentContext<any>): void => {
  const vciAuthorizationRequestOpts = {
    redirectUri: getOid4vciDefaultRedirectUri(),
    clientId: getClientId(),
    // fixme: Set back to auto. We only do this because of a bug in PAR handling Walt.id
    parMode: PARMode.NEVER,
  } satisfies AuthorizationRequestOpts
  linkHandlers.add([
    new OID4VCIHolderLinkHandler({
      protocols: [
        OID4VCI_CODE_URL_REGEX, // Only scoped to /oid4vci, as we pass in redirect URIs, and we could have other codes in the future
        new RegExp('https?:\\/\\/.*\\?.*credential_offer=.+'),
        new RegExp('https?:\\/\\/.*\\?.*credential_offer_uri=.+'),
      ],
      authorizationRequestOpts: vciAuthorizationRequestOpts,
      stateNavigationListener: oid4vciStateNavigationListener,
      context,
    }),
    new Siopv2OID4VPLinkHandler({
      protocols: [new RegExp('http:\\/\\/.*\\?.*request_uri=.+'), new RegExp('https:\\/\\/.*\\?.*request_uri=.+')],
      stateNavigationListener: OID4VPCallbackStateListener(vpStateCallbacks),
      noStateMachinePersistence: true,
      context,
    }),
  ])
}

export const getAgent = (): TAgent<TAgentTypes> => {
  if (!_agent) {
    _agent = createAgentInstance()
    _agentContext = {..._agent.context, agent: _agent}
    addLinkListeners(linkHandlers, _agentContext)
  }
  return _agent
}

export const getAgentContext = (): IAgentContext<TAgentTypes> & {agent: TAgent<TAgentTypes>} => {
  if (!_agentContext) {
    getAgent() // This will initialize both
  }
  return _agentContext!
}

