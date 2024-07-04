import React, {FC, ReactElement, useEffect} from 'react'
import {emitLinkHandlerURLEvent} from '@sphereon/ssi-sdk.core'
import {agentContext} from '@agent'
import {OID4VCI_CODE_URL_REGEX, OID4VCI_STATE_STORAGE_KEY} from '@/app'

const OID4VCIStateMachineComponent: FC = (): ReactElement => {
  useEffect((): void => {
    if (!OID4VCI_CODE_URL_REGEX.test(window.location.href)) {
      return void emitLinkHandlerURLEvent({source: 'URL', url: window.location.href}, agentContext)
    }

    const machineState = sessionStorage.getItem(OID4VCI_STATE_STORAGE_KEY)
    if (!machineState) {
      throw Error('Cannot use a code flow if no authorization has happened')
    }
    sessionStorage.removeItem(OID4VCI_STATE_STORAGE_KEY)
    return void emitLinkHandlerURLEvent(
      {
        source: 'URL',
        url: window.location.href,
        options: {machineState: JSON.parse(machineState)},
      },
      agentContext,
    )
  }, [])
  return <div />
}

export default OID4VCIStateMachineComponent
