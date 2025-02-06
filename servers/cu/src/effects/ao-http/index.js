import { pipe, pipeWith, unapply } from 'ramda'

import Fastify from 'fastify'
import FastifyMiddie from '@fastify/middie'
import cors from 'cors'
import helmet from 'helmet'

import { withMetricRoutes } from './routes/metrics.js'
import { withStateRoutes } from './routes/state.js'
import { withResultRoutes } from './routes/result.js'
import { withDryRunRoutes } from './routes/dryRun.js'
import { withResultsRoutes } from './routes/results.js'
import { withCronRoutes } from './routes/cron.js'
import { withHealthcheckRoutes } from './routes/healthcheck.js'

const pipeP = unapply(pipeWith((fn, p) => Promise.resolve(p).then(fn)))

const withRoutes = pipe(
  withHealthcheckRoutes,
  withStateRoutes,
  withResultRoutes,
  withDryRunRoutes,
  withResultsRoutes,
  withCronRoutes,
  withMetricRoutes
)

export const createAoHttp = async ({ logger: _logger, domain, ...config }) => {
  const logger = _logger.child('ao-http')

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
