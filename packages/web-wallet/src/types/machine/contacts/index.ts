import {Interpreter, State, StateMachine} from 'xstate'
import {ChangeEvent, createContext, ReactNode, useContext} from 'react'
import {NavigateFunction, useOutletContext} from 'react-router-dom'
import {Party} from '@sphereon/ssi-sdk.data-store'
import {UIContextType} from '../general'

export enum NaturalPersonMachineEvents {
  ABORT = 'ABORT',
  NEXT = 'NEXT',
  PREVIOUS = 'PREVIOUS',
  SET_FIRST_NAME = 'SET_FIRST_NAME',
  SET_MIDDLE_NAME = 'SET_MIDDLE_NAME',
  SET_LAST_NAME = 'SET_LAST_NAME',
  SET_EMAIL_ADDRESS = 'SET_EMAIL_ADDRESS',
  SET_PHONE_NUMBER = 'SET_PHONE_NUMBER',
  SET_ROLE = 'SET_ROLE',
  SET_ORGANIZATION = 'SET_ORGANIZATION',
  SET_STREET_NAME = 'SET_STREET_NAME',
  SET_STREET_NUMBER = 'SET_STREET_NUMBER',
  SET_POSTAL_CODE = 'SET_POSTAL_CODE',
  SET_CITY_NAME = 'SET_CITY_NAME',
  SET_PROVINCE_NAME = 'SET_PROVINCE_NAME',
  SET_COUNTRY_CODE = 'SET_COUNTRY_CODE',
  SET_BUILDING_NAME = 'SET_BUILDING_NAME',
}

export enum NaturalPersonMachineStates {
  enterPersonalData = 'enterPersonalData',
  enterPhysicalAddress = 'enterPhysicalAddress',
  addOrganization = 'addOrganization',
  addRole = 'addRole',
  reviewContact = 'reviewContact',
  storeContact = 'storeContact',
  done = 'done',
  aborted = 'aborted',
  error = 'error',
}

export enum NaturalPersonGuards {
  naturalPersonPersonalDataGuard = 'naturalPersonPersonalDataGuard',
  naturalPersonPhysicalAddressGuard = 'naturalPersonPhysicalAddressGuard',
}

export type NaturalPersonData = {
  firstName: string
  middleName?: string
  lastName: string
  emailAddress: string
  phoneNumber: string
  organization?: Party
  streetName: string
  streetNumber: string
  postalCode: string
  cityName: string
  provinceName: string
  countryCode: string
  buildingName?: string
}

export type CreateNaturalPersonMachineOpts = {
  machineId?: string
}

export type InstanceContactMachineOpts = CreateNaturalPersonMachineOpts & {
  machine: StateMachine<NaturalPersonMachineContext, any, NaturalPersonEventTypes>
  navigate: NavigateFunction
  services?: any
  guards?: any
  subscription?: () => void
  requireCustomNavigationHook?: boolean
}

export type ContactInterpretType = Interpreter<
  NaturalPersonMachineContext,
  any,
  NaturalPersonEventTypes,
  {
    value: any
    context: NaturalPersonMachineContext
  },
  any
>

export type AbortNaturalPersonEvent = {type: NaturalPersonMachineEvents.ABORT}
export type PreviousEvent = {type: NaturalPersonMachineEvents.PREVIOUS; data?: any}
export type NextEvent = {type: NaturalPersonMachineEvents.NEXT; data?: any}
export type FirstNameEvent = {type: NaturalPersonMachineEvents.SET_FIRST_NAME; data: string}
export type MiddleNameEvent = {type: NaturalPersonMachineEvents.SET_MIDDLE_NAME; data: string}
export type LastNameEvent = {type: NaturalPersonMachineEvents.SET_LAST_NAME; data: string}
export type EmailAddressEvent = {type: NaturalPersonMachineEvents.SET_EMAIL_ADDRESS; data: string}
export type PhoneNumberEvent = {type: NaturalPersonMachineEvents.SET_PHONE_NUMBER; data: string}
export type NaturalPersonOrganizationEvent = {type: NaturalPersonMachineEvents.SET_ORGANIZATION; data: Party}
export type NaturalPersonRoleEvent = {type: NaturalPersonMachineEvents.SET_ROLE; data: any}
export type StreetNameNaturalPersonContactEvent = {type: NaturalPersonMachineEvents.SET_STREET_NAME; data: string}
export type StreetNumberNaturalPersonContactEvent = {type: NaturalPersonMachineEvents.SET_STREET_NUMBER; data: string}
export type PostalCodeNaturalPersonContactEvent = {type: NaturalPersonMachineEvents.SET_POSTAL_CODE; data: string}
export type CityNameNaturalPersonContactEvent = {type: NaturalPersonMachineEvents.SET_CITY_NAME; data: string}
export type ProvinceNameNaturalPersonContactEvent = {type: NaturalPersonMachineEvents.SET_PROVINCE_NAME; data: string}
export type CountryCodeNaturalPersonContactEvent = {type: NaturalPersonMachineEvents.SET_COUNTRY_CODE; data: string}
export type BuildingNameNaturalPersonContactEvent = {type: NaturalPersonMachineEvents.SET_BUILDING_NAME; data: string}

