import { workerData } from 'node:worker_threads'
import { hostname } from 'node:os'
import fs from 'node:fs'
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

broadcast.onmessage = (event) => {
  const data = event.data

  if (data.type === 'dump-evaluations') {
    return apis.dumpEvaluations(data.processId)
  }

  logger.warn('Unrecognized event type "%s". Doing nothing...', data.type)
}

if (workerData.EVALUATION_RESULT_DIR && !fs.existsSync(workerData.EVALUATION_RESULT_DIR)) {
  fs.mkdirSync(workerData.EVALUATION_RESULT_DIR, { recursive: true })
}

worker({
  loadEvaluation: (...args) => {
    return apis.loadEvaluation(...args)
      .catch((e) => {
        throw new Error(`Error in loadEvaluation worker: ${e}`)
      })
  },
  dumpEvaluations: (...args) => apis.dumpEvaluations(...args)
    .catch((e) => {
      throw new Error(`Error in dumpEvaluations worker: ${e}`)
    })
})
