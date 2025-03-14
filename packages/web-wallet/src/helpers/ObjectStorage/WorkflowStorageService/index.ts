import {ObjectStorage} from '@objectstorage'
import {
  DocumentCategory,
  IWorkflowDocumentDescriptor,
  SelectedAssetFile,
  WorkflowDocumentStorageInfo,
  WorkflowDTOType,
  WorkflowEntityType,
} from '@typings'
import {StoragePathResolver} from '@objectstorage/StoragePathResolver'
import {FileBody} from '@objectstorage/types'
import {FileOptions, TransformOptions} from '@supabase/storage-js'
import {supabaseServiceClient} from '../../SupabaseClient'
import {uuid} from 'short-uuid'
import {PostgrestError, PostgrestResponseFailure, PostgrestResponseSuccess} from '@supabase/postgrest-js/dist/cjs/types' // Package has two PostgrestError types exported...
import {IWorkflowStepData} from '@/src/workflows/simpleWorkflowRouter'
import {WF_BUCKET_STORAGE_ID} from '@components/views/WorkflowApproveDocuments'

export class WorkflowStorageService {
  private readonly _storage

  get storage() {
    return this._storage
  }

  constructor(
    private workflowId: string,
    private assetId: string,
    path?: string,
  ) {
    this._storage = ObjectStorage.fromResolver(new StoragePathResolver(WF_BUCKET_STORAGE_ID, path ? `${assetId}/${path}` : `${assetId}`))
  }

  public static fromWorkflow(workflow: WorkflowDTOType | WorkflowEntityType, path?: string) {
    return WorkflowStorageService.fromAsset(workflow.id, 'asset' in workflow ? workflow.asset.id : workflow.asset_id, path)
  }

  public static fromState(workflowState: IWorkflowStepData) {
    return WorkflowStorageService.fromWorkflow(workflowState.workflow)
  }

  public static fromAsset(workflowId: string, assetId: string, path?: string) {
    return new WorkflowStorageService(workflowId, assetId, path)
  }

  public static async uploadUsingState(
    selectedFile: SelectedAssetFile,
    workflowState: IWorkflowStepData,
  ): Promise<{
    data: WorkflowDocumentStorageInfo | null
    error: PostgrestError | null
  }> {
    if (!selectedFile?.file) {
      throw Error('No file provided')
    }
    if (!workflowState.workflowStep.senderIdentity) {
      throw Error('No sender did is provided.')
    }
    const workflowStorage = WorkflowStorageService.fromState(workflowState)
    const {data, error} = await workflowStorage.upload({
      fileName: selectedFile.file.name,
      fileBody: selectedFile.file,
      documentDescriptor: {...workflowState.descriptor?.document!, correlationId: uuid()},
      uploaderDID: workflowState.workflowStep.senderIdentity.identifier.correlationId,
      workflowStepId: workflowState.workflowStep.id,
      fileOptions: {
        upsert: true,
      },
    })

    /*  // todo once workflowState is implemented get it from there
          const storage = ObjectStorage.fromObject(new Test())
          // todo path config

          const {data2, error2} = await storage.upload(`${documentType ?? 'example'}-${new Date()}`, selectedFile.file, {upsert: true})*/
    if (error) {
      console.log('Error adding file ' + error)
    } else {
      console.log(`File uploaded: ${JSON.stringify(data)}`)
    }
    return {data, error}
  }

  async upload(args: {
    documentDescriptor: IWorkflowDocumentDescriptor
    fileName: string
    fileBody: FileBody
    workflowStepId: string
    uploaderDID: string
    fileOptions?: FileOptions
  }): Promise<PostgrestResponseSuccess<WorkflowDocumentStorageInfo> | PostgrestResponseFailure> {
    const {documentDescriptor, fileName, fileBody, fileOptions} = args
    const storageInfo = await this._storage.upload(`${documentDescriptor.category ?? DocumentCategory.OTHER}/${fileName}`, fileBody, fileOptions)
    console.log(JSON.stringify(storageInfo.data))
    // @ts-ignore
    const objectStorageId = storageInfo.data.id
    const documentInfo: Omit<WorkflowDocumentStorageInfo, 'id' | 'created_at'> = {
      //todo: created_at is another field that will be added to this entity
      asset_id: this.assetId,
      workflow_id: this.workflowId,
      uploaded_by_did: args.uploaderDID,
      storage_object_id: objectStorageId,
      storage_object_path: storageInfo.data!.path,
      category: args.documentDescriptor.category,
      type: args.documentDescriptor.type,
      correlation_id: args.documentDescriptor.correlationId ?? uuid(),
    }
    const docResult = await supabaseServiceClient.from('workflow_document').insert(documentInfo).select('id').single<{
      id: string
    }>()
    if (docResult.error) {
      throw new Error(`Error on creating workflow_document ${docResult.error}`)
    }
    return {
      ...docResult,
      ...(docResult.data && {
        data: {
          ...documentInfo,
          id: docResult.data.id,
        },
      }),
    } as PostgrestResponseSuccess<WorkflowDocumentStorageInfo>
  }

  async getStorageInfo(args: {correlationId: string}) {
    // todo: start working via object id that we also stored, so we can move files without impact
    const queryResult = await supabaseServiceClient
      .from('workflow_document')
      .select('*')
      .eq('correlation_id', args.correlationId)
      .eq('workflow_id', this.workflowId)
      .single<WorkflowDocumentStorageInfo>()
    return queryResult.data!
  }

  async downloadByCorrelationId(args: {correlationId: string; transformOptions?: TransformOptions}) {
    // todo: start working via object id that we also stored, so we can move files without impact
    const queryResult = await this.getStorageInfo(args)
    return this._storage.download(queryResult.storage_object_path, args.transformOptions && {transform: args.transformOptions})
  }
}
