import { worker } from 'workerpool'
import { BroadcastChannel, workerData } from 'node:worker_threads'
import { tap } from 'ramda'
import cron from 'node-cron'

import { createTaskQueue, enqueueWith, dequeueWith, removeDequeuedTasksWith } from './taskQueue.js'
import { domainConfigSchema, config } from '../../config.js'
// Without this import the worker crashes
import { createResultApis } from '../../domain/index.js'
import { createSqliteClient } from './sqlite.js'
import { broadcastEnqueueWith, enqueueResultsWith, processResultWith, processResultsWith } from './worker-fn.js'
import { deleteOldTracesWith } from './tracer.js'

const broadcastChannel = new BroadcastChannel('mu-worker')

/*
 * Here we create a logger and inject it, this logger has the
 * same interface as the other one however instead of writing
 * to stdout it sends all the logs back to the main thread
 * using the broadcast channel.
*/
function createBroadcastLogger ({ namespace, config }) {
  const loggerBroadcast = (note, ...args) => {
    broadcastChannel.postMessage({
      purpose: 'log',
      namespace,
      message: note,
      args
    })
  }

  loggerBroadcast.child = (name) => {
    return createBroadcastLogger({ namespace: `${namespace}:${name}`, config })
  }

  loggerBroadcast.tap = (note, ...rest) =>
    tap((...args) => loggerBroadcast(note, ...rest, ...args))

  return loggerBroadcast
}

async function whileTrue (fn) {
  while (true) {
    await fn()
  }
}

const broadcastLogger = createBroadcastLogger({ namespace: 'mu-worker-broadcast', config })
export const domain = {
  ...(domainConfigSchema.parse(config)),
  fetch,
  logger: broadcastLogger
}


/**
 * This program utilizes the business logic for
 * processing results but since the worker is also
 * instantiated by the business logic used by the
 * server, it pull in its own set of apis here.
 */
const {
  processMsg,
  processSpawn,
  processAssign
} = await createResultApis(domain)

const db = await createSqliteClient({ url: workerData.DB_URL, bootstrap: false, type: 'tasks' })
const queue = await createTaskQueue({
  queueId: workerData.queueId,
  db,
  logger: broadcastLogger
})

/**
 * We post a message with the queue size every second to ensure
 * that the sliding window array of queue sizes does not become
 * stale with minutes-old values.
 */
setInterval(() => {
  broadcastChannel.postMessage({ purpose: 'queue-size', size: queue.length, time: Date.now() })
}, 1000)
/**
 * Initialize a set of task ids.
 * These task ids represent database ids
 * to be remove on the next cron cycle.
 */
const dequeuedTasks = new Set()

const enqueue = enqueueWith({ queue, queueId: workerData.queueId, logger: broadcastLogger, db })
const broadcastEnqueue = broadcastEnqueueWith({ enqueue, queue, broadcastChannel })
const dequeue = dequeueWith({ queue, logger: broadcastLogger, dequeuedTasks })
const removeDequeuedTasks = removeDequeuedTasksWith({ dequeuedTasks, queueId: workerData.queueId, db })

const enqueueResults = enqueueResultsWith({
  enqueue: broadcastEnqueue
})

const processResult = processResultWith({
  logger: broadcastLogger,
  enqueueResults,
  processMsg,
  processSpawn,
  processAssign
})

const processResults = processResultsWith({
  enqueue: broadcastEnqueue,
  dequeue,
  processResult,
  logger: broadcastLogger,
  TASK_QUEUE_MAX_RETRIES: workerData.TASK_QUEUE_MAX_RETRIES,
  TASK_QUEUE_RETRY_DELAY: workerData.TASK_QUEUE_RETRY_DELAY,
  broadcastChannel,
  whileTrue,
  setTimeout
})

/** Set up a cron to clear out old tasks from the
  * sqlite database. Every two seconds, all of the
  * tasks in the database that have been dequeued
  * (dequeuedTasks) are deleted.
  */
let ct = null
let isJobRunning = false
ct = cron.schedule('*/2 * * * * *', async () => {
  if (!isJobRunning) {
    isJobRunning = true
    ct.stop() // pause cron while dequeueing
    removeDequeuedTasks()
    ct.start() // resume cron when done dequeueing
    isJobRunning = false
  }
})

let traceCt = null
let traceIsJobRunning = false
const traceDb = await createSqliteClient({ url: workerData.TRACE_DB_URL, bootstrap: false, type: 'traces' })
const deleteOldTraces = deleteOldTracesWith({ db: traceDb, logger: broadcastLogger })
/**
 * Create cron to clear out traces, each hour
 */
function startDeleteTraceCron () {
  traceCt = cron.schedule('0 * * * *', async () => {
    if (!traceIsJobRunning) {
      traceIsJobRunning = true
      traceCt.stop()
      await deleteOldTraces()
      traceCt.start()
      traceIsJobRunning = false
    }
  })
}
/**
 * Start the processing of results from
 * the queue and expose the worker api
 */

processResults()

worker({
  enqueueResults,
  startDeleteTraceCron
})
