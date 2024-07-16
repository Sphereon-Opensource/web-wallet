import {DIDDocumentSection, TKeyType} from '@veramo/core'
import {JsonFormsCore} from '@jsonforms/core'
import {v4} from 'uuid'

export enum KeyManagementSystem {
  LOCAL = 'local',
}

export type IdentifierType = 'did'

export type IdentifierMethod = string

export type IdentifierOrigin = 'External' | 'Managed'

export type JSONFormTypeState<DataType> = Pick<JsonFormsCore, 'errors'> & {data: DataType}

export type KeyManagementIdentifier = {
  type: IdentifierType
  method: IdentifierMethod
  network?: string
  ebsi?: DidEbsi
  web?: DidWeb
  alias?: string
  value: string
  origin: IdentifierOrigin
}

export type DidWeb = {
  hostName: string
  path?: string
}

export type DidEbsi = {
  executeLedgerOperation: boolean
  tao: Tao
}

export type Tao = {
  name?: string
  url: string
}

export type IdentifierServiceEndpoint = {
  id: string
  type: string
  serviceEndpoint: string
}

export type IdentifierKey = {
  id: string
  action?: 'generate'
  type: TKeyType
  alias?: string
  purposes: Array<string>
  capability: IdentifierKeyCapability
  readonly: boolean
}

/**
 * TODO: Move to SDK!
 */

export type IdentifierKeyCapability = {
  keyType: TKeyType
  vmRelationShips: DIDDocumentSection[]
  label?: string
  codecName?: string
  meta?: Record<string, any>
  minKeys?: number
  maxKeys?: number
  readonly?: boolean
  allowed: {
    asControllerKey: boolean
    importable: boolean
    vmRelationShipSelection: boolean
    updates: boolean
  }
}

export type IdentifierCapability = {
  method: string
  label: string
  minKeys: number
  maxKeys: number
  serviceEndpoints: boolean
  create: {
    keyTypes: IdentifierKeyCapability[]
    serviceEndpoints?: boolean
  }
  add: {
    supported: boolean
    keyTypes?: IdentifierKeyCapability[]
    serviceEndpoints?: boolean
    controllerKeys?: boolean
  }
  delete: {
    supported: boolean
    controllerKeys?: boolean
    serviceEndpoints?: boolean
  }
}

/**
 * Searches across all key capabilities of an identifier capability for minimum read only keys required and generates them
 *
 * Please note that this method does not perform the actual key generation. That is happening in the backend to not leak any private keys
 *
 * @param identifierCapability
 */
export const generateReadOnlyUIKeysForAdd = (identifierCapability: IdentifierCapability): Array<IdentifierKey> => {
  let keyNr = 1
  return (
    identifierCapability.create.keyTypes
      ?.filter(keyCap => keyCap.readonly === true)
      .flatMap(keyCap => {
        let keys: IdentifierKey[] = []
        for (let i = 0; i < (keyCap.minKeys ?? 1); i++) {
          keys.push(
            generateUIKey({
              keyCapability: keyCap,
              identifierCapability,
              aliasKeyNumber: keyNr++,
              createAlias: true,
              readonly: true,
            }),
          )
        }
        return keys
      }) ?? []
  )
}

/**
 * Generates a single key based on a key capability
 *
 * Please note that this method does not perform the actual key generation. That is happening in the backend to not leak any private keys
 *
 * @param keyCapability
 * @param identifierCapability
 * @param readonly
 * @param createAlias
 * @param aliasKeyNumber
 */
export const generateUIKey = ({
  keyCapability,
  identifierCapability,
  readonly = false,
  createAlias = true,
  aliasKeyNumber,
}: {
  keyCapability: IdentifierKeyCapability
  identifierCapability?: IdentifierCapability
  readonly?: boolean
  createAlias?: boolean
  aliasKeyNumber?: number
}): IdentifierKey => {
  const keyNumber = aliasKeyNumber ? `-${aliasKeyNumber}` : ''
  const method = identifierCapability?.method ? `${identifierCapability.method}` : ''
  return {
    id: v4(),
    alias: `${method}${keyNumber}-${new Date().toISOString()} ${keyCapability.label}`,
    type: keyCapability.keyType,
    purposes: keyCapability.vmRelationShips,
    capability: keyCapability,
    readonly,
  }
}

