import {
  Asset,
  createAssetDescriptor,
  IInEdge,
  IOutEdge,
  IWorkflowStepDescriptor,
  PROCESS_OWNER_DID,
  WorkflowDTOType,
  WorkflowEntity,
  WorkflowEntityType,
  WorkflowStatus,
  WorkflowStepCode,
  workflowStepDescriptors,
  WorkflowStepDTOType,
  WorkflowStepEntity,
  WorkflowStepEntityType,
} from '@typings'
import {supabaseServiceClient} from '@helpers/SupabaseClient'
import {Party} from '@sphereon/ssi-sdk.data-store'

export type WorkflowType = WorkflowDTOType | WorkflowEntityType
export type WorkflowStepType = WorkflowStepDTOType | WorkflowStepEntityType
export interface IWorkflowStepData extends IWorkflowDescriptorData {
  workflow: WorkflowDTOType
  workflowStep: WorkflowStepDTOType
}

export interface IWorkflowDescriptorData {
  getInEdge: () => IInEdge | undefined
  getInEdges: () => IInEdge[]
  getOutEdges: () => IOutEdge[]
  descriptor: IWorkflowStepDescriptor | undefined
  currentStepCode: WorkflowStepCode
}

export async function newCreateAssetWorkflowEntities(
  asset: Asset,
  parties: Party[],
  translate: {
    (key: string, options?: any, defaultMessage?: string): string
    (key: string, defaultMessage?: string): string
  },
): Promise<IWorkflowStepData> {
  const workflowEntity = new WorkflowEntity()
  workflowEntity.owner_id = PROCESS_OWNER_DID
  workflowEntity.created_at = new Date().toISOString()
  workflowEntity.asset_id = asset.id

  const wfRes = await supabaseServiceClient.from('workflow').insert(workflowEntity).select('id')
  if (wfRes.error || !wfRes.data || wfRes.data.length == 0) {
    throw new Error('Adding workflow failed: ' + wfRes.error)
  }
  const workflowId = wfRes.data[0]['id']
  workflowEntity.id = workflowId

  /*const res = await create.mutate({
        dataProviderName: 'supaBase',
        resource: "workflow",
        values: workflowEntity,
        meta: {
            fields: [
                'id'
            ]
        }
    })
*/
  console.log('================================================================')
  console.log('' + workflowId)
  console.log(JSON.stringify(wfRes.data))
  console.log('================================================================')
  /*const createWorkflowResult = create.data!.data
    workflowEntity.id = createWorkflowResult.id as string*/

  const workflowStepEntity = new WorkflowStepEntity()
  workflowStepEntity.status = WorkflowStatus.New
  workflowStepEntity.code = createAssetDescriptor.step
  workflowStepEntity.message = createAssetDescriptor.message
  workflowStepEntity.message = createAssetDescriptor.message
  workflowStepEntity.action = createAssetDescriptor.action!
  workflowStepEntity.created_at = new Date().toISOString()
  workflowStepEntity.sender_id = PROCESS_OWNER_DID
  workflowStepEntity.recipient_id = PROCESS_OWNER_DID
  workflowStepEntity.workflow_id = workflowId

  const stepRes = await supabaseServiceClient.from('workflow_step').insert(workflowStepEntity).select('id')
  if (stepRes.error || !stepRes.data || stepRes.data.length == 0) {
    throw new Error('Adding workflow step failed: ' + JSON.stringify(stepRes.error))
  }
  const stepId = stepRes.data[0]['id']
  // await create.mutate({
  //     dataProviderName: 'supaBase',
  //     resource: 'workflow_step',
  //     values: workflowStepEntity
  // })
  // const createStepResult = create.data!.data
  // workflowStepEntity.id = createStepResult.id as string
  workflowStepEntity.id = stepId
  const workflowDescriptorData = getWorkflowDescriptorData(WorkflowStatus.New, WorkflowStepCode.CREATE_ASSET)
  const workflow = workflowEntity.asDTO([asset], parties)
  const workflowStep = workflowStepEntity.asDTO([workflow], parties, translate)
  return {
    ...workflowDescriptorData,
    workflow,
    workflowStep,
  }
}

/*
export async function startCreateWorkflow(assetId: string) {
    const result = await newCreateAssetWorkflowEntities(assetId)
    return progressWorkflowState(result)
}
*/

export function getWorkflowDescriptor(step: WorkflowStepCode | number): IWorkflowStepDescriptor {
  // @ts-ignore
  const stepType: WorkflowStepCode = WorkflowStepCode[WorkflowStepCode[step]]
  const descriptor = workflowStepDescriptors[stepType]!
  return descriptor
}

export function getWorkflowStepData(workflow: WorkflowDTOType, workflowStep: WorkflowStepDTOType): IWorkflowStepData {
  return {
    ...getWorkflowDescriptorData(workflowStep.status, workflowStep.code),
    workflow,
    workflowStep,
  }
}

