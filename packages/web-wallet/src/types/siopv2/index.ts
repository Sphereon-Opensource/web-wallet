import {Siopv2MachineInterpreter, Siopv2MachineState} from '@sphereon/ssi-sdk.siopv2-oid4vp-op-auth'
import {CredentialSummary} from '@sphereon/ui-components.credential-branding/dist/types'

export enum Siopv2NavigationEventListenerType {
  CONTACT_CONSENT_CHANGE = 'siopv2OnContactConsentChange',
  ALIAS_CHANGE = 'siopv2OnAliasChange',
  CREATE_CONTACT = 'siopv2OnCreateContact',
  SET_SELECTED_CREDENTIALS = 'siopv2OnShareCredentials',
  NEXT_ENABLED_STATE_UPDATED = 'siopv2OnNextEnabledStateUpdate',
  DECLINE_CREDENTIALS_REQUEST = 'siopv2OnDeclineCredentialsRequest',
  NEXT = 'siopv2OnNext',
}

export type Siopv2MachineNavigationArgs = {
  siopv2Machine: Siopv2MachineInterpreter
  state: Siopv2MachineState
  onNext: () => void
  onBack: () => void
}

export type Siopv2NavigationArgs = {abortController: AbortController} & Siopv2MachineNavigationArgs

export type SelectableCredentialWithSummary = {
  credentialSummary: CredentialSummary
}