export type UIKeyCountInfo = {
  keyCapability: IdentifierKeyCapability
  keyType: TKeyType
  label?: string
  keys: IdentifierKey[]
  minKeys: number
  maxKeys?: number
  count: number
  error?: string
}

export type UIKeyCapabilitiesInfo = {identifierCapability: IdentifierCapability; keys: UIKeyCountInfo[]; errors: string[]}
export const calculateUIKeyCapabilitiesInfo = ({
  identifierCapability,
  keys,
  mode = identifierCapability.create,
}: {
  identifierCapability: IdentifierCapability
  keys: Array<IdentifierKey>
  mode?: IdentifierCapability['create'] | IdentifierCapability['add']
}): UIKeyCapabilitiesInfo => {
  let errors: string[] = []
  const countInfo =
    mode.keyTypes?.map(keyCap => {
      const minKeys = keyCap.minKeys ?? 0
      const maxKeys = keyCap.maxKeys ?? Number.MAX_VALUE
      const filteredKeys: IdentifierKey[] = keys.filter(key => key.type === keyCap.keyType)
      const count = filteredKeys.length

      let error: undefined | string = undefined
      if (count < minKeys) {
        error = `At least ${minKeys} of type ${keyCap.label} required, but ${count} found`
      } else if (count > maxKeys) {
        error = `At most ${minKeys} of type ${keyCap.label} required, but ${count} found`
      }
      if (error) {
        errors.push(error)
      }
      return <UIKeyCountInfo>{
        keyCapability: keyCap,
        keyType: keyCap.keyType,
        label: keyCap.label,
        keys: filteredKeys,
        minKeys,
        maxKeys,
        count,
        error,
      }
    }) ?? []

  if (identifierCapability.minKeys && keys.length < identifierCapability.minKeys) {
    errors.push(`At least ${identifierCapability.minKeys} keys are required for DID method ${identifierCapability.label}, ${keys.length} found`)
  } else if (identifierCapability.maxKeys && keys.length > identifierCapability.maxKeys) {
    errors.push(`At most ${identifierCapability.maxKeys} keys are required for DID method ${identifierCapability.label}, ${keys.length} found`)
  }
  return {
    identifierCapability,
    errors,
    keys: countInfo,
  }
}

/*
export const areAllUIKeysPresentForAdd = ({identifierCapability, keys, mode}: {
    identifierCapability: IdentifierCapability,
    keys: Array<IdentifierKey>,
    mode: IdentifierCapability['create'] | IdentifierCapability['add']
}): boolean => {
    if ((identifierCapability.minKeys && keys.length < identifierCapability.minKeys) || (identifierCapability.maxKeys && keys.length > identifierCapability.maxKeys)) {
        console.log(`Too few (${identifierCapability.minKeys}) or too many (${identifierCapability.maxKeys}) keys exist: ${keys.length}`)
        return false
    }
    const keyIssues = mode.keyTypes?.filter(keyCap => {
        if (keyCap.minKeys || keyCap.maxKeys) {
            const filteredKeys: IdentifierKey[] = keys.filter(key => key.type === keyCap.keyType)
            if ((keyCap.minKeys && filteredKeys.length < keyCap.minKeys) || (keyCap.maxKeys && filteredKeys.length > keyCap.maxKeys)) {
                console.log(`Too few (${keyCap.minKeys}) or too many (${keyCap.maxKeys}) keys exist: ${filteredKeys.length}`)
                return true
            }
        }
        return false
    }) ?? []

    return keyIssues.length === 0
}
*/

