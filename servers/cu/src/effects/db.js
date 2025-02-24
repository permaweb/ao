import * as SqliteClient from './sqlite.js'
import * as PostgresClient from './pg.js'

/**
 * Shared db primitives
 *
 * TODO: better ways to do this, but this is fine for now, since their use
 * is encapsulated within the effects
 */

export const [PROCESSES_TABLE, BLOCKS_TABLE, MODULES_TABLE, EVALUATIONS_TABLE, MESSAGES_TABLE, CHECKPOINTS_TABLE, CHECKPOINT_FILES_TABLE] = [
  'processes',
  'blocks',
  'modules',
  'evaluations',
  'messages',
  'checkpoints',
  'checkpoint_files'
]

/**
 * Use a high value unicode character to terminate a range query prefix.
 * This will cause only string with a given prefix to match a range query
 */
export const COLLATION_SEQUENCE_MAX_CHAR = '\u{10FFFF}'

/**
 * This technically isn't the smallest char, but it's small enough for our needs
 */
export const COLLATION_SEQUENCE_MIN_CHAR = '0'

export async function createDbClient ({ url, ...rest }) {
  if (url.startsWith('postgres://')) {
    return PostgresClient.createPostgresClient({ url, ssl: { rejectUnauthorized: false }, ...rest })
  }

  return SqliteClient.createSqliteClient({ url: `${url}.sqlite`, ...rest })
}
