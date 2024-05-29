import { worker } from 'workerpool'
import { workerData } from 'node:worker_threads'
import { of } from 'hyper-async'
import { cond, equals, propOr } from 'ramda'

import { createTaskQueue, enqueueWith, dequeueWith } from './taskQueue.js'
import { domainConfigSchema, config } from '../../config.js'
import { logger } from '../../logger.js'
import { createResultApis } from '../../domain/index.js'

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
 * Push results onto the queue and seperate
 * them out by type so they can be individually
 * operated on by the worker. Also stucture them
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
function processResultsWith ({ dequeue, processResult, logger }) {
  return async () => {
    while (true) {
      const result = dequeue()
      if (result) {
        logger(`Processing task of type ${result.type}`)
        processResult(result).catch((e) => {
          logger(`Result failed with error ${e}, will not recover`)
          logger(e)
        })
      } else {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }
}

const queue = createTaskQueue({
  queueId: workerData.queueId,
  logger
})

const enqueue = enqueueWith({ queue, logger })
const dequeue = dequeueWith({ queue, logger })

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
  dequeue,
  processResult,
  logger
})

/**
 * Start the processing of results from
 * the queue and expose the worker api
 */

processResults()

worker({
  enqueueResults
})
