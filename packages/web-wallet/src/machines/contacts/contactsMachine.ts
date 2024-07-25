import {assign, createMachine} from 'xstate'
import {
  NaturalPersonEventTypes,
  NaturalPersonMachineEvents,
  NaturalPersonMachineStates,
  EmailAddressEvent,
  FirstNameEvent,
  CreateNaturalPersonMachineOpts,
  NaturalPersonMachineContext,
  LastNameEvent,
  NaturalPersonGuards,
  PhoneNumberEvent,
  NaturalPersonOrganizationEvent,
  MiddleNameEvent,
  StreetNameNaturalPersonContactEvent,
  StreetNumberNaturalPersonContactEvent,
  CityNameNaturalPersonContactEvent,
  PostalCodeNaturalPersonContactEvent,
  CountryCodeNaturalPersonContactEvent,
  BuildingNameNaturalPersonContactEvent,
  ProvinceNameNaturalPersonContactEvent,
} from '@typings'

export const naturalPersonPersonalDataGuard = (ctx: NaturalPersonMachineContext, _event: NaturalPersonEventTypes) => {
  return !!ctx.firstName && !!ctx.lastName && !!ctx.emailAddress && !!ctx.phoneNumber
}

export const naturalPersonPhysicalAddressGuard = (ctx: NaturalPersonMachineContext, _event: NaturalPersonEventTypes) => {
  return !!ctx.streetName && !!ctx.streetNumber && !!ctx.postalCode && !!ctx.cityName && !!ctx.provinceName && !!ctx.countryCode
}

const CONTACT_MACHINE_ID = 'contactMachine'
export const naturalPersonMachine = (opts?: CreateNaturalPersonMachineOpts) => {
  const initialContext: NaturalPersonMachineContext = {
    firstName: '',
    middleName: '',
    lastName: '',
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
  return createMachine<NaturalPersonMachineContext, NaturalPersonEventTypes>({
    id: opts?.machineId ?? CONTACT_MACHINE_ID,
    predictableActionArguments: true,
    initial: NaturalPersonMachineStates.enterPersonalData,
    schema: {
      events: {} as NaturalPersonEventTypes,
      guards: {} as
        | {
            type: NaturalPersonGuards.naturalPersonPersonalDataGuard
          }
        | {
            type: NaturalPersonGuards.naturalPersonPhysicalAddressGuard
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
      [NaturalPersonMachineStates.enterPersonalData]: {
        on: {
          [NaturalPersonMachineEvents.SET_FIRST_NAME]: {
            actions: assign({firstName: (_ctx, e: FirstNameEvent) => e.data}),
          },
          [NaturalPersonMachineEvents.SET_MIDDLE_NAME]: {
            actions: assign({middleName: (_ctx, e: MiddleNameEvent) => e.data}),
          },
          [NaturalPersonMachineEvents.SET_LAST_NAME]: {
            actions: assign({lastName: (_ctx, e: LastNameEvent) => e.data}),
          },
          [NaturalPersonMachineEvents.SET_EMAIL_ADDRESS]: {
            actions: assign({emailAddress: (_ctx, e: EmailAddressEvent) => e.data}),
          },
          [NaturalPersonMachineEvents.SET_PHONE_NUMBER]: {
            actions: assign({phoneNumber: (_ctx, e: PhoneNumberEvent) => e.data}),
          },
          [NaturalPersonMachineEvents.NEXT]: {
            target: NaturalPersonMachineStates.enterPhysicalAddress,
            cond: NaturalPersonGuards.naturalPersonPersonalDataGuard,
          },
          [NaturalPersonMachineEvents.PREVIOUS]: {
            target: NaturalPersonMachineStates.aborted,
          },
        },
      },
      [NaturalPersonMachineStates.enterPhysicalAddress]: {
        on: {
          [NaturalPersonMachineEvents.SET_STREET_NAME]: {
            actions: assign({streetName: (_ctx, e: StreetNameNaturalPersonContactEvent) => e.data}),
          },
          [NaturalPersonMachineEvents.SET_STREET_NUMBER]: {
            actions: assign({streetNumber: (_ctx, e: StreetNumberNaturalPersonContactEvent) => e.data}),
          },
          [NaturalPersonMachineEvents.SET_CITY_NAME]: {
            actions: assign({cityName: (_ctx, e: CityNameNaturalPersonContactEvent) => e.data}),
          },
          [NaturalPersonMachineEvents.SET_POSTAL_CODE]: {
            actions: assign({postalCode: (_ctx, e: PostalCodeNaturalPersonContactEvent) => e.data}),
          },
          [NaturalPersonMachineEvents.SET_COUNTRY_CODE]: {
            actions: assign({countryCode: (_ctx, e: CountryCodeNaturalPersonContactEvent) => e.data}),
          },
          [NaturalPersonMachineEvents.SET_BUILDING_NAME]: {
            actions: assign({buildingName: (_ctx, e: BuildingNameNaturalPersonContactEvent) => e.data}),
          },
          [NaturalPersonMachineEvents.SET_PROVINCE_NAME]: {
            actions: assign({provinceName: (_ctx, e: ProvinceNameNaturalPersonContactEvent) => e.data}),
          },
          [NaturalPersonMachineEvents.NEXT]: {
            target: NaturalPersonMachineStates.addOrganization,
            cond: NaturalPersonGuards.naturalPersonPhysicalAddressGuard,
          },
          [NaturalPersonMachineEvents.PREVIOUS]: {
            target: NaturalPersonMachineStates.enterPersonalData,
          },
        },
      },
      [NaturalPersonMachineStates.addOrganization]: {
        on: {
          [NaturalPersonMachineEvents.SET_ORGANIZATION]: {
            actions: assign({organization: (_ctx, e: NaturalPersonOrganizationEvent) => e.data}),
          },
          [NaturalPersonMachineEvents.NEXT]: {
            target: NaturalPersonMachineStates.addRole,
          },
          [NaturalPersonMachineEvents.PREVIOUS]: {
            target: NaturalPersonMachineStates.enterPersonalData,
          },
        },
      },
      [NaturalPersonMachineStates.addRole]: {
        on: {
          [NaturalPersonMachineEvents.NEXT]: {
            target: NaturalPersonMachineStates.reviewContact,
          },
          [NaturalPersonMachineEvents.PREVIOUS]: {
            target: NaturalPersonMachineStates.addOrganization,
          },
        },
      },
      [NaturalPersonMachineStates.reviewContact]: {
        on: {
          [NaturalPersonMachineEvents.NEXT]: {
            target: NaturalPersonMachineStates.storeContact,
          },
          [NaturalPersonMachineEvents.PREVIOUS]: {
            target: NaturalPersonMachineStates.addRole,
          },
        },
      },
      [NaturalPersonMachineStates.storeContact]: {
        invoke: {
          id: NaturalPersonMachineStates.storeContact,
          src: NaturalPersonMachineStates.storeContact,
          onDone: {
            target: NaturalPersonMachineStates.done,
          },
          onError: {
            target: NaturalPersonMachineStates.error,
            actions: assign({error: (_ctx, e) => e.data}),
          },
        },
      },
      [NaturalPersonMachineStates.done]: {
        type: 'final',
        id: NaturalPersonMachineStates.done,
      },
      [NaturalPersonMachineStates.error]: {
        type: 'final',
        id: NaturalPersonMachineStates.error,
      },
      [NaturalPersonMachineStates.aborted]: {
        type: 'final',
        id: NaturalPersonMachineStates.aborted,
      },
    },
  })
}