export type NaturalPersonEventTypes =
  | AbortNaturalPersonEvent
  | NextEvent
  | PreviousEvent
  | FirstNameEvent
  | MiddleNameEvent
  | LastNameEvent
  | EmailAddressEvent
  | PhoneNumberEvent
  | NaturalPersonOrganizationEvent
  | NaturalPersonRoleEvent
  | StreetNameNaturalPersonContactEvent
  | StreetNumberNaturalPersonContactEvent
  | PostalCodeNaturalPersonContactEvent
  | CityNameNaturalPersonContactEvent
  | ProvinceNameNaturalPersonContactEvent
  | CountryCodeNaturalPersonContactEvent
  | BuildingNameNaturalPersonContactEvent

export type NaturalPersonState = State<
  NaturalPersonMachineContext,
  NaturalPersonEventTypes,
  any,
  {value: any; context: NaturalPersonMachineContext},
  any
>

export type NaturalPersonContextType = {
  onFirstNameChanged: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  onMiddleNameChanged: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  onLastNameChanged: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  onEmailAddressChanged: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  onPhoneNumberChanged: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  onSetOrganization: (organization: Party | undefined) => Promise<void>
  onStreetNameNameChanged: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  onStreetNumberChanged: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  onPostalCodeChanged: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  onCityNameChanged: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  onProvinceNameChanged: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  onCountryCodeChanged: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  onBuildingNameChanged: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  // TODO step 3 https://sphereon.atlassian.net/browse/DPP-124
  onSetRole: (role: any) => Promise<void>
}

export type ContactContextType = UIContextType &
  NaturalPersonContextType & {
    context: NaturalPersonMachineContext
  }

export type NaturalPersonMachineContext = {
  firstName: string
  middleName: string
  lastName: string
  emailAddress: string
  phoneNumber: string
  organization?: Party
  streetName: string
  streetNumber: string
  postalCode: string
  cityName: string
  provinceName: string
  countryCode: string
  buildingName: string
  role?: any
  error?: any
}

export const NaturalPersonContext = createContext({} as ContactContextType)
export const useNaturalPersonMachine = () => useContext(NaturalPersonContext)
export const useNaturalPersonOutletContext = () => useOutletContext<ContactContextType>()

export type NaturalPersonProviderProps = {
  children?: ReactNode
  customContactsInstance?: ContactInterpretType
  opts?: InstanceContactMachineOpts
}

export type CreateOrganizationContactMachineOpts = {
  machineId?: string
}

export type OrganizationContactMachineContext = {
  legalName: string
  displayName: string
  emailAddress: string
  phoneNumber: string
  streetName: string
  streetNumber: string
  postalCode: string
  cityName: string
  provinceName: string
  countryCode: string
  buildingName: string
  error?: any
}

export enum OrganizationContactMachineEvents {
  ABORT = 'ABORT',
  NEXT = 'NEXT',
  PREVIOUS = 'PREVIOUS',
  SET_LEGAL_NAME = 'SET_LEGAL_NAME',
  SET_DISPLAY_NAME = 'SET_DISPLAY_NAME',
  SET_EMAIL_ADDRESS = 'SET_EMAIL_ADDRESS',
  SET_PHONE_NUMBER = 'SET_PHONE_NUMBER',
  SET_STREET_NAME = 'SET_STREET_NAME',
  SET_STREET_NUMBER = 'SET_STREET_NUMBER',
  SET_POSTAL_CODE = 'SET_POSTAL_CODE',
  SET_CITY_NAME = 'SET_CITY_NAME',
  SET_PROVINCE_NAME = 'SET_PROVINCE_NAME',
  SET_COUNTRY_CODE = 'SET_COUNTRY_CODE',
  SET_BUILDING_NAME = 'SET_BUILDING_NAME',
}

