import React from 'react'
import {fireEvent, render, waitFor} from '@testing-library/react'
import {Refine} from '@refinedev/core'
import {dataProvider as supabaseDataProvider} from '@refinedev/supabase'
import '@testing-library/jest-dom'
import {MachineDTO} from '@typings'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {v4 as uuidv4} from 'uuid'
import {MachineForm} from './machine.form'
import {supabaseServiceClient} from '@helpers/SupabaseClient'
import {CrudFormProps, DeleteFormProps} from '../types'
import {DeleteForm} from './delete.form'

const tenantId = uuidv4()
let createdMachine: MachineDTO | undefined
let clonedMachine: MachineDTO | undefined

const buildMachineView = (crudFormProps: CrudFormProps<MachineDTO>) => {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <Refine dataProvider={supabaseDataProvider(supabaseServiceClient)}>
        <MachineForm {...crudFormProps} />
      </Refine>
    </QueryClientProvider>,
  )
}

const buildDeleteView = (deleteFormProps: DeleteFormProps) => {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <Refine dataProvider={supabaseDataProvider(supabaseServiceClient)}>
        <DeleteForm {...deleteFormProps} />
      </Refine>
    </QueryClientProvider>,
  )
}

describe('refineDev hook integration with database', () => {
  it('inserts a new machine record into the database', async () => {
    const {getByPlaceholderText, getByText} = buildMachineView({
      formAction: 'create',
      onRecordCommitted: (machine: MachineDTO) => (createdMachine = machine),
    })

    fireEvent.change(getByPlaceholderText('Machine Name'), {target: {value: 'test_machine_name'}})
    fireEvent.change(getByPlaceholderText('Tenant'), {target: {value: tenantId}})
    fireEvent.click(getByPlaceholderText('Persistence'))
    fireEvent.click(getByText('Submit'))

    await waitFor(() => expect(createdMachine).toBeTruthy())
    expect(createdMachine!.id).toHaveLength(36)
    expect(createdMachine!.name).toEqual('test_machine_name')
    expect(createdMachine!.tenantId).toEqual(tenantId)
    expect(createdMachine!.persistence).toEqual(true)
  })

  it('reads and updates the machine record in the database', async () => {
    let updatedMachine: Partial<MachineDTO> | undefined
    let formLoaded = false
    const {getByPlaceholderText, getByText} = buildMachineView({
      formAction: 'edit',
      idToLoad: createdMachine?.id,
      onRecordCommitted: (machine: Partial<MachineDTO>) => (updatedMachine = machine),
      onFormLoaded: () => (formLoaded = true),
    })

    await waitFor(() => expect(formLoaded).toEqual(true))

    // Modify & submit React form
    fireEvent.click(getByPlaceholderText('Persistence'))
    fireEvent.click(getByText('Submit'))

    await waitFor(() => expect(updatedMachine).toBeTruthy())
    expect(updatedMachine!.id).toEqual(createdMachine!.id)
    expect(updatedMachine!.persistence).not.toEqual(createdMachine!.persistence)
  })

  it('clones the machine record from the database', async () => {
    let formLoaded = false
    const {getByPlaceholderText, getByText} = buildMachineView({
      formAction: 'clone',
      idToLoad: createdMachine?.id,
      onRecordCommitted: (machine: MachineDTO) => (clonedMachine = machine),
      onFormLoaded: () => (formLoaded = true),
    })

    await waitFor(() => expect(formLoaded).toEqual(true))

    // Modify & submit React form
    fireEvent.change(getByPlaceholderText('Machine Name'), {target: {value: 'cloned_test_machine'}})
    fireEvent.click(getByText('Submit'))

    await waitFor(() => expect(clonedMachine).toBeTruthy())
    expect(clonedMachine!.id).not.toEqual(createdMachine!.id)
    expect(clonedMachine!.name).toEqual('cloned_test_machine')
  })

  it('deletes the create & cloned machine records from the database', async () => {
    expect(createdMachine).toBeTruthy()
    expect(clonedMachine).toBeTruthy()

    let recordDeleted = false
    buildDeleteView({
      resource: 'machine',
      idToDelete: createdMachine!.id,
      onRecordDeleted: () => (recordDeleted = true),
    })
    await waitFor(() => expect(recordDeleted).toEqual(true))

    recordDeleted = false
    buildDeleteView({
      resource: 'machine',
      idToDelete: clonedMachine!.id,
      onRecordDeleted: () => (recordDeleted = true),
    })
    await waitFor(() => expect(recordDeleted).toEqual(true))
  })
})
