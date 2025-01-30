import { workerData } from 'node:worker_threads'
import { hostname } from 'node:os'

import { fetch, setGlobalDispatcher, Agent } from 'undici'
import { worker } from 'workerpool'

import { createLogger } from '../../../domain/logger.js'
import { createApis } from './main.js'

setGlobalDispatcher(new Agent({
  /** the timeout, in milliseconds, after which a socket without active requests will time out. Monitors time between activity on a connected socket. This value may be overridden by *keep-alive* hints from the server */
  keepAliveTimeout: 30 * 1000, // 30 seconds
  /** the maximum allowed `idleTimeout`, in milliseconds, when overridden by *keep-alive* hints from the server. */
  keepAliveMaxTimeout: 10 * 60 * 1000 // 10 mins
}))

const logger = createLogger({ ...workerData, name: `ao-cu:${hostname()}:worker-${workerData.id}` })

const apis = await createApis({
  ...workerData,
  fetch,
  logger
})

const broadcast = new BroadcastChannel(workerData.BROADCAST)
console.log({ bc: workerData.BROADCAST })

broadcast.onmessage = (event) => {
  const data = event.data
  console.log({ data })
  if (data.type === 'dump-evaluations') return apis.dumpEvaluations()

  logger.warn('Unrecognized event type "%s". Doing nothing...', data.type)
}

worker({
  loadEvaluationFromDir: (...args) => apis.loadEvaluationFromDir(...args)
    .catch((e) => {
      console.error('Error in loadEvaluation worker', e)
      throw e
    }),
  dumpEvaluations: (...args) => apis.dumpEvaluations(...args)
    .catch((e) => {
      console.error('Error in dumpEvaluations worker', e)
      throw e
    })
})
