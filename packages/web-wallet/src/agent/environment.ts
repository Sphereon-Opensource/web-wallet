import {getEnv, getEnvInt} from '@/src/services/env'

export const getAgentBaseUrl = () => getEnv('BROWSER_PUBLIC_AGENT_BASE_URL') ?? 'http://localhost:5010'
export const getVcApiBasePath = () => getEnv('BROWSER_PUBLIC_VC_API_BASE_PATH') ?? '/vc'
export const getVcApiBaseUrl = () => `${getAgentBaseUrl()}${getVcApiBasePath()}`
export const getVcApiGetCredentialUrl = () => `${getVcApiBaseUrl()}/credentials`
export const getVcApiCredentialIssueUrl = () => `${getVcApiGetCredentialUrl()}/issue`
export const getVcApiUrl = () => getEnv('BROWSER_PUBLIC_OID4VCI_API_URL') ?? `${getAgentBaseUrl()}/oid4vci`
export const getDidApiBasePath = () => getEnv('BROWSER_PUBLIC_DID_API_BASE_PATH') ?? '/did'
export const getDidApiBaseUrl = () => `${getAgentBaseUrl()}${getDidApiBasePath()}`
export const getDidApiCreateDidUrl = () => `${getDidApiBaseUrl()}/identifiers`
export const getDidApiDeactivateUrl = () => `${getDidApiBaseUrl()}/deactivate`
export const getIdTruncationLength = () => getEnvInt('BROWSER_PUBLIC_ID_TRUNCATION_LENGTH', 8)
export const getContactAliasMaxLength = () => getEnvInt('BROWSER_PUBLIC_CONTACT_ALIAS_MAX_LENGTH', 50)
