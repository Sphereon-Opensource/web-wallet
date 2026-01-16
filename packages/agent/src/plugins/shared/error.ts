/**
 * Custom error classes for plugin operations.
 */

/**
 * Base class for plugin errors.
 */
export class PluginError extends Error {
  readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'PluginError'
    this.code = code
  }
}

/**
 * Error thrown when an entity is not found.
 */
export class NotFoundError extends PluginError {
  readonly entityType: string
  readonly identifier: string

  constructor(entityType: string, identifier: string) {
    super(`${entityType} not found: ${identifier}`, 'NOT_FOUND')
    this.name = 'NotFoundError'
    this.entityType = entityType
    this.identifier = identifier
  }
}

/**
 * Error thrown when an entity already exists.
 */
export class AlreadyExistsError extends PluginError {
  readonly entityType: string
  readonly identifier: string

  constructor(entityType: string, identifier: string) {
    super(`${entityType} already exists: ${identifier}`, 'ALREADY_EXISTS')
    this.name = 'AlreadyExistsError'
    this.entityType = entityType
    this.identifier = identifier
  }
}

/**
 * Error thrown for validation failures.
 */
export class ValidationError extends PluginError {
  readonly field?: string

  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
    this.field = field
  }
}

/**
 * Error thrown for external service failures.
 */
export class ExternalServiceError extends PluginError {
  readonly serviceName: string
  readonly cause?: Error

  constructor(serviceName: string, message: string, cause?: Error) {
    super(`${serviceName}: ${message}`, 'EXTERNAL_SERVICE_ERROR')
    this.name = 'ExternalServiceError'
    this.serviceName = serviceName
    this.cause = cause
  }
}

/**
 * Check if an error is a NotFoundError.
 */
export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError
}

/**
 * Check if an error is a ValidationError.
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError
}
