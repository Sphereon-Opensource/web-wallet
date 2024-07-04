import {useDelete} from '@refinedev/core'
import React, {useEffect} from 'react'
import {DeleteFormProps} from '../types'

export function DeleteForm({resource, idToDelete, onRecordDeleted}: DeleteFormProps) {
  const {mutate} = useDelete()

  useEffect(() => {
    mutate(
      {
        resource: resource,
        id: idToDelete,
      },
      {
        onError: (error, variables, context) => {
          throw Error(`deletion of record with id ${idToDelete} failed: ${error.message}`)
        },
        onSuccess: (data, variables, context) => {
          if (onRecordDeleted) {
            onRecordDeleted()
          }
        },
      },
    )
  }, [mutate])

  return <div></div>
}
