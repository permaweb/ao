import { stat } from 'node:fs'

import Database from 'better-sqlite3'
import bytes from 'bytes'

export const [PROCESSES_TABLE, BLOCKS_TABLE, MODULES_TABLE, EVALUATIONS_TABLE] = [
  'processes',
  'blocks',
  'modules',
  'evaluations'
]

const createProcesses = async (db) => db.prepare(
  `CREATE TABLE IF NOT EXISTS ${PROCESSES_TABLE}(
    id TEXT PRIMARY KEY,
    signature TEXT,
    data TEXT,
    anchor TEXT,
    owner TEXT,
    tags JSONB,
    block JSONB
  ) WITHOUT ROWID;`
).run()

const createBlocks = async (db) => db.prepare(
  `CREATE TABLE IF NOT EXISTS ${BLOCKS_TABLE}(
    id INTEGER PRIMARY KEY,
    height INTEGER,
    timestamp INTEGER
  ) WITHOUT ROWID;`
).run()

const createModules = async (db) => db.prepare(
  `CREATE TABLE IF NOT EXISTS ${MODULES_TABLE}(
    id TEXT PRIMARY KEY,
    owner TEXT,
    tags JSONB
  ) WITHOUT ROWID;`
).run()

const createEvaluations = async (db) => db.prepare(
  `CREATE TABLE IF NOT EXISTS ${EVALUATIONS_TABLE}(
    id TEXT PRIMARY KEY,
    processId TEXT,
    messageId TEXT,
    deepHash TEXT,
    nonce INTEGER,
    epoch INTEGER,
    timestamp INTEGER,
    ordinate TEXT,
    blockHeight INTEGER,
    cron BOOLEAN,
    output JSONB,
    evaluatedAt INTEGER
  ) WITHOUT ROWID;`
).run()

const createBlocksIndexes = async (db) => db.prepare(
  `CREATE INDEX IF NOT EXISTS idx_blocks_height_timestamp
    ON ${BLOCKS_TABLE}
    (height, timestamp);`
).run()

const createEvaluationIndexes = async (db) => db.prepare(
  `CREATE INDEX IF NOT EXISTS idx_evaluations_deepHash_id
    ON ${EVALUATIONS_TABLE}
    (deepHash, id);
  `
).run()

let internalSqliteDb
export async function createSqliteClient ({ url, walLimit = bytes.parse('100mb') }) {
  if (internalSqliteDb) return internalSqliteDb

  const db = Database(url)
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
    .then(() => createProcesses(db))
    .then(() => createBlocks(db))
    .then(() => createModules(db))
    .then(() => createEvaluations(db))
    .then(() => createBlocksIndexes(db))
    .then(() => createEvaluationIndexes(db))

  return {
    query: async ({ sql, parameters }) => db.prepare(sql).all(...parameters),
    run: async ({ sql, parameters }) => db.prepare(sql).run(...parameters),
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
