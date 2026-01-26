import {DcqlCredentialQuery} from 'dcql'

export enum DataProvider {
  DEFAULT = 'default',
  CREDENTIALS = 'credentials',
  KEYS = 'keys',
  IDENTIFIERS = 'identifiers',
  EXTERNAL_IDENTIFIERS = 'externalIdentifiers',
  QUERIES = 'presentationDefinitions',
  CREDENTIAL_DESIGNS = 'credential_designs',
  BOOKING = 'booking',
}

export type DcqlClaim = NonNullable<DcqlCredentialQuery['claims']>[number] // TODO find a better location for this
