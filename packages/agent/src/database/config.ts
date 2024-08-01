import { Entities as VeramoDataStoreEntities, migrations as VeramoDataStoreMigrations } from '@veramo/data-store'
import {
  DB_CACHE_ENABLED,
  DB_DATABASE_NAME,
  DB_HOST,
  DB_PASSWORD,
  DB_PORT,
  DB_SCHEMA,
  DB_SSL_ALLOW_SELF_SIGNED,
  DB_SSL_CA,
  DB_TYPE,
  DB_URL,
  DB_USE_SSL,
  DB_USERNAME,
} from '../environment'
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions'
import { TlsOptions } from 'tls'
import { WebWalletMigrations } from './migrations'
import { SqliteConnectionOptions } from 'typeorm/driver/sqlite/SqliteConnectionOptions'
import {
  DataStoreContactEntities,
  DataStoreDigitalCredentialEntities,
  DataStoreEventLoggerEntities,
  DataStoreIssuanceBrandingEntities,
  DataStoreMachineStateEntities,
  DataStorePresentationDefinitionEntities,
  DataStoreStatusListEntities,
} from '@sphereon/ssi-sdk.data-store'
import {
  DataStoreContactMigrations,
  DataStoreDigitalCredentialMigrations,
  DataStoreEventLoggerMigrations,
  DataStoreIssuanceBrandingMigrations,
  DataStoreMachineStateMigrations,
  DataStorePresentationDefinitionMigrations,
  DataStoreStatusListMigrations,
} from '@sphereon/ssi-sdk.data-store'

if (!process.env.DB_ENCRYPTION_KEY) {
  console.warn(
    `Please provide a DB_ENCRYPTION_KEY env var. Now we will use a pre-configured one. When you change to the var you will have to replace your DB`,
  )
}

/**
 * Setup SSL options
 */
const enableSSL = DB_USE_SSL === 'true' || DB_URL?.includes('sslmode=require')

let ssl: TlsOptions | boolean = enableSSL
  ? {
      ...(DB_SSL_CA && { ca: DB_SSL_CA }),
      ...(DB_SSL_ALLOW_SELF_SIGNED && {
        rejectUnauthorized: DB_SSL_ALLOW_SELF_SIGNED === 'false',
      }),
    }
  : false
if (enableSSL && Object.keys(ssl).length === 0) {
  ssl = true
}

/**
 * SQLite3 DB configuration
 */
const sqliteConfig: SqliteConnectionOptions = {
  type: 'sqlite',
  database: DB_URL!,
  entities: [
    ...VeramoDataStoreEntities,
    ...DataStoreContactEntities,
    ...DataStoreIssuanceBrandingEntities,
    ...DataStoreStatusListEntities,
    ...DataStoreEventLoggerEntities,
    ...DataStoreDigitalCredentialEntities,
    ...DataStoreMachineStateEntities,
    ...DataStorePresentationDefinitionEntities,
  ],
  migrations: [
    ...VeramoDataStoreMigrations,
    ...DataStoreContactMigrations,
    ...DataStoreIssuanceBrandingMigrations,
    ...DataStoreStatusListMigrations,
    ...DataStoreEventLoggerMigrations,
    ...DataStoreDigitalCredentialMigrations,
    ...DataStoreMachineStateMigrations,
    ...DataStorePresentationDefinitionMigrations,
    ...WebWalletMigrations,
  ],
  migrationsRun: false, // We run migrations from code to ensure proper ordering with Redux
  synchronize: false, // We do not enable synchronize, as we use migrations from code
  migrationsTransactionMode: 'each', // protect every migration with a separate transaction
  logging: ['info', 'error'], // 'all' means to enable all logging
  logger: 'advanced-console',
}

/**
 * Postgresql DB configuration
 */
const postgresConfig: PostgresConnectionOptions = validatePostgresOptions({
  type: 'postgres',
  ...(DB_URL && { url: DB_URL }),
  ...(DB_HOST && { host: DB_HOST }),
  ...(DB_PORT && { port: Number.parseInt(DB_PORT) }),
  ...(DB_USERNAME && { username: DB_USERNAME }),
  ...(DB_PASSWORD && { password: DB_PASSWORD }),
  ...(DB_SCHEMA && { schema: DB_SCHEMA }),
  ssl,
  database: DB_DATABASE_NAME,
  cache: DB_CACHE_ENABLED !== 'false',
  entities: [
    ...VeramoDataStoreEntities,
    ...DataStoreContactEntities,
    ...DataStoreIssuanceBrandingEntities,
    ...DataStoreStatusListEntities,
    ...DataStoreEventLoggerEntities,
    ...DataStoreDigitalCredentialEntities,
    ...DataStoreMachineStateEntities,
    ...DataStorePresentationDefinitionEntities,
  ],
  migrations: [
    ...VeramoDataStoreMigrations,
    ...DataStoreContactMigrations,
    ...DataStoreIssuanceBrandingMigrations,
    ...DataStoreStatusListMigrations,
    ...DataStoreEventLoggerMigrations,
    ...DataStoreDigitalCredentialMigrations,
    ...DataStoreMachineStateMigrations,
    ...DataStorePresentationDefinitionMigrations,
    ...WebWalletMigrations,
  ],
  migrationsRun: false, // We run migrations from code to ensure proper ordering with Redux
  synchronize: false, // We do not enable synchronize, as we use migrations from code
  migrationsTransactionMode: 'each', // protect every migration with a separate transaction
  logging: ['info', 'error'], // 'all' means to enable all logging
  logger: 'advanced-console',
})

function validatePostgresOptions(options: PostgresConnectionOptions) {
  if ('url' in options && (('username' in options && options.username) || ('password' in options && options.password))) {
    throw Error(
      'Username / password credentials will not be used when a connection string URL is configured. You can embed the password in the connection string URL',
    )
  }
  return options
}

console.log(`Database type '${DB_TYPE}' is being used`)
export const DB_CONFIG = DB_TYPE === 'postgres' ? postgresConfig : sqliteConfig
