import {DcqlCredentialQuery} from 'dcql'

export enum DataProvider {
  DEFAULT = 'default',
  SUPABASE = 'supaBase',
  CREDENTIALS = 'credentials',
  KEYS = 'keys',
  IDENTIFIERS = 'identifiers',
  QUERIES = 'presentationDefinitions',
  CREDENTIAL_DESIGNS = 'credential_designs',
}
