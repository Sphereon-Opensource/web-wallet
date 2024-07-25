import {assign, createMachine} from 'xstate'
import {
  CreateOrganizationContactMachineOpts,
  OrganizationContactMachineContext,
  OrganizationContactMachineEventTypes,
  OrganizationContactMachineStates,
  OrganizationContactMachineEvents,
  LegalNameOrganizationContactEvent,
  EmailAddressOrganizationContactEvent,
  PhoneNumberOrganizationContactEvent,
  OrganizationContactMachineGuards,
  StreetNameOrganizationContactEvent,
  StreetNumberOrganizationContactEvent,
  PostalCodeOrganizationContactEvent,
  CityNameOrganizationContactEvent,
  CountryCodeOrganizationContactEvent,
  BuildingNameOrganizationContactEvent,
  ProvinceNameOrganizationContactEvent,
  DisplayNameOrganizationContactEvent,
} from '@typings'

export const organizationalDataGuard = (ctx: OrganizationContactMachineContext, _event: OrganizationContactMachineEventTypes) => {
  return !!ctx.legalName && !!ctx.displayName && !!ctx.emailAddress && !!ctx.phoneNumber
}

export const physicalAddressGuard = (ctx: OrganizationContactMachineContext, _event: OrganizationContactMachineEventTypes) => {
  return !!ctx.streetName && !!ctx.streetNumber && !!ctx.postalCode && !!ctx.cityName && !!ctx.provinceName && !!ctx.countryCode
}

const CONTACT_MACHINE_ID = 'organizationContactMachine'
export const organizationContactMachine = (opts?: CreateOrganizationContactMachineOpts) => {
  const initialContext: OrganizationContactMachineContext = {
    legalName: '',
    displayName: '',
    emailAddress: '',
    phoneNumber: '',
    streetName: '',
    streetNumber: '',
    postalCode: '',
    cityName: '',
    provinceName: '',
    countryCode: '',
    buildingName: '',
  }
  return createMachine<OrganizationContactMachineContext, OrganizationContactMachineEventTypes>({
    id: opts?.machineId ?? CONTACT_MACHINE_ID,
    predictableActionArguments: true,
    initial: OrganizationContactMachineStates.enterOrganizationalData,
    schema: {
      events: {} as OrganizationContactMachineEventTypes,
      guards: {} as {
        type: OrganizationContactMachineGuards.organizationalDataGuard
      },
      services: {} as {
        persistContact: {
          data: void
        }
      },
    },
    context: {
      ...initialContext,
    },
    states: {
      [OrganizationContactMachineStates.enterOrganizationalData]: {
        on: {
          [OrganizationContactMachineEvents.SET_LEGAL_NAME]: {
            actions: assign({legalName: (_ctx, e: LegalNameOrganizationContactEvent) => e.data}),
          },
          [OrganizationContactMachineEvents.SET_DISPLAY_NAME]: {
            actions: assign({displayName: (_ctx, e: DisplayNameOrganizationContactEvent) => e.data}),
          },
          [OrganizationContactMachineEvents.SET_EMAIL_ADDRESS]: {
            actions: assign({emailAddress: (_ctx, e: EmailAddressOrganizationContactEvent) => e.data}),
          },
          [OrganizationContactMachineEvents.SET_PHONE_NUMBER]: {
            actions: assign({phoneNumber: (_ctx, e: PhoneNumberOrganizationContactEvent) => e.data}),
          },
          [OrganizationContactMachineEvents.NEXT]: {
            target: OrganizationContactMachineStates.enterPhysicalAddress,
            cond: OrganizationContactMachineGuards.organizationalDataGuard,
          },
          [OrganizationContactMachineEvents.PREVIOUS]: {
            target: OrganizationContactMachineStates.aborted,
          },
        },
      },
      [OrganizationContactMachineStates.enterPhysicalAddress]: {
        on: {
          [OrganizationContactMachineEvents.SET_STREET_NAME]: {
            actions: assign({streetName: (_ctx, e: StreetNameOrganizationContactEvent) => e.data}),
          },
          [OrganizationContactMachineEvents.SET_STREET_NUMBER]: {
            actions: assign({streetNumber: (_ctx, e: StreetNumberOrganizationContactEvent) => e.data}),
          },
          [OrganizationContactMachineEvents.SET_CITY_NAME]: {
            actions: assign({cityName: (_ctx, e: CityNameOrganizationContactEvent) => e.data}),
          },
          [OrganizationContactMachineEvents.SET_POSTAL_CODE]: {
            actions: assign({postalCode: (_ctx, e: PostalCodeOrganizationContactEvent) => e.data}),
          },
          [OrganizationContactMachineEvents.SET_COUNTRY_CODE]: {
            actions: assign({countryCode: (_ctx, e: CountryCodeOrganizationContactEvent) => e.data}),
          },
          [OrganizationContactMachineEvents.SET_BUILDING_NAME]: {
            actions: assign({buildingName: (_ctx, e: BuildingNameOrganizationContactEvent) => e.data}),
          },
          [OrganizationContactMachineEvents.SET_PROVINCE_NAME]: {
            actions: assign({provinceName: (_ctx, e: ProvinceNameOrganizationContactEvent) => e.data}),
          },
          [OrganizationContactMachineEvents.NEXT]: {
            target: OrganizationContactMachineStates.reviewContact,
            cond: OrganizationContactMachineGuards.physicalAddressGuard,
          },
          [OrganizationContactMachineEvents.PREVIOUS]: {
            target: OrganizationContactMachineStates.enterOrganizationalData,
          },
        },
      },
      [OrganizationContactMachineStates.reviewContact]: {
        on: {
          [OrganizationContactMachineEvents.NEXT]: {
            target: OrganizationContactMachineStates.storeContact,
          },
          [OrganizationContactMachineEvents.PREVIOUS]: {
            target: OrganizationContactMachineStates.aborted,
          },
        },
      },
      [OrganizationContactMachineStates.storeContact]: {
        invoke: {
          id: OrganizationContactMachineStates.storeContact,
          src: OrganizationContactMachineStates.storeContact,
          onDone: {
            target: OrganizationContactMachineStates.done,
          },
          onError: {
            target: OrganizationContactMachineStates.error,
            actions: assign({error: (_ctx, e) => e.data}),
          },
        },
      },
      [OrganizationContactMachineStates.done]: {
        type: 'final',
        id: OrganizationContactMachineStates.done,
      },
      [OrganizationContactMachineStates.error]: {
        type: 'final',
        id: OrganizationContactMachineStates.error,
      },
      [OrganizationContactMachineStates.aborted]: {
        type: 'final',
        id: OrganizationContactMachineStates.aborted,
      },
    },
  })
}