export const KEYIdentifierCapabilities: IdentifierCapability = {
  method: 'key',
  label: 'KEY',
  minKeys: 1,
  maxKeys: 1,
  serviceEndpoints: false,
  create: {
    keyTypes: [
      {
        label: 'ES256 (Secp256r1)',
        keyType: 'Secp256r1',
        vmRelationShips: ['capabilityDelegation', 'capabilityInvocation', 'assertionMethod', 'authentication', 'keyAgreement', 'verificationMethod'],
        minKeys: 0,
        maxKeys: 1,
        allowed: {
          vmRelationShipSelection: false,
          asControllerKey: true,
          importable: true,
          updates: false,
        },
      },
      {
        label: 'ES256k1 (Secp256k1)',
        keyType: 'Secp256k1',
        vmRelationShips: ['capabilityDelegation', 'capabilityInvocation', 'assertionMethod', 'authentication', 'keyAgreement', 'verificationMethod'],
        minKeys: 0,
        maxKeys: 1,
        allowed: {
          vmRelationShipSelection: false,
          asControllerKey: true,
          importable: true,
          updates: false,
        },
      },
      {
        label: 'Ed25519',
        keyType: 'Ed25519',
        vmRelationShips: ['capabilityDelegation', 'capabilityInvocation', 'assertionMethod', 'authentication', 'keyAgreement', 'verificationMethod'],
        minKeys: 0,
        maxKeys: 1,
        allowed: {
          vmRelationShipSelection: false,
          asControllerKey: true,
          importable: true,
          updates: false,
        },
      },
      {
        label: 'RSA',
        keyType: 'RSA',
        vmRelationShips: ['capabilityDelegation', 'capabilityInvocation', 'assertionMethod', 'authentication', 'keyAgreement', 'verificationMethod'],
        minKeys: 0,
        maxKeys: 1,
        allowed: {
          vmRelationShipSelection: false,
          asControllerKey: true,
          importable: true,
          updates: false,
        },
      },
    ],
    serviceEndpoints: false,
  },
  add: {
    supported: false,
  },
  delete: {
    supported: false,
  },
}

const KEY_jwk_jcsIdentifierCapabilities = JSON.parse(JSON.stringify(KEYIdentifierCapabilities))
KEY_jwk_jcsIdentifierCapabilities.label = 'EBSI Natural Person'
KEY_jwk_jcsIdentifierCapabilities.create.keyTypes = KEYIdentifierCapabilities.create.keyTypes.map(keyType => {
  keyType.codecName = 'jwk_jcs-pub'
  return keyType
})

export const JWKIdentifierCapabilities: IdentifierCapability = {
  method: 'jwk',
  label: 'JWK',
  minKeys: 1,
  maxKeys: 1,
  serviceEndpoints: false,
  create: {
    keyTypes: [
      {
        label: 'ES256 (Secp256r1)',
        keyType: 'Secp256r1',
        vmRelationShips: ['capabilityDelegation', 'capabilityInvocation', 'assertionMethod', 'authentication', 'keyAgreement', 'verificationMethod'],
        minKeys: 0,
        maxKeys: 1,
        allowed: {
          vmRelationShipSelection: false,
          asControllerKey: true,
          importable: true,
          updates: false,
        },
      },
      {
        label: 'ES256k1 (Secp256k1)',
        keyType: 'Secp256k1',
        vmRelationShips: ['capabilityDelegation', 'capabilityInvocation', 'assertionMethod', 'authentication', 'keyAgreement', 'verificationMethod'],
        minKeys: 0,
        maxKeys: 1,
        allowed: {
          vmRelationShipSelection: false,
          asControllerKey: true,
          importable: true,
          updates: false,
        },
      },
      {
        label: 'Ed25519',
        keyType: 'Ed25519',
        vmRelationShips: ['capabilityDelegation', 'capabilityInvocation', 'assertionMethod', 'authentication', 'keyAgreement', 'verificationMethod'],
        minKeys: 0,
        maxKeys: 1,
        allowed: {
          vmRelationShipSelection: false,
          asControllerKey: true,
          importable: true,
          updates: false,
        },
      },
      {
        label: 'RSA',
        keyType: 'RSA',
        vmRelationShips: ['capabilityDelegation', 'capabilityInvocation', 'assertionMethod', 'authentication', 'keyAgreement', 'verificationMethod'],
        minKeys: 0,
        maxKeys: 1,
        allowed: {
          vmRelationShipSelection: false,
          asControllerKey: true,
          importable: true,
          updates: false,
        },
      },
    ],
    serviceEndpoints: false,
  },
  add: {
    supported: false,
  },
  delete: {
    supported: false,
  },
}

