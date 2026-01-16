/**
 * Utility functions for formatting values in the web-wallet.
 */

/**
 * Format a byte count as a human-readable file size.
 *
 * @param bytes - The number of bytes
 * @returns Formatted string like "1.5 MB" or "256 KB"
 *
 * @example
 * formatFileSize(0)         // "0 B"
 * formatFileSize(1024)      // "1.0 KB"
 * formatFileSize(1536)      // "1.5 KB"
 * formatFileSize(1048576)   // "1.0 MB"
 */
export function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null) return ''
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const size = i < sizes.length ? sizes[i] : sizes[sizes.length - 1]

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${size}`
}

/**
 * Format a number as currency with the specified currency code.
 *
 * @param amount - The numeric amount
 * @param currencyCode - ISO 4217 currency code (e.g., "EUR", "USD")
 * @param locale - The locale for formatting (default: 'en-US')
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1234.56, 'EUR')        // "€1,234.56"
 * formatCurrency(1234.56, 'USD')        // "$1,234.56"
 * formatCurrency(1234.56, 'EUR', 'de')  // "1.234,56 €"
 */
export function formatCurrency(
  amount?: number,
  currencyCode: string = 'EUR',
  locale: string = 'en-US'
): string {
  if (amount === undefined || amount === null) return ''

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
    }).format(amount)
  } catch {
    // Fallback if currency code is invalid
    return `${currencyCode} ${amount.toFixed(2)}`
  }
}

/**
 * Format a date string for display.
 *
 * @param dateString - ISO date string or Date object
 * @param options - Intl.DateTimeFormat options
 * @param locale - The locale for formatting (default: 'en-US')
 * @returns Formatted date string
 *
 * @example
 * formatDate('2024-01-15')                    // "Jan 15, 2024"
 * formatDate('2024-01-15', { dateStyle: 'full' }) // "Monday, January 15, 2024"
 */
export function formatDate(
  dateString?: string | Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
  locale: string = 'en-US'
): string {
  if (!dateString) return ''

  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    return new Intl.DateTimeFormat(locale, options).format(date)
  } catch {
    return String(dateString)
  }
}

/**
 * Format a date and time string for display.
 *
 * @param dateString - ISO date string or Date object
 * @param locale - The locale for formatting (default: 'en-US')
 * @returns Formatted date/time string
 *
 * @example
 * formatDateTime('2024-01-15T14:30:00Z') // "Jan 15, 2024, 2:30 PM"
 */
export function formatDateTime(
  dateString?: string | Date,
  locale: string = 'en-US'
): string {
  return formatDate(dateString, { dateStyle: 'medium', timeStyle: 'short' }, locale)
}

/**
 * Truncate a string to a maximum length with ellipsis.
 *
 * @param str - The string to truncate
 * @param maxLength - Maximum length before truncation
 * @param suffix - The suffix to add when truncated (default: '...')
 * @returns Truncated string
 *
 * @example
 * truncateString('Hello World', 8)  // "Hello..."
 * truncateString('Hi', 8)           // "Hi"
 */
export function truncateString(
  str?: string,
  maxLength: number = 50,
  suffix: string = '...'
): string {
  if (!str) return ''
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - suffix.length) + suffix
}

/**
 * Truncate a DID for display, keeping the method and last characters.
 *
 * @param did - The DID to truncate
 * @param keepEnd - Number of characters to keep at the end (default: 8)
 * @returns Truncated DID
 *
 * @example
 * truncateDid('did:web:example.com:user:12345678')  // "did:web:...12345678"
 */
export function truncateDid(did?: string, keepEnd: number = 8): string {
  if (!did) return ''
  if (did.length <= 20) return did

  const parts = did.split(':')
  if (parts.length < 2) return truncateString(did, 20)

  const method = `${parts[0]}:${parts[1]}:`
  const rest = parts.slice(2).join(':')

  if (rest.length <= keepEnd) return did
  return `${method}...${rest.slice(-keepEnd)}`
}
