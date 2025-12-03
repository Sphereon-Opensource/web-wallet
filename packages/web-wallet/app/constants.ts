import {getEnv} from '@/src/services/env'

export const OID4VCI_STATE_STORAGE_KEY = 'oid4vci-state'
export const getClientId = () =>
  getEnv('BROWSER_PUBLIC_CLIENT_ID') ??
  process.env.NEXTAUTH_URL ??
  (typeof window !== 'undefined' && window.location ? `${window.location.protocol}//${window.location.host}` : undefined)

export const getOid4vciDefaultRedirectUri = () =>
  typeof window !== 'undefined' && window.location ? `${window.location.protocol}//${window.location.host}/oid4vci` : getClientId()
export const OID4VCI_CODE_URL_REGEX = /https?:\/\/.*\/oid4vci.*\?.*code=.+/ // Only scoped to /oid4vci, as we pass in redirect URIs, and we could have other codes in the future

export const getSiopDefaultRedirectUri = () =>
  typeof window !== 'undefined' && window.location ? `${window.location.protocol}//${window.location.host}/oid4vp` : getClientId()


export const MAX_QUERYID_LENGTH = 255