export const EBSIIdentifierCapabilities: IdentifierCapability = {
  method: 'ebsi',
  label: 'EBSI Legal Entity',
  minKeys: 2,
  maxKeys: 10, // TODO: Remove in the future, so we can have the user define optional keys during creation
  serviceEndpoints: true,
  create: {
    keyTypes: [
      {
        label: 'ES256 (Secp256r1)',
        keyType: 'Secp256r1',
        vmRelationShips: ['assertionMethod', 'authentication', 'verificationMethod'],
        readonly: true,
        minKeys: 1,
        maxKeys: 1,
        allowed: {
          vmRelationShipSelection: false,
          asControllerKey: false,
          importable: true,
          updates: true,
        },
      },
      {
        label: 'ES256k1 (Secp256k1)',
        keyType: 'Secp256k1',
        vmRelationShips: ['capabilityDelegation', 'capabilityInvocation', 'keyAgreement', 'verificationMethod'],
        readonly: true,
        minKeys: 1,
        maxKeys: 1,
        allowed: {
          vmRelationShipSelection: false,
          asControllerKey: true,
          importable: true,
          updates: false,
        },
      },
      {
        label: 'Ed25519',
        keyType: 'Ed25519',
        vmRelationShips: ['capabilityDelegation', 'capabilityInvocation', 'assertionMethod', 'authentication', 'keyAgreement', 'verificationMethod'],
        readonly: false,
        allowed: {
          vmRelationShipSelection: false,
          asControllerKey: true,
          importable: true,
          updates: false,
        },
      },
      {
        label: 'RSA',
        keyType: 'RSA',
        vmRelationShips: ['capabilityDelegation', 'capabilityInvocation', 'assertionMethod', 'authentication', 'keyAgreement', 'verificationMethod'],
        readonly: false,
        allowed: {
          vmRelationShipSelection: false,
          asControllerKey: true,
          importable: true,
          updates: false,
        },
      },
    ],
    serviceEndpoints: true,
  },
  add: {
    supported: true,
    keyTypes: [
      {
        label: 'ES256 (Secp256r1)',
        keyType: 'Secp256r1',
        vmRelationShips: ['assertionMethod', 'authentication', 'verificationMethod', 'keyAgreement'],
        readonly: false,
        allowed: {
          vmRelationShipSelection: true,
          asControllerKey: false,
          importable: true,
          updates: true,
        },
      },
      {
        label: 'ES256k1 (Secp256k1)',
        keyType: 'Secp256k1',
        vmRelationShips: ['assertionMethod', 'authentication', 'verificationMethod', 'keyAgreement'],
        readonly: false,
        allowed: {
          vmRelationShipSelection: true,
          asControllerKey: false,
          importable: true,
          updates: false,
        },
      },
      {
        label: 'Ed25519',
        keyType: 'Ed25519',
        vmRelationShips: ['assertionMethod', 'authentication', 'keyAgreement', 'verificationMethod'],
        readonly: false,
        allowed: {
          vmRelationShipSelection: true,
          asControllerKey: false,
          importable: true,
          updates: false,
        },
      },
      {
        label: 'RSA',
        keyType: 'RSA',
        vmRelationShips: ['assertionMethod', 'authentication', 'keyAgreement', 'verificationMethod'],
        readonly: false,
        allowed: {
          vmRelationShipSelection: true,
          asControllerKey: false,
          importable: true,
          updates: false,
        },
      },
    ],
    serviceEndpoints: true,
  },
  delete: {
    supported: true,
    controllerKeys: false,
    serviceEndpoints: true,
  },
}

