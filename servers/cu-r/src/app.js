import { always, compose, pipe } from 'ramda'
import express from 'express'
import cors from 'cors'
import httpProxy from 'http-proxy'
import { LRUCache } from 'lru-cache'

/**
 * TODO: we could inject these, but just keeping simple for now
 */
import { logger } from './logger.js'
import { config } from './config.js'

/**
 * The pure business logic.
 *
 * Given a list of valid hosts, return a function that given the processId and failoverAttempt
 * will return a deterministic host from the valid hosts list.
 *
 * If the failoverAttempt exceeds the length of valid hosts list, then every host has
 * been attempted, and so return undefined, to be handled upstream
 */
export function determineHostWith ({ hosts = [], maxSize = 1_000_000 * 10 }) {
  const cache = new LRUCache({
    /**
     * Defaulted to 10MB above
     */
    maxSize,
    /**
     * A number is 8 bytes
     */
    sizeCalculation: () => 8
  })

  function stringToUniqueId (str) {
    return str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  }

  return ({ processId, failoverAttempt }) => {
    if (failoverAttempt >= hosts.length) return

    /**
     * Check cache, and hydrate if necessary
     */
    let uniqueId = cache.get(processId)
    if (!uniqueId) {
      uniqueId = stringToUniqueId(processId)
      cache.set(processId, uniqueId)
    }

    return hosts[(uniqueId + failoverAttempt) % hosts.length]
  }
}

function withRevProxies ({ mount, hosts }) {
  const proxy = httpProxy.createProxyServer({})
  const determineHost = determineHostWith({ hosts })

  async function trampoline (init) {
    let result = init
    /**
     * Call the next iteration, as long it is provided.
     *
     * This prevents overflowing the callback, and gives us our trampoline
     */
    while (typeof result === 'function') result = await result()
    return result
  }

  /**
   * A middleware that simply calls the next handler in the chain.
   *
   * If no errors are thrown, then this middleware simply returns the response.
   * If an error is thrown, it is caught, logged, then used to respond to the request.
   *
   * This is useful for handling thrown errors, and prevents having to call
   * next explictly. Instead, a more idiomatic thrown error can be used in subsequent handlers
   */
  const withErrorHandler = (handler) => (req, res) => {
    return Promise.resolve()
      .then(() => handler(req, res))
      .catch((err) => {
        logger(err)
        if (res.writableEnded) return
        return res.status(err.status || 500).send(err || 'Internal Server Error')
      })
  }

  /**
   * A middleware that will reverse proxy the request to the host determined
   * by the injected business logic, using the provided proxy server instance.
   *
   * If the failoverAttempts for a request are exhausted, then simply bubble the error
   * in the response.
   */
  const withRevProxyHandler = ({ processIdFromRequest }) => {
    return compose(
      withErrorHandler,
      always(async (req, res) => {
        const processId = processIdFromRequest(req)

        /**
         * designed to only log in error cases, so that happy paths
         * are unimpeded by extra work
         */
        async function revProxy ({ failoverAttempt, err }) {
          return new Promise((resolve, reject) => {
            const host = determineHost({ processId, failoverAttempt })

            /**
             * There are no more hosts to failover to -- we've tried them all
             */
            if (!host) {
              logger('Exhausted all failover attempts for process %s. Bubbling final error', processId, err)
              return reject(err)
            }

            /**
             * Reverse proxy the request to the underlying selected host.
             * If an error occurs, return the next iteration for our trampoline to invoke.
             */
            proxy.web(req, res, { target: host }, (err) => {
              /**
               * No error occurred, so we're done
               */
              if (!err) return resolve()

              /**
               * Return the thunk for our next iteration, incrementing our failoverAttempt,
               * so the next host in the list will be used
               */
              logger('Error occurred for host %s and process %s', host, processId, err)
              return resolve(() => revProxy({ failoverAttempt: failoverAttempt + 1, err }))
            })
          })
        }

        /**
         * Our initial thunk that performs the first revProxy to the process' primary host.
         *
         * By using a trampoline, we sideskirt any issues with our tailcall recursion overflowing
         * the callstack, no matter how many underlying hosts exist
         */
        return trampoline(() => revProxy({ failoverAttempt: 0 }))
      })
    )()
  }

  return (app) => {
    mount({ app, withRevProxyHandler })
    return app
  }
}

export const server = pipe(
  (app) => app.use(cors()),
  withRevProxies({
    ...config,
    /**
     * The ONLY custom bits in here for the service.
     *
     * Everything else is boilerplate and reusable.
     */
    mount: ({ app, withRevProxyHandler }) => {
      app.get('/', withRevProxyHandler({ processIdFromRequest: (req) => 'process' }))
      app.get('/result/:messageTxId', withRevProxyHandler({ processIdFromRequest: (req) => req.query['process-id'] }))
      app.get('/state/:processId', withRevProxyHandler({ processIdFromRequest: (req) => req.params.processId }))
      app.get('/cron/:processId', withRevProxyHandler({ processIdFromRequest: (req) => req.params.processId }))
    }
  }),
  (app) => {
    const server = app.listen(config.port, () => {
      logger(`Server is running on http://localhost:${config.port}`)
    })

    process.on('SIGTERM', () => {
      logger('Recevied SIGTERM. Gracefully shutting down server...')
      server.close(() => logger('Server Shut Down'))
    })

    return server
  }
)(express())
