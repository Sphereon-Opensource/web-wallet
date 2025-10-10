import {DcqlCredentialQuery} from 'dcql'

export enum DataProvider {
  DEFAULT = 'default',
  SUPABASE = 'supaBase',
  CREDENTIALS = 'credentials',
  KEYS = 'keys',
  IDENTIFIERS = 'identifiers',
  QUERIES = 'presentationDefinitions',
}

export type DcqlClaim = NonNullable<DcqlCredentialQuery['claims']>[number] // TODO find a better location for this