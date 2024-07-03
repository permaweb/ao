import { worker } from 'workerpool'
import { workerData } from 'node:worker_threads'
import { of } from 'hyper-async'
import { cond, equals, propOr } from 'ramda'
import cron from 'node-cron'

import { createTaskQueue, enqueueWith, dequeueWith, removeDequeuedTasksWith } from './taskQueue.js'
import { domainConfigSchema, config } from '../../config.js'
import { logger } from '../../logger.js'
import { createResultApis } from '../../domain/index.js'
import { createSqliteClient } from './sqlite.js'

export const domain = {
  ...(domainConfigSchema.parse(config)),
  fetch,
  logger
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
          assigns: propOr([], 'assigns', res)
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
  return ({ msgs, spawns, assigns }) => {
    const results = [
      ...msgs.map(msg => ({
        type: 'MESSAGE',
        cachedMsg: msg,
        initialTxId: msg.initialTxId
      })),
      ...spawns.map(spawn => ({
        type: 'SPAWN',
        cachedSpawn: spawn,
        initialTxId: spawn.initialTxId
      })),
      ...assigns.flatMap(assign => assign.Processes.map(
        (pid) => ({
          type: 'ASSIGN',
          assign: {
            txId: assign.Message,
            processId: pid,
            baseLayer: assign.BaseLayer === true ? '' : null,
            exclude: assign.Exclude && assign.Exclude.length > 0 ? assign.Exclude.join(',') : null
          }
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
        console.log({ TASK_QUEUE_MAX_RETRIES, TASK_QUEUE_RETRY_DELAY })
        logger(`Processing task of type ${result.type}`)
        processResult(result).catch((e) => {
          logger(`Result failed with error ${e}, will not recover`)
          logger(e)
          /**
           * Upon failure, we want to add back to the task queue
           * our task with its progress (ctx). This progress is passed
           * down in the cause object of the error.
           *
           * After some time, enqueue the task again and increment retries.
           * Upon maximum retries, finish.
           */
          const ctx = e.cause ?? {}
          const retries = ctx.retries ?? 0
          const stage = ctx.stage
          setTimeout(() => {
            if (retries < TASK_QUEUE_MAX_RETRIES && stage !== 'end') {
              enqueue({ ...ctx, retries: retries + 1 })
            }
          }, TASK_QUEUE_RETRY_DELAY)
        })
      } else {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }
}

const db = await createSqliteClient({ url: workerData.DB_URL, bootstrap: false })
const queue = await createTaskQueue({
  queueId: workerData.queueId,
  db,
  logger
})

/**
 * Initialize a set of task ids.
 * These task ids represent database ids
 * to be remove on the next cron cycle.
 */
const dequeuedTasks = new Set()

const enqueue = enqueueWith({ queue, queueId: workerData.queueId, logger, db })
const dequeue = dequeueWith({ queue, logger, dequeuedTasks })
const removeDequeuedTasks = removeDequeuedTasksWith({ dequeuedTasks, queueId: workerData.queueId, db })

const enqueueResults = enqueueResultsWith({
  enqueue
})

const processResult = processResultWith({
  logger,
  enqueueResults,
  processMsg,
  processSpawn,
  processAssign
})

const processResults = processResultsWith({
  enqueue,
  dequeue,
  processResult,
  logger,
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
