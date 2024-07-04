export enum KeyManagementSystem {
  LOCAL = 'local',
}

export type IdentifierType = 'did'

export type IdentifierMethod = string

export type IdentifierOrigin = 'External' | 'Managed'

export type KeyManagementIdentifier = {
  type: IdentifierType
  method: IdentifierMethod
  alias?: string
  value: string
  origin: IdentifierOrigin
}
