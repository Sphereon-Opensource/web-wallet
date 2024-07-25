import React, {ChangeEvent, useCallback, useEffect, useState} from 'react'
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
  const instance = useInterpret(organizationContactMachine(), {
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
  const navigate = useNavigate()
  const translate = useTranslate()
  const [disabled, setDisabled] = useState<boolean>(true)
  const [step, setStep] = useState<number>(1)
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
    if (!displayName || !displayName.length) {
      throw new Error(translate('contact_create_display_name_error_message'))
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

    const contactType = await getContactType('organizations')

    const contact: AddContactArgs = {
      legalName,
      displayName,
      contactType,
      electronicAddresses: [
        {
          type: 'email',
          electronicAddress: emailAddress,
        },
        {
          type: 'phone',
          electronicAddress: phoneNumber,
        },
      ],
      physicalAddresses: [
        {
          type: 'visit',
          buildingName: buildingName === '' ? undefined : buildingName,
          cityName,
          countryCode,
          postalCode,
          provinceName,
          streetName,
          streetNumber,
        },
      ],
    }

    await addContact(contact)
  }, [])

  useEffect(() => {
    instance.onTransition(state => organizationContactStateNavigationListener(instance, state, navigate))
    instance.subscribe(state => setDisabled(!state.can(OrganizationContactMachineEvents.NEXT)))
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

  const onLegalNameChanged = useCallback(async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    instance.send(OrganizationContactMachineEvents.SET_LEGAL_NAME, {data: event.target.value})
  }, [])
  const onDisplayNameChanged = useCallback(async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    instance.send(OrganizationContactMachineEvents.SET_DISPLAY_NAME, {data: event.target.value})
  }, [])
  const onEmailAddressChanged = useCallback(async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    instance.send(OrganizationContactMachineEvents.SET_EMAIL_ADDRESS, {data: event.target.value})
  }, [])
  const onPhoneNumberChanged = useCallback(async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    instance.send(OrganizationContactMachineEvents.SET_PHONE_NUMBER, {data: event.target.value})
  }, [])
  const onStreetNameNameChanged = useCallback(async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    instance.send(OrganizationContactMachineEvents.SET_STREET_NAME, {data: event.target.value})
  }, [])
  const onStreetNumberChanged = useCallback(async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    instance.send(OrganizationContactMachineEvents.SET_STREET_NUMBER, {data: event.target.value})
  }, [])
  const onPostalCodeChanged = useCallback(async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    instance.send(OrganizationContactMachineEvents.SET_POSTAL_CODE, {data: event.target.value})
  }, [])
  const onCityNameChanged = useCallback(async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    instance.send(OrganizationContactMachineEvents.SET_CITY_NAME, {data: event.target.value})
  }, [])
  const onProvinceNameChanged = useCallback(async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    instance.send(OrganizationContactMachineEvents.SET_PROVINCE_NAME, {data: event.target.value})
  }, [])
  const onCountryCodeChanged = useCallback(async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    instance.send(OrganizationContactMachineEvents.SET_COUNTRY_CODE, {data: event.target.value})
  }, [])
  const onBuildingNameChanged = useCallback(async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    instance.send(OrganizationContactMachineEvents.SET_BUILDING_NAME, {data: event.target.value})
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
        context: instance.getSnapshot().context,
      }}>
      {children}
    </OrganizationContactContext.Provider>
  )
}