export const WEBIdentifierCapabilities: IdentifierCapability = {
  method: 'web',
  label: 'WEB',
  minKeys: 0,
  maxKeys: Number.MAX_VALUE,
  serviceEndpoints: true,
  create: {
    keyTypes: [
      {
        label: 'ES256 (Secp256r1)',
        keyType: 'Secp256r1',
        vmRelationShips: ['assertionMethod', 'authentication', 'verificationMethod'],
        readonly: false,
        allowed: {
          vmRelationShipSelection: true,
          asControllerKey: true,
          importable: true,
          updates: true,
        },
      },
      {
        label: 'ES256k1 (Secp256k1)',
        keyType: 'Secp256k1',
        vmRelationShips: ['capabilityDelegation', 'capabilityInvocation', 'keyAgreement', 'assertionMethod', 'authentication', 'verificationMethod'],
        readonly: false,
        allowed: {
          vmRelationShipSelection: true,
          asControllerKey: true,
          importable: true,
          updates: true,
        },
      },
      {
        label: 'Ed25519',
        keyType: 'Ed25519',
        vmRelationShips: ['capabilityDelegation', 'capabilityInvocation', 'assertionMethod', 'authentication', 'keyAgreement', 'verificationMethod'],
        readonly: false,
        allowed: {
          vmRelationShipSelection: true,
          asControllerKey: true,
          importable: true,
          updates: true,
        },
      },
      {
        label: 'RSA',
        keyType: 'RSA',
        vmRelationShips: ['capabilityDelegation', 'capabilityInvocation', 'assertionMethod', 'authentication', 'keyAgreement', 'verificationMethod'],
        readonly: false,
        allowed: {
          vmRelationShipSelection: true,
          asControllerKey: true,
          importable: true,
          updates: false,
        },
      },
    ],
    serviceEndpoints: true,
  },
  add: {
    supported: true,
    keyTypes: [
      {
        label: 'ES256 (Secp256r1)',
        keyType: 'Secp256r1',
        vmRelationShips: ['assertionMethod', 'authentication', 'verificationMethod'],
        readonly: false,
        allowed: {
          vmRelationShipSelection: true,
          asControllerKey: true,
          importable: true,
          updates: true,
        },
      },
      {
        label: 'ES256k1 (Secp256k1)',
        keyType: 'Secp256k1',
        vmRelationShips: ['capabilityDelegation', 'capabilityInvocation', 'keyAgreement', 'assertionMethod', 'authentication', 'verificationMethod'],
        readonly: false,
        allowed: {
          vmRelationShipSelection: true,
          asControllerKey: true,
          importable: true,
          updates: true,
        },
      },
      {
        label: 'Ed25519',
        keyType: 'Ed25519',
        vmRelationShips: ['capabilityDelegation', 'capabilityInvocation', 'assertionMethod', 'authentication', 'keyAgreement', 'verificationMethod'],
        readonly: false,
        allowed: {
          vmRelationShipSelection: true,
          asControllerKey: true,
          importable: true,
          updates: true,
        },
      },
      {
        label: 'RSA',
        keyType: 'RSA',
        vmRelationShips: ['capabilityDelegation', 'capabilityInvocation', 'assertionMethod', 'authentication', 'keyAgreement', 'verificationMethod'],
        readonly: false,
        allowed: {
          vmRelationShipSelection: true,
          asControllerKey: true,
          importable: true,
          updates: false,
        },
      },
    ],
    serviceEndpoints: true,
  },
  delete: {
    supported: true,
    controllerKeys: false,
    serviceEndpoints: true,
  },
}

export const IdentifierCapabilities: Record<string, IdentifierCapability> = {
  ebsi: EBSIIdentifierCapabilities,
  jwk: JWKIdentifierCapabilities,
  key: KEYIdentifierCapabilities,
  ['key:jwk_jcs-pub']: KEY_jwk_jcsIdentifierCapabilities,
  web: WEBIdentifierCapabilities,
}
