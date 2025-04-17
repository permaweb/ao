import debug from 'debug'
import { propOr, tap } from 'ramda'
import { randomBytes } from 'crypto'
import { TRACES_TABLE } from './sqlite.js'

/**
   * Each minute, a cron runs to delete all traces older than 2 hours.
   * This is to prevent the trace database from growing too large.
   */
export function deleteOldTracesWith ({ db, logger }) {
  return async () => {
    function createQuery () {
      const twoHoursAgo = Date.now() - (2 * 1000 * 60 * 60)
      /**
       * Delete all traces with timestamp older than 2 hours.
       */
      return {
        sql: `
          DELETE FROM ${TRACES_TABLE}
          WHERE timestamp < ?
        `,
        parameters: [twoHoursAgo]
      }
    }
    await db.run(createQuery())
    await db.run({ sql: 'VACUUM;', parameters: [] })
    logger({ log: 'Deleted old traces.' })
  }
}

function createTraceWith ({ db }) {
  /**
   * Persist the ip and other metadata to the storage system for traces
   * @param {String} messageId - The identifying id for this message
   * @param {String} processId - The id for this message's process
   * @param {String} wallet - The wallet address associated with this message
   * @param {String} parentId - The messageId of this message's 'parent' message
   * @param {String} ip - The ip address of the client that pushed this message
   * @param {'MESSAGE' | 'SPAWN' | 'ASSIGN' } type - The type of this message
   * @returns Sql query and parameters
   */
  function createQuery ({ messageId, processId, wallet, parentId, ip, type }) {
    const randomByteString = randomBytes(8).toString('hex')
    return {
      sql: `
        INSERT OR IGNORE INTO ${TRACES_TABLE}
        (id, messageId, processId, wallet, timestamp, parentId, ip, type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      parameters: [
        `${messageId}-${processId}-${wallet}-${randomByteString}`,
        messageId,
        processId,
        wallet,
        Date.now(),
        parentId,
        ip,
        type
      ]
    }
  }

  return ({ messageId, processId, wallet, parentId, ip, type }) => {
    /**
     * Add the trace to the db.
     */
    db.run(createQuery({ messageId, processId, wallet, parentId, ip, type }))
  }
}

export function traceWith ({ namespace, db, TRACE_DB_URL, activeTraces, DISABLE_TRACE }) {
  const createTrace = createTraceWith({ db })
  const logger = debug(namespace)

  /*
   * Wrapping the original logger function to add tracing behavior
   * and also calling the original logger function in order to mimic
   * the same behavior
   */
  const tracerLogger = ({ log, logId, end }, ctx) => {
    /**
     * Messages are assigned a logId when they first enter the processing pipeline.
     * This logId will allow us to group these logs together and save + print them
     * at the end of the message processing.
     */
    logId = logId || propOr(undefined, 'logId', ctx)

    /**
     * Some logs will not have a logId. These are logs not associated with
     * any particular message. We want to log these and move on.
     */
    if (!logId) {
      if (Array.isArray(log)) {
        logger(...log)
      } else {
        logger(log)
      }
    } else {
      /**
       * If we do have a logId, add / create an entry in our
       * activeTraces map. This allows us to keep a list of
       * all logs associated with a message.
       */
      const currLogs = activeTraces.get(logId)
      if (currLogs) {
        currLogs.logs.push(log)
      } else {
        activeTraces.set(logId, { logs: [log] })
      }
    }

    /**
     * Some logs have an 'end' flag passed in. This signifies
     * that the message is at the end of the processing pipeline,
     * and the logs are ready to save + print.
     */
    if (end) {
      const currentLog = activeTraces.get(logId)
      ctx = ctx ?? {}
      const { messageId, processId, wallet, parentId, ip } = ctx
      const type = ctx?.type || ctx?.dataItem?.tags?.find((tag) => tag.name === 'Type')?.value?.toUpperCase()

      /**
       * If we have a messageId or processId, save our trace to the DB.
       */
      if (messageId || processId || !DISABLE_TRACE) {
        createTrace({ messageId, processId, wallet, parentId, ip, type })
      }

      /**
       * Iterate through our list of logs and print each one.
       */
      if (currentLog?.logs?.length > 0) {
        for (const log of currentLog?.logs) {
          if (Array.isArray(log)) {
            logger(...log)
          } else {
            logger(log)
          }
        }
      }
      /**
       * Delete our map entry for this logId.
       * This will prevent the map growing unboundedly large.
       */
      activeTraces.delete(logId)
    }
  }

  tracerLogger.namespace = logger.namespace

  tracerLogger.child = (name) => traceWith({ namespace: `${tracerLogger.namespace}:${name}`, db, TRACE_DB_URL, activeTraces })
  tracerLogger.tap = ({ log, logId, end }) => {
    return tap((...args) => {
      return tracerLogger({ log, logId, end }, ...args)
    })
  }

  return tracerLogger
}

export function recentTracesWith ({ db, DISABLE_TRACE }) {
  return async ({ wallet, ip, timestamp }) => {
    if (DISABLE_TRACE) {
      return []
    }
    const results = await db.query(`SELECT * FROM ${TRACES_TABLE} WHERE wallet = ? AND ip = ? AND timestamp > ? ORDER BY timestamp DESC LIMIT 100`, [wallet, ip, timestamp])
    return results
  }
}

/*
 * Here we fetch the traces from the trace data source
*/
export function readTracesWith ({ db, DISABLE_TRACE }) {
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
    offset = 0,
    /**
     * the type of input we should query - can be
     * MESSAGE, SPAWN, OR ASSIGN
     */
    type
  }) => {
    /**
     * Creates a SQL query to retrieve a message given a messageId, processId, and type.
     * Recursively retrieves all ancestors and descendants of the root node.
     * Note messageId is queried using LIKE `%${messageId}%`.
     * This allows us to grab all records with the processId if messageId is undefined.
     *
     * @param {String} messageId - The messageId of the record to retrieve
     * @param {String} processId - The processId of the record to retrieve
     * @param {'MESSAGE' | 'SPAWN' | 'ASSIGN' } type - The type of record to retrieve
     * @param {Number} offset - The starting point to retrieve records from
     * @param {Number} limit - The page size for the request
     * @returns Sql query and parameters
     */
    function createQuery (messageId, processId, type, offset, limit) {
      return {
        sql: `
        WITH RECURSIVE 
            Root AS (
              SELECT id, messageId, processId, wallet, ip, parentId, timestamp, type
              FROM traces
              WHERE messageId LIKE ? AND processId = ?
              ORDER BY timestamp DESC
            ),  
            FilteredRoot AS (
              SELECT * FROM Root WHERE type = ?
            ),
            Ancestors AS (
              SELECT id, messageId, processId, wallet, ip, parentId, timestamp, type
              FROM traces
              WHERE messageId IN (SELECT messageId FROM FilteredRoot) AND processId IN (SELECT processId FROM FilteredRoot)
              UNION ALL
              SELECT t.id, t.messageId, t.processId, t.wallet, t.ip, t.parentId, t.timestamp, t.type
              FROM traces t
              INNER JOIN Ancestors a ON t.messageId = a.parentId
              WHERE t.messageId NOT IN (SELECT messageId FROM FilteredRoot) AND t.processId IN (SELECT processId FROM FilteredRoot)
            ),
            Descendants AS (
              SELECT id, messageId, processId, wallet, ip, parentId, timestamp, type
              FROM traces
              WHERE messageId IN (SELECT messageId FROM FilteredRoot) AND processId IN (SELECT processId FROM FilteredRoot)
              UNION ALL
              SELECT t.id, t.messageId, t.processId, t.wallet, t.ip, t.parentId, t.timestamp, t.type
              FROM traces t
              INNER JOIN Descendants d ON t.parentId = d.messageId
              WHERE t.messageId NOT IN (SELECT messageId FROM FilteredRoot) AND t.processId IN (SELECT processId FROM FilteredRoot)
            )
            SELECT 'root' AS relation, id, messageId, processId, wallet, ip, parentId, timestamp, type FROM ROOT WHERE messageId IN (SELECT messageId FROM FilteredRoot) AND processId IN (SELECT processId FROM FilteredRoot)
            UNION ALL
            SELECT 'ancestor' AS relation, id, messageId, processId, wallet, ip, parentId, timestamp, type FROM Ancestors WHERE messageId NOT IN (SELECT messageId FROM FilteredRoot) AND processId IN (SELECT processId FROM FilteredRoot)
            UNION ALL
            SELECT 'descendant' AS relation, id, messageId, processId, wallet, ip, parentId, timestamp, type FROM Descendants WHERE messageId NOT IN (SELECT messageId FROM FilteredRoot) AND processId IN (SELECT processId FROM FilteredRoot)
            LIMIT ?, ?;
        `,
        parameters: [
          `%${messageId || ''}%`,
          processId,
          type,
          offset,
          limit
        ]
      }
    }

    if (DISABLE_TRACE) {
      return []
    }

    const results = await db.query(createQuery(message, process, type, offset, limit)).catch((e) => console.error('Error querying database for traces:', { e }))
    return results
  }
}
