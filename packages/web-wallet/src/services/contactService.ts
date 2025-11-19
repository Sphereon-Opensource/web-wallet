import {AddNaturalPersonArgs, AddPartyRelationshipArgs, NaturalPersonData} from '@typings'
import {supabaseServiceClient} from '@helpers/SupabaseClient'
import {EventLogger, EventLoggerBuilder} from '@sphereon/ssi-sdk.core'
import {ActionType, InitiatorType, LoggingEventType, LogLevel, SubSystem, System} from '@sphereon/ssi-types'
import {agentContext, getAgent} from '@agent'
import {getAgentBaseUrl} from '../agent/environment'
import type {Party as RealParty, Party, PartyType} from '@sphereon/ssi-sdk.data-store-types'
import {AddContactArgs} from '@sphereon/ssi-sdk.contact-manager'

const logger: EventLogger = new EventLoggerBuilder()
  .withContext(agentContext)
  .withLogLevel(LogLevel.INFO)
  .withSystem(System.CONTACT)
  .withSubSystem(SubSystem.CONTACT_MANAGER)
  .withInitiatorType(InitiatorType.SYSTEM)
  .build()

export async function storeContact(naturalPersonData: NaturalPersonData, contactType?: PartyType): Promise<Party> {
  await logger.logEvent({
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

  await logger.logEvent({
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
  const result = await supabaseServiceClient().from('PartyType').select('*').eq('name', typeName).single<PartyType>()
  if (!result.data) {
    throw new Error('No contactType found for inserting a NaturalPerson.')
  }
  return result.data
}

async function storeParty(data: AddNaturalPersonArgs): Promise<Party> {
  const response = await fetch(`${getAgentBaseUrl}/parties`, {
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
  const partyRelationship: AddPartyRelationshipArgs = {left_id: leftId, right_id: rightId}
  const {error} = await supabaseServiceClient().from('PartyRelationship').insert([partyRelationship])
  if (error) {
    throw error
  }
}

// TODO refactor this service
export const addParty = async (args: AddContactArgs): Promise<RealParty> => {
  return getAgent().cmAddContact(args).catch((error: Error) => {
    console.error(error) // log with stack trace
    return Promise.reject(Error(`Unable to create contact. Error: ${error}`))
  })
}
