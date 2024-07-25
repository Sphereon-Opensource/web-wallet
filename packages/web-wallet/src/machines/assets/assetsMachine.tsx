import {assign, createMachine} from 'xstate'
import {
  AdditionalInformationEvent,
  AssetEventTypes,
  AssetGuards,
  AssetMachineContext,
  AssetMachineEvents,
  AssetMachineStates,
  AssetNameEvent,
  CreateAssetMachineOpts,
  DocumentsEvent,
  FilePermissionChangedEvent,
  OwnerContactEvent,
  SetProductEvent,
} from '@typings'

export const ownerContactDataGuard = (ctx: AssetMachineContext, _event: AssetEventTypes) => {
  return !!ctx.ownerContact
}

export const productDataGuard = (ctx: AssetMachineContext, _event: AssetEventTypes) => {
  return !!ctx.assetName && ctx.assetName.length > 0 && !!ctx.product
}

export const documentDataGuard = (ctx: AssetMachineContext, _event: AssetEventTypes) => {
  return !!ctx.document
}

const ASSET_MACHINE_ID = 'assetMachine'
export const assetMachine = (opts?: CreateAssetMachineOpts) => {
  const initialContext: AssetMachineContext = {
    assetName: '',
  }
  return createMachine<AssetMachineContext, AssetEventTypes>({
    id: opts?.machineId ?? ASSET_MACHINE_ID,
    predictableActionArguments: true,
    initial: AssetMachineStates.enterOwnerContactData,
    schema: {
      events: {} as AssetEventTypes,
      guards: {} as
        | {
            type: AssetGuards.ownerContactDataGuard
          }
        | {
            type: AssetGuards.productDataGuard
          }
        | {
            type: AssetGuards.documentDataGuard
          },
      services: {} as {
        publishAsset: {
          data: void
        }
      },
    },
    context: {
      ...initialContext,
    },
    states: {
      [AssetMachineStates.enterOwnerContactData]: {
        on: {
          [AssetMachineEvents.SET_OWNER_CONTACT]: {
            actions: assign({ownerContact: (_ctx, e: OwnerContactEvent) => e.data}),
          },
          [AssetMachineEvents.NEXT]: {
            target: AssetMachineStates.enterProductsData,
            cond: AssetGuards.ownerContactDataGuard,
          },
          [AssetMachineEvents.PREVIOUS]: {
            target: AssetMachineStates.aborted,
          },
        },
      },
      [AssetMachineStates.enterProductsData]: {
        on: {
          [AssetMachineEvents.SET_ASSET_NAME]: {
            actions: assign({assetName: (_ctx, e: AssetNameEvent) => e.data}),
          },
          [AssetMachineEvents.SET_PRODUCT]: {
            actions: assign({product: (_ctx, e: SetProductEvent) => e.data}),
          },
          [AssetMachineEvents.NEXT]: {
            target: AssetMachineStates.enterDocumentsData,
            cond: AssetGuards.productDataGuard,
          },
          [AssetMachineEvents.PREVIOUS]: {
            target: AssetMachineStates.enterOwnerContactData,
          },
        },
      },
      [AssetMachineStates.enterDocumentsData]: {
        on: {
          [AssetMachineEvents.SET_DOCUMENT]: {
            actions: assign({document: (_ctx, e: DocumentsEvent) => e.data}),
          },
          [AssetMachineEvents.SET_FILE_PERMISSIONS]: {
            actions: assign({document: (_ctx, e: FilePermissionChangedEvent) => e.data}),
          },
          [AssetMachineEvents.NEXT]: {
            target: AssetMachineStates.enterAdditionalInformationData,
            cond: AssetGuards.documentDataGuard,
          },
          [AssetMachineEvents.PREVIOUS]: {
            target: AssetMachineStates.enterProductsData,
          },
        },
      },
      [AssetMachineStates.enterAdditionalInformationData]: {
        on: {
          [AssetMachineEvents.SET_ADDITIONAL_INFORMATION]: {
            actions: assign({additionalInformation: (_ctx, e: AdditionalInformationEvent) => e.data}),
          },
          [AssetMachineEvents.NEXT]: {
            target: AssetMachineStates.publishAsset,
          },
          [AssetMachineEvents.PREVIOUS]: {
            target: AssetMachineStates.enterDocumentsData,
          },
        },
      },
      [AssetMachineStates.publishAsset]: {
        invoke: {
          id: AssetMachineStates.publishAsset,
          src: AssetMachineStates.publishAsset,
          onDone: {
            target: AssetMachineStates.done,
          },
          onError: {
            target: AssetMachineStates.error,
            actions: assign({error: (_ctx, e) => e.data}),
          },
        },
      },
      [AssetMachineStates.done]: {
        type: 'final',
        id: AssetMachineStates.done,
      },
      [AssetMachineStates.error]: {
        type: 'final',
        id: AssetMachineStates.error,
      },
      [AssetMachineStates.aborted]: {
        type: 'final',
        id: AssetMachineStates.aborted,
      },
    },
  })
}
