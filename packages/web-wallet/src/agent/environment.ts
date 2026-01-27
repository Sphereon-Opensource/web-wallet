import {getEnv, getEnvInt} from '@/src/services/env'
import {agentConfig} from '@/src/services/agentConfig'

// Use agentConfig as the source of truth, with env var fallback during initial load
export const getAgentBaseUrl = () => agentConfig.getPublicBaseUrl()
export const getVcApiBasePath = () => agentConfig.getConfig()?.paths.vcApi ?? getEnv('BROWSER_PUBLIC_VC_API_BASE_PATH') ?? '/vc'
export const getVcApiBaseUrl = () => `${getAgentBaseUrl()}${getVcApiBasePath()}`
export const getVcApiGetCredentialUrl = () => `${getVcApiBaseUrl()}/credentials`
export const getVcApiCredentialIssueUrl = () => `${getVcApiGetCredentialUrl()}/issue`
export const getVcApiUrl = () => getEnv('BROWSER_PUBLIC_OID4VCI_API_URL') ?? `${getAgentBaseUrl()}${agentConfig.getPath('oid4vci')}`
export const getDidApiBasePath = () => agentConfig.getConfig()?.paths.didApi ?? getEnv('BROWSER_PUBLIC_DID_API_BASE_PATH') ?? '/did'
export const getDidApiBaseUrl = () => `${getAgentBaseUrl()}${getDidApiBasePath()}`
export const getDidApiCreateDidUrl = () => `${getDidApiBaseUrl()}/identifiers`
export const getDidApiDeactivateUrl = () => `${getDidApiBaseUrl()}/deactivate`
export const getIdTruncationLength = () => getEnvInt('BROWSER_PUBLIC_ID_TRUNCATION_LENGTH', 8)
export const getContactAliasMaxLength = () => getEnvInt('BROWSER_PUBLIC_CONTACT_ALIAS_MAX_LENGTH', 50)
export const getIssuerCorrelationId = () => getEnv('BROWSER_PUBLIC_ISSUER_CORRELATION_ID')

export const getHolderPrimaryIdentifier = () => getEnv('BROWSER_PUBLIC_HOLDER_PRIMARY_IDENTIFIER')

export const I18NEXT_CONFIG_PATH = process.env.I18NEXT_DEFAULT_CONFIG_PATH // set inside next config itself!
