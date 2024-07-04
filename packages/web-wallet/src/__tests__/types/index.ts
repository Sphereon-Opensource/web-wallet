import {FormAction} from '@refinedev/core'

export interface CrudFormProps<TYPE_DTO> {
  formAction: FormAction
  idToLoad?: string
  onFormLoaded?: () => void
  onRecordCommitted?: (dto: TYPE_DTO) => void
}

export interface DeleteFormProps {
  resource: string
  idToDelete: string
  onRecordDeleted?: () => void
}
