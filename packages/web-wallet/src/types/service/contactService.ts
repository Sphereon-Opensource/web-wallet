import {ElectronicAddress, NaturalPerson, PartyType, PhysicalAddress} from '@sphereon/ssi-sdk.data-store'

export type AddNaturalPersonArgs = Omit<NaturalPerson, 'id' | 'createdAt' | 'lastUpdatedAt'> & {
  uri?: string
  electronicAddresses: Omit<ElectronicAddress, 'id' | 'createdAt' | 'lastUpdatedAt'>[]
  physicalAddresses: Omit<PhysicalAddress, 'id' | 'createdAt' | 'lastUpdatedAt'>[]
  contactType: PartyType
}

export type AddPartyRelationshipArgs = {
  left_id: string
  right_id: string
}
