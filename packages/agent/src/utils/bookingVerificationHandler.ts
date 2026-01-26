import { BookingVerificationApiServer } from '../api/bookingVerificationApiServer'

/**
 * Checks if a correlation ID has booking verification context stored.
 *
 * This can be used to determine if a credential presentation is associated
 * with a booking verification flow.
 *
 * @param correlationId - The correlation ID to check
 * @returns true if booking verification context exists for this correlation ID
 */
export function hasBookingVerificationContext(correlationId: string): boolean {
  return BookingVerificationApiServer.isBookingVerification(correlationId)
}

/**
 * Marks a booking verification as complete.
 *
 * This function should be called after successful VP verification in the OID4VP flow
 * when the correlation ID is associated with a booking verification.
 *
 * @param correlationId - The correlation ID from the OID4VP flow
 * @param success - Whether the verification was successful
 * @param error - Optional error message if verification failed
 */
export function completeBookingVerification(
  correlationId: string,
  success: boolean,
  error?: string
): void {
  if (success) {
    BookingVerificationApiServer.completeVerification(correlationId, 'VERIFIED')
    console.log(`[BookingVerification] Verification ${correlationId} completed successfully`)
  } else {
    BookingVerificationApiServer.completeVerification(correlationId, 'FAILED', error)
    console.log(`[BookingVerification] Verification ${correlationId} failed: ${error}`)
  }
}

/**
 * Gets the booking verification context for a correlation ID.
 *
 * @param correlationId - The correlation ID to look up
 * @returns The stored context, or undefined if not found
 */
export function getBookingVerificationContext(correlationId: string) {
  return BookingVerificationApiServer.getVerificationContext(correlationId)
}
