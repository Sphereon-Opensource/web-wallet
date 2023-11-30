import { CreateWebWallet1700163641000 } from './postgres/1700163641000-CreateWebWallet'

// Individual migrations per purpose. Allows parties to not run migrations and thus create/update tables if they are not using a particular feature (yet)
export const WorkflowMigrations = [CreateWebWallet1700163641000]

// All migrations together
export const WebWalletMigrations = [...WorkflowMigrations]
