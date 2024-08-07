import {
  CreateContactEvent,
  ErrorDetails,
  OID4VCIMachineEvents,
  OID4VCIMachineInterpreter,
  OID4VCIMachineState,
  OID4VCIMachineStates,
} from '@sphereon/ssi-sdk.oid4vci-holder'
import {SimpleEventsOf} from 'xstate'
import {ConnectionType, CorrelationIdentifierType, CredentialRole, IBasicCredentialLocaleBranding} from '@sphereon/ssi-sdk.data-store'
import {getIssuerName} from '@sphereon/oid4vci-common'
import debug from 'debug'
import {LoadingPageState} from '@/pages/oid4vci/loading'
import {AddContactPageState} from '@/pages/oid4vci/addContact'
import {ReviewCredentialsPageState} from '@/pages/oid4vci/reviewCredentials'
import {ErrorPageState} from '@/pages/oid4vci/error'
import {
  MainRoute,
  NavigationEventListenerType,
  DataResource,
  OID4VCINavigationArgs,
  OID4VCINavigationEventListenerType,
  OID4VCIRoute,
  navigationEventEmitter,
  SIOPV2Route,
} from '@typings'
import {toNonPersistedCredentialSummary} from '@sphereon/ui-components.credential-branding'
import {AuthorizationCodeState} from '@/pages/oid4vci/AuthorizationCodeUrl'
import agent from '@agent'
import {OID4VCI_STATE_STORAGE_KEY} from '@/app'
import {IdentityOrigin} from '@sphereon/ssi-sdk.data-store/dist/types/contact/contact'

const navigateLoading = async (args: OID4VCINavigationArgs): Promise<void> => {
  const state: LoadingPageState = {
    message: 'action_getting_information_message',
  }

  navigationEventEmitter.navigateTo(`${MainRoute.OID4VCI}/${OID4VCIRoute.LOADING}`, {...state})
}

const navigateAddContact = async (args: OID4VCINavigationArgs): Promise<void> => {
  const {abortController, oid4vciMachine, state: machineState, onBack} = args
  const {hasContactConsent, serverMetadata, contactAlias} = machineState.context

  // Avoid duplicate navigation
  if (!machineState.changed) {
    return
  }
  if (window.location.pathname === `${MainRoute.OID4VP}/${OID4VCIRoute.ADD_CONTACT}`) {
    return
  }

  if (onBack === undefined) {
    return Promise.reject(Error('Missing onBack in arguments'))
  }

  if (serverMetadata === undefined) {
    return Promise.reject(Error('Missing serverMetadata in context'))
  }

  const issuerUrl: URL = new URL(serverMetadata.issuer)
  const correlationId: string = `${issuerUrl.protocol}//${issuerUrl.hostname}`
  const issuerName: string = getIssuerName(correlationId, serverMetadata.credentialIssuerMetadata)
  const onConsentChange = (event: any): void => {
    abortController.abort()
    oid4vciMachine.send({
      type: OID4VCIMachineEvents.SET_CONTACT_CONSENT,
      data: event.detail,
    })
  }

  const onAliasChange = (event: any): void => {
    abortController.abort()
    oid4vciMachine.send({
      type: OID4VCIMachineEvents.SET_CONTACT_ALIAS,
      data: event.detail,
    })
  }

  const onCreate = (event: any): void => {
    abortController.abort()
    oid4vciMachine.send({
      type: OID4VCIMachineEvents.CREATE_CONTACT,
      data: event.detail,
    })
  }
  window.addEventListener(NavigationEventListenerType.POPSTATE, onBack, {signal: abortController.signal})
  window.addEventListener(OID4VCINavigationEventListenerType.CONTACT_CONSENT_CHANGE, onConsentChange, {signal: abortController.signal})
  window.addEventListener(OID4VCINavigationEventListenerType.ALIAS_CHANGE, onAliasChange, {signal: abortController.signal})
  window.addEventListener(OID4VCINavigationEventListenerType.CREATE_CONTACT, onCreate, {signal: abortController.signal})

  const state: AddContactPageState = {
    hasContactConsent,
    contactAlias,
    isCreateDisabled: oid4vciMachine.getSnapshot()?.can(OID4VCIMachineEvents.CREATE_CONTACT as SimpleEventsOf<CreateContactEvent>) !== true,
    identities: [
      {
        alias: correlationId,
        roles: [CredentialRole.ISSUER],
        origin: IdentityOrigin.EXTERNAL,
        identifier: {
          type: CorrelationIdentifierType.URL,
          correlationId: issuerUrl.hostname,
        },
        // TODO WAL-476 add support for correct connection
        connection: {
          type: ConnectionType.OPENID_CONNECT,
          config: {
            clientId: '138d7bf8-c930-4c6e-b928-97d3a4928b01',
            clientSecret: '03b3955f-d020-4f2a-8a27-4e452d4e27a0',
            scopes: ['auth'],
            issuer: 'https://example.com/app-test',
            redirectUrl: 'app:/callback',
            dangerouslyAllowInsecureHttpRequests: true,
            clientAuthMethod: 'post' as const,
          },
        },
      },
    ],
    contactName: issuerName,
    contactUri: correlationId,
  }
  navigationEventEmitter.navigateTo(`${MainRoute.OID4VCI}/${OID4VCIRoute.ADD_CONTACT}`, {...state})
}

