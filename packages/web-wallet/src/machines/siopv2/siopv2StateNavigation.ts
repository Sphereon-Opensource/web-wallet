import {
  DataResource,
  MainRoute,
  navigationEventEmitter,
  NavigationEventListenerType,
  Siopv2NavigationArgs,
  Siopv2NavigationEventListenerType,
  SIOPV2Route,
} from '@typings'
import {LoadingPageState} from '@/pages/siopv2/loading'
import {ErrorPageState} from '@/pages/siopv2/error'
import {
  Siopv2MachineContext,
  Siopv2MachineEvents,
  Siopv2MachineInterpreter,
  Siopv2MachineState,
  Siopv2MachineStates,
} from '@sphereon/ssi-sdk.siopv2-oid4vp-op-auth'
import debug from 'debug'
import {InformationRequestPageState} from '@/pages/siopv2/informationRequest'
import {PresentationDefinitionWithLocation} from '@sphereon/did-auth-siop'
import {Format} from '@sphereon/pex-models'
import {IdentityOrigin} from '@sphereon/ssi-sdk.data-store/dist/types/contact/contact'
import agent from '@agent'
import {ConnectionType, CorrelationIdentifierType, CredentialRole, PartyOrigin, PartyTypeType} from '@sphereon/ssi-sdk.data-store'

const handleNavigation = async (
  path: string,
  state: any,
  abortController?: AbortController,
  listeners?: {event: string; handler: EventListenerOrEventListenerObject}[],
): Promise<void> => {
  if (abortController && listeners) {
    listeners.forEach(({event, handler}) => {
      window.addEventListener(event, handler, {signal: abortController.signal})
    })
  }
  navigationEventEmitter.navigateTo(path, state)
}

const navigateLoading = async (): Promise<void> => {
  // Avoid navigate again after sending SET_SELECTED_CREDENTIALS after which the machine will update its state and re-trigger the event
  if (window.location.pathname === `${MainRoute.OID4VP}/${SIOPV2Route.LOADING}`) {
    return
  }

  const state: LoadingPageState = {
    message: 'action_getting_information_message',
  }
  await handleNavigation(`${MainRoute.OID4VP}/${SIOPV2Route.LOADING}`, {...state})
}

const navigateInformationRequest = async (args: Siopv2NavigationArgs): Promise<void> => {
  // Avoid navigate again after sending SET_SELECTED_CREDENTIALS after which the machine will update its state and re-trigger the event
  if (window.location.pathname === `${MainRoute.OID4VP}/${SIOPV2Route.INFORMATION_REQUEST}`) {
    return
  }

  const {abortController, state: machineState, siopv2Machine, onBack, onNext} = args
  const {contact, authorizationRequestData, selectableCredentialsMap} = machineState.context

  if (contact === undefined) {
    return Promise.reject(Error('Missing contact in context'))
  }

  if (authorizationRequestData === undefined) {
    return Promise.reject(Error('Missing authorization request data in context'))
  }

  if (authorizationRequestData.presentationDefinitions === undefined || authorizationRequestData.presentationDefinitions.length === 0) {
    return Promise.reject(Error('No presentation definitions present'))
  }

  if (authorizationRequestData.presentationDefinitions.length > 1) {
    return Promise.reject(Error('Multiple presentation definitions not supported yet'))
  }

  if (selectableCredentialsMap === undefined) {
    return Promise.reject(Error('No selectable credentials present'))
  }

  const presentationDefinitionWithLocation: PresentationDefinitionWithLocation = authorizationRequestData.presentationDefinitions[0]
  const format: Format | undefined = authorizationRequestData.registrationMetadataPayload?.registration?.vp_formats
  const subjectSyntaxTypesSupported: Array<string> | undefined =
    authorizationRequestData.registrationMetadataPayload?.registration?.subject_syntax_types_supported

  const onSelect = async (event: any): Promise<void> => {
    siopv2Machine.send({type: Siopv2MachineEvents.SET_SELECTED_CREDENTIALS, data: event.detail})

    // Trigger re-render due to possible change of isSendDisabled
    window.dispatchEvent(
      new CustomEvent(Siopv2NavigationEventListenerType.NEXT_ENABLED_STATE_UPDATED, {
        detail: siopv2Machine.getSnapshot()?.can(Siopv2MachineEvents.NEXT),
      }),
    )
  }

  const onAccept = async (): Promise<void> => {
    onNext()
  }

  const onDecline = async (): Promise<void> => {
    siopv2Machine.send(Siopv2MachineEvents.DECLINE)
  }
  const state: InformationRequestPageState = {
    verifierName: contact.contact.displayName,
    presentationDefinition: presentationDefinitionWithLocation.definition,
    selectableCredentialsMap,
    format,
    subjectSyntaxTypesSupported,
  }
  await handleNavigation(`${MainRoute.OID4VP}/${SIOPV2Route.INFORMATION_REQUEST}`, {...state}, abortController, [
    {event: NavigationEventListenerType.POPSTATE, handler: onBack},
    {event: Siopv2NavigationEventListenerType.DECLINE_CREDENTIALS_REQUEST, handler: onDecline},
    {event: Siopv2NavigationEventListenerType.SET_SELECTED_CREDENTIALS, handler: onSelect},
    {event: Siopv2NavigationEventListenerType.NEXT, handler: onAccept},
  ])
}