export function getWorkflowDescriptorData(status: WorkflowStatus, code: WorkflowStepCode | number): IWorkflowDescriptorData {
  // const code = workflowStep.code
  // @ts-ignore
  // const currentStepType: WorkflowStepType = WorkflowStepType[WorkflowStepType[code]]
  // const descriptor = workflowStepDescriptors[currentStepType]
  const descriptor = getWorkflowDescriptor(code)!
  const getInEdge = (): IInEdge | undefined => {
    return descriptor?.inEdge.find(inEdge => inEdge.inStatus === status)
  }

  const getInEdges = (): IInEdge[] => {
    return descriptor?.inEdge ?? []
  }

  const getOutEdges = (): IOutEdge[] => {
    return getInEdge()?.outEdge ?? []
  }

  return {
    getInEdge,
    getInEdges,
    getOutEdges,
    descriptor,
    currentStepCode: descriptor.step,
  }
}

export async function progressWorkflowState(
  workflowState: IWorkflowStepData,
  documentCorrelationIds?: string[] /* | (IWorkflowDescriptorData & { workflowStep: WorkflowStepEntityType, workflow: WorkflowEntityType })*/,
): Promise<void> {
  const inEdge = workflowState.getInEdge()
  console.log(
    `Progress called on ${workflowState.workflow.id}:${workflowState.workflowStep.id}:${inEdge?.inStatus} ${workflowState.descriptor?.actionType} `,
  )

  if (Array.isArray(documentCorrelationIds) && documentCorrelationIds.length > 1) {
    throw Error('Only one document per step supported for now')
  }
  const document_correlation_id = Array.isArray(documentCorrelationIds) ? documentCorrelationIds[0] : undefined
  typeof inEdge?.onIn === 'function' && inEdge!.onIn!()
  for (const out of workflowState.getOutEdges()) {
    typeof out.onOut === 'function' && out.onOut()
    for (const instance of out.create ?? []) {
      if (!instance.step) {
        throw Error(`Create instance data on an out edge should have a step value`)
      }
      const descriptor = getWorkflowDescriptor(instance.step)
      console.log(`Progress ${workflowState.workflow.id}:${workflowState.workflowStep.id}:${inEdge?.inStatus} - create out edge: ${descriptor.step} `)
      const step: WorkflowStepEntityType = {
        workflow_id: workflowState.workflow.id,
        sender_id: instance.sender ?? workflowState.workflowStep.senderIdentity?.identifier.correlationId,
        recipient_id: instance.recipients ?? workflowState.workflowStep.recipientIdentity?.identifier.correlationId, // fixme: Lookup based on type
        created_at: new Date(),
        document_correlation_id,
        action: descriptor.action,
        code: descriptor.step,
        message: descriptor.message,
        status: instance.status ?? WorkflowStatus.New,
      }
      let data, error
      ;({data, error} = await supabaseServiceClient.from('workflow_step').insert(step).select('id'))
      if (error || !data || data.length == 0) {
        throw new Error('Adding workflow step failed: ' + JSON.stringify(error))
      }
      const stepId = data[0]['id']
      console.log(
        `Progress wf:${workflowState.workflow.id}, step:${
          workflowState.workflowStep.id
        }, status:${inEdge?.inStatus} => create step: id ${stepId}, values: ${JSON.stringify(step)} `,
      )
      /*create.mutate({
                dataProviderName: 'supaBase',
                resource: "workflow_step",
                values: step,
            })
            console.log(JSON.stringify(create.data))
            create.reset()*/
    }
    if (!workflowState.workflowStep.recipientIdentity) {
      throw new Error('Updating workflow step failed: recipientIdentity of workflowStep should not be empty.')
    }
    for (const instance of out.update ?? []) {
      const status = instance.status ?? WorkflowStatus.Done
      console.log(`Progress ${JSON.stringify(workflowState.workflowStep)}:${inEdge?.inStatus} - will update to status ${status}... `)
      const step: WorkflowStepEntityType = {
        sender_id: instance.sender ?? workflowState.workflowStep.recipientIdentity.identifier.correlationId,
        recipient_id: instance.recipients ?? workflowState.workflowStep.recipientIdentity.identifier.correlationId,
        document_correlation_id,
        status,
      }
      console.log(`Progress ${JSON.stringify(workflowState.workflowStep)}:${inEdge?.inStatus} - updated step ${JSON.stringify(step)} `)
      let data, error
      ;({data, error} = await supabaseServiceClient.from('workflow_step').update(step).eq('id', workflowState.workflowStep.id).select('id'))
      if (error || !data || data.length == 0) {
        throw new Error('Updating workflow step failed: ' + JSON.stringify(error))
      }
      // const stepId = data[0]['id']
      /*update.mutate({
                dataProviderName: 'supaBase',
                resource: "workflow_step",
                values: {
                    ...step
                },
                id: workflowState.workflowStep.id
            })*/
      console.log(JSON.stringify(data))
      console.log(`Progress ${JSON.stringify(workflowState.workflowStep)}:${inEdge?.inStatus} - updated step got ${JSON.stringify(data)} `)
      // update.reset()
    }
  }
}
