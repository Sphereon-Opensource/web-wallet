import {ImageAttributes} from '@sphereon/ui-components.core'

export type CredentialExchangeMode = 'issuance' | 'verification'

export type CredentialExchangeStatus = 'idle' | 'loading' | 'pending' | 'verified' | 'failed' | 'expired'

export interface CredentialPreviewItem {
  id: string
  name: string
  type?: string
  backgroundColor?: string
  logo?: ImageAttributes
  isMandatory?: boolean
}

export interface CredentialExchangeViewProps {
  /** Mode determines the flow type - issuance (OID4VCI) or verification (OID4VP) */
  mode: CredentialExchangeMode

  /** The URI to encode in the QR code (for verification) or the raw offer URI (for issuance) */
  qrUri: string

  /** Optional deeplink URL for opening in a mobile wallet */
  deeplink?: string

  /** Which tab to show initially */
  initialTab?: 'qr' | 'url'

  /** Whether to show the URL tab (defaults to true for issuance, false for verification) */
  showUrlTab?: boolean

  /** Credential preview items to display */
  credentials?: CredentialPreviewItem[]

  /** Status indicator for verification flows */
  status?: CredentialExchangeStatus

  /** Status message to display */
  statusMessage?: string

  /** Callback when URL is copied */
  onCopyUrl?: () => void

  /** Callback when "Open in Wallet" is clicked */
  onOpenInWallet?: (url: string) => void

  /** Callback when retry is clicked after failure */
  onRetry?: () => void

  /** Additional CSS class name */
  className?: string

  /** QR code size in pixels (default 200) */
  qrSize?: number

  /** Custom QR code element (if provided, bypasses internal QR generation) */
  qrElement?: React.ReactElement | null

  /** Whether QR code is currently loading */
  qrLoading?: boolean

  /** Title text override */
  title?: string

  /** Subtitle text override */
  subtitle?: string

  /** Credential section title override */
  credentialSectionTitle?: string
}
