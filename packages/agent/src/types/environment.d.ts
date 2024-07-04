declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV?: 'development' | 'production' | 'local'
      PORT?: string
      INTERNAL_HOSTNAME_OR_IP?: string
      EXTERNAL_HOSTNAME?: string
      DEFAULT_DID?: string
      DEFAULT_KID?: string
      DB_CONNECTION_NAME?: string
      DB_ENCRYPTION_KEY?: string
      CONF_PATH?: string
      UNIVERSAL_RESOLVER_RESOLVE_URL?: string
      ENV_VAR_PREFIX?: string
      DB_TYPE?: string
      DB_URL?: string
      DB_HOST?: string
      DB_PORT?: string
      DB_USERNAME?: string
      DB_PASSWORD?: string
      DB_SCHEMA?: string
      DB_USE_SSL?: string
      DB_SSL_CA?: string
      DB_SSL_ALLOW_SELF_SIGNED?: string
      DB_DATABASE_NAME?: string
      DB_CACHE_ENABLED?: string
      OID4VP_ENABLED?: string
      OID4VCI_ENABLED?: string
      OID4VCI_API_BASE_URL?: string
      OID4VCI_ISSUER_OPTIONS_PATH?: string
      OID4VCI_ISSUER_METADATA_PATH?: string
      VC_API_BASE_PATH?: string
      VC_API_DEFAULT_PROOF_FORMAT?: string
      VC_API_FEATURES?: string
      CONTACT_MANAGER_API_FEATURES?: string
      STATUS_LIST_API_FEATURES?: string
      REMOTE_SERVER_API_FEATURES?: string
      STATUS_LIST_API_BASE_PATH?: string
      STATUS_LIST_ISSUER?: string
      STATUS_LIST_ID?: string
      STATUS_LIST_CORRELATION_ID?: string
      STATUS_LIST_LENGTH?: string
      STATUS_LIST_PURPOSE?: string
      DID_API_BASE_PATH?: string
      ASSET_DEFAULT_DID_METHOD?: string
      DID_API_RESOLVE_MODE?: string
      DID_OPTIONS_PATH?: string
      DID_API_FEATURES?: string
      DID_WEB_SERVICE_FEATURES?: string
      DID_IMPORT_MODE?: string
      DID_WEB_DID?: string
      DID_WEB_KID?: string
      DID_WEB_CERT_PEM?: string
      DID_WEB_PRIVATE_KEY_PEM?: string
      DID_WEB_CERT_CHAIN_PEM?: string
      AUTHENTICATION_ENABLED?: string
      AUTHENTICATION_STRATEGY?: string
      AUTHORIZATION_ENABLED?: string
      AUTHORIZATION_GLOBAL_REQUIRE_USER_IN_ROLES?: string
      OID4VP_DEFINITIONS?: string
      OID4VP_PRESENTATION_DEFINITION_PATH?: string
      OID4VP_RP_OPTIONS_PATH?: string
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {}
