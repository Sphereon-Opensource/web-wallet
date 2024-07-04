export const OID4VCI_STATE_STORAGE_KEY = 'oid4vci-state'
export const CLIENT_ID =
  process.env.NEXT_PUBLIC_CLIENT_ID ??
  process.env.NEXTAUTH_URL ??
  (typeof window !== 'undefined' && window.location ? `${window.location.protocol}//${window.location.host}` : undefined)
export const OID4VCI_DEFAULT_REDIRECT_URI =
  typeof window !== 'undefined' && window.location ? `${window.location.protocol}//${window.location.host}/oid4vci` : CLIENT_ID
export const OID4VCI_CODE_URL_REGEX = /https?:\/\/.*\/oid4vci.*\?.*code=.+/ // Only scoped to /oid4vci, as we pass in redirect URIs, and we could have other codes in the future

export const SIOP_DEFAULT_REDIRECT_URI =
  typeof window !== 'undefined' && window.location ? `${window.location.protocol}//${window.location.host}/oid4vp` : CLIENT_ID
