import { stat } from 'node:fs'

import Database from 'better-sqlite3'
import bytes from 'bytes'

export const [TASKS_TABLE, TRACES_TABLE, CRON_PROCESSES_TABLE] = [
  'tasks',
  'traces',
  'cron_processes'
]
const createTasks = async (db) => db.prepare(
  `CREATE TABLE IF NOT EXISTS ${TASKS_TABLE}(
    id TEXT PRIMARY KEY,
    queueId TEXT,
    timestamp INTEGER,
    data TEXT
  ) WITHOUT ROWID;`
).run()

const createTraces = async (db) => db.prepare(
  `CREATE TABLE IF NOT EXISTS ${TRACES_TABLE}(
    id TEXT PRIMARY KEY,
    messageId TEXT,
    processId TEXT,
    wallet TEXT,
    timestamp INTEGER,
    parentId TEXT,
    logs TEXT,
    data TEXT,
    type TEXT
  ) WITHOUT ROWID;`
).run()

const createCronProcesses = async (db) => db.prepare(
  `CREATE TABLE IF NOT EXISTS ${CRON_PROCESSES_TABLE}(
    processId TEXT PRIMARY KEY,
    status TEXT,
    cursor TEXT
  ) WITHOUT ROWID;`
).run()

const createTracesIndexes = async (db) => db.prepare(
  `CREATE INDEX IF NOT EXISTS idx_${TRACES_TABLE}_messageId_processId
    ON ${TRACES_TABLE}
    (messageId, processId);`
).run()

let internalSqliteDb
export async function createSqliteClient ({ url, bootstrap = false, walLimit = bytes.parse('100mb'), type = 'tasks' }) {
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

    if (type === 'tasks') {
      await Promise.resolve()
        .then(() => createTasks(db))
        .then(() => createCronProcesses(db))
    }
    if (type === 'traces') {
      await Promise.resolve()
        .then(() => createTraces(db))
        .then(() => createTracesIndexes(db))
    }
  }

  return {
    query: async ({ sql, parameters }) => db.prepare(sql).all(...parameters),
    run: async ({ sql, parameters }) => db.prepare(sql).run(...parameters),
    transaction: async (statements) => db.transaction(
      (statements) => statements.map(({ sql, parameters }) => db.prepare(sql).run(...parameters))
    )(statements),
    pragma: async (value, options) => db.pragma(value, options),
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
