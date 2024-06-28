import { workerData } from 'node:worker_threads'
import { hostname } from 'node:os'

import { fetch, setGlobalDispatcher, Agent } from 'undici'
import { worker, Transfer } from 'workerpool'

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
worker({
  evaluate: (...args) => apis.evaluate(...args)
    /**
     * Transfer the ownership of the underlying ArrayBuffer back to the main thread
     * to prevent copying it over
     */
    .then((output) => {
      /**
       * If the very first evaluation produces
       * an error, the resultant Memory will be null
       * (prevMemory is used, which initializes as null)
       *
       * So in this edge-case, there's nothing to transfer,
       * so we simply return output
       */
      if (!output.Memory) return output

      /**
       * We make sure to only transfer the underlying ArrayBuffer
       * back to the main thread.
       */
      output.Memory = ArrayBuffer.isView(output.Memory)
        ? output.Memory.buffer
        : output.Memory

      return new Transfer(output, [output.Memory])
    })
})
