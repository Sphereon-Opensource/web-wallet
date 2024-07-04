// TODO replace with proper type
export type Product = {
  productNature: string
  productSpecification: string
  countryOfOrigin: string
  rawAmount: number
  unit: string
  finalDeliveryDate: string
  [x: string]: any
}

export type Asset = {
  id: string
  name: string
  owner_id: string // TODO rename to owner_did after clearing DB
  description: string
  contact_id: string
  [x: string]: any
}
