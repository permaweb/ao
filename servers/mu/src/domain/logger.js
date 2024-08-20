import { traceWith } from './clients/tracer.js'
import * as SqliteClient from './clients/sqlite.js'

export const createLogger = async ({ namespace, config, activeTraces }) => {
  const db = await SqliteClient.createSqliteClient({ url: `${config.TRACE_DB_URL}.sqlite`, bootstrap: false, type: 'traces' })
  return traceWith({ namespace, db, TRACE_DB_URL: config.TRACE_DB_URL, activeTraces, DISABLE_TRACE: config.DISABLE_TRACE })
}

export default createLogger
