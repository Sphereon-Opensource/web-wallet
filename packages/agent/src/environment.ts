/*********************************************************************************************************************
 * DO NOT IMPORT OTHER DEPS BELOW.
 *
 * If you need env vars with types or imports, put them in ./environment-deps.ts
 * Reason is that we want to load this file early on. The more deps the bigger the chance that we would load files that depend on the env vars!
 * *******************************************************************************************************************
 */
import { config as dotenvConfig } from 'dotenv-flow'
import { resolve } from 'path'
import { env } from '@sphereon/ssi-express-support'
await dotenvConfig()

/*********************************************************************************************************************
 * DO NOT IMPORT OTHER DEPS ABOVE.
 *
 * If you need env vars with types or imports, put them in ./environment-deps.ts
 * Reason is that we want to load this file early on. The more deps the bigger the chance that we would load files that depend on the env vars!
 * *******************************************************************************************************************
 */

const toBoolean = (value: string | undefined, defaultValue?: boolean): boolean => (value === undefined ? (defaultValue ?? true) : value === 'true')

/**
 * Please see .env.example for an explanation of the different environment variables available
 *
 * This file takes all environment variables and assigns them to constants, with default values,
 * so the rest of the code doesn't have to know the exact environment values
 */
export const ENV_VAR_PREFIX = process.env.ENV_VAR_PREFIX ?? ''
export const DB_TYPE = env('DB_TYPE', ENV_VAR_PREFIX) ?? 'postgres'
process.env[`${ENV_VAR_PREFIX}${DB_TYPE}`] = DB_TYPE // make sure we sync back in case we did not have it above
//#DB_URL="database/agent_default.sqlite"
//#DB_URL="'postgresql://postgres:your-super-secret-and-long-postgres-password@127.0.0.1:5432/postgres"
export const DB_URL = env('DB_URL', ENV_VAR_PREFIX) // Using DB_URL is optional
export const DB_HOST = env('DB_HOST', ENV_VAR_PREFIX)
export const DB_PORT = env('DB_PORT', ENV_VAR_PREFIX)
export const DB_USERNAME = env('DB_USERNAME', ENV_VAR_PREFIX)
export const DB_PASSWORD = env('DB_PASSWORD', ENV_VAR_PREFIX)
export const DB_SCHEMA = env('DB_SCHEMA', ENV_VAR_PREFIX)
export const DB_USE_SSL = env('DB_USE_SSL', ENV_VAR_PREFIX)
export const DB_SSL_CA = env('DB_SSL_CA', ENV_VAR_PREFIX)
export const DB_SSL_ALLOW_SELF_SIGNED = env('DB_SSL_ALLOW_SELF_SIGNED', ENV_VAR_PREFIX) ?? true
export const DB_CONNECTION_NAME = env('DB_CONNECTION_NAME', ENV_VAR_PREFIX) ?? 'default'
export const DB_DATABASE_NAME = env('DB_DATABASE_NAME', ENV_VAR_PREFIX) ?? 'web-wallet-agent'
export const DB_CACHE_ENABLED = env('DB_CACHE_ENABLED', ENV_VAR_PREFIX) ?? 'true'
export const DB_ENCRYPTION_KEY = env('DB_ENCRYPTION_KEY', ENV_VAR_PREFIX) ?? '29739248cad1bd1a0fc4d9b75cd4d2990de535baf5caadfdf8d8f86664aa830c'
export const INTERNAL_HOSTNAME_OR_IP = env('INTERNAL_HOSTNAME_OR_IP', ENV_VAR_PREFIX) ?? env('HOSTNAME', ENV_VAR_PREFIX) ?? '0.0.0.0'
export const INTERNAL_PORT = env('PORT', ENV_VAR_PREFIX) ? Number.parseInt(env('PORT', ENV_VAR_PREFIX)!) : 5000
export const EXTERNAL_HOSTNAME = env('EXTERNAL_HOSTNAME', ENV_VAR_PREFIX) ?? 'localhost'
export const DEFAULT_X5C = env('DEFAULT_X5C', ENV_VAR_PREFIX)?.split(/[, ]/)
export const DEFAULT_MODE = env('DEFAULT_MODE', ENV_VAR_PREFIX) ?? 'did' //did, jwk or x5c
export const DEFAULT_DID = env('DEFAULT_DID', ENV_VAR_PREFIX)
export const DEFAULT_KID = env('DEFAULT_KID', ENV_VAR_PREFIX)
export const CONF_PATH = env('CONF_PATH', ENV_VAR_PREFIX) ? resolve(env('CONF_PATH', ENV_VAR_PREFIX)!) : resolve('../../conf')
export const IS_OID4VP_ENABLED = toBoolean(process.env.OID4VP_ENABLED, true)

