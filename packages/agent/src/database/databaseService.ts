import { DataSource } from 'typeorm'
import { DataSources } from '@sphereon/ssi-sdk.agent-config'
import { DB_CONFIG } from './config'
import { DB_CONNECTION_NAME, DB_TYPE } from '../environment-vars'

console.log(`Using DB configuration for a ${DB_CONFIG.type} database`)

/**
 * Gets the database connection.
 *
 * Also makes sure that migrations are run (versioning for DB schema's), so we can properly update over time
 *
 * @param connectionName The database name
 */
export const getDbConnection = async (connectionName: string): Promise<DataSource> => {
  if (!DataSources.singleInstance().has(connectionName)) {
    console.log(`Using DB connection with connectionName ${connectionName} and type ${DB_TYPE}`)
    DataSources.singleInstance().addConfig(connectionName, DB_CONFIG)
  }
  return DataSources.singleInstance().getDbConnection(connectionName)
}

/**
 * Runs a migration down (drops DB schema)
 * @param dataSource
 */
export const revertMigration = async (dataSource: DataSource): Promise<void> => {
  if (dataSource.isInitialized) {
    await dataSource.undoLastMigration()
  } else {
    console.error('DataSource is not initialized')
  }
}

/**
 * Runs a migration down (drops DB schema)
 * @param dataSource
 */
export const dropDatabase = async (dataSource: DataSource): Promise<void> => {
  if (dataSource.isInitialized) {
    await dataSource.dropDatabase()
  } else {
    console.error('DataSource is not initialized')
  }
}

export const dbConnection = getDbConnection(DB_CONNECTION_NAME)
