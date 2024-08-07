import { worker } from 'workerpool'
import { BroadcastChannel, workerData } from 'node:worker_threads'
import { of } from 'hyper-async'
import { cond, equals, propOr, tap } from 'ramda'
import cron from 'node-cron'

import { createTaskQueue, enqueueWith, dequeueWith, removeDequeuedTasksWith } from './taskQueue.js'
import { domainConfigSchema, config } from '../../config.js'
// Without this import the worker crashes
// import { logger } from '../../logger.js'
import { createResultApis } from '../../domain/index.js'
import { createSqliteClient } from './sqlite.js'
import { randomBytes } from 'node:crypto'

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

const broadcastLogger = createBroadcastLogger('mu-worker-broadcast')

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

/**
 * Process an individual result. This handles
 * all 3 types of results, spawns, messages and
 * assigns and invokes the necessary business logic.
 * If there is a failure that can be recovered from
 * it places a result back on the queue
 */
export function processResultWith ({
  enqueueResults,
  processMsg,
  processSpawn,
  processAssign
}) {
  return async (result) => {
    return of(result)
      .map((result) => ({ ...result, stage: result.stage ?? 'start' }))
      /**
       * Choose the correct business logic based
       * on the type of the individual Result
       */
      .chain((res) => cond([
        [equals('MESSAGE'), () => processMsg],
        [equals('SPAWN'), () => processSpawn],
        [equals('ASSIGN'), () => processAssign]
      ])(res.type)(res))

      /**
       * Here we enqueue further result sets that
       * were themselves the result of running the
       * processing functions above
       */
      .chain((res) => {
        enqueueResults({
          msgs: propOr([], 'msgs', res),
          spawns: propOr([], 'spawns', res),
          assigns: propOr([], 'assigns', res),
          parentId: propOr(undefined, 'parentId', res)
        })
        return of(res)
      })
      .toPromise()
  }
}

/**
 * Push results onto the queue and separate
 * them out by type so they can be individually
 * operated on by the worker. Also structure them
 * correctly for input into the business logic
 */
export function enqueueResultsWith ({ enqueue }) {
  return ({ msgs, spawns, assigns, initialTxId, parentId, ...rest }) => {
    console.log(100, { msgs, spawns, assigns, parentId, rest, msg: msgs[0] })
    const results = [
      ...msgs.map(msg => ({
        type: 'MESSAGE',
        cachedMsg: msg,
        initialTxId: msg.initialTxId,
        messageId: msg.initialTxId,
        processId: msg.fromProcessId,
        parentId: msg.parentId,
        logId: randomBytes(8).toString('hex')
      })),
      ...spawns.map(spawn => ({
        type: 'SPAWN',
        cachedSpawn: spawn,
        initialTxId: spawn.initialTxId,
        messageId: spawn.initialTxId,
        processId: spawn.processId,
        parentId: spawn.parentId,
        logId: randomBytes(8).toString('hex')
      })),
      ...assigns.flatMap(assign => assign.Processes.map(
        (pid) => ({
          type: 'ASSIGN',
          assign: {
            txId: assign.Message,
            processId: pid,
            baseLayer: assign.BaseLayer === true ? '' : null,
            exclude: assign.Exclude && assign.Exclude.length > 0 ? assign.Exclude.join(',') : null
          },
          messageId: assign.Message,
          processId: pid,
          parentId,
          logId: randomBytes(8).toString('hex')
        })
      ))
    ]
    results.forEach(enqueue)
  }
}

/**
 * Kick of processing of results in the order
 * that they enter into the queue. Results
 * do not need to wait for other results to finish
 * so we can do this async
 */
function processResultsWith ({ enqueue, dequeue, processResult, logger, TASK_QUEUE_MAX_RETRIES, TASK_QUEUE_RETRY_DELAY }) {
  return async () => {
    while (true) {
      const result = dequeue()
      if (result) {
        logger({ log: `Processing task of type ${result.type}` }, result)
        processResult(result).then((ctx) => {
          broadcastChannel.postMessage({
            purpose: 'task-retries',
            retries: ctx.retries ?? 0,
            status: 'success'
          })
        }).catch((e) => {
          /**
           * Upon failure, we want to add back to the task queue
           * our task with its progress (ctx). This progress is passed
           * down in the cause object of the error.
          *
          * After some time, enqueue the task again and increment retries.
          * Upon maximum retries, finish.
          */
          const ctx = e.cause
          const retries = ctx.retries ?? 0
          const stage = ctx.stage
          const type = result.type
          broadcastChannel.postMessage({
            purpose: 'error-stage',
            stage,
            type
          })
          logger({ log: `Result failed with error ${e}, will not recover`, end: retries >= TASK_QUEUE_MAX_RETRIES }, ctx)
          setTimeout(() => {
            if (retries < TASK_QUEUE_MAX_RETRIES && stage !== 'end' && ctx) {
              logger({ log: `Retrying process task of type ${result.type}, attempt ${retries + 1}`, end: retries >= TASK_QUEUE_MAX_RETRIES }, ctx)
              enqueue({ ...ctx, retries: retries + 1 })
            } else {
              broadcastChannel.postMessage({
                purpose: 'task-retries',
                retries,
                status: 'failure'
              })
            }
          }, TASK_QUEUE_RETRY_DELAY)
        })
      } else {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }
}

function broadcastEnqueueWith ({ enqueue, queue }) {
  return (...args) => {
    broadcastChannel.postMessage({
      purpose: 'queue-size',
      size: queue.length + 1,
      time: Date.now()
    })
    return enqueue(...args)
  }
}

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
const broadcastEnqueue = broadcastEnqueueWith({ enqueue, queue })
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
  TASK_QUEUE_RETRY_DELAY: workerData.TASK_QUEUE_RETRY_DELAY
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

/**
 * Start the processing of results from
 * the queue and expose the worker api
 */

processResults()

worker({
  enqueueResults
})
