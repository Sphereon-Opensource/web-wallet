import {Interpreter, State, StateMachine} from 'xstate'
import React, {createContext, ReactNode, useContext} from 'react'
import {NavigateFunction, useOutletContext} from 'react-router-dom'
import {AssetFilePermission, Product, SelectedAssetFile} from '@typings'
import {Contact} from '@sphereon/ssi-sdk.data-store'

export enum AssetMachineEvents {
  NEXT = 'NEXT',
  PREVIOUS = 'PREVIOUS',
  SET_OWNER_CONTACT = 'SET_OWNER_CONTACT',
  SET_ASSET_NAME = 'SET_ASSET_NAME',
  SET_PRODUCT = 'SET_PRODUCT',
  SET_DOCUMENT = 'SET_DOCUMENT',
  SET_FILE_PERMISSIONS = 'SET_FILE_PERMISSIONS',
  SET_ADDITIONAL_INFORMATION = 'SET_ADDITIONAL_INFORMATION',
}

export enum AssetMachineStates {
  enterOwnerContactData = 'enterOwnerContactData',
  enterProductsData = 'enterProductsData',
  enterDocumentsData = 'enterDocumentsData',
  enterAdditionalInformationData = 'enterAdditionalInformationData',
  publishAsset = 'publishAsset',
  aborted = 'aborted',
  done = 'done',
  error = 'error',
}

export enum AssetGuards {
  ownerContactDataGuard = 'ownerContactDataGuard',
  productDataGuard = 'productDataGuard',
  documentDataGuard = 'documentDataGuard',
}

export type AssetMachineContext = {
  assetName: string
  ownerContact?: Contact
  product?: Product
  document?: SelectedAssetFile
  additionalInformation?: string
  error?: any
}
export type CreateAssetMachineOpts = {
  machineId?: string
}

export type InstanceAssetMachineOpts = CreateAssetMachineOpts & {
  machine: StateMachine<AssetMachineContext, any, AssetEventTypes>
  navigate: NavigateFunction
  services?: any
  guards?: any
  subscription?: any
  requireCustomNavigationHook?: boolean
}

export type AssetInterpretType = Interpreter<
  AssetMachineContext,
  any,
  AssetEventTypes,
  {
    value: any
    context: AssetMachineContext
  },
  any
>

export type PreviousAssetEvent = {type: AssetMachineEvents.PREVIOUS; data?: any}
export type NextAssetEvent = {type: AssetMachineEvents.NEXT; data?: any}
export type OwnerContactEvent = {type: AssetMachineEvents.SET_OWNER_CONTACT; data?: Contact}
export type AssetNameEvent = {type: AssetMachineEvents.SET_ASSET_NAME; data: string}
export type SetProductEvent = {type: AssetMachineEvents.SET_PRODUCT; data: Product}
export type DocumentsEvent = {type: AssetMachineEvents.SET_DOCUMENT; data: SelectedAssetFile}
export type FilePermissionChangedEvent = {type: AssetMachineEvents.SET_FILE_PERMISSIONS; data: SelectedAssetFile}
export type AdditionalInformationEvent = {type: AssetMachineEvents.SET_ADDITIONAL_INFORMATION; data: string}
export type AssetEventTypes =
  | NextAssetEvent
  | PreviousAssetEvent
  | OwnerContactEvent
  | AssetNameEvent
  | SetProductEvent
  | DocumentsEvent
  | AdditionalInformationEvent
  | FilePermissionChangedEvent
export type AssetState = State<AssetMachineContext, AssetEventTypes, any, {value: any; context: AssetMachineContext}, any>

type UIContextType = {
  onNext: () => Promise<void>
  onBack: () => Promise<void>
  step: number
  maxInteractiveSteps: number
  disabled?: boolean
}

export type AddOwnerContactToAssetContext = {
  onOwnerContactChanged: (value?: Contact) => Promise<void>
  contacts: Contact[]
}

export type DefineAssetProductContentContext = {
  onAssetNameChanged: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  onShowModal: () => Promise<void>
  onCloseModal: () => Promise<void>
  onEditProduct: () => Promise<void>
  isEditingProduct: boolean
  showDefineProductModal: boolean
}

export type AddDocumentContentContext = {
  onAddFile: (file: File) => Promise<void>
  onFilePermissionChange: (selectedFile: SelectedAssetFile, permission: AssetFilePermission) => Promise<void>
}

export type GetAssetSummaryContentContext = AddOwnerContactToAssetContext &
  DefineAssetProductContentContext &
  AddDocumentContentContext & {
    onSetAdditionalInformation: (value: string) => Promise<void>
  }

export type AssetContextType = UIContextType &
  AddOwnerContactToAssetContext &
  DefineAssetProductContentContext &
  AddDocumentContentContext &
  GetAssetSummaryContentContext & {
    onProductChanged: (product: Product) => Promise<void>
    context: AssetMachineContext
  }

export const AssetContext = createContext({} as AssetContextType)
export const useAssetMachine = () => useContext(AssetContext)
export const useAssetOutletContext = () => useOutletContext<AssetContextType>()

export type AssetProviderProps = {
  children?: ReactNode
  customAssetInstance?: AssetInterpretType
  opts?: InstanceAssetMachineOpts
}
