import {DocumentCategory, DocumentType} from '@typings'
import {formatDate} from '@helpers/date/DateHelper'

export class WorkflowDocumentStorageInfoDTO {
  id: string
  asset_id: string
  created_at: string
  workflow_id: string
  uploaded_by_did: string
  storage_object_id: string
  storage_object_path: string
  category: string
  type: string
  correlation_id: string
  file_name: string
}

export class WorkflowDocumentStorageInfo {
  id: string
  asset_id: string
  created_at: string
  workflow_id: string
  uploaded_by_did: string
  storage_object_id: string
  storage_object_path: string
  category: DocumentCategory
  type: DocumentType
  correlation_id: string

  static toDTO(entity: WorkflowDocumentStorageInfo): WorkflowDocumentStorageInfoDTO {
    const splitPath = entity.storage_object_path ? entity.storage_object_path.split('/') : []
    const fileName = splitPath.length > 0 ? splitPath[splitPath.length - 1] : ''
    return {
      id: entity.id,
      asset_id: entity.asset_id,
      created_at: formatDate(entity.created_at),
      workflow_id: entity.workflow_id,
      uploaded_by_did: entity.uploaded_by_did,
      storage_object_id: entity.storage_object_id,
      storage_object_path: entity.storage_object_path,
      category: entity.category,
      type: entity.type,
      correlation_id: entity.correlation_id,
      file_name: fileName,
    }
  }
}

export type StorageDocumentDTO = {
  workflow_document_id?: string
  asset_id?: string
  workflow_id?: string
  uploaded_by_did?: string
  storage_object_id?: string
  category?: string
  type?: string
  correlation_id?: string
  file_name: string
  storage_object_path: string
  bucket_id: string
  owner: string
  document_id: string
  updated_at: string
  created_at: string
  last_accessed_at: string
  metadata: Record<string, any>
}

export const createStorageDocumentTableRows = (
  workflowDocumentStorageInfos: WorkflowDocumentStorageInfo[],
  documents: StorageObject[],
): StorageDocumentTableItem[] => {
  return documents.map(doc => {
    const info = workflowDocumentStorageInfos.find(info => info.storage_object_id === doc.id || doc.name.includes(info.asset_id))
    const splitPath = doc.name ? doc.name.split('/') : []
    const fileName = splitPath.length > 0 ? splitPath[splitPath.length - 1] : ''
    return {
      workflow_document_id: info?.id ?? '',
      asset_id: info?.asset_id ?? '',
      workflow_id: info?.workflow_id ?? '',
      uploaded_by_did: info?.uploaded_by_did,
      storage_object_id: info?.storage_object_id,
      category: info?.category,
      type: info?.type,
      correlation_id: info?.correlation_id,
      file_name: fileName,
      storage_object_path: doc.name,
      bucket_id: doc.bucket_id,
      owner: doc.owner,
      document_id: doc.id,
      updated_at: formatDate(doc.updated_at),
      created_at: formatDate(doc.created_at),
      last_accessed_at: formatDate(doc.last_accessed_at),
      metadata: doc.metadata,
      actions: 'actions',
    }
  })
}

export type StorageDocumentTableItem = StorageDocumentDTO & {
  actions: string
}

export type StorageObject = {
  id: string
  bucket_id: string
  name: string
  owner: string
  created_at: string
  updated_at: string
  last_accessed_at: string
  metadata: Record<string, any>
  path_tokens: string[]
  version: string
}
