import { randomBytes } from 'crypto'
import { TASKS_TABLE } from './sqlite.js'

/**
 * Create our task queue.
 * Check if using a "persisted" queue Id
 * by querying the database for tasks with that queue Id.
 * If there are results, set them as initial array.
 * Otherwise, start with an empty array.
 *
 */
export async function createTaskQueue ({ queueId, logger, db }) {
  logger({ log: `Initializing queue for queue index ${queueId}` })
  function createDeleteQuery () {
    return {
      sql: `
        DELETE FROM ${TASKS_TABLE}
        WHERE queueId = ? AND timestamp < (strftime('%s', 'now') - 3600) * 1000;
      `,
      parameters: [
        queueId
      ]
    }
  }

  function createQuery () {
    return {
      sql: `
        SELECT * FROM ${TASKS_TABLE}
        WHERE queueId = ?
        ORDER BY timestamp DESC
      `,
      parameters: [
        queueId
      ]
    }
  }

  await db.run(createDeleteQuery())
  await db.run({ sql: 'VACUUM;', parameters: [] })
  const queryResults = (await db.query(createQuery())).map((row) => ({ ...JSON.parse(row.data), dbId: row.id }))
  const taskQueue = queryResults || []
  return taskQueue
}

/**
 * Enqueue a task onto our task queue.
 * Write it to the database after
 * adding it to the queue. Tasks are identified
 * by a dbId, which includes the queueId, timestamp,
 * and a random hex string. This is so that it can
 * be removed from the database when dequeuing.
 */
export function enqueueWith ({ queue, queueId, logger, db, getRecentTraces, toAddress, getRateLimits, IP_WALLET_RATE_LIMIT, IP_WALLET_RATE_LIMIT_INTERVAL, rateLimits }) {
  async function checkRateLimitExceeded(task) {
    function calculateRateLimit(walletID, procID, limits) {
      if (!walletID) return 100
      if (!limits || Object.keys(limits).length === 0) return 50
      const userBase = Number(limits?.addresses?.[walletID] ?? 0) + Number(limits.default)
      const processLimits = limits?.processes?.[procID] ?? {}
      const processDivisor = Number(processLimits?.divide ?? 1)
      const processSubtractor = Number(processLimits?.subtract ?? 0)
      return Math.max(0, (userBase / processDivisor) - processSubtractor)
    }
    const intervalStart = new Date().getTime() - IP_WALLET_RATE_LIMIT_INTERVAL
    const wallet = task?.wallet || task?.cachedMsg?.wallet || null
    const processId = task?.cachedMsg?.msg?.Target || task?.processId || null
    const address = task?.cachedMsg?.cron ? wallet : await toAddress(wallet)
    const rateLimitAllowance = calculateRateLimit(address, processId, getRateLimits())
    const recentTraces = await getRecentTraces({ wallet, ip: task.ip, timestamp: intervalStart, processId, isSpawn: task?.type === "SPAWN" })
    const walletTracesCount = recentTraces.wallet.length
    console.log(`Rate limit result for address ${address}, ${walletTracesCount} wallet traces found, ${rateLimitAllowance} rate limit allowance`)
    if (walletTracesCount >= rateLimitAllowance) {
      logger({ log: `Rate limit exceeded. Skipping enqueueing task.` })
      return true
    }
    return false
  }
  function createQuery (task, dbId, timestamp) {
    return {
      sql: `
        INSERT OR IGNORE INTO ${TASKS_TABLE}
        (id, queueId, timestamp, data)
        VALUES (?, ?, ?, ?)
      `,
      parameters: [
        dbId,
        queueId,
        timestamp,
        JSON.stringify(task)
      ]
    }
  }
  return async (task) => {
    const rateLimitExceeded = await checkRateLimitExceeded(task)
    if (rateLimitExceeded) return
    const timestamp = new Date().getTime()
    const randomByteString = randomBytes(8).toString('hex')
    const dbId = `${queueId}-${timestamp}-${randomByteString}`
    queue.push({ ...task, dbId })
    db.run(createQuery(task, dbId, timestamp))
  }
}

/**
 * Dequeue a task from the task queue.
 * Also add the ID to our dequeuedTask
 * set for later removal from the db.
 */
export function dequeueWith ({ queue, dequeuedTasks }) {
  return () => {
    if (queue.length === 0) {
      return null
    }
    const dequeuedTask = queue.shift()

    dequeuedTasks.add(dequeuedTask.dbId)
    return dequeuedTask
  }
}

/**
 * Remove dequeued tasks from the db.
 * Remove all DB records with ids that are present
 * in our dequeuedTasks set. Upon calling the function,
 * create a copy of the set using Array.from().
 * This deals with overwrite issues - only the tasks in the set
 * at the time of copying will be removed from the db and set.
 */
export function removeDequeuedTasksWith ({ dequeuedTasks, queueId, db }) {
  function createQuery (dequeuedTasks) {
    return {
      sql: `
        DELETE FROM ${TASKS_TABLE}
        WHERE id IN (${Array.from(dequeuedTasks).map(() => '?').join(',')}) OR timestamp < (strftime('%s', 'now') - 3600) * 1000;
      `,
      parameters: Array.from(dequeuedTasks)
    }
  }
  return () => {
    const taskCopy = Array.from(dequeuedTasks)
    if (!taskCopy.length) return

    const query = createQuery(taskCopy)

    db.run(query)
    db.run({ sql: 'VACUUM;', parameters: [] })
    taskCopy.forEach((task) => {
      dequeuedTasks.delete(task)
    })
  }
}
