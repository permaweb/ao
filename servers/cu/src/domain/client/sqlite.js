import Database from 'better-sqlite3'

let internalSqliteDb
export async function createSqliteClient ({ url }) {
  if (internalSqliteDb) return internalSqliteDb

  const db = Database(url)

  /**
   * TODO:
   * - Create tables
   * - Create indexes
   */
  await Promise.resolve()

  return {
    query: async ({ sql, parameters }) => db.prepare(sql).all(...parameters),
    run: async ({ sql, parameters }) => db.prepare(sql).run(...parameters),
    db
  }
}

/**
 * This technically isn't the smallest char, but it's small enough for our needs
 */
export const COLLATION_SEQUENCE_MIN_CHAR = '0'