const navigateSelectCredentials = async (args: OID4VCINavigationArgs): Promise<void> => {
  navigationEventEmitter.navigateTo(`${MainRoute.OID4VCI}/${OID4VCIRoute.SELECT_CREDENTIALS}`)
}

const navigatePINVerification = async (args: OID4VCINavigationArgs): Promise<void> => {
  navigationEventEmitter.navigateTo(`${MainRoute.OID4VCI}/${OID4VCIRoute.PIN_VERIFICATION}`)
}

const navigateAuthorizationCodeURL = async (args: OID4VCINavigationArgs): Promise<void> => {
  const {abortController, oid4vciMachine, state: machineState} = args
  const {authorizationCodeURL, serverMetadata} = machineState.context
  let contactAlias = machineState.context.contactAlias
  const issuerUrl: URL = new URL(serverMetadata!.issuer)
  const correlationId: string = `${issuerUrl.protocol}//${issuerUrl.hostname}`
  const issuerName: string = getIssuerName(correlationId, serverMetadata!.credentialIssuerMetadata)

  if (!contactAlias || contactAlias.trim() == '') {
    const contact = await agent.oid4vciHolderGetContact({serverMetadata})
    contactAlias = contact?.contact?.displayName ?? issuerName
  }

  if (!authorizationCodeURL) {
    return navigateError(args, {message: 'No authorization code URL present', title: 'Authentication error'})
  }

  const onInvokeAuthorizationRequest = (event: any): void => {
    abortController.abort()
    oid4vciMachine.send({
      type: OID4VCIMachineEvents.INVOKED_AUTHORIZATION_CODE_REQUEST,
      data: authorizationCodeURL,
    })
  }
  window.addEventListener(OID4VCINavigationEventListenerType.INVOKE_AUTHORIZATION_REQUEST, onInvokeAuthorizationRequest, {
    signal: abortController.signal,
  })

  const state: AuthorizationCodeState = {authorizationCodeURL, contactAlias}
  navigationEventEmitter.navigateTo(`${MainRoute.OID4VCI}/${OID4VCIRoute.AUTHORIZATION_CODE}`, {...state})
}

const navigateReviewCredentials = async (args: OID4VCINavigationArgs): Promise<void> => {
  const {abortController, state: machineState, oid4vciMachine, onBack, onNext} = args

  // Avoid duplicate navigation
  if (!machineState.changed) {
    return
  }
  if (window.location.pathname === `${MainRoute.OID4VP}/${OID4VCIRoute.REVIEW_CREDENTIALS}`) {
    return
  }
  const {credentialsToAccept, contact, credentialBranding} = machineState.context
  const localeBranding: Array<IBasicCredentialLocaleBranding> | undefined = credentialBranding?.[machineState.context.selectedCredentials[0]]

  if (contact === undefined) {
    return Promise.reject(Error('Missing contact in context'))
  }

  if (onNext === undefined) {
    return Promise.reject(Error('Missing onNext in arguments'))
  }

  if (onBack === undefined) {
    return Promise.reject(Error('Missing onBack in arguments'))
  }

  const onDecline = async (): Promise<void> => {
    abortController.abort()
    oid4vciMachine.send(OID4VCIMachineEvents.DECLINE)
  }

  window.addEventListener(NavigationEventListenerType.POPSTATE, onBack, {signal: abortController.signal})
  window.addEventListener(OID4VCINavigationEventListenerType.DECLINE_CREDENTIAL, onDecline, {signal: abortController.signal})
  window.addEventListener(OID4VCINavigationEventListenerType.ACCEPT_CREDENTIAL, onNext, {signal: abortController.signal})

  const state: ReviewCredentialsPageState = {
    credential: await toNonPersistedCredentialSummary({
      verifiableCredential: credentialsToAccept[0].uniformVerifiableCredential,
      branding: localeBranding,
      issuer: contact,
      credentialRole: CredentialRole.HOLDER,
    }),
  }

  navigationEventEmitter.navigateTo(`${MainRoute.OID4VCI}/${OID4VCIRoute.REVIEW_CREDENTIALS}`, {...state})
}

