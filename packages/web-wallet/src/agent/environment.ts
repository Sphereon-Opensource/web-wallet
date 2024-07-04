import process from 'process'

export const AGENT_BASE_URL = `${process.env.NEXT_PUBLIC_AGENT_BASE_URL ?? 'http://localhost:5010'}`
export const VC_API_BASE_PATH = `${process.env.NEXT_PUBLIC_VC_API_BASE_PATH ?? '/vc'}`
export const VC_API_BASE_URL = `${AGENT_BASE_URL}${VC_API_BASE_PATH}`
export const VC_API_GET_CREDENTIAL_URL = `${VC_API_BASE_URL}/credentials`
export const VC_API_GET_CREDENTIAL_ISSUE_URL = `${VC_API_GET_CREDENTIAL_URL}/issue`
export const OID4VCI_API_URL = process.env.NEXT_PUBLIC_OID4VCI_API_URL ?? `${AGENT_BASE_URL}/oid4vci`
export const DID_API_BASE_PATH = `${process.env.NEXT_PUBLIC_DID_API_BASE_PATH ?? '/did'}`
export const DID_API_BASE_URL = `${AGENT_BASE_URL}${DID_API_BASE_PATH}`
export const DID_API_CREATE_DID_URL = `${DID_API_BASE_URL}/identifiers`
export const DID_API_DEACTIVATE_DID_URL = `${DID_API_BASE_URL}/deactivate`
export const ID_TRUNCATION_LENGTH = process.env.NEXT_PUBLIC_ID_TRUNCATION_LENGTH ? parseInt(process.env.NEXT_PUBLIC_ID_TRUNCATION_LENGTH) : 8
export const CONTACT_ALIAS_MAX_LENGTH = process.env.NEXT_PUBLIC_CONTACT_ALIAS_MAX_LENGTH
  ? parseInt(process.env.NEXT_PUBLIC_CONTACT_ALIAS_MAX_LENGTH)
  : 50
export const I18NEXT_CONFIG_PATH = process.env.I18NEXT_DEFAULT_CONFIG_PATH // set inside next config itself!
