import { stat } from 'node:fs'

import Database from 'better-sqlite3'
import bytes from 'bytes'

export const [TASKS_TABLE] = [
  'tasks'
]
const createTasks = async (db) => db.prepare(
  `CREATE TABLE IF NOT EXISTS ${TASKS_TABLE}(
    id TEXT PRIMARY KEY,
    queueId TEXT,
    timestamp INTEGER,
    data TEXT
  ) WITHOUT ROWID;`
).run()

let internalSqliteDb
export async function createSqliteClient ({ url, bootstrap = false, walLimit = bytes.parse('100mb') }) {
  if (internalSqliteDb) return internalSqliteDb

  const db = Database(url)

  if (bootstrap) {
    db.pragma('encoding = "UTF-8"')
    db.pragma('journal_mode = WAL')
    /**
     * https://github.com/WiseLibs/better-sqlite3/blob/master/docs/performance.md#checkpoint-starvation
     */
    setInterval(stat.bind(null, `${url}-wal`, (err, stat) => {
      if (err && err.code !== 'ENOENT') throw err
      if (stat && stat.size > walLimit) db.pragma('wal_checkpoint(RESTART)')
    }), 5000).unref()

    await Promise.resolve()
      .then(() => createTasks(db))
  }

  return {
    query: async ({ sql, parameters }) => db.prepare(sql).all(...parameters),
    run: async ({ sql, parameters }) => db.prepare(sql).run(...parameters),
    transaction: async (statements) => db.transaction(
      (statements) => statements.map(({ sql, parameters }) => db.prepare(sql).run(...parameters))
    )(statements),
    db
  }
}

/**
 * Use a high value unicode character to terminate a range query prefix.
 * This will cause only string with a given prefix to match a range query
 */
export const COLLATION_SEQUENCE_MAX_CHAR = '\u{10FFFF}'

/**
 * This technically isn't the smallest char, but it's small enough for our needs
 */
export const COLLATION_SEQUENCE_MIN_CHAR = '0'
