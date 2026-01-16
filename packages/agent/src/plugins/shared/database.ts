import { DataSource } from 'typeorm'

/**
 * Build a WHERE clause with dynamic conditions.
 *
 * @param conditions - Object of field names to values
 * @param startIndex - Starting parameter index (default: 1)
 * @returns Tuple of [whereClause, params, nextIndex]
 *
 * @example
 * const [where, params, idx] = buildWhereClause({ name: 'test', active: true })
 * // where = '"name" = $1 AND "active" = $2'
 * // params = ['test', true]
 * // idx = 3
 */
export function buildWhereClause(
  conditions: Record<string, unknown>,
  startIndex: number = 1
): [string, unknown[], number] {
  const clauses: string[] = []
  const params: unknown[] = []
  let paramIndex = startIndex

  for (const [field, value] of Object.entries(conditions)) {
    if (value === undefined) continue

    if (value === null) {
      clauses.push(`"${toSnakeCase(field)}" IS NULL`)
    } else {
      clauses.push(`"${toSnakeCase(field)}" = $${paramIndex++}`)
      params.push(value)
    }
  }

  return [clauses.join(' AND '), params, paramIndex]
}

/**
 * Build an UPDATE SET clause with dynamic fields.
 *
 * @param updates - Object of field names to values
 * @param startIndex - Starting parameter index (default: 1)
 * @returns Tuple of [setClause, params, nextIndex]
 */
export function buildUpdateClause(
  updates: Record<string, unknown>,
  startIndex: number = 1
): [string, unknown[], number] {
  const setClauses: string[] = []
  const params: unknown[] = []
  let paramIndex = startIndex

  for (const [field, value] of Object.entries(updates)) {
    if (value === undefined) continue

    setClauses.push(`"${toSnakeCase(field)}" = $${paramIndex++}`)
    params.push(value === null ? null : value)
  }

  return [setClauses.join(', '), params, paramIndex]
}

/**
 * Convert camelCase to snake_case.
 */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

/**
 * Execute a query and return results.
 * Wrapper for common query patterns.
 */
export async function executeQuery<T>(
  db: DataSource,
  query: string,
  params: unknown[] = []
): Promise<T[]> {
  return db.query(query, params)
}

/**
 * Execute a query and return a single result or null.
 */
export async function executeSingleQuery<T>(
  db: DataSource,
  query: string,
  params: unknown[] = []
): Promise<T | null> {
  const results = await db.query(query, params)
  return results.length > 0 ? results[0] : null
}
