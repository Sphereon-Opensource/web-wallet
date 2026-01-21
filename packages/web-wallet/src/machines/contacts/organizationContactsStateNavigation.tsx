import React, {useCallback, useEffect, useMemo, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {useInterpret} from '@xstate/react'
import {useTranslate} from '@refinedev/core'
import {AddContactArgs} from '@sphereon/ssi-sdk.contact-manager'
import {
  MainRoute,
  OrganizationContactContext,
  OrganizationContactCreationRoute,
  OrganizationContactMachineEvents,
  OrganizationContactMachineProviderProps,
  OrganizationContactMachineStates,
  OrganizationContactsMachineInterpretType,
  OrganizationContactsMachineState,
} from '@typings'
import {organizationalDataGuard, organizationContactMachine, physicalAddressGuard} from '@machines/contacts/organizationContactsMachine'
import {addContact, getContactType} from '../../services/contactService'

const organizationContactStateNavigationListener = async (
  contactMachine: OrganizationContactsMachineInterpretType,
  state: OrganizationContactsMachineState,
  navigate: any,
): Promise<void> => {
  if (state.matches(OrganizationContactMachineStates.enterOrganizationalData)) {
    return navigate(OrganizationContactCreationRoute.ORGANIZATION_INFO)
  } else if (state.matches(OrganizationContactMachineStates.enterPhysicalAddress)) {
    return navigate(OrganizationContactCreationRoute.PHYSICAL_ADDRESS)
  }
  if (state.matches(OrganizationContactMachineStates.reviewContact)) {
    return navigate(OrganizationContactCreationRoute.REVIEW)
  } else if (
    state.matches(OrganizationContactMachineStates.done) ||
    state.matches(OrganizationContactMachineStates.aborted) ||
    state.matches(OrganizationContactMachineStates.error)
  ) {
    contactMachine.stop()
    return navigate(MainRoute.CONTACTS)
  }
}

export const OrganizationContactMachineContextProvider = (props: OrganizationContactMachineProviderProps): JSX.Element => {
  const {children} = props
  const navigate = useNavigate()
  const translate = useTranslate()

  // Memoize the machine to prevent recreation on every render
  const machine = useMemo(() => organizationContactMachine(), [])

  const instance = useInterpret(machine, {
    services: {
      storeContact: async () => {
        return storeOrganizationContact()
      },
    },
    guards: {
      organizationalDataGuard,
      physicalAddressGuard,
    },
  })
  const [disabled, setDisabled] = useState<boolean>(true)
  const [step, setStep] = useState<number>(1)
  const [machineContext, setMachineContext] = useState(instance.getSnapshot().context)
  const maxInteractiveSteps: number = 3
  const maxAutoSteps: number = 1

  const storeOrganizationContact = useCallback(async (): Promise<void> => {
    const {
      legalName,
      displayName,
      emailAddress,
      phoneNumber,
      buildingName,
      cityName,
      countryCode,
      postalCode,
      provinceName,
      streetName,
      streetNumber,
    } = instance.getSnapshot().context
    if (!legalName || !legalName.length) {
      throw new Error(translate('contact_create_legal_name_error_message'))
    }

    const contactType = await getContactType('organizations')

    // Build electronic addresses array only with provided values
    const electronicAddresses: Array<{type: string; electronicAddress: string}> = []
    if (emailAddress) {
      electronicAddresses.push({type: 'email', electronicAddress: emailAddress})
    }
    if (phoneNumber) {
      electronicAddresses.push({type: 'phone', electronicAddress: phoneNumber})
    }

    // Build physical address only if any address field is provided
    const hasPhysicalAddress = streetName || streetNumber || cityName || postalCode || provinceName || countryCode || buildingName
    const physicalAddresses = hasPhysicalAddress
      ? [
          {
            type: 'visit',
            buildingName: buildingName || undefined,
            cityName: cityName || undefined,
            countryCode: countryCode || undefined,
            postalCode: postalCode || undefined,
            provinceName: provinceName || undefined,
            streetName: streetName || undefined,
            streetNumber: streetNumber || undefined,
          },
        ]
      : []

    const contact: AddContactArgs = {
      legalName,
      displayName: displayName || legalName,
      contactType,
      electronicAddresses,
      physicalAddresses,
    }

    await addContact(contact)
  }, [])

  useEffect(() => {
    instance.onTransition(state => organizationContactStateNavigationListener(instance, state, navigate))
    instance.subscribe(state => {
      setDisabled(!state.can(OrganizationContactMachineEvents.NEXT))
      setMachineContext(state.context)
    })
    const handlePopstate = (): void => {
      const nextStep: number = step - 1
      if (step > 0) {
        instance.send(OrganizationContactMachineEvents.PREVIOUS)
        setStep(nextStep)
      } else {
        instance.send(OrganizationContactMachineEvents.ABORT)
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
      instance.send(OrganizationContactMachineEvents.NEXT)
      setStep(nextStep)
    }
  }, [step, maxAutoSteps, maxInteractiveSteps])

  const onBack = useCallback(async (): Promise<void> => {
    const nextStep: number = step - 1
    if (nextStep >= 1) {
      setStep(nextStep)
    }
    instance.send(OrganizationContactMachineEvents.PREVIOUS)
  }, [step, maxAutoSteps, maxInteractiveSteps])

  const onLegalNameChanged = useCallback(async (value: string): Promise<void> => {
    instance.send(OrganizationContactMachineEvents.SET_LEGAL_NAME, {data: value})
  }, [])
  const onDisplayNameChanged = useCallback(async (value: string): Promise<void> => {
    instance.send(OrganizationContactMachineEvents.SET_DISPLAY_NAME, {data: value})
  }, [])
  const onEmailAddressChanged = useCallback(async (value: string): Promise<void> => {
    instance.send(OrganizationContactMachineEvents.SET_EMAIL_ADDRESS, {data: value})
  }, [])
  const onPhoneNumberChanged = useCallback(async (value: string): Promise<void> => {
    instance.send(OrganizationContactMachineEvents.SET_PHONE_NUMBER, {data: value})
  }, [])
  const onStreetNameNameChanged = useCallback(async (value: string): Promise<void> => {
    instance.send(OrganizationContactMachineEvents.SET_STREET_NAME, {data: value})
  }, [])
  const onStreetNumberChanged = useCallback(async (value: string): Promise<void> => {
    instance.send(OrganizationContactMachineEvents.SET_STREET_NUMBER, {data: value})
  }, [])
  const onPostalCodeChanged = useCallback(async (value: string): Promise<void> => {
    instance.send(OrganizationContactMachineEvents.SET_POSTAL_CODE, {data: value})
  }, [])
  const onCityNameChanged = useCallback(async (value: string): Promise<void> => {
    instance.send(OrganizationContactMachineEvents.SET_CITY_NAME, {data: value})
  }, [])
  const onProvinceNameChanged = useCallback(async (value: string): Promise<void> => {
    instance.send(OrganizationContactMachineEvents.SET_PROVINCE_NAME, {data: value})
  }, [])
  const onCountryCodeChanged = useCallback(async (value: string): Promise<void> => {
    instance.send(OrganizationContactMachineEvents.SET_COUNTRY_CODE, {data: value})
  }, [])
  const onBuildingNameChanged = useCallback(async (value: string): Promise<void> => {
    instance.send(OrganizationContactMachineEvents.SET_BUILDING_NAME, {data: value})
  }, [])

  return (
    <OrganizationContactContext.Provider
      value={{
        onBack,
        onNext,
        onLegalNameChanged,
        onDisplayNameChanged,
        onEmailAddressChanged,
        onPhoneNumberChanged,
        onStreetNameNameChanged,
        onStreetNumberChanged,
        onPostalCodeChanged,
        onCityNameChanged,
        onProvinceNameChanged,
        onCountryCodeChanged,
        onBuildingNameChanged,
        disabled,
        step,
        maxInteractiveSteps,
        context: machineContext,
      }}>
      {children}
    </OrganizationContactContext.Provider>
  )
}