export const IS_OID4VCI_ENABLED = toBoolean(process.env.OID4VCI_ENABLED, true)
export const OID4VCI_API_BASE_URL = env('OID4VCI_API_BASE_URL', ENV_VAR_PREFIX) ?? `${INTERNAL_HOSTNAME_OR_IP}:${INTERNAL_PORT}/oid4vci`
export const OID4VCI_ISSUER_OPTIONS_PATH = `${CONF_PATH}/oid4vci_options`
export const OID4VCI_ISSUER_METADATA_PATH = `${CONF_PATH}/oid4vci_metadata`

export const IS_VC_API_ENABLED = toBoolean(process.env.VC_API_ENABLED, true)
export const VC_API_BASE_PATH = env('VC_API_BASE_PATH', ENV_VAR_PREFIX) ?? '/vc'
export const VC_API_DEFAULT_PROOF_FORMAT = env('VC_API_DEFAULT_PROOF_FORMAT', ENV_VAR_PREFIX) ?? 'jwt' // 'lds' for json-ld

export const IS_CONTACT_MANAGER_ENABLED = toBoolean(process.env.CONTACT_MANAGER_ENABLED, true)

export const IS_JWKS_HOSTING_ENABLED = toBoolean(process.env.JWKS_HOSTING_ENABLED, true)
export const IS_STATUS_LIST_ENABLED = toBoolean(process.env.IS_STATUS_LIST_ENABLED, true)


export const STATUS_LIST_API_BASE_PATH = env('STATUS_LIST_API_BASE_PATH', ENV_VAR_PREFIX) ?? VC_API_BASE_PATH
export const STATUS_LIST_ISSUER = env('STATUS_LIST_ISSUER', ENV_VAR_PREFIX) ?? DEFAULT_DID
export const STATUS_LIST_ID = env('STATUS_LIST_ID', ENV_VAR_PREFIX) ?? 'http://localhost/vc/credentials/status-lists/1'
export const STATUS_LIST_CORRELATION_ID = env('STATUS_LIST_CORRELATION_ID', ENV_VAR_PREFIX) ?? 'default-sl'
export const STATUS_LIST_LENGTH = env('STATUS_LIST_LENGTH', ENV_VAR_PREFIX) ?? '150000' // at least 150k to ensure herd privacy
export const STATUS_LIST_PURPOSE = env('STATUS_LIST_PURPOSE', ENV_VAR_PREFIX) ?? 'revocation' // revocation or suspension

export const DID_API_BASE_PATH = env('DID_API_BASE_PATH', ENV_VAR_PREFIX) ?? '/did'
export const ASSET_DEFAULT_DID_METHOD = env('ASSET_DEFAULT_DID_METHOD', ENV_VAR_PREFIX) ?? 'jwk'

export const DID_API_RESOLVE_MODE = env('DID_API_RESOLVE_MODE', ENV_VAR_PREFIX) ?? 'hybrid'
// DID_OPTIONS is legacy
export const IDENTIFIER_OPTIONS_PATH =
  env('IDENTIFIER_OPTIONS_PATH', ENV_VAR_PREFIX) ?? env('DID_OPTIONS_PATH', ENV_VAR_PREFIX) ?? `${CONF_PATH}/dids`

// DID_IMPORT is legacy
export const IDENTIFIER_IMPORT_MODE =
  env('IDENTIFIER_IMPORT_MODE', ENV_VAR_PREFIX) ?? env('DID_IMPORT_MODE', ENV_VAR_PREFIX) ?? 'filesystem,environment'
export const DID_WEB_DID = env('DID_WEB_DID', ENV_VAR_PREFIX)
export const DID_WEB_KID = env('DID_WEB_KID', ENV_VAR_PREFIX)
export const DID_WEB_CERT_PEM = env('DID_WEB_CERT_PEM', ENV_VAR_PREFIX)
export const DID_WEB_PRIVATE_KEY_PEM = env('DID_WEB_PRIVATE_KEY_PEM', ENV_VAR_PREFIX)
export const DID_WEB_CERT_CHAIN_PEM = env('DID_WEB_CERT_CHAIN_PEM', ENV_VAR_PREFIX)

export const AUTHENTICATION_ENABLED = env('AUTHENTICATION_ENABLED', ENV_VAR_PREFIX) === 'false'
export const AUTHENTICATION_STRATEGY = env('AUTHENTICATION_STRATEGY', ENV_VAR_PREFIX)
export const AUTHORIZATION_ENABLED = env('AUTHORIZATION_ENABLED', ENV_VAR_PREFIX) === 'false'
export const AUTHORIZATION_GLOBAL_REQUIRE_USER_IN_ROLES = env('AUTHORIZATION_GLOBAL_REQUIRE_USER_IN_ROLES', ENV_VAR_PREFIX)

export const OID4VP_DEFINITIONS: string[] = process.env.OID4VP_DEFINITIONS
  ? process.env.OID4VP_DEFINITIONS.split(/[, ]/).map((val) => val.trim())
  : []
export const OID4VP_PRESENTATION_DEFINITION_PATH = `${CONF_PATH}/presentation_definitions`
export const OID4VP_RP_OPTIONS_PATH = `${CONF_PATH}/oid4vp_options`
