import debug from 'debug'
import { tap } from 'ramda'

/*
 * Here we persist the logs to the storage system
 * for traces.
*/
function traceLogs (namespace, args) {
  console.log('Saving logs to trace:', namespace, args)
}

export function traceWith ({ namespace, TRACE_DB_PATH }) {
  const logger = debug(namespace)

  /*
   * Wrapping the original logger function to add tracing behaviour
   * and also calling the original logger function in order to mimic
   * the same behaviour
   */
  const tracerLogger = (...args) => {
    traceLogs(namespace, ...args)
    logger(...args)
  }

  tracerLogger.namespace = logger.namespace

  tracerLogger.child = (name) => traceWith({ namespace: `${tracerLogger.namespace}:${name}`, TRACE_DB_PATH })
  tracerLogger.tap = (note, ...rest) =>
    tap((...args) => tracerLogger(note, ...rest, ...args))

  return tracerLogger
}

/*
 * Here we fetch the traces from the trace data source
*/
export function readTracesWith ({ TRACE_DB_PATH }) {
  return async ({
    /*
     * Given a process id return all message activity for
     * that process id
     */
    process,
    /*
     * Given a message id return all pushing activity
     * for that message, this should mean any parents
     * or subsequent pushes. So given a message id
     * this function should return the parent message
     * it was pushed for (if there is one) and any
     * subsequent messages that were pushed.
     */
    message,
    /*
     * Given a wallet, return activity related to this
     * wallet
     */
    wallet,
    /*
     * the page size for the request
     */
    limit,
    /*
     * offset is the page to return so if limit is 20 and offset is
     * 20, this function should return records starting at 20
     */
    offset
  }) => {
    return []
  }
}
