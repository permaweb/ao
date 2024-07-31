import debug from 'debug'
import { tap } from 'ramda'
import { randomBytes } from 'crypto'
import { TRACES_TABLE } from './sqlite.js'
/*
 * Here we persist the logs to the storage system
 * for traces.
*/
// function traceLogs (namespace, args) {
//   console.log('Saving logs to trace:', namespace, args)
// }

function createTraceWith ({ db }) {
  function createQuery (logs, messageId, processId, wallet, data) {
    const randomByteString = randomBytes(8).toString('hex')
    return {
      sql: `
        INSERT OR IGNORE INTO ${TRACES_TABLE}
        (id, messageId, processId, wallet, timestamp, logs, data)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      parameters: [
        `${messageId}-${processId}-${wallet}-${randomByteString}`,
        messageId,
        processId,
        wallet,
        Date.now(),
        logs,
        data
      ]
    }
  }

  return ({ logs, messageId, processId, wallet, ctx }) => {
    if (ctx) {
      ctx.tx.dataLength = ctx.tx.data?.length ?? undefined
      delete ctx.tx.data
    }
    db.run(createQuery(logs, messageId, processId, wallet, JSON.stringify(ctx ?? '{}'))).catch((e) => console.log('db error: ', { e }))
    // console.log('Db saved.')
  }
}

const activeLogs = new Map()
const activeCtx = new Map()
export function traceWith ({ namespace, db, TRACE_DB_PATH }) {
  const createTrace = createTraceWith({ db })
  const logger = debug(namespace)

  /*
   * Wrapping the original logger function to add tracing behaviour
   * and also calling the original logger function in order to mimic
   * the same behaviour
   */
  // args - 0: message, 1: messageId, 2: processId, 3: wallet
  const tracerLogger = ({ log, options }, ctx) => {
    if (Array.isArray(log)) {
      logger(...log)
    } else {
      logger(log)
    }
    const { messageId, processId, wallet, end } = options ?? {}
    if (messageId || wallet) {
      const id = `${messageId}-${processId}`
      const currLogs = activeLogs.get(id)
      activeCtx.set(id, ctx)
      if (currLogs) {
        currLogs.logs.push(log)
      } else {
        activeLogs.set(id, { logs: [log], messageId, processId, wallet })
      }

      if (end) {
        const log = activeLogs.get(id)
        const ctx = activeCtx.get(id)
        console.log({ id, log, ctx, logs: log.logs })
        createTrace({ logs: JSON.stringify(log.logs), messageId, processId, wallet, ctx })
      }
    }
  }

  tracerLogger.namespace = logger.namespace

  tracerLogger.child = (name) => traceWith({ namespace: `${tracerLogger.namespace}:${name}`, db, TRACE_DB_PATH })
  tracerLogger.tap = ({ log, options }) => {
    return tap((...args) => {
      return tracerLogger({ log, options }, ...args)
    })
  }

  return tracerLogger
}

/*
 * Here we fetch the traces from the trace data source
*/
export function readTracesWith ({ db }) {
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
    function createQuery (messageId, processId, wallet) {
      return {
        sql: `
          SELECT * FROM ${TRACES_TABLE}
          WHERE messageId = ?
        `,
        parameters: [
          messageId
        ]
      }
    }

    const results = (await db.query(createQuery(message, process, wallet)).catch((e) => console.error('db error: ', { e }))).map((result) => {
      return { ...result, logs: JSON.parse(result.logs), data: JSON.parse(result.data) }
    })
    return results
  }
}
