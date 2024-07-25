import {assetMachine, documentDataGuard, ownerContactDataGuard, productDataGuard} from './assetsMachine'
import {
  Asset,
  AssetContext,
  AssetCreateSubRoute,
  AssetFilePermission,
  AssetInterpretType,
  AssetMachineEvents,
  AssetMachineStates,
  AssetProviderProps,
  AssetState,
  CredentialReference,
  MainRoute,
  Product,
  SelectedAssetFile,
} from '@typings'
import React, {useCallback, useEffect, useMemo, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {generateCredential} from '@helpers/Credentials/CredentialsHelper'
import {issueVerifiableCredential} from '@helpers/Credentials/CredentialService'
import {getWorkflowStepData, newCreateAssetWorkflowEntities, progressWorkflowState} from '../../workflows/simpleWorkflowRouter'
import {WorkflowStorageService} from '@objectstorage/WorkflowStorageService'
import {HttpError, useCreate, useDelete, useList, useTranslate} from '@refinedev/core'
import {createDID} from '@helpers/DID/DIDService'
import {useInterpret} from '@xstate/react'
import debug from 'debug'
import {CredentialMapper} from '@sphereon/ssi-types'
import {Contact, Party} from '@sphereon/ssi-sdk.data-store'

const assetStateNavigationListener = async (assetMachine: AssetInterpretType, state: AssetState, navigate: any) => {
  if (state.matches(AssetMachineStates.enterOwnerContactData)) {
    return navigate(AssetCreateSubRoute.CONTACTS)
  } else if (state.matches(AssetMachineStates.enterProductsData) && state.changed) {
    return navigate(AssetCreateSubRoute.PRODUCTS)
  } else if (state.matches(AssetMachineStates.enterDocumentsData) && state.changed) {
    return navigate(AssetCreateSubRoute.DOCUMENTS)
  } else if (state.matches(AssetMachineStates.enterAdditionalInformationData) && state.changed) {
    return navigate(AssetCreateSubRoute.SUMMARY)
  } else if (state.matches(AssetMachineStates.done) || state.matches(AssetMachineStates.aborted) || state.matches(AssetMachineStates.error)) {
    assetMachine.stop()
    debug(`Stopping asset machine: ${assetMachine.id}`)
    return navigate(MainRoute.ASSETS)
  }
}

export const AssetContextProvider = (props: AssetProviderProps): JSX.Element => {
  const {children} = props

  const instance = useInterpret(assetMachine(), {
    services: {
      publishAsset: async () => {
        return publishAsset()
      },
    },
    guards: {
      ownerContactDataGuard,
      productDataGuard,
      documentDataGuard,
    },
  })

  const navigate = useNavigate()
  const translate = useTranslate()
  const [disabled, setDisabled] = useState<boolean>(true)
  const [step, setStep] = useState<number>(1)
  const [isEditingProduct, setIsEditingProduct] = useState<boolean>(false)
  const [showDefineProductModal, setShowDefineProductModal] = useState<boolean>(false)
  const maxInteractiveSteps: number = 4
  const maxAutoSteps: number = 1
  const {mutateAsync: insertAsset} = useCreate<Asset, HttpError>()
  const {mutateAsync: insertCredentialReference} = useCreate<CredentialReference, HttpError>()
  const {mutateAsync: deleteAsset} = useDelete<Asset, HttpError>()
  const parties = useList<Party, HttpError>({resource: 'parties'})

  const partiesByContactId: Map<string, Party> = useMemo(() => {
    return new Map<string, Party>((parties.data?.data ?? []).map(p => [p.contact.id, p] as [string, Party]))
  }, [parties, parties.data])

  const contacts: Contact[] = useMemo(() => {
    return Array.from(partiesByContactId.values(), p => p.contact)
  }, [partiesByContactId])

  const publishAsset = useCallback(async (): Promise<void> => {
    const {ownerContact, product, assetName, additionalInformation, document} = {...instance.getSnapshot().context}
    if (!ownerContact) {
      throw new Error('No contact was selected')
    }
    if (!product) {
      throw new Error('No product was selected')
    }
    if (!partiesByContactId) {
      throw new Error('No parties for the contact id')
    }
    if (!assetName) {
      throw new Error('No asset name was provided')
    }

    const party = partiesByContactId.get(ownerContact.id)
    const issuerIdentity = party?.identities && party.identities.length > 0 ? party.identities[0] : undefined // TODO when there more identities, it needs to be selected in the input form
    if (!party || !issuerIdentity) {
      throw new Error('No identity was selected.')
    }

    const credential = generateCredential(assetName, ownerContact, issuerIdentity, product, {additionalInformation})
    if (!credential.id) {
      throw new Error('The credential id is not set while this is required for this application.')
    }
    const vc = await issueVerifiableCredential(credential)
    const did = await createDID()
    const asset = (
      await insertAsset(
        {
          dataProviderName: 'supaBase',
          resource: 'asset',
          values: {
            name: assetName,
            did,
            owner_id: issuerIdentity.identifier.correlationId,
            description: product.productNature,
            contact_id: ownerContact.id,
          },
        },
        {
          onError: error => {
            throw new Error(`Adding asset failed: ${JSON.stringify(error)}`)
          },
        },
      )
    ).data

    const assetId = asset.id

    //todo: here I think we need to have a connection from asset to the credential
    // https://sphereon.atlassian.net/browse/DPP-131
    const uniformVC = CredentialMapper.toUniformCredential(vc)
    await insertCredentialReference(
      {
        dataProviderName: 'supaBase',
        resource: 'credential_reference',
        values: {
          credential_id: uniformVC.id,
          credential_string: JSON.stringify(credential),
          asset_id: assetId,
        },
      },
      {
        onError: error => {
          deleteAsset(
            {
              dataProviderName: 'supaBase',
              resource: 'asset',
              id: assetId,
            },
            {
              onError: error => {
                throw new Error(`Asset rollback failed: ${JSON.stringify(error)}`)
              },
            },
          )
          throw new Error(`Adding credential failed: ${JSON.stringify(error)}`)
        },
      },
    )

    const result = await newCreateAssetWorkflowEntities(asset, Array.from(partiesByContactId.values()), translate)
    const workflowState = getWorkflowStepData(result.workflow, result.workflowStep)

    if (!document) {
      throw Error('No file present!')
    }
    const uploadResult = await WorkflowStorageService.uploadUsingState(document, workflowState)
    if (!uploadResult.data) {
      throw Error('Could not upload document')
    }
    return progressWorkflowState(result, [uploadResult.data.correlation_id])
  }, [])

  useEffect(() => {
    instance.onTransition(state => {
      assetStateNavigationListener(instance, state, navigate)
    })
    instance.subscribe(state => {
      setDisabled(!state.can(AssetMachineEvents.NEXT))
    })
    const handlePopstate = () => {
      const nextStep: number = step - 1
      if (step > 0) {
        setStep(nextStep)
      }
      instance.send(AssetMachineEvents.PREVIOUS)
    }
    window.addEventListener('popstate', handlePopstate)
    return () => {
      window.removeEventListener('popstate', handlePopstate)
    }
  }, [instance, step])

  const onNext = useCallback(async (): Promise<void> => {
    const nextStep: number = step + 1
    if (nextStep <= maxInteractiveSteps + maxAutoSteps) {
      instance.send(AssetMachineEvents.NEXT)
      setStep(nextStep)
    }
  }, [step, maxAutoSteps, maxInteractiveSteps])

  const onBack = useCallback(async (): Promise<void> => {
    const nextStep: number = step - 1
    if (nextStep >= 1) {
      setStep(nextStep)
    }
    instance.send(AssetMachineEvents.PREVIOUS)
  }, [step, maxAutoSteps, maxInteractiveSteps])

  const onOwnerContactChanged = useCallback(
    async (value?: Contact): Promise<void> => {
      instance.send({type: AssetMachineEvents.SET_OWNER_CONTACT, data: value})
    },
    [instance],
  )

  const onAssetNameChanged = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      instance.send({type: AssetMachineEvents.SET_ASSET_NAME, data: event.target.value})
    },
    [instance],
  )

  const onProductChanged = useCallback(
    async (product: Product): Promise<void> => {
      instance.send({type: AssetMachineEvents.SET_PRODUCT, data: product})
    },
    [instance],
  )

  const onEditProduct = useCallback(async (): Promise<void> => {
    setShowDefineProductModal(true)
    setIsEditingProduct(true)
  }, [])

  const onShowModal = useCallback(async (): Promise<void> => {
    setShowDefineProductModal(true)
  }, [showDefineProductModal])

  const onCloseModal = useCallback(async (): Promise<void> => {
    setShowDefineProductModal(false)
    setIsEditingProduct(false)
  }, [showDefineProductModal, isEditingProduct])

  const onAddFile = useCallback(
    async (file: File): Promise<void> => {
      // Adding private as default permission
      instance.send({type: AssetMachineEvents.SET_DOCUMENT, data: {file, permission: AssetFilePermission.PRIVATE}})
    },
    [instance],
  )

  const onFilePermissionChange = useCallback(
    async (selectedFile: SelectedAssetFile, permission: AssetFilePermission): Promise<void> => {
      instance.send({type: AssetMachineEvents.SET_FILE_PERMISSIONS, data: {...selectedFile, permission}})
    },
    [instance],
  )

  const onSetAdditionalInformation = useCallback(
    async (value: string): Promise<void> => {
      instance.send({type: AssetMachineEvents.SET_ADDITIONAL_INFORMATION, data: value})
    },
    [instance],
  )

  return (
    <AssetContext.Provider
      value={{
        onBack,
        onNext,
        onOwnerContactChanged,
        onAssetNameChanged,
        onProductChanged,
        onShowModal,
        onCloseModal,
        onEditProduct,
        onAddFile,
        onFilePermissionChange,
        onSetAdditionalInformation,
        contacts,
        isEditingProduct,
        showDefineProductModal,
        disabled,
        step,
        maxInteractiveSteps,
        context: instance.getSnapshot().context,
      }}>
      {children}
    </AssetContext.Provider>
  )
}
