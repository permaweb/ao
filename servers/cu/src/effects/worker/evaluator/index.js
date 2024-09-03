import { BroadcastChannel, workerData } from 'node:worker_threads'
import { hostname } from 'node:os'

import { fetch, setGlobalDispatcher, Agent } from 'undici'
import { worker, Transfer } from 'workerpool'

import { createLogger } from '../../../domain/logger.js'
import { arrayBufferFromMaybeView } from '../../../domain/utils.js'

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
  if (data.type === 'close-stream') return apis.close(data.streamId)

  logger.warn('Unrecognized event type "%s". Doing nothing...', data.type)
}

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
       * The evaluation stream is being closed,
       * so no output is returned, so nothing
       * needs to be transferred
       */
      if (!output) return output
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
       * If Memory is sufficiently large, transferring the View somehow
       * causes the underlying ArrayBuffer to be truncated. This truncation
       * does not occur when instead the underlying ArrayBuffer is transferred,
       * directly.
       *
       * So we always ensure the Memory transferred back to the main thread
       * is the actual ArrayBuffer, and not a View.
       *
       * TODO: maybe AoLoader should be made to return the underlying ArrayBuffer
       * as Memory, instead of a View?
       */
      output.Memory = arrayBufferFromMaybeView(output.Memory)

      return new Transfer(output, [output.Memory])
    })
})
