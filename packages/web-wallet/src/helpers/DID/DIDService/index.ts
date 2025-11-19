import {DIDRegistrationResult, UniRegistrar} from '@sphereon/did-uni-client'
import {getDidApiCreateDidUrl, getDidApiDeactivateUrl} from '../../../agent/environment'
import {EventLogger, EventLoggerBuilder} from '@sphereon/ssi-sdk.core'
import {DefaultActionSubType, LogLevel, ActionType, System, InitiatorType, SubSystem, LoggingEventType} from '@sphereon/ssi-types'

import {getAgentContext} from '@agent'
import {parseDid} from '@sphereon/ssi-types'
import {IdentifierMethod} from '@typings'
import {IDIDState} from '@sphereon/did-uni-client/dist/types/types'

const logger: EventLogger = new EventLoggerBuilder()
  .withContext(getAgentContext())
  .withLogLevel(LogLevel.INFO)
  .withSystem(System.IDENTITY)
  .withSubSystem(SubSystem.DID_PROVIDER)
  .withInitiatorType(InitiatorType.SYSTEM)
  .build()

export const createDID = async (opts?: {didMethod: string}): Promise<string> => {
  const {didMethod} = {...opts}
  const uniRegistrar = await new UniRegistrar().setCreateURL(getDidApiCreateDidUrl()).create(didMethod ?? 'jwk', {
    options: {
      storeSecrets: true,
    },
  })

  const did = uniRegistrar.didState.didDocument!.id

  await logger.logEvent({
    type: LoggingEventType.AUDIT,
    data: {
      description: `did ${parseDid(did).method} created`,
      actionType: ActionType.CREATE,
      actionSubType: DefaultActionSubType.DID_CREATION,
      data: did,
      diagnosticData: opts,
    },
  })

  return did
}

export const deactivateDid = async (did: string): Promise<string> => {
  const result: DIDRegistrationResult = await new UniRegistrar().setDeactivateURL(getDidApiDeactivateUrl()).deactivate(did, {
    options: {
      storeSecrets: true,
    },
  })
  return (result as unknown as IDIDState).state
}

export const getDidMethod = (didString: string): string => {
  const parts = didString.split(':')
  if (parts.length >= 3) {
    return parts[1]
  } else {
    return ''
  }
}

/**
 *
 * @param did
 * @param opts
 *          uppercase: defaults to true if not provided
 * @example:
 *  const did = 'did:example:123456789abcdefghi'
 *  const method1 = getDidMethodFromDID(did); // "EXAMPLE"
 *  const method2 = getDidMethodFromDID(did, { uppercase: false }); // "example"
 */
export const getDidMethodFromDID = (did: string, opts: {uppercase?: boolean} = {uppercase: true}): IdentifierMethod => {
  if (did.indexOf('did:') === -1) {
    throw new Error('Invalid DID format')
  }
  const method = did.split(':')[1]
  return opts.uppercase ? method.toUpperCase() : method
}
