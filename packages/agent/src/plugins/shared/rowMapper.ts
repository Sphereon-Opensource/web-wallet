/**
 * Generic row mapping utilities for database results.
 */

/**
 * Parse a date field from a database row, returning undefined if null/empty.
 */
export function parseDate(value: unknown): Date | undefined {
  if (!value) return undefined
  return new Date(value as string)
}

/**
 * Parse a required date field from a database row.
 */
export function parseRequiredDate(value: unknown): Date {
  return new Date(value as string)
}

/**
 * Parse a JSON field from a database row.
 * Handles both string and already-parsed object formats.
 */
export function parseJson<T = Record<string, unknown>>(value: unknown): T | undefined {
  if (!value) return undefined
  if (typeof value === 'string') {
    return JSON.parse(value) as T
  }
  return value as T
}

/**
 * Parse a number field from a database row.
 */
export function parseNumber(value: unknown, defaultValue: number = 0): number {
  if (value === null || value === undefined) return defaultValue
  if (typeof value === 'number') return value
  return parseInt(value as string, 10)
}

/**
 * Parse a boolean field from a database row.
 */
export function parseBoolean(value: unknown, defaultValue: boolean = false): boolean {
  if (value === null || value === undefined) return defaultValue
  if (typeof value === 'boolean') return value
  return value === 'true' || value === '1' || value === 1
}

/**
 * Create a typed row mapper function.
 *
 * @example
 * const mapUser = createRowMapper<User>({
 *   id: 'id',
 *   firstName: 'first_name',
 *   createdAt: { column: 'created_at', transform: parseRequiredDate }
 * })
 */
export type RowMapperConfig<T> = {
  [K in keyof T]: string | { column: string; transform: (value: unknown) => T[K] }
}

export function createRowMapper<T>(config: RowMapperConfig<T>): (row: Record<string, unknown>) => T {
  return (row: Record<string, unknown>): T => {
    const result: Partial<T> = {}

    for (const [key, mapping] of Object.entries(config) as [keyof T, string | { column: string; transform: (value: unknown) => T[keyof T] }][]) {
      if (typeof mapping === 'string') {
        result[key] = row[mapping] as T[keyof T]
      } else {
        result[key] = mapping.transform(row[mapping.column])
      }
    }

    return result as T
  }
}
