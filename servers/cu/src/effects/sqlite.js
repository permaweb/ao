import { stat } from 'node:fs'

import Database from 'better-sqlite3'
import bytes from 'bytes'

import { BLOCKS_TABLE, CHECKPOINT_FILES_TABLE, CHECKPOINTS_TABLE, EVALUATIONS_TABLE, MESSAGES_TABLE, MODULES_TABLE, PROCESSES_TABLE } from './db.js'

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
    cron TEXT,
    output JSONB,
    evaluatedAt INTEGER
  ) WITHOUT ROWID;`
).run()

const createMessages = async (db) => db.prepare(
  `CREATE TABLE IF NOT EXISTS ${MESSAGES_TABLE}(
    id TEXT,
    processId TEXT,
    seq TEXT,
    PRIMARY KEY (id, processId)
  ) WITHOUT ROWID;`
).run()

const createCheckpoints = async (db) => db.prepare(
  `CREATE TABLE IF NOT EXISTS ${CHECKPOINTS_TABLE}(
    id TEXT PRIMARY KEY,
    processId TEXT,
    timestamp INTEGER,
    ordinate TEXT,
    cron TEXT,
    memory TEXT,
    evaluation TEXT
  ) WITHOUT ROWID;`
).run()

const createCheckpointFiles = async (db) => db.prepare(
  `CREATE TABLE IF NOT EXISTS ${CHECKPOINT_FILES_TABLE}(
    id TEXT PRIMARY KEY,
    processId TEXT UNIQUE,
    timestamp INTEGER,
    ordinate TEXT,
    cron TEXT,
    file TEXT,
    evaluation TEXT,
    cachedAt INTEGER
  ) WITHOUT ROWID;`
).run()

const createBlocksIndexes = async (db) => db.prepare(
  `CREATE INDEX IF NOT EXISTS idx_${BLOCKS_TABLE}_height_timestamp
    ON ${BLOCKS_TABLE}
    (height, timestamp);`
).run()

const createMessagesIndexes = async (db) => db.prepare(
  `CREATE INDEX IF NOT EXISTS idx_${MESSAGES_TABLE}_id_processId_seq
    ON ${MESSAGES_TABLE}
    (id, processId, seq);
  `
).run()

const createCheckpointsIndexes = async (db) => db.prepare(
  `CREATE INDEX IF NOT EXISTS idx_${CHECKPOINTS_TABLE}_processId_timestamp
    ON ${CHECKPOINTS_TABLE}
    (processId, timestamp);`
).run()

const createCheckpointFilesIndexes = async (db) => db.prepare(
  `CREATE INDEX IF NOT EXISTS idx_${CHECKPOINT_FILES_TABLE}_processId_timestamp
    ON ${CHECKPOINTS_TABLE}
    (processId, timestamp);`
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
      .then(() => createProcesses(db))
      .then(() => createBlocks(db))
      .then(() => createModules(db))
      .then(() => createEvaluations(db))
      .then(() => createMessages(db))
      .then(() => createCheckpoints(db))
      .then(() => createCheckpointFiles(db))
      .then(() => createBlocksIndexes(db))
      .then(() => createMessagesIndexes(db))
      .then(() => createCheckpointsIndexes(db))
      .then(() => createCheckpointFilesIndexes(db))
  }

  return {
    engine: 'sqlite',
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
