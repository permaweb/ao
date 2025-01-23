import pg from 'pg'

import { BLOCKS_TABLE, CHECKPOINT_FILES_TABLE, CHECKPOINTS_TABLE, EVALUATIONS_TABLE, MESSAGES_TABLE, MODULES_TABLE, PROCESSES_TABLE } from './db.js'

const { Pool } = pg

const rows = (res) => res.rows

export async function createPostgresClient ({ url, bootstrap = false, ...rest }) {
  const pool = new Pool({
    connectionString: url,
    max: 10,
    idleTimeoutMillis: 10000,
    allowExitOnIdle: true,
    ...rest
  })

  if (bootstrap) {
    await Promise.resolve()
      .then(() => createProcesses(pool))
      .then(() => createBlocks(pool))
      .then(() => createModules(pool))
      .then(() => createEvaluations(pool))
      .then(() => createMessages(pool))
      .then(() => createCheckpoints(pool))
      .then(() => createCheckpointFiles(pool))
      .then(() => createBlocksIndexes(pool))
      .then(() => createMessagesIndexes(pool))
      .then(() => createCheckpointsIndexes(pool))
      .then(() => createCheckpointFilesIndexes(pool))
  }

  return {
    engine: 'postgres',
    query: async ({ sql, parameters }) => pool.query(toOrdinals(sql), parameters).then(rows),
    run: async ({ sql, parameters }) => pool.query(toOrdinals(sql), parameters).then(rows),
    transaction: async (statements) => pool.connect()
      .then((client) =>
        /**
         * https://node-postgres.com/features/transactions
         */
        Promise.resolve()
          .then(() => client.query('BEGIN'))
          .then(() => Promise.all(statements.map(
            ({ sql, parameters }) => client.query(toOrdinals(sql), parameters).then(rows)
          )))
          .then(() => client.query('COMMIT'))
          .catch((e) => client.query('ROLLBACK').then(() => { throw e }))
          .finally(() => client.release())
      )
  }
}

const createProcesses = async (pool) => pool.query(
  `CREATE TABLE IF NOT EXISTS ${PROCESSES_TABLE}(
    id TEXT PRIMARY KEY,
    signature TEXT,
    data TEXT,
    anchor TEXT,
    owner TEXT,
    tags TEXT,
    block TEXT
  );`
)

const createBlocks = async (pool) => pool.query(
  `CREATE TABLE IF NOT EXISTS ${BLOCKS_TABLE}(
    id BIGINT PRIMARY KEY,
    height BIGINT,
    timestamp BIGINT
  );`
)

const createModules = async (pool) => pool.query(
  `CREATE TABLE IF NOT EXISTS ${MODULES_TABLE}(
    id TEXT PRIMARY KEY,
    owner TEXT,
    tags TEXT
  );`
)

const createEvaluations = async (pool) => pool.query(
  `CREATE TABLE IF NOT EXISTS ${EVALUATIONS_TABLE}(
    id TEXT PRIMARY KEY,
    "processId" TEXT,
    "messageId" TEXT,
    "deepHash" TEXT,
    nonce BIGINT,
    epoch BIGINT,
    timestamp BIGINT,
    ordinate TEXT,
    "blockHeight" BIGINT,
    cron TEXT,
    output TEXT,
    "evaluatedAt" BIGINT
  );`
)

const createMessages = async (pool) => pool.query(
  `CREATE TABLE IF NOT EXISTS ${MESSAGES_TABLE}(
    id TEXT,
    "processId" TEXT,
    seq TEXT,
    PRIMARY KEY (id, "processId")
  );`
)

const createCheckpoints = async (pool) => pool.query(
  `CREATE TABLE IF NOT EXISTS ${CHECKPOINTS_TABLE}(
    id TEXT PRIMARY KEY,
    "processId" TEXT,
    timestamp BIGINT,
    ordinate TEXT,
    cron TEXT,
    memory TEXT,
    evaluation TEXT
  );`
)

const createCheckpointFiles = async (pool) => pool.query(
  `CREATE TABLE IF NOT EXISTS ${CHECKPOINT_FILES_TABLE}(
    id TEXT PRIMARY KEY,
    "processId" TEXT UNIQUE,
    timestamp BIGINT,
    ordinate TEXT,
    cron TEXT,
    file TEXT,
    evaluation TEXT,
    "cachedAt" BIGINT
  );`
)

const createBlocksIndexes = async (pool) => pool.query(
  `CREATE INDEX IF NOT EXISTS idx_${BLOCKS_TABLE}_height_timestamp
    ON ${BLOCKS_TABLE}
    (height, timestamp);`
)

const createMessagesIndexes = async (pool) => pool.query(
  `CREATE INDEX IF NOT EXISTS idx_${MESSAGES_TABLE}_id_processId_seq
    ON ${MESSAGES_TABLE}
    (id, "processId", seq);
  `
)

const createCheckpointsIndexes = async (pool) => pool.query(
  `CREATE INDEX IF NOT EXISTS idx_${CHECKPOINTS_TABLE}_processId_timestamp
    ON ${CHECKPOINTS_TABLE}
    ("processId", timestamp);`
)

const createCheckpointFilesIndexes = async (pool) => pool.query(
  `CREATE INDEX IF NOT EXISTS idx_${CHECKPOINT_FILES_TABLE}_processId_timestamp
    ON ${CHECKPOINTS_TABLE}
    ("processId", timestamp);`
)

/**
 * HACK to convert SQLite queries to postgres queries:
 * 1. replace all parameters like '?' with the ordinal parameter like '$1'
 * 2. replace INSERT AND IGNORE with ON CONFLICT DO NOTHING
 *
 * This is to circumvent the diverging sql dialects and different
 * parameterization supported by different clients.
 *
 * We could eventually use a query builder ie. knex or kysely,
 * that translates multiple dialects, but this is less changes, simpler,
 * and less deps. So we'll do this for now.
 */
function toOrdinals (sql) {
  let count = 0
  sql = sql.trim()
  if (sql.startsWith('INSERT')) {
    sql = sql.replace('INSERT OR IGNORE', 'INSERT')
    if (sql.endsWith(';')) sql = sql.slice(0, -1)
    sql += ' ON CONFLICT DO NOTHING;'
  }
  return sql.replace(/\?/g, () => `$${++count}`)
}
