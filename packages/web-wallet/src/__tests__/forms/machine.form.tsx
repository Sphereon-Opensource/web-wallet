import React, {useEffect} from 'react'
import {MachineDTO, MachineEntity, MachineEntityType} from '@typings'
import {CreateResponse, FormAction, HttpError, useForm} from '@refinedev/core'
import {UseFormProps} from '@refinedev/core'
import {v4 as uuidv4} from 'uuid'
import {CrudFormProps} from '../types'

export function MachineForm({formAction, idToLoad, onFormLoaded, onRecordCommitted}: CrudFormProps<MachineDTO>) {
  const [partialDto, setPartialDto] = React.useState<Partial<MachineDTO>>({})
  const {onFinish, queryResult} = useForm<MachineEntity, HttpError, Partial<MachineEntity>>(buildUseFormOpts(formAction, idToLoad))

  const dtoFromResponse = (entityResponse: any) => {
    const newDto = new MachineEntity(entityResponse.data).asDTO()
    if (formAction === 'clone') {
      newDto.id = uuidv4() // I did not get clone to work with an auto-generated id. On submission, it seems to behave like the edit mode.
    }
    return newDto
  }

  React.useEffect(() => {
    const {data: entityResponse, isLoading, status, error} = queryResult ?? {}
    const isError = status === 'error'

    if (isError && error) {
      throw Error('Could not load the machineDTO: ' + error.message)
    }

    if (Object.keys(partialDto).length === 0 && !isLoading && entityResponse) {
      setPartialDto(dtoFromResponse(entityResponse))
    }
  }, [queryResult, partialDto, formAction])

  useEffect(() => {
    if (onFormLoaded) {
      if (Object.keys(partialDto).length > 0) {
        onFormLoaded()
      }
    }
  }, [partialDto, onFormLoaded])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {name, value, checked, type} = e.target
    setPartialDto(prev => ({...prev, [name]: type === 'checkbox' ? checked : value}))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const machineEntity = new MachineDTO(partialDto).asEntity()
    const response: CreateResponse<Partial<MachineEntityType>> | void = await onFinish(machineEntity)
    if (onRecordCommitted) {
      const entityType = (response as CreateResponse<Partial<MachineEntityType>>).data
      if (entityType) {
        partialDto.id = entityType.id
      }
      onRecordCommitted(new MachineDTO(partialDto))
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input type="hidden" name="id" placeholder="Id" value={partialDto.id} />
        <input name="name" placeholder="Machine Name" value={partialDto.name} onChange={handleChange} />
        <input name="tenantId" placeholder="Tenant" value={partialDto.tenantId} onChange={handleChange} />
        <input type="checkbox" name="persistence" placeholder="Persistence" checked={partialDto.persistence} onChange={handleChange} />
        <button type="submit">Submit</button>
      </form>
    </div>
  )
}

function buildUseFormOpts(formAction: FormAction, idToLoad?: string): UseFormProps<MachineEntity, HttpError, Partial<MachineEntity>> {
  if (!idToLoad && (formAction === 'edit' || formAction === 'clone')) {
    throw Error(`${formAction} mode requires idToLoad to be set`)
  }

  return {
    resource: 'machine',
    action: formAction,
    ...(idToLoad && {id: idToLoad}),
    meta: formAction === 'create' ? {select: 'id'} : formAction === 'clone' ? {select: '*'} : undefined,
  }
}
