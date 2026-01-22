import { CreateWebWallet1700163641000 } from './postgres/1700163641000-CreateWebWallet'
import { AddCredentialDesignBranding1763717017000 } from './postgres/1763717017000-AddCredentialDesignBranding'
import { CreateInboxAndEInvoice1736780400000 } from './postgres/1736780400000-CreateInboxAndEInvoice'
import { CleanupWorkflowTables1737600000000 } from './postgres/1737600000000-CleanupWorkflowTables'
import { FixUpdateCredentialDesignFunction1737700000000 } from './postgres/1737700000000-FixUpdateCredentialDesignFunction'
import { DB_TYPE, IS_WALLET_ENABLED, IS_INBOX_ENABLED } from '../../environment-vars'

if (!DB_TYPE.includes('postgres')) {
  throw Error(`This application requires a Postgres database. Sqlite or other DB types are not supported!`)
}

// Issuer infrastructure migrations - always run (forms, credential designs, metadata)
// These are core issuer functionality, not wallet-specific
// CleanupWorkflowTables must run before InboxMigrations to remove old asset table
// FixUpdateCredentialDesignFunction fixes the update_credential_design function to handle missing keys
export const IssuerMigrations = [CreateWebWallet1700163641000, CleanupWorkflowTables1737600000000, AddCredentialDesignBranding1763717017000, FixUpdateCredentialDesignFunction1737700000000]

// Inbox migrations - run when inbox is enabled
export const InboxMigrations = IS_INBOX_ENABLED ? [CreateInboxAndEInvoice1736780400000] : []

// Legacy export for backwards compatibility
export const WorkflowMigrations = IS_WALLET_ENABLED ? IssuerMigrations : IssuerMigrations

// All migrations together
export const WebWalletMigrations = [...IssuerMigrations, ...InboxMigrations]
