import { createNewStatusList } from '@sphereon/ssi-sdk.vc-status-list'
import { getDriver } from '@sphereon/ssi-sdk.vc-status-list-issuer-drivers'
import {
  DB_CONNECTION_NAME,
  DEFAULT_DID,
  STATUS_LIST_CORRELATION_ID,
  STATUS_LIST_ID,
  STATUS_LIST_ISSUER,
  STATUS_LIST_LENGTH,
  STATUS_LIST_PURPOSE,
  STATUS_LIST_TYPE,
} from '../environment-vars'
import { context } from '../agent'
import { STATUS_LIST_API_FEATURES } from '../environment-vars-with-deps'
import { StatusListType } from '@sphereon/ssi-types'

export async function getOrCreateConfiguredStatusList(args?: { issuer?: string; keyRef?: string }) {
  if (!STATUS_LIST_API_FEATURES || STATUS_LIST_API_FEATURES.length === 0) {
    return
  }

  const driver = await getDriver({
    correlationId: STATUS_LIST_CORRELATION_ID,
    id: STATUS_LIST_ID,
    dbName: DB_CONNECTION_NAME,
  })
  let statusList = undefined
  try {
    statusList = await driver.getStatusList({
      correlationId: STATUS_LIST_CORRELATION_ID,
    })
  } catch (error) {
    console.log(
      `No existing status list found with id ${STATUS_LIST_ID}, purpose ${STATUS_LIST_PURPOSE} and length ${STATUS_LIST_LENGTH}. Will create one...`,
    )
  }
  if (statusList) {
    console.log(`Existing status list found id ${STATUS_LIST_ID}, type ${statusList.type} and length ${statusList.length}`)
  } else {
    statusList = await createNewStatusList(
      {
        type: StatusListType.StatusList2021,
        correlationId: STATUS_LIST_CORRELATION_ID,
        id: STATUS_LIST_ID,
        statusList2021: {
          statusPurpose: STATUS_LIST_PURPOSE,
          indexingDirection: 'rightToLeft'
        },
        length: Number.parseInt(STATUS_LIST_LENGTH),
        issuer: args?.issuer ?? STATUS_LIST_ISSUER ?? DEFAULT_DID!,
        keyRef: args?.keyRef
      },
      context,
    )
    await driver.createStatusList({
      statusListType: STATUS_LIST_TYPE as StatusListType,
      statusListCredential: statusList.statusListCredential,
      correlationId: STATUS_LIST_CORRELATION_ID,
    })
    console.log(`New status list created with id ${STATUS_LIST_ID}, purpose ${STATUS_LIST_PURPOSE} and length ${STATUS_LIST_LENGTH}`)
  }
}
