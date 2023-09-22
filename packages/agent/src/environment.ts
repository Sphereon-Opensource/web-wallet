import { config as dotenvConfig } from "dotenv-flow";
import { resolve } from "path";
import { loadJsonFiles } from "./utils";
import { IDIDOpts } from "./types";
import { vcApiFeatures } from "@sphereon/ssi-sdk.w3c-vc-api";
import {
  DidApiFeatures,
  DidWebServiceFeatures,
} from "@sphereon/ssi-sdk.uni-resolver-registrar-api";
import { env } from "@sphereon/ssi-express-support/dist/functions";
import { statusListFeatures } from "@sphereon/ssi-sdk.vc-status-list-issuer-rest-api";

await dotenvConfig();

/**
 * Please see .env.example for an explanation of the different environment variables available
 *
 * This file takes all environment variables and assigns them to constants, with default values,
 * so the rest of the code doesn't have to know the exact environment values
 */
export const ENV_VAR_PREFIX = process.env.ENV_VAR_PREFIX ?? "";

export const DB_TYPE = env("DB_TYPE", ENV_VAR_PREFIX) ?? "sqlite";

export const MEMORY_DB = DB_TYPE.toLowerCase().startsWith("mem");
export const DB_URL =
  env("DB_URL", ENV_VAR_PREFIX) ??
  (MEMORY_DB ? ":memory:" : "database/agent_default.sqlite");

if (MEMORY_DB) {
  if (!DB_URL.includes(":memory:")) {
    throw Error(
      `DB_TYPE is set to ${DB_TYPE}, but the DB_URL (${DB_URL}) does not contain ':memory:"`,
    );
  }
  console.log(
    "An in Memory Database is being used. All created DIDs and keys will be discarded on restart",
  );
}
export const DB_HOST = env("DB_HOST", ENV_VAR_PREFIX);
export const DB_PORT = env("DB_PORT", ENV_VAR_PREFIX);
export const DB_USERNAME = env("DB_USERNAME", ENV_VAR_PREFIX);
export const DB_PASSWORD = env("DB_PASSWORD", ENV_VAR_PREFIX);
export const DB_USE_SSL = env("DB_USE_SSL", ENV_VAR_PREFIX);
export const DB_SSL_CA = env("DB_SSL_CA", ENV_VAR_PREFIX);
export const DB_SSL_ALLOW_SELF_SIGNED =
  env("DB_SSL_ALLOW_SELF_SIGNED", ENV_VAR_PREFIX) ?? true;
export const DB_CONNECTION_NAME =
  env("DB_CONNECTION_NAME", ENV_VAR_PREFIX) ?? "default";
export const DB_DATABASE_NAME =
  env("DB_DATABASE_NAME", ENV_VAR_PREFIX) ?? "vc-customer";
export const DB_CACHE_ENABLED =
  env("DB_CACHE_ENABLED", ENV_VAR_PREFIX) ?? "true";
export const DB_ENCRYPTION_KEY =
  env("DB_ENCRYPTION_KEY", ENV_VAR_PREFIX) ??
  "29739248cad1bd1a0fc4d9b75cd4d2990de535baf5caadfdf8d8f86664aa830c";
export const INTERNAL_HOSTNAME_OR_IP =
  env("INTERNAL_HOSTNAME_OR_IP", ENV_VAR_PREFIX) ??
  env("HOSTNAME", ENV_VAR_PREFIX) ??
  "0.0.0.0";
export const INTERNAL_PORT = env("PORT", ENV_VAR_PREFIX)
  ? Number.parseInt(env("PORT", ENV_VAR_PREFIX)!)
  : 5000;
export const EXTERNAL_HOSTNAME =
  env("EXTERNAL_HOSTNAME", ENV_VAR_PREFIX) ?? "test.verification.sphereon.com";
export const DEFAULT_DID = env("DEFAULT_DID", ENV_VAR_PREFIX);
export const DEFAULT_KID = env("DEFAULT_KID", ENV_VAR_PREFIX);
export const CONF_PATH = env("CONF_PATH", ENV_VAR_PREFIX)
  ? resolve(env("CONF_PATH", ENV_VAR_PREFIX)!)
  : resolve("../../conf");
export const VC_API_BASE_PATH =
  env("VC_API_BASE_PATH", ENV_VAR_PREFIX) ?? "/vc";
export const VC_API_DEFAULT_PROOF_FORMAT =
  env("VC_API_DEFAULT_PROOF_FORMAT", ENV_VAR_PREFIX) ?? "lds";
