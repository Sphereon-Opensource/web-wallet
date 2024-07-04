import {OID4VCIMachineNavigationArgs} from '@sphereon/ssi-sdk.oid4vci-holder'

export enum OID4VCINavigationEventListenerType {
  CONTACT_CONSENT_CHANGE = 'oid4vciOnContactConsentChange',
  ALIAS_CHANGE = 'oid4vciOnAliasChange',
  CREATE_CONTACT = 'oid4vciOnCreateContact',
  DECLINE_CREDENTIAL = 'oid4vciOnDeclineCredential',
  ACCEPT_CREDENTIAL = 'oid4vciOnAcceptCredential',
  INVOKE_AUTHORIZATION_REQUEST = 'oid4vciInvokeAuthorizationRequest',
  NEXT = 'oid4vciOnNext',
}

export type OID4VCINavigationArgs = {abortController: AbortController} & Omit<OID4VCIMachineNavigationArgs, 'navigation'> // FIXME OID4VCIMachineNavigationArgs in SSI-SDK has mandatory navigation field which we do not need anymore
