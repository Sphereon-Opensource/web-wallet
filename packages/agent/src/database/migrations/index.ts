import { CreateWebWallet1700163641000 } from './postgres/1700163641000-CreateWebWallet'
import {DB_TYPE, IS_WALLET_ENABLED} from "../../environment-vars";


if (IS_WALLET_ENABLED && !DB_TYPE.includes('postgres')) {
    throw Error(`WALLET mode can only be enabled using a Postgres database. Sqlite or other DB types are not supported!`)
}

// Individual migrations per purpose. Allows parties to not run migrations and thus create/update tables if they are not using a particular feature (yet)
export const WorkflowMigrations = IS_WALLET_ENABLED ? [CreateWebWallet1700163641000] : []

// All migrations together
export const WebWalletMigrations = [...WorkflowMigrations]
