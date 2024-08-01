import {CredentialPayload} from '@veramo/core'
import agent, {agentContext} from '@agent'
import {OriginalVerifiableCredential} from '@sphereon/ssi-types'
import {EventLogger, EventLoggerBuilder} from '@sphereon/ssi-sdk.core'
import {DefaultActionSubType, LogLevel, ActionType, System, InitiatorType, SubSystem, LoggingEventType} from '@sphereon/ssi-types'

const logger: EventLogger = new EventLoggerBuilder()
  .withContext(agentContext)
  .withLogLevel(LogLevel.INFO)
  .withSystem(System.CREDENTIALS)
  .withSubSystem(SubSystem.VC_PERSISTENCE)
  .withInitiatorType(InitiatorType.SYSTEM)
  .build()

export async function issueVerifiableCredential(credential: CredentialPayload) {
  await logger.logEvent({
    type: LoggingEventType.AUDIT,
    data: {
      level: LogLevel.TRACE,
      description: 'issueVerifiableCredential function call',
      actionType: ActionType.CREATE,
      actionSubType: DefaultActionSubType.VC_ISSUE,
      diagnosticData: credential,
    },
  })

  const resp = await agent.vcApiClientIssueCredential({credential})
  let vc = resp
  if ('verifiableCredential' in resp) {
    vc = resp.verifiableCredential
  }

  await logger.logEvent({
    type: LoggingEventType.AUDIT,
    data: {
      description: `verifiable credential ${JSON.stringify(credential.type)} issued`,
      actionType: ActionType.CREATE,
      actionSubType: DefaultActionSubType.VC_ISSUE,
      initiatorType: InitiatorType.USER,
      data: credential,
      diagnosticData: resp,
    },
  })

  return vc as OriginalVerifiableCredential
}