const navigateError = async (args: OID4VCINavigationArgs, customError?: ErrorDetails): Promise<void> => {
  const {abortController, state: machineState, onBack, onNext} = args
  const error = customError ?? machineState.context.error

  if (error === undefined) {
    return Promise.reject(Error('Missing error in context'))
  }

  if (onNext === undefined) {
    return Promise.reject(Error('Missing onNext in arguments'))
  }

  if (onBack === undefined) {
    return Promise.reject(Error('Missing onBack in arguments'))
  }

  window.addEventListener(NavigationEventListenerType.POPSTATE, onBack, {signal: abortController.signal})
  window.addEventListener(OID4VCINavigationEventListenerType.NEXT, onNext, {signal: abortController.signal})

  console.log('oid4vci error', error)
  const state: ErrorPageState = {
    title: error.title,
    message: error.message,
  }

  navigationEventEmitter.navigateTo(`${MainRoute.OID4VCI}/${OID4VCIRoute.ERROR}`, {...state})
}

const navigateFinal = async (args: OID4VCINavigationArgs): Promise<void> => {
  const {oid4vciMachine} = args

  debug(`Stopping oid4vci instance...`)
  oid4vciMachine.stop()
  debug(`Stopped oid4vci instance`)

  navigationEventEmitter.navigateTo(DataResource.CREDENTIALS)
}

export const oid4vciStateNavigationListener = async (oid4vciMachine: OID4VCIMachineInterpreter, state: OID4VCIMachineState): Promise<void> => {
  if (state._event.type === 'internal') {
    // Make sure we do not navigate when triggered by an internal event. We need to stay on current screen
    // Make sure we do not navigate when state has not changed
    return
  }

  // We need this abort controller to remove the existing event listeners because on every change in the state machine it will create duplicate listeners otherwise
  const abortController = new AbortController()

  const onBack = (): void => {
    abortController.abort()
    oid4vciMachine.send(OID4VCIMachineEvents.PREVIOUS)
  }

  const onNext = (): void => {
    abortController.abort()
    oid4vciMachine.send(OID4VCIMachineEvents.NEXT)
  }

  if (
    state.matches(OID4VCIMachineStates.getContact) ||
    state.matches(OID4VCIMachineStates.transitionFromSetup) ||
    state.matches(OID4VCIMachineStates.transitionFromWalletInput) ||
    state.matches(OID4VCIMachineStates.getCredentials)
  ) {
    return navigateLoading({oid4vciMachine, state, onBack, abortController})
  } else if (state.matches(OID4VCIMachineStates.waitForAuthorizationResponse)) {
    sessionStorage.setItem(OID4VCI_STATE_STORAGE_KEY, JSON.stringify(state.toJSON()))
    return navigateLoading({oid4vciMachine, state, onBack, abortController})
  } else if (state.matches(OID4VCIMachineStates.addContact)) {
    return navigateAddContact({oid4vciMachine, state, onNext, onBack, abortController})
  } else if (state.matches(OID4VCIMachineStates.selectCredentials)) {
    return navigateSelectCredentials({oid4vciMachine, state, onNext, onBack, abortController})
  } else if (state.matches(OID4VCIMachineStates.verifyPin)) {
    return navigatePINVerification({oid4vciMachine, state, onNext, onBack, abortController})
  } else if (state.matches(OID4VCIMachineStates.initiateAuthorizationRequest)) {
    return navigateAuthorizationCodeURL({oid4vciMachine, state, onNext, onBack, abortController})
  } else if (state.matches(OID4VCIMachineStates.reviewCredentials)) {
    return navigateReviewCredentials({
      oid4vciMachine,
      state,
      onNext,
      onBack,
      abortController,
    })
  } else if (state.matches(OID4VCIMachineStates.handleError)) {
    return navigateError({oid4vciMachine, state, onNext, onBack, abortController})
  } else if (
    state.matches(OID4VCIMachineStates.done) ||
    state.matches(OID4VCIMachineStates.error) ||
    state.matches(OID4VCIMachineStates.aborted) ||
    state.matches(OID4VCIMachineStates.declined)
  ) {
    return navigateFinal({oid4vciMachine, state, onNext, onBack, abortController})
  }
}