export type AbortOrganizationContactEvent = {type: OrganizationContactMachineEvents.ABORT}
export type PreviousOrganizationContactEvent = {type: OrganizationContactMachineEvents.PREVIOUS; data?: any}
export type NextOrganizationContactEvent = {type: OrganizationContactMachineEvents.NEXT; data?: any}
export type LegalNameOrganizationContactEvent = {type: OrganizationContactMachineEvents.SET_LEGAL_NAME; data: string}
export type DisplayNameOrganizationContactEvent = {type: OrganizationContactMachineEvents.SET_DISPLAY_NAME; data: string}
export type EmailAddressOrganizationContactEvent = {type: OrganizationContactMachineEvents.SET_EMAIL_ADDRESS; data: string}
export type PhoneNumberOrganizationContactEvent = {type: OrganizationContactMachineEvents.SET_PHONE_NUMBER; data: string}
export type StreetNameOrganizationContactEvent = {type: OrganizationContactMachineEvents.SET_STREET_NAME; data: string}
export type StreetNumberOrganizationContactEvent = {type: OrganizationContactMachineEvents.SET_STREET_NUMBER; data: string}
export type PostalCodeOrganizationContactEvent = {type: OrganizationContactMachineEvents.SET_POSTAL_CODE; data: string}
export type CityNameOrganizationContactEvent = {type: OrganizationContactMachineEvents.SET_CITY_NAME; data: string}
export type ProvinceNameOrganizationContactEvent = {type: OrganizationContactMachineEvents.SET_PROVINCE_NAME; data: string}
export type CountryCodeOrganizationContactEvent = {type: OrganizationContactMachineEvents.SET_COUNTRY_CODE; data: string}
export type BuildingNameOrganizationContactEvent = {type: OrganizationContactMachineEvents.SET_BUILDING_NAME; data: string}

export type OrganizationContactMachineEventTypes =
  | AbortOrganizationContactEvent
  | NextOrganizationContactEvent
  | PreviousOrganizationContactEvent
  | LegalNameOrganizationContactEvent
  | DisplayNameOrganizationContactEvent
  | EmailAddressOrganizationContactEvent
  | PhoneNumberOrganizationContactEvent
  | StreetNameOrganizationContactEvent
  | StreetNumberOrganizationContactEvent
  | PostalCodeOrganizationContactEvent
  | CityNameOrganizationContactEvent
  | ProvinceNameOrganizationContactEvent
  | CountryCodeOrganizationContactEvent
  | BuildingNameOrganizationContactEvent

export enum OrganizationContactMachineStates {
  enterOrganizationalData = 'enterOrganizationalData',
  enterPhysicalAddress = 'enterPhysicalAddress',
  reviewContact = 'reviewContact',
  storeContact = 'storeContact',
  done = 'done',
  aborted = 'aborted',
  error = 'error',
}

export enum OrganizationContactMachineGuards {
  organizationalDataGuard = 'organizationalDataGuard',
  physicalAddressGuard = 'physicalAddressGuard',
}

export type OrganizationContactsMachineInterpretType = Interpreter<
  OrganizationContactMachineContext,
  any,
  OrganizationContactMachineEventTypes,
  {
    value: any
    context: OrganizationContactMachineContext
  },
  any
>

export type OrganizationContactsMachineState = State<
  OrganizationContactMachineContext,
  OrganizationContactMachineEventTypes,
  any,
  {
    value: any
    context: OrganizationContactMachineContext
  },
  any
>

export type OrganizationContactMachineProviderProps = {
  children?: ReactNode
  customContactsInstance?: OrganizationContactsMachineInterpretType
  opts?: InstanceOrganizationContactMachineOpts
}

export type InstanceOrganizationContactMachineOpts = CreateOrganizationContactMachineOpts & {
  machine: StateMachine<OrganizationContactMachineContext, any, OrganizationContactMachineEventTypes>
  navigate: NavigateFunction
  services?: any
  guards?: any
  subscription?: () => void
  requireCustomNavigationHook?: boolean
}

export const OrganizationContactContext = createContext({} as OrganizationContactContextType)

export type OrganizationContactContextType = UIContextType &
  OrganizationContactContext & {
    context: OrganizationContactMachineContext
  }

export type OrganizationContactContext = {
  onLegalNameChanged: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  onDisplayNameChanged: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  onEmailAddressChanged: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  onPhoneNumberChanged: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  onStreetNameNameChanged: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  onStreetNumberChanged: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  onPostalCodeChanged: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  onCityNameChanged: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  onProvinceNameChanged: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  onCountryCodeChanged: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  onBuildingNameChanged: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
}

export const useOrganizationContactMachine = () => useContext(OrganizationContactContext)

export const useOrganizationContactOutletContext = () => useOutletContext<OrganizationContactContextType>()
