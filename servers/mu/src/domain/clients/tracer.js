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
  function createQuery (logs, messageId, processId, wallet, parentMessageId, data) {
    const randomByteString = randomBytes(8).toString('hex')
    return {
      sql: `
        INSERT OR IGNORE INTO ${TRACES_TABLE}
        (id, messageId, processId, wallet, timestamp, parentId, logs, data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      parameters: [
        `${messageId}-${processId}-${wallet}-${randomByteString}`,
        messageId,
        processId,
        wallet,
        Date.now(),
        parentMessageId,
        logs,
        data
      ]
    }
  }

  return ({ logs, messageId, processId, wallet, parentMessageId, ctx }) => {
    if (ctx?.tx?.data) {
      ctx.tx.dataLength = ctx.tx.data.length
      delete ctx.tx.data
    }
    if (ctx?.raw) {
      ctx.rawLength = ctx.raw.length
      delete ctx.raw
    }
    db.run(createQuery(logs, messageId, processId, wallet, parentMessageId, JSON.stringify(ctx ?? '{}')))
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
    // TODO: Log everything at the end
    if (Array.isArray(log)) {
      logger(...log)
    } else {
      logger(log)
    }
    const { messageId, processId, wallet, end, parentMessageId } = options ?? {}
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
        const currentLog = activeLogs.get(id)
        const ctx = activeCtx.get(id)
        createTrace({ logs: JSON.stringify(currentLog.logs), messageId, processId, wallet, parentMessageId, ctx })
        // TODO: Log everything at the end
        // for (const log of currentLog.logs) {
        //   if (Array.isArray(log)) {
        //     logger(...log)
        //   } else {
        //     logger(log)
        //   }
        // }
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
    limit = 20,
    /*
     * offset is the page to return so if limit is 20 and offset is
     * 20, this function should return records starting at 20
     */
    offset = 0
  }) => {
    function createQuery (messageId, processId, wallet) {
      return {
        sql: `
          WITH RECURSIVE 
            Ancestors AS (
                SELECT id, messageId, processId, wallet, logs, data, parentId
                FROM traces
                WHERE messageId = ?
                UNION ALL
                SELECT t.id, t.messageId, t.processId, t.wallet, t.logs, t.data, t.parentId
                FROM traces t
                INNER JOIN Ancestors a ON t.messageId = a.parentId
            ),
            Descendants AS (
                SELECT id, messageId, processId, wallet, logs, data, parentId
                FROM traces
                WHERE messageId = ?
                UNION ALL
                SELECT t.id, t.messageId, t.processId, t.wallet, t.logs, t.data, t.parentId
                FROM traces t
                INNER JOIN Descendants d ON t.parentId = d.messageId
            )
            SELECT 'root' AS type, id, messageId, processId, wallet, logs, data, parentId FROM traces WHERE messageId = ?
            UNION ALL
            SELECT 'ancestor' AS type, id, messageId, processId, wallet, logs, data, parentId FROM Ancestors WHERE messageId != ?
            UNION ALL
            SELECT 'descendant' AS type, id, messageId, processId, wallet, logs, data, parentId FROM Descendants WHERE messageId != ?
            LIMIT ?, ?;
        `,
        parameters: [
          messageId,
          messageId,
          messageId,
          messageId,
          messageId,
          offset,
          limit
        ]
      }
    }

    const results = (await db.query(createQuery(message, process, wallet)).catch((e) => console.error('db error: ', { e }))).map((result) => {
      return { ...result, logs: JSON.parse(result.logs), data: JSON.parse(result.data) }
    })
    return results
  }
}
