import { BroadcastChannel, workerData } from 'node:worker_threads'
import { hostname } from 'node:os'

import { fetch, setGlobalDispatcher, Agent } from 'undici'
import { worker } from 'workerpool'

import { createLogger } from '../../../domain/logger.js'
import fs from 'fs'
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
  console.log({ event })
  // if (data.type === 'close-stream') return apis.close(data.streamId)

  logger.warn('Unrecognized event type "%s". Doing nothing...', data.type)
}

if (!fs.existsSync(workerData.EVALUATION_RESULT_DIR)) {
  fs.mkdirSync(workerData.EVALUATION_RESULT_DIR, { recursive: true })
}
/**
 * Expose our worker api
 */
worker({
  saveEvaluationToDir: (...args) => apis.saveEvaluationToDir(...args)
    /**
     * Transfer the ownership of the underlying ArrayBuffer back to the main thread
     * to prevent copying it over
     */
    .catch((e) => {
      console.error('Error in hydrator worker 1', e)
      throw e
    }),
  loadEvaluationFromDir: (...args) => apis.loadEvaluationFromDir(...args)
    .catch((e) => {
      console.error('Error in hydrator worker 2', e)
      throw e
    })
})
