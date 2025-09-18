import { of } from 'hyper-async'
import { cond, equals, propOr } from 'ramda'
import { randomBytes } from 'node:crypto'

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
       * processing functions above. We also pass a
       * parentId and processId for logging purposes
       */
      .chain((res) => {
        enqueueResults({
          msgs: propOr([], 'msgs', res),
          spawns: propOr([], 'spawns', res),
          assigns: propOr([], 'assigns', res),
          parentId: propOr(undefined, 'parentId', res),
          processId: propOr(undefined, 'processId', res),
          wallet: propOr(undefined, 'wallet', res),
          ip: propOr(undefined, 'ip', res),
          parentOwner: propOr(undefined, 'parentOwner', res)
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
 * correctly for input into the business logic.
 * messageId, processId, parentId, and logId have been
 * added for log tracing purposes.
 */
export function enqueueResultsWith ({ enqueue }) {
  return ({ msgs, spawns, assigns, initialTxId, parentId, processId, ...rest }) => {
    console.dir({ m: 'ENQUEUING RESULTS' }, { depth: null })
    const results = [
      ...msgs.map(msg => ({
        type: 'MESSAGE',
        cachedMsg: msg,
        initialTxId: msg.initialTxId,
        messageId: msg.initialTxId,
        processId: msg.fromProcessId,
        parentId: msg.parentId,
        logId: randomBytes(8).toString('hex'),
        ip: rest.ip,
        parentOwner: rest.parentOwner,
        wallet: msg.wallet
      })),
      ...spawns.map(spawn => ({
        type: 'SPAWN',
        cachedSpawn: spawn,
        initialTxId: spawn.initialTxId,
        messageId: spawn.initialTxId,
        processId: spawn.processId,
        parentId: spawn.parentId,
        logId: randomBytes(8).toString('hex'),
        ip: rest.ip,
        parentOwner: rest.parentOwner,
        wallet: spawn.wallet
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
          processId,
          parentId,
          logId: randomBytes(8).toString('hex'),
          ip: rest.ip,
          parentOwner: rest.parentOwner,
          wallet: rest.wallet ?? null
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
export function processResultsWith ({
  enqueue,
  dequeue,
  processResult,
  logger,
  TASK_QUEUE_MAX_RETRIES,
  TASK_QUEUE_RETRY_DELAY,
  broadcastChannel,
  whileTrue,
  setTimeout
}) {
  return async () => {
    async function handleResult () {
      const result = dequeue()
      if (result) {
        logger({ log: `Processing task of type ${result.type}` }, result)
        processResult(result).then((ctx) => {
          /**
           * After successfully processing result,
           * broadcast retries metric.
           */
          broadcastChannel.postMessage({
            purpose: 'task-retries',
            retries: ctx.retries ?? 0,
            status: 'success'
          })
        }).catch((e) => {
          const ctx = e.cause
          const retries = ctx.retries ?? 0
          const stage = ctx.stage
          const type = result.type

          /**
           * On errors, log the error and send to the broadcast channel for metric purposes
           */
          logger({ log: `Result failed with error ${e}, will not recover`, end: retries >= TASK_QUEUE_MAX_RETRIES }, ctx)
          broadcastChannel.postMessage({
            purpose: 'error-stage',
            stage,
            type
          })

          /**
           * Upon failure, we want to add back to the task queue
           * our task with its progress (ctx). This progress is passed
           * down in the cause object of the error.
          *
          * After some time, enqueue the task again and increment retries.
          * Upon maximum retries, finish.
          */
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
          }, (2 ** retries) * TASK_QUEUE_RETRY_DELAY)
        })
      } else {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    whileTrue(handleResult)
  }
}

export function broadcastEnqueueWith ({ enqueue, queue, broadcastChannel }) {
  return (...args) => {
    broadcastChannel.postMessage({
      purpose: 'queue-size',
      size: queue.length + 1,
      time: Date.now()
    })
    return enqueue(...args)
  }
}
