import React, {FC, ReactElement, useEffect} from 'react'
import {emitLinkHandlerURLEvent} from '@sphereon/ssi-sdk.core'
import {getAgentContext} from '@agent'

const OID4VPStateMachineComponent: FC = (): ReactElement => {
  useEffect((): void => {
    void emitLinkHandlerURLEvent({source: 'URL', url: window.location.href}, getAgentContext())
  }, [])
  return <div />
}

export default OID4VPStateMachineComponent
