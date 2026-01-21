import React, {useCallback, useEffect, useMemo, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {useTranslate} from '@refinedev/core'
import {useInterpret} from '@xstate/react'
import type {Party} from '@sphereon/ssi-sdk.data-store-types'
import {naturalPersonMachine, naturalPersonPersonalDataGuard, naturalPersonPhysicalAddressGuard} from './contactsMachine'
import {storeContact} from '../../services/contactService'
import {
  NaturalPersonContext,
  ContactInterpretType,
  NaturalPersonMachineEvents,
  NaturalPersonMachineStates,
  NaturalPersonProviderProps,
  NaturalPersonState,
  NaturalPersonCreationRoute,
  MainRoute,
} from '@typings'

const naturalPersonStateNavigationListener = async (
  contactMachine: ContactInterpretType,
  state: NaturalPersonState,
  navigate: any,
): Promise<void> => {
  if (state.matches(NaturalPersonMachineStates.enterPersonalData)) {
    return navigate(NaturalPersonCreationRoute.PERSONAL_INFO)
  } else if (state.matches(NaturalPersonMachineStates.enterPhysicalAddress)) {
    return navigate(NaturalPersonCreationRoute.PHYSICAL_ADDRESS)
  } else if (state.matches(NaturalPersonMachineStates.addOrganization)) {
    return navigate(NaturalPersonCreationRoute.ORGANIZATION)
  } else if (state.matches(NaturalPersonMachineStates.addRole)) {
    return navigate(NaturalPersonCreationRoute.ROLE)
  } else if (state.matches(NaturalPersonMachineStates.reviewContact)) {
    return navigate(NaturalPersonCreationRoute.REVIEW)
  } else if (
    state.matches(NaturalPersonMachineStates.done) ||
    state.matches(NaturalPersonMachineStates.aborted) ||
    state.matches(NaturalPersonMachineStates.error)
  ) {
    contactMachine.stop()
    return navigate(MainRoute.CONTACTS)
  }
}

export const NaturalPersonContextProvider = (props: NaturalPersonProviderProps): JSX.Element => {
  const {children} = props
  const navigate = useNavigate()
  const translate = useTranslate()

  // Memoize the machine to prevent recreation on every render
  const machine = useMemo(() => naturalPersonMachine(), [])

  const instance = useInterpret(machine, {
    services: {
      storeContact: async () => {
        return storeNaturalPerson()
      },
    },
    guards: {
      naturalPersonPersonalDataGuard,
      naturalPersonPhysicalAddressGuard,
    },
  })
  const [disabled, setDisabled] = useState<boolean>(true)
  const [step, setStep] = useState<number>(1)
  const [machineContext, setMachineContext] = useState(instance.getSnapshot().context)
  const maxInteractiveSteps: number = 5
  const maxAutoSteps: number = 1

  const storeNaturalPerson: () => Promise<void> = useCallback(async (): Promise<void> => {
    const {
      firstName,
      middleName,
      lastName,
      emailAddress,
      phoneNumber,
      organization,
      buildingName,
      cityName,
      countryCode,
      postalCode,
      provinceName,
      streetName,
      streetNumber,
    } = instance.getSnapshot().context
    if (!firstName || !firstName.length) {
      throw new Error(translate('contact_create_first_name_error_message'))
    }
    if (!lastName || !lastName.length) {
      throw new Error(translate('contact_create_last_name_error_message'))
    }
    if (!emailAddress || !emailAddress.length) {
      throw new Error(translate('contact_create_email_address_error_message'))
    }
    if (!phoneNumber || !phoneNumber.length) {
      throw new Error(translate('contact_create_phone_number_error_message'))
    }
    if (!streetName || !streetName.length) {
      throw new Error(translate('contact_create_street_name_error_message'))
    }
    if (!streetNumber || !streetNumber.length) {
      throw new Error(translate('contact_create_street_number_error_message'))
    }
    if (!cityName || !cityName.length) {
      throw new Error(translate('contact_create_city_name_error_message'))
    }
    if (!countryCode || !countryCode.length) {
      throw new Error(translate('contact_create_country_code_error_message'))
    }
    if (!postalCode || !postalCode.length) {
      throw new Error(translate('contact_create_postal_code_error_message'))
    }
    if (!provinceName || !provinceName.length) {
      throw new Error(translate('contact_create_province_name_error_message'))
    }
    await storeContact({
      firstName,
      middleName: middleName === '' ? undefined : middleName,
      lastName,
      emailAddress,
      phoneNumber,
      organization,
      buildingName: buildingName === '' ? undefined : buildingName,
      cityName,
      countryCode,
      postalCode,
      provinceName,
      streetName,
      streetNumber,
    })
  }, [instance])

  useEffect(() => {
    instance.onTransition((state: NaturalPersonState) => {
      void naturalPersonStateNavigationListener(instance, state, navigate)
    })
    instance.subscribe((state: NaturalPersonState) => {
      setDisabled(!state.can(NaturalPersonMachineEvents.NEXT))
      setMachineContext(state.context)
    })
    const handlePopstate = () => {
      const nextStep: number = step - 1
      if (step > 0) {
        instance.send(NaturalPersonMachineEvents.PREVIOUS)
        setStep(nextStep)
      } else {
        instance.send(NaturalPersonMachineEvents.ABORT)
      }
    }
    window.addEventListener('popstate', handlePopstate)
    return () => {
      window.removeEventListener('popstate', handlePopstate)
    }
  }, [instance, step])

  const onNext = useCallback(async (): Promise<void> => {
    const nextStep: number = step + 1
    if (nextStep <= maxInteractiveSteps + maxAutoSteps) {
      instance.send(NaturalPersonMachineEvents.NEXT)
      setStep(nextStep)
    }
  }, [step, instance])

  const onBack = useCallback(async (): Promise<void> => {
    const nextStep: number = step - 1
    if (nextStep >= 1) {
      setStep(nextStep)
    }
    instance.send(NaturalPersonMachineEvents.PREVIOUS)
  }, [step, instance])

  const onFirstNameChanged = useCallback(
    async (value: string): Promise<void> => {
      instance.send(NaturalPersonMachineEvents.SET_FIRST_NAME, {data: value})
    },
    [instance],
  )
  const onMiddleNameChanged = useCallback(async (value: string): Promise<void> => {
    instance.send(NaturalPersonMachineEvents.SET_MIDDLE_NAME, {data: value})
  }, [])
  const onLastNameChanged = useCallback(
    async (value: string): Promise<void> => {
      instance.send(NaturalPersonMachineEvents.SET_LAST_NAME, {data: value})
    },
    [instance],
  )
  const onEmailAddressChanged = useCallback(
    async (value: string): Promise<void> => {
      instance.send(NaturalPersonMachineEvents.SET_EMAIL_ADDRESS, {data: value})
    },
    [instance],
  )
  const onPhoneNumberChanged = useCallback(
    async (value: string): Promise<void> => {
      instance.send(NaturalPersonMachineEvents.SET_PHONE_NUMBER, {data: value})
    },
    [instance],
  )
  const onRoleAssigned = useCallback(
    async (value: string): Promise<void> => {
      instance.send(NaturalPersonMachineEvents.SET_ROLE, {data: value})
    },
    [instance],
  )
  const onOrganizationAssigned = useCallback(
    async (selectedOrganization: Party | undefined): Promise<void> => {
      instance.send(NaturalPersonMachineEvents.SET_ORGANIZATION, {data: selectedOrganization})
    },
    [instance],
  )
  const onStreetNameNameChanged = useCallback(async (value: string): Promise<void> => {
    instance.send(NaturalPersonMachineEvents.SET_STREET_NAME, {data: value})
  }, [])
  const onStreetNumberChanged = useCallback(async (value: string): Promise<void> => {
    instance.send(NaturalPersonMachineEvents.SET_STREET_NUMBER, {data: value})
  }, [])
  const onPostalCodeChanged = useCallback(async (value: string): Promise<void> => {
    instance.send(NaturalPersonMachineEvents.SET_POSTAL_CODE, {data: value})
  }, [])
  const onCityNameChanged = useCallback(async (value: string): Promise<void> => {
    instance.send(NaturalPersonMachineEvents.SET_CITY_NAME, {data: value})
  }, [])
  const onProvinceNameChanged = useCallback(async (value: string): Promise<void> => {
    instance.send(NaturalPersonMachineEvents.SET_PROVINCE_NAME, {data: value})
  }, [])
  const onCountryCodeChanged = useCallback(async (value: string): Promise<void> => {
    instance.send(NaturalPersonMachineEvents.SET_COUNTRY_CODE, {data: value})
  }, [])
  const onBuildingNameChanged = useCallback(async (value: string): Promise<void> => {
    instance.send(NaturalPersonMachineEvents.SET_BUILDING_NAME, {data: value})
  }, [])

  return (
    <NaturalPersonContext.Provider
      value={{
        onBack,
        onNext,
        onFirstNameChanged,
        onMiddleNameChanged,
        onLastNameChanged,
        onEmailAddressChanged,
        onPhoneNumberChanged,
        onStreetNameNameChanged,
        onStreetNumberChanged,
        onPostalCodeChanged,
        onCityNameChanged,
        onProvinceNameChanged,
        onCountryCodeChanged,
        onBuildingNameChanged,
        onSetOrganization: onOrganizationAssigned,
        onSetRole: onRoleAssigned,
        disabled,
        step,
        maxInteractiveSteps,
        context: machineContext,
      }}>
      {children}
    </NaturalPersonContext.Provider>
  )
}