export const VC_API_FEATURES: vcApiFeatures[] = env(
  "VC_API_FEATURES",
  ENV_VAR_PREFIX,
)
  ? (env("VC_API_FEATURES", ENV_VAR_PREFIX)?.split(",") as vcApiFeatures[])
  : ["vc-issue", "vc-verify", "vc-persist"];

export const STATUS_LIST_API_FEATURES: statusListFeatures[] = env(
  "STATUS_LIST_API_FEATURES",
  ENV_VAR_PREFIX,
)
  ? (env("STATUS_LIST_API_FEATURES", ENV_VAR_PREFIX)?.split(
      ",",
    ) as statusListFeatures[])
  : ["status-list-hosting", "w3c-vc-api-credential-status"];

export const STATUS_LIST_API_BASE_PATH =
  env("STATUS_LIST_API_BASE_PATH", ENV_VAR_PREFIX) ?? VC_API_BASE_PATH;
export const STATUS_LIST_ISSUER =
  env("STATUS_LIST_ISSUER", ENV_VAR_PREFIX) ?? DEFAULT_DID;
export const STATUS_LIST_ID =
  env("STATUS_LIST_ID", ENV_VAR_PREFIX) ??
  "https://verification.sphereon.com/vc/credentials/status-lists/1";
export const STATUS_LIST_CORRELATION_ID =
  env("STATUS_LIST_CORRELATION_ID", ENV_VAR_PREFIX) ?? "default-sl";
export const STATUS_LIST_LENGTH =
  env("STATUS_LIST_LENGTH", ENV_VAR_PREFIX) ?? "150000"; // at least 150k to ensure herd privacy
export const STATUS_LIST_PURPOSE =
  env("STATUS_LIST_PURPOSE", ENV_VAR_PREFIX) ?? "revocation"; // revocation or suspension

export const DID_API_BASE_PATH =
  env("DID_API_BASE_PATH", ENV_VAR_PREFIX) ?? "/did";

export const DID_API_RESOLVE_MODE =
  env("DID_API_RESOLVE_MODE", ENV_VAR_PREFIX) ?? "hybrid";
export const DID_OPTIONS_PATH =
  env("DID_OPTIONS_PATH", ENV_VAR_PREFIX) ?? `${CONF_PATH}/dids`;
export const DID_API_FEATURES: DidApiFeatures[] = env(
  "DID_API_FEATURES",
  ENV_VAR_PREFIX,
)
  ? (env("DID_API_FEATURES", ENV_VAR_PREFIX)?.split(",") as DidApiFeatures[])
  : ["did-persist", "did-resolve"];
export const DID_WEB_SERVICE_FEATURES: DidWebServiceFeatures[] = env(
  "DID_WEB_SERVICE_FEATURES",
  ENV_VAR_PREFIX,
)
  ? (env("DID_WEB_SERVICE_FEATURES", ENV_VAR_PREFIX)?.split(
      ",",
    ) as DidWebServiceFeatures[])
  : []; // Let's not enable global did web hosting by default

export const DID_IMPORT_MODE =
  env("DID_IMPORT_MODE", ENV_VAR_PREFIX) ?? "filesystem,environment";
export const DID_WEB_DID = env("DID_WEB_DID", ENV_VAR_PREFIX);
export const DID_WEB_KID = env("DID_WEB_KID", ENV_VAR_PREFIX);
export const DID_WEB_CERT_PEM = env("DID_WEB_CERT_PEM", ENV_VAR_PREFIX);
export const DID_WEB_PRIVATE_KEY_PEM = env(
  "DID_WEB_PRIVATE_KEY_PEM",
  ENV_VAR_PREFIX,
);
export const DID_WEB_CERT_CHAIN_PEM = env(
  "DID_WEB_CERT_CHAIN_PEM",
  ENV_VAR_PREFIX,
);

export const AUTHENTICATION_ENABLED =
  env("AUTHENTICATION_ENABLED", ENV_VAR_PREFIX) === "false";
export const AUTHENTICATION_STRATEGY = env(
  "AUTHENTICATION_STRATEGY",
  ENV_VAR_PREFIX,
);
export const AUTHORIZATION_ENABLED =
  env("AUTHORIZATION_ENABLED", ENV_VAR_PREFIX) === "false";
export const AUTHORIZATION_GLOBAL_REQUIRE_USER_IN_ROLES = env(
  "AUTHORIZATION_GLOBAL_REQUIRE_USER_IN_ROLES",
  ENV_VAR_PREFIX,
);
export const didOptConfigs = loadJsonFiles<IDIDOpts>({
  path: DID_OPTIONS_PATH,
});
