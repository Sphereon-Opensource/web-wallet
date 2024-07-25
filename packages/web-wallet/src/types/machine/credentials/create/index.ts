import {Interpreter, State, StateMachine} from 'xstate'
import React, {createContext, ReactNode, useContext} from 'react'
import {NavigateFunction, useOutletContext} from 'react-router-dom'
import {Party} from '@sphereon/ssi-sdk.data-store'
import {UIContextType} from '@typings'

export enum CredentialCreateEvents {
  ABORT = 'ABORT',
  NEXT = 'NEXT',
  PREVIOUS = 'PREVIOUS',
  SET_FIRST_NAME = 'SET_FIRST_NAME',
  SET_LAST_NAME = 'SET_LAST_NAME',
  SET_EMAIL_ADDRESS = 'SET_EMAIL_ADDRESS',
  SET_PHONE_NUMBER = 'SET_PHONE_NUMBER',
  SET_ROLE = 'SET_ROLE',
  SET_ORGANIZATION = 'SET_ORGANIZATION',
}

export enum CredentialCreateMachineStates {
  enterPersonalData = 'enterPersonalData',
  addOrganization = 'addOrganization',
  addRole = 'addRole',
  reviewContact = 'reviewContact',
  storeContact = 'storeContact',
  done = 'done',
  aborted = 'aborted',
  error = 'error',
}

export enum CredentialCreateGuards {
  CredentialCreateDataGuard = 'CredentialCreateDataGuard',
}

export type CredentialCreateData = {
  firstName: string
  lastName: string
  emailAddress: string
  phoneNumber: string
  organization?: Party
}

export type CreateCredentialCreateMachineOpts = {
  machineId?: string
}

export type InstanceCredentialCreateMachineOpts = CreateCredentialCreateMachineOpts & {
  machine: StateMachine<CredentialCreateMachineContext, any, CredentialCreateEventTypes>
  navigate: NavigateFunction
  services?: any
  guards?: any
  subscription?: () => void
  requireCustomNavigationHook?: boolean
}

export type CredentialCreateInterpretType = Interpreter<
  CredentialCreateMachineContext,
  any,
  CredentialCreateEventTypes,
  {
    value: any
    context: CredentialCreateMachineContext
  },
  any
>

export type AbortEvent = {type: CredentialCreateEvents.ABORT}
export type PreviousEvent = {type: CredentialCreateEvents.PREVIOUS; data?: any}
export type NextEvent = {type: CredentialCreateEvents.NEXT; data?: any}
export type FirstNameEvent = {type: CredentialCreateEvents.SET_FIRST_NAME; data: string}
export type LastNameEvent = {type: CredentialCreateEvents.SET_LAST_NAME; data: string}
export type EmailAddressEvent = {type: CredentialCreateEvents.SET_EMAIL_ADDRESS; data: string}
export type PhoneNumberEvent = {type: CredentialCreateEvents.SET_PHONE_NUMBER; data: string}
export type CredentialCreateOrganizationEvent = {type: CredentialCreateEvents.SET_ORGANIZATION; data: Party}
export type CredentialCreateRoleEvent = {type: CredentialCreateEvents.SET_ROLE; data: any}
export type CredentialCreateEventTypes =
  | AbortEvent
  | NextEvent
  | PreviousEvent
  | FirstNameEvent
  | LastNameEvent
  | EmailAddressEvent
  | PhoneNumberEvent
  | CredentialCreateOrganizationEvent
  | CredentialCreateRoleEvent
export type CredentialCreateState = State<
  CredentialCreateMachineContext,
  CredentialCreateEventTypes,
  any,
  {value: any; context: CredentialCreateMachineContext},
  any
>

export type CredentialCreateContextType = {
  onFirstNameChanged: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  onLastNameChanged: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  onEmailAddressChanged: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  onPhoneNumberChanged: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  onSetOrganization: (organization: Party | undefined) => Promise<void>
  // TODO step 3 https://sphereon.atlassian.net/browse/DPP-124
  onSetRole: (role: any) => Promise<void>
}

export type CredentialContextType = UIContextType &
  CredentialCreateContextType & {
    context: CredentialCreateMachineContext
  }

export type CredentialCreateMachineContext = {
  firstName: string
  lastName: string
  emailAddress: string
  phoneNumber: string
  organization?: Party
  role?: any
  error?: any
}

export const CredentialCreateContext = createContext({} as CredentialContextType)
export const useCredentialCreateMachine = () => useContext(CredentialCreateContext)
export const useCredentialCreateOutletContext = () => useOutletContext<CredentialContextType>()

export type CredentialCreateProviderProps = {
  children?: ReactNode
  customContactsInstance?: CredentialCreateInterpretType
  opts?: InstanceCredentialCreateMachineOpts
}
