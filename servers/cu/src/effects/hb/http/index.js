import { Readable } from 'node:stream'

import { pipe, pipeWith, unapply } from 'ramda'
import Fastify from 'fastify'
import FastifyMiddie from '@fastify/middie'
import cors from 'cors'
import helmet from 'helmet'
import { parseMultipartMessage } from '@apeleghq/multipart-parser'

import { parseMultipartBoundary } from '../index.js'

import { withMetricRoutes } from '../../routes/metrics.js'
import { withHealthcheckRoutes } from './routes/healthcheck.js'
import { withResultRoutes } from './routes/result.js'

const pipeP = unapply(pipeWith((fn, p) => Promise.resolve(p).then(fn)))

const withRoutes = pipe(
  withHealthcheckRoutes,
  withResultRoutes,
  withMetricRoutes
)

export const createHbHttp = async ({ logger: _logger, domain, ...config }) => {
  const logger = _logger.child('hb-http')

  /**
   * Fastify wraps the Node native req and res with Request and Reply
   * only after Middleware (added using use()) is ran. Ergo, Middleware can
   * not be used to make things accessible on the top level Request and Reply.
   *
   * In order to do that, Fastify recommends using a preHandler hook, which
   * fires after the wrapping by Fastify has occurred, allowing us to augment
   * the top level objects received by routes.
   *
   * See https://fastify.dev/docs/v3.29.x/Reference/Middleware/#middleware
   *
   * So we use a preHandler hook to inject the domain, config, and logger
   * to all routes.
   */
  const withDeps = (app) => app.addHook('preHandler', (req, _res, next) => {
    req.domain = domain
    req.config = config
    req.logger = logger
    next()
  })

  return pipeP(
    /**
     * Allow us to use some simple express middleware
     */
    (app) => app.register(FastifyMiddie).then(() => app),
    (app) => app.use(helmet()),
    (app) => app.use(cors()),
    (app) => {
      app.addContentTypeParser('multipart/form-data', function (_req, req, done) {
        const boundary = parseMultipartBoundary(req)

        if (!boundary) return done()

        /**
         * Parse the streaming body into an Async generator
         * that can be used to iterate over the parts. Each part
         * is emitted as { headers: Headers, body: Uint8Array | null }.
         *
         * IFF the part is a nested multipart, then parts field will also
         * be present, which is a nested iterator of the same structure
         *
         * This is set at req.body
         */
        const body = parseMultipartMessage(Readable.toWeb(req), boundary)
        done(null, body)
      })

      return app
    },
    withDeps,
    withRoutes,
    (app) => {
      async function start () {
        return new Promise((resolve) => {
          /**
           * See https://github.com/fastify/fastify?tab=readme-ov-file#note
           */
          app.listen({ port: config.port, host: '0.0.0.0' }, () => {
            logger(`Server is running on http://localhost:${config.port}`)
            logger(`Server in unit mode: "${config.UNIT_MODE}"`)
            resolve()
          })
        })
      }

      async function stop () {
        return new Promise((resolve, reject) => {
          logger('Received SIGTERM. Gracefully shutting down server...')
          app.close(
            () => {
              logger('Server shut down.')
              resolve()
            },
            (e) => {
              logger('Failed to shut down server!', e)
              reject(e)
            }
          )
        })
      }

      return { start, stop }
    }
  )(Fastify())
}
