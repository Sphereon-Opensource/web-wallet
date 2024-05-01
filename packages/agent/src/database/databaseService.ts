import { DataSource } from 'typeorm'
import { postgresConfig } from './config'
import { DataSources } from '@sphereon/ssi-sdk.agent-config'
import {config as dotenvConfig} from "dotenv-flow";

console.log(`Using DB configuration for a ${postgresConfig.type} database`)

/**
 * Gets the database connection.
 *
 * Also makes sure that migrations are run (versioning for DB schema's), so we can properly update over time
 *
 * @param connectionName The database name
 */
export const getDbConnection = async (connectionName: string): Promise<DataSource> => {
  return DataSources.singleInstance().addConfig(connectionName, postgresConfig).getDbConnection(connectionName)
}

export const revertMigration = async (connectionName: string): Promise<void> => {
  const dataSource = await getDbConnection(connectionName);
  if (dataSource.isInitialized) {
    await dataSource.undoLastMigration();
  } else {
    console.error("DataSource is not initialized");
  }
}
