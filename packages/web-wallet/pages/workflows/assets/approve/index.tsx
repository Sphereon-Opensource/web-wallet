import {useTranslate} from '@refinedev/core'
import {VerifiableCredential} from '@veramo/core'
import React, {CSSProperties, useEffect, useState} from 'react'
import WorkflowApproveAsset from '@components/views/WorkflowApproveAsset'
import {buildInformationDetails} from '@helpers/Credentials/CredentialsHelper'
import {IWorkflowStepData, progressWorkflowState} from '../../../../src/workflows/simpleWorkflowRouter'
import {KeyValuePair} from '@typings'
import {staticPropsWithSST} from '../../../../src/i18n/server'

type Props = {
  workflowState: IWorkflowStepData
  titleCaption: string
  subTitleCaption: string
  subCloseCaption: string
  caption: string
  actionAbortLabel?: string
  actionSubmitLabel?: string
  documentType?: string
  onSubmit?: () => Promise<void>
  onPostSubmit?: () => Promise<void>
  onAbort?: () => Promise<void>
  onClose?: () => Promise<void>
  style?: CSSProperties
}

const WorkflowApproveAssetModal: React.FC<Props> = (props: Props) => {
  const {
    workflowState,
    onAbort,
    onSubmit,
    onClose,
    titleCaption,
    subTitleCaption,
    subCloseCaption,
    caption,
    actionAbortLabel,
    actionSubmitLabel,
    documentType,
  } = props

  const translate = useTranslate()
  const [informationDetails, setInformationDetails] = useState<Array<KeyValuePair>>([])
  const [credential, setCredential] = useState<VerifiableCredential | undefined>(undefined)

  const onSubmitDefault = async (): Promise<void> => {
    await progressWorkflowState(workflowState)
    typeof onClose === 'function' ? await onClose() : await onCloseDefault()
    typeof props.onPostSubmit === 'function' && void props.onPostSubmit()
  }

  const onAbortDefault = async (): Promise<void> => {
    window.history.back()
  }

  const onCloseDefault = async (): Promise<void> => {
    window.history.back()
  }

  useEffect(() => {
    async function fetchCredentialData(): Promise<void> {
      try {
        const details = await buildInformationDetails(workflowState.workflow.asset.id, async (vc: VerifiableCredential) => setCredential(vc))
        setInformationDetails(details)
      } catch (error) {
        console.error('Error fetching information details:', error)
      }
    }

    void fetchCredentialData()
  }, [workflowState])

  return (
    <WorkflowApproveAsset
      style={{width: 909}}
      credential={credential}
      titleCaption={titleCaption}
      subTitleCaption={subTitleCaption}
      subCloseCaption={subCloseCaption}
      caption={caption}
      onClose={typeof onClose === 'function' ? onClose : onCloseDefault}
      onAbort={typeof onAbort === 'function' ? onAbort : undefined /*onAbortDefault*/}
      actionAbortLabel={actionAbortLabel ?? translate('action_decline_label')}
      onSubmit={typeof onSubmit === 'function' ? onSubmit : onSubmitDefault}
      actionSubmitLabel={actionSubmitLabel ?? translate('action_approve_label')}
      // TODO we need to fill this data with credential data and possible additional information, use workflowState
      informationDetails={informationDetails}
    />
  )
}
export const getStaticProps = staticPropsWithSST

export default WorkflowApproveAssetModal
