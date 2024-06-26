import { workerData } from 'node:worker_threads'
import { hostname } from 'node:os'

import { fetch, setGlobalDispatcher, Agent } from 'undici'
import { worker } from 'workerpool'

import { createLogger } from '../../logger.js'

import { createApis } from './main.js'

setGlobalDispatcher(new Agent({
  /** the timeout, in milliseconds, after which a socket without active requests will time out. Monitors time between activity on a connected socket. This value may be overridden by *keep-alive* hints from the server */
  keepAliveTimeout: 30 * 1000, // 30 seconds
  /** the maximum allowed `idleTimeout`, in milliseconds, when overridden by *keep-alive* hints from the server. */
  keepAliveMaxTimeout: 10 * 60 * 1000 // 10 mins
}))

const logger = createLogger(`ao-cu:${hostname()}:worker-${workerData.id}`)

const apis = await createApis({
  ...workerData,
  fetch,
  logger
})

/**
 * Expose our worker api
 */
worker(apis)
