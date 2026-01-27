import { CreateWebWallet1700163641000 } from './postgres/1700163641000-CreateWebWallet'
import { AddCredentialDesignBranding1763717017000 } from './postgres/1763717017000-AddCredentialDesignBranding'
import { CreateInboxAndEInvoice1736780400000 } from './postgres/1736780400000-CreateInboxAndEInvoice'
import { CleanupWorkflowTables1736780300000 } from './postgres/1736780300000-CleanupWorkflowTables'
import { FixUpdateCredentialDesignFunction1737700000000 } from './postgres/1737700000000-FixUpdateCredentialDesignFunction'
import { SeedCredentialIssuanceWizard1764000000000 } from './postgres/1764000000000-SeedCredentialIssuanceWizard'
import { MigrateEInvoiceServiceFormat1738000000000 } from './postgres/1738000000000-MigrateEInvoiceServiceFormat'
import { DB_TYPE, IS_WALLET_ENABLED, IS_INBOX_ENABLED } from '../../environment-vars'

if (!DB_TYPE.includes('postgres')) {
  throw Error(`This application requires a Postgres database. Sqlite or other DB types are not supported!`)
}

// Issuer infrastructure migrations - always run (forms, credential designs, metadata)
// These are core issuer functionality, not wallet-specific
// CleanupWorkflowTables must run before InboxMigrations to remove old asset table
// FixUpdateCredentialDesignFunction fixes the update_credential_design function to handle missing keys
// SeedCredentialIssuanceWizard ensures the CredentialIssuanceWizard form is always available
export const IssuerMigrations = [CreateWebWallet1700163641000, CleanupWorkflowTables1736780300000, AddCredentialDesignBranding1763717017000, FixUpdateCredentialDesignFunction1737700000000, SeedCredentialIssuanceWizard1764000000000]

// Inbox migrations - run when inbox is enabled
// MigrateEInvoiceServiceFormat migrates old service types (einv-direct, etc.) to new format (type: eInvoice, subType: Direct)
export const InboxMigrations = IS_INBOX_ENABLED ? [CreateInboxAndEInvoice1736780400000, MigrateEInvoiceServiceFormat1738000000000] : []

// Legacy export for backwards compatibility
export const WorkflowMigrations = IS_WALLET_ENABLED ? IssuerMigrations : IssuerMigrations

// All migrations together
export const WebWalletMigrations = [...IssuerMigrations, ...InboxMigrations]
