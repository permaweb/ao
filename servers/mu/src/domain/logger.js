import { traceWith } from './clients/tracer.js'
import * as SqliteClient from './clients/sqlite.js'

export const createLogger = async ({ namespace, config, activeTraces }) => {
  const db = await SqliteClient.createSqliteClient({ url: `${config.TRACE_DB_PATH}.sqlite`, bootstrap: false, type: 'traces' })
  return traceWith({ namespace, db, TRACE_DB_PATH: config.TRACE_DB_PATH, activeTraces })
}

export default createLogger
