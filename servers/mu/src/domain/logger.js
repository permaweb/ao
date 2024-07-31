import { traceWith } from './clients/tracer.js'
import * as SqliteClient from './clients/sqlite.js'

export const createLogger = async ({ namespace, config }) => {
  const db = await SqliteClient.createSqliteClient({ url: `${config.DB_URL}.sqlite`, bootstrap: false })
  return traceWith({ namespace, db, TRACE_DB_PATH: config.TRACE_DB_PATH })
}

export default createLogger
