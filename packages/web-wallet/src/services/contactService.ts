import {AddNaturalPersonArgs, NaturalPersonData} from '@typings'
import {EventLogger, EventLoggerBuilder} from '@sphereon/ssi-sdk.core'
import {ActionType, InitiatorType, LoggingEventType, LogLevel, SubSystem, System} from '@sphereon/ssi-types'
import {getAgentContext, getAgent} from '@agent'
import {getAgentBaseUrl} from '../agent/environment'
import type {Party as RealParty, Party, PartyType} from '@sphereon/ssi-sdk.data-store-types'
import {PartyTypeType, PartyOrigin} from '@sphereon/ssi-sdk.data-store-types'
import {AddContactArgs} from '@sphereon/ssi-sdk.contact-manager'

let _eventLogger: EventLogger | undefined
const getLogger = (): EventLogger => {
  if (!_eventLogger) {
    _eventLogger = new EventLoggerBuilder()
      .withContext(getAgentContext())
      .withLogLevel(LogLevel.INFO)
      .withSystem(System.CONTACT)
      .withSubSystem(SubSystem.CONTACT_MANAGER)
      .withInitiatorType(InitiatorType.SYSTEM)
      .build()
  }
  return _eventLogger
}

export async function storeContact(naturalPersonData: NaturalPersonData, contactType?: PartyType): Promise<Party> {
  await getLogger().logEvent({
    type: LoggingEventType.AUDIT,
    data: {
      level: LogLevel.TRACE,
      description: 'storeContact function call',
      actionType: ActionType.CREATE,
      actionSubType: 'create contact',
      initiatorType: InitiatorType.USER,
      diagnosticData: {
        naturalPersonData,
        contactType,
      },
    },
  })

  if (!contactType) {
    contactType = await getContactType('people')
  }

  const data: AddNaturalPersonArgs = {
    firstName: naturalPersonData.firstName,
    middleName: naturalPersonData.middleName,
    lastName: naturalPersonData.lastName,
    displayName: naturalPersonData.middleName
      ? `${naturalPersonData.firstName} ${naturalPersonData.middleName} ${naturalPersonData.lastName}`
      : `${naturalPersonData.firstName} ${naturalPersonData.lastName}`,
    uri: naturalPersonData.emailAddress, // URI is mandatory in contact service
    electronicAddresses: [
      {type: 'email', electronicAddress: naturalPersonData.emailAddress},
      {type: 'phone', electronicAddress: naturalPersonData.phoneNumber},
    ],
    physicalAddresses: [
      {
        type: 'home',
        buildingName: naturalPersonData.buildingName,
        cityName: naturalPersonData.cityName,
        countryCode: naturalPersonData.countryCode,
        postalCode: naturalPersonData.postalCode,
        provinceName: naturalPersonData.provinceName,
        streetName: naturalPersonData.streetName,
        streetNumber: naturalPersonData.streetNumber,
      },
    ],
    contactType,
  }

  const persistedParty = await storeParty(data)

  if (naturalPersonData.organization) {
    await storePartyRelationship(naturalPersonData.organization.id, persistedParty.id)
  }

  await getLogger().logEvent({
    type: LoggingEventType.AUDIT,
    data: {
      description: 'contact created',
      actionType: ActionType.CREATE,
      actionSubType: 'create contact',
      initiatorType: InitiatorType.USER,
      data: persistedParty,
      diagnosticData: {
        naturalPersonData,
      },
    },
  })

  return persistedParty
}

export async function addContact(args: AddContactArgs): Promise<Party> {
  return getAgent().cmAddContact(args)
}

export async function getContactType(typeName: string): Promise<PartyType> {
  const agent = getAgent()
  const contactTypes = await agent.cmGetContactTypes()

  // Map typeName to PartyTypeType
  const partyTypeType = typeName === 'organizations' ? PartyTypeType.ORGANIZATION : PartyTypeType.NATURAL_PERSON

  let contactType = contactTypes.find((ct: PartyType) => ct.type === partyTypeType)

  // If contact type doesn't exist, create it
  if (!contactType) {
    contactType = await agent.cmAddContactType({
      name: typeName,
      type: partyTypeType,
      origin: PartyOrigin.INTERNAL,
      tenantId: 'default',
      description: `${typeName} contact type`,
    })
  }

  return contactType
}

async function storeParty(data: AddNaturalPersonArgs): Promise<Party> {
  const response = await fetch(`${getAgentBaseUrl()}/parties`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}

// TODO why are we not calling the add contact plugin
async function storePartyRelationship(leftId: string, rightId: string): Promise<void> {
  const response = await fetch(`${getAgentBaseUrl()}/api/party-relationships`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({leftId, rightId}),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `Failed to create party relationship: ${response.statusText}`)
  }
}

// TODO refactor this service
export const addParty = async (args: AddContactArgs): Promise<RealParty> => {
  return getAgent()
    .cmAddContact(args)
    .catch((error: Error) => {
      console.error(error) // log with stack trace
      return Promise.reject(Error(`Unable to create contact. Error: ${error}`))
    })
}
