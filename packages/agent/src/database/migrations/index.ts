import { CreateWebWallet1700163641000 } from './postgres/1700163641000-CreateWebWallet'
import { AddCredentialDesignBranding1763717017000 } from './postgres/1763717017000-AddCredentialDesignBranding'
import { CreateInboxAndEInvoice1736780400000 } from './postgres/1736780400000-CreateInboxAndEInvoice'
import { DB_TYPE, IS_WALLET_ENABLED, IS_INBOX_ENABLED } from '../../environment-vars'

if (IS_WALLET_ENABLED && !DB_TYPE.includes('postgres')) {
  throw Error(`WALLET mode can only be enabled using a Postgres database. Sqlite or other DB types are not supported!`)
}

if (IS_INBOX_ENABLED && !DB_TYPE.includes('postgres')) {
  throw Error(`INBOX mode can only be enabled using a Postgres database. Sqlite or other DB types are not supported!`)
}

// Individual migrations per purpose. Allows parties to not run migrations and thus create/update tables if they are not using a particular feature (yet)
export const WorkflowMigrations = IS_WALLET_ENABLED ? [CreateWebWallet1700163641000, AddCredentialDesignBranding1763717017000] : []
export const InboxMigrations = IS_INBOX_ENABLED ? [CreateInboxAndEInvoice1736780400000] : []

// All migrations together
export const WebWalletMigrations = [...WorkflowMigrations, ...InboxMigrations]
