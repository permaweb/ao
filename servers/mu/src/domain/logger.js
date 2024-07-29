import { traceWith } from './clients/tracer.js'

export const createLogger = ({ namespace, config }) => {
  return traceWith({ namespace, TRACE_DB_PATH: config.TRACE_DB_PATH })
}

export default createLogger
