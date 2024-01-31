import { join } from 'node:path'
import { always, compose, pipe } from 'ramda'
import heapdump from 'heapdump'
import express from 'express'
import cors from 'cors'
/**
 * See https://github.com/http-party/node-http-proxy/pull/1559
 * the PR that fixes the memory was not merged, so a fork
 * was created with the fix
 */
import httpProxy from 'http-proxy-node16'
import { LRUCache } from 'lru-cache'

/**
 * TODO: we could inject these, but just keeping simple for now
 */
import { logger } from './logger.js'
import { config } from './config.js'
import { determineHostWith } from './domain.js'

function withRevProxies ({ aoUnitConfig, hosts, maxSize = 1_000_000 * 10 }) {
  const proxy = httpProxy.createProxyServer({})
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

  logger('Configuring to reverse proxy ao %s units...', config.aoUnit)

  const determineHost = determineHostWith({ hosts, cache })
  const mount = aoUnitConfig[config.aoUnit]

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
  const withRevProxyHandler = ({ processIdFromRequest, restreamBody }) => {
    return compose(
      withErrorHandler,
      always(async (req, res) => {
        const processId = await processIdFromRequest(req)

        async function revProxy ({ failoverAttempt, err }) {
          /**
           * In cases where we have to consume the request stream before proxying
           * it, we allow passing a restreamBody to get a fresh stream to send along
           * on the proxied request.
           *
           * If not needed, then this is simply set to undefined, which uses the unconsumed
           * request stream fro the original request object
           *
           * See buffer option on https://www.npmjs.com/package/http-proxy#options
           */
          const buffer = restreamBody ? await restreamBody(req) : undefined

          return new Promise((resolve, reject) => {
            const host = determineHost({ processId, failoverAttempt })

            /**
             * There are no more hosts to failover to -- we've tried them all
             */
            if (!host) {
              logger('Exhausted all failover attempts for process %s. Bubbling final error', processId, err)
              return reject(err)
            }

            logger('Reverse Proxying process %s to host %s', processId, host)
            /**
             * Reverse proxy the request to the underlying selected host.
             * If an error occurs, return the next iteration for our trampoline to invoke.
             */
            proxy.web(req, res, { target: host, buffer }, (err) => {
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
    mount({ app, revProxy: withRevProxyHandler })
    return app
  }
}

export const router = (aoUnitConfig) => pipe(
  (app) => app.use(cors()),
  (app) => app.use(express.static(config.DUMP_PATH)),
  withRevProxies({ ...config, aoUnitConfig }),
  (app) => {
    const server = app.listen(config.port, () => {
      logger(`Server is running on http://localhost:${config.port}`)
    })

    process.on('SIGTERM', () => {
      logger('Recevied SIGTERM. Gracefully shutting down server...')
      server.close(() => logger('Server Shut Down'))
    })

    process.on('SIGUSR2', () => {
      const name = `${Date.now()}.heapsnapshot`
      heapdump.writeSnapshot(join(config.DUMP_PATH, name))
      console.log(name)
    })

    return server
  }
)(express())
