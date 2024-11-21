import { env } from '@sphereon/ssi-express-support'
import { eventLoggerAuditMethods } from '@sphereon/ssi-sdk.event-logger'
import { oid4vciHolderContextMethods } from '@sphereon/ssi-sdk.oid4vci-holder'
import { contactManagerMethods } from '@sphereon/ssi-sdk.contact-manager'
import { sphereonKeyManagerMethods } from '@sphereon/ssi-sdk-ext.key-manager'
import { didAuthSiopOpAuthenticatorMethods } from '@sphereon/ssi-sdk.siopv2-oid4vp-op-auth'
import { ebsiSupportMethods } from '@sphereon/ssi-sdk.ebsi-support'
import { issuanceBrandingMethods } from '@sphereon/ssi-sdk.issuance-branding'
import { pdManagerMethods } from '@sphereon/ssi-sdk.pd-manager'
import { credentialStoreMethods } from '@sphereon/ssi-sdk.credential-store'
import {
  IDENTIFIER_OPTIONS_PATH,
  ENV_VAR_PREFIX,
  OID4VCI_ISSUER_METADATA_PATH,
  OID4VCI_ISSUER_OPTIONS_PATH,
  OID4VP_PRESENTATION_DEFINITION_PATH,
  OID4VP_RP_OPTIONS_PATH,
} from './environment'
import { loadJsonFiles } from './utils'
import { IIdentifierConfigOpts, OID4VPInstanceOpts } from './types'
import { IIssuerOptsImportArgs, IMetadataImportArgs } from '@sphereon/ssi-sdk.oid4vci-issuer-store'
import { IPresentationDefinition } from '@sphereon/pex'
import { vcApiFeatures } from '@sphereon/ssi-sdk.w3c-vc-api'
import { ContactManagerMRestApiFeatures } from '@sphereon/ssi-sdk.contact-manager-rest-api'
import { statusListFeatures } from '@sphereon/ssi-sdk.vc-status-list-issuer-rest-api'
import { DidApiFeatures, DidWebServiceFeatures } from '@sphereon/ssi-sdk.uni-resolver-registrar-api'
import { identifierResolutionContextMethods } from '@sphereon/ssi-sdk-ext.identifier-resolution'
import {credentialValidationMethods} from '@sphereon/ssi-sdk.credential-validation'

export const REMOTE_SERVER_API_FEATURES: string[] = env('REMOTE_SERVER_API_FEATURES', ENV_VAR_PREFIX)
  ? (env('REMOTE_SERVER_API_FEATURES', ENV_VAR_PREFIX)?.split(',') as string[])
  : [
      ...eventLoggerAuditMethods,
      ...oid4vciHolderContextMethods,
      ...contactManagerMethods,
      ...sphereonKeyManagerMethods,
      ...didAuthSiopOpAuthenticatorMethods,
      'didManagerCreate',
      'didManagerGetProviders',
      'createVerifiablePresentation',
      ...ebsiSupportMethods,
      ...issuanceBrandingMethods,
      ...pdManagerMethods,
      ...credentialStoreMethods,
      ...identifierResolutionContextMethods,
      ...credentialValidationMethods,
      'crsGetUniqueCredentials', // FIXME in SSI_SDK
      // fixme: import from respective modules
      'createSdJwtVc',
      'createSdJwtPresentation',
      'verifySdJwtVc',
      'verifySdJwtPresentation',
      'jwtPrepareJws',
      'jwtCreateJwsJsonGeneralSignature',
      'jwtCreateJwsJsonFlattenedSignature',
      'jwtCreateJwsCompactSignature',
      'jwtVerifyJwsCompactSignature',
    ]

export const oid4vpInstanceOpts = loadJsonFiles<OID4VPInstanceOpts>({ path: OID4VP_RP_OPTIONS_PATH })

export const oid4vciInstanceOpts = loadJsonFiles<IIssuerOptsImportArgs>({
  path: OID4VCI_ISSUER_OPTIONS_PATH,
})
export const oid4vciMetadataOpts = loadJsonFiles<IMetadataImportArgs>({
  path: OID4VCI_ISSUER_METADATA_PATH,
})
export const syncDefinitionsOpts = loadJsonFiles<IPresentationDefinition>({ path: OID4VP_PRESENTATION_DEFINITION_PATH })
export const VC_API_FEATURES: vcApiFeatures[] = env('VC_API_FEATURES', ENV_VAR_PREFIX)
  ? (env('VC_API_FEATURES', ENV_VAR_PREFIX)?.split(',') as vcApiFeatures[])
  : ['vc-issue', 'vc-verify', 'vc-persist']

export const CONTACT_MANAGER_API_FEATURES: ContactManagerMRestApiFeatures[] = env('CONTACT_MANAGER_API_FEATURES', ENV_VAR_PREFIX)
  ? (env('CONTACT_MANAGER_API_FEATURES', ENV_VAR_PREFIX)?.split(',') as ContactManagerMRestApiFeatures[])
  : ['party_read', 'party_write', 'party_type_read', 'identity_read']
export const STATUS_LIST_API_FEATURES: statusListFeatures[] = env('STATUS_LIST_API_FEATURES', ENV_VAR_PREFIX)
  ? (env('STATUS_LIST_API_FEATURES', ENV_VAR_PREFIX)?.split(',') as statusListFeatures[])
  : ['status-list-hosting', 'w3c-vc-api-credential-status']
export const DID_API_FEATURES: DidApiFeatures[] = env('DID_API_FEATURES', ENV_VAR_PREFIX)
  ? (env('DID_API_FEATURES', ENV_VAR_PREFIX)?.split(',') as DidApiFeatures[])
  : ['did-persist', 'did-resolve']
export const DID_WEB_SERVICE_FEATURES: DidWebServiceFeatures[] = env('DID_WEB_SERVICE_FEATURES', ENV_VAR_PREFIX)
  ? (env('DID_WEB_SERVICE_FEATURES', ENV_VAR_PREFIX)?.split(',') as DidWebServiceFeatures[])
  : ['did-web-global-resolution']

export const identifierOptConfigs = loadJsonFiles<IIdentifierConfigOpts>({
  path: IDENTIFIER_OPTIONS_PATH,
})
