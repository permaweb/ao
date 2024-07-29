import debug from 'debug'
import { tap } from 'ramda'
import { randomBytes } from 'crypto'
import { TRACES_TABLE } from './sqlite.js'
/*
 * Here we persist the logs to the storage system
 * for traces.
*/
function traceLogs (namespace, args) {
  console.log('Saving logs to trace:', namespace, args)
}

function createTraceWith ({ db }) {
  function createQuery (message, messageId, processId, wallet) {
    const randomByteString = randomBytes(8).toString('hex')
    return {
      sql: `
        INSERT OR IGNORE INTO ${TRACES_TABLE}
        (id, messageId, processId, wallet, timestamp, data)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      parameters: [
        `${messageId}-${processId}-${wallet}-${randomByteString}`,
        messageId,
        processId,
        wallet,
        Date.now(),
        message
      ]
    }
  }

  return (message, messageId, processId, wallet) => {
    console.log({ message, messageId, processId, wallet })
    db.run(createQuery(message, messageId, processId, wallet)).catch((e) => console.log('db error: ', { e }))
  }
}

export function traceWith ({ namespace, db, TRACE_DB_PATH }) {
  const createTrace = createTraceWith({ db })
  const logger = debug(namespace)

  /*
   * Wrapping the original logger function to add tracing behaviour
   * and also calling the original logger function in order to mimic
   * the same behaviour
   */
  // args - 0: message, 1: messageId, 2: processId, 3: wallet
  const tracerLogger = (args) => {
    if (typeof args === 'object') {
      const { log, messageId, processId, wallet } = args
      console.log({ log, messageId, processId, wallet })
      traceLogs(namespace, log)
      logger(log)
      if (messageId || processId || wallet) {
        createTrace(...log)
      }
    } else {
      const log = args
      traceLogs(namespace, log)
      logger(log)
    }
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