const navigateError = async (args: Siopv2NavigationArgs): Promise<void> => {
  const {abortController, state: machineState, onBack, onNext} = args
  const {error} = machineState.context
  console.error('navigateError', error)

  if (!error || !onBack || !onNext) {
    return Promise.reject(Error('Missing required fields in arguments or context'))
  }

  const state: ErrorPageState = {
    title: error.title,
    message: error.message,
  }

  await handleNavigation(`${MainRoute.OID4VP}/${SIOPV2Route.ERROR}`, state, abortController, [
    {event: NavigationEventListenerType.POPSTATE, handler: onBack},
    {event: Siopv2NavigationEventListenerType.NEXT, handler: onNext},
  ])
}

const navigateFinal = async (args: Siopv2NavigationArgs): Promise<void> => {
  const {siopv2Machine} = args
  debug(`Stopping siopv2 instance...`)
  siopv2Machine.stop()
  debug(`Stopped siopv2 instance`)
  await handleNavigation(DataResource.CREDENTIALS, {})
}

const createAbortControllerWithBackNextHandlers = (siopv2Machine: Siopv2MachineInterpreter) => {
  const abortController = new AbortController()
  const handlers = {
    onBack: (): void => {
      abortController.abort()
      siopv2Machine.send(Siopv2MachineEvents.PREVIOUS)
    },
    onNext: (): void => {
      abortController.abort()
      siopv2Machine.send(Siopv2MachineEvents.NEXT)
    },
  }
  return {abortController, handlers}
}

const showLoading = async (siopv2Machine: Siopv2MachineInterpreter, state: Siopv2MachineState) => {
  if (!state.changed) {
    return
  }

  return navigateLoading()
}

const addContact = async (siopv2Machine: Siopv2MachineInterpreter, machineState: Siopv2MachineState) => {
  if (!machineState.changed) {
    return
  }

  const {authorizationRequestData}: Siopv2MachineContext = machineState.context
  const {name, correlationId} = authorizationRequestData ?? {}

  if (!correlationId) {
    return Promise.reject(Error('correlationId could not be extracted from the authorization request data'))
  }
  const contactName = name ?? correlationId

  const {abortController} = createAbortControllerWithBackNextHandlers(siopv2Machine)

  const identities = [
    {
      alias: contactName,
      roles: [CredentialRole.VERIFIER],
      origin: IdentityOrigin.EXTERNAL,
      identifier: {type: CorrelationIdentifierType.URL, correlationId},
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
  ]

  try {
    const party = await agent.cmAddContact({
      legalName: contactName,
      displayName: contactName,
      identities,
      contactType: {
        id: '3875c12e-fdaa-4ef6-a340-c936e054b627',
        origin: PartyOrigin.EXTERNAL,
        type: PartyTypeType.ORGANIZATION,
        name: 'Sphereon_default_type',
        tenantId: '95e09cfc-c974-4174-86aa-7bf1d5251fb4',
      },
    })

    siopv2Machine.send({
      type: Siopv2MachineEvents.SET_CONTACT_CONSENT,
      data: true,
    })
    siopv2Machine.send({
      type: Siopv2MachineEvents.SET_CONTACT_ALIAS,
      data: correlationId,
    })
    siopv2Machine.send({
      type: Siopv2MachineEvents.CREATE_CONTACT,
      data: party,
    })
  } catch (error) {
    abortController.abort(`Add contact failed`)
    throw Error(`Unable to create contact. Error: ${error}`)
  }
}

const selectCredentials = async (siopv2Machine: Siopv2MachineInterpreter, state: Siopv2MachineState) => {
  if (!state.changed) {
    return
  }

  const {abortController, handlers} = createAbortControllerWithBackNextHandlers(siopv2Machine)
  const {onNext, onBack} = handlers

  return navigateInformationRequest({
    siopv2Machine,
    state,
    onNext,
    onBack,
    abortController,
  })
}

const handleError = async (siopv2Machine: Siopv2MachineInterpreter, state: Siopv2MachineState) => {
  const {abortController, handlers} = createAbortControllerWithBackNextHandlers(siopv2Machine)
  const {onNext, onBack} = handlers
  return navigateError({siopv2Machine, state, onNext, onBack, abortController})
}

const final = async (siopv2Machine: Siopv2MachineInterpreter, state: Siopv2MachineState) => {
  if (!state.changed) {
    return
  }
  if (state.context.error) {
    console.log(`State context container error:`)
    console.log(state.context.error)
  }

  const {abortController, handlers} = createAbortControllerWithBackNextHandlers(siopv2Machine)
  const {onNext, onBack} = handlers
  return navigateFinal({siopv2Machine, state, onNext, onBack, abortController})
}

export const vpStateCallbacks = new Map<Siopv2MachineStates, (oid4vpMachine: Siopv2MachineInterpreter, state: Siopv2MachineState) => Promise<void>>()
vpStateCallbacks.set(Siopv2MachineStates.selectCredentials, selectCredentials)
vpStateCallbacks.set(Siopv2MachineStates.createConfig, showLoading)
vpStateCallbacks.set(Siopv2MachineStates.getSiopRequest, showLoading)
vpStateCallbacks.set(Siopv2MachineStates.sendResponse, showLoading)
vpStateCallbacks.set(Siopv2MachineStates.getSelectableCredentials, showLoading)
vpStateCallbacks.set(Siopv2MachineStates.retrieveContact, showLoading)
vpStateCallbacks.set(Siopv2MachineStates.addContact, addContact)
vpStateCallbacks.set(Siopv2MachineStates.handleError, handleError)
vpStateCallbacks.set(Siopv2MachineStates.done, final)
vpStateCallbacks.set(Siopv2MachineStates.error, handleError)
vpStateCallbacks.set(Siopv2MachineStates.aborted, final)
vpStateCallbacks.set(Siopv2MachineStates.declined, final)
