import {DataSource} from 'typeorm'

import {postgresConfig, sqliteConfig} from './config'
import {DB_TYPE} from '../environment'
import {DataSources} from '@sphereon/ssi-sdk.agent-config'

const config = DB_TYPE.toLowerCase().includes('postgres') ? postgresConfig : sqliteConfig

console.log(`Using DB configuration for a ${config} database`)

/**
 * Gets the database connection, which is SQLite or Postgresql depending on configuration/environment vars.
 *
 * Also makes sure that migrations are run (versioning for DB schema's), so we can properly update over time
 *
 * @param connectionName The database name
 */
export const getDbConnection = async (connectionName: string): Promise<DataSource> => {
  return DataSources.singleInstance().addConfig(connectionName, config).getDbConnection(connectionName)
}
