import { unapply, pipeWith } from 'ramda'
import ms from 'ms'

import Fastify from 'fastify'
import FastifyMiddie from '@fastify/middie'
import cors from 'cors'
import helmet from 'helmet'

import { logger as _logger } from './logger.js'
import { config } from './config.js'
import { withRoutes } from './routes/index.js'

import { domain } from './routes/middleware/withDomain.js'

const logger = _logger.child('app')

const pipeP = unapply(pipeWith((fn, p) => Promise.resolve(p).then(fn)))

export const server = pipeP(
  /**
   * Allow us to use some simple express middleware
   */
  (app) => app.register(FastifyMiddie).then(() => app),
  (app) => app.use(helmet()),
  (app) => app.use(cors()),
  withRoutes,
  (app) => {
    /**
     * See https://github.com/fastify/fastify?tab=readme-ov-file#note
     */
    const server = app.listen({ port: config.port, host: '0.0.0.0' }, () => {
      logger(`Server is running on http://localhost:${config.port}`)
    })

    const memMonitor = setInterval(async () => {
      logger('Stats Usage: %j', await domain.apis.stats())
      logger('Currently Pending readState operations: %j', domain.apis.pendingReadStates())
    }, config.MEM_MONITOR_INTERVAL)
    memMonitor.unref()

    if (config.PROCESS_MEMORY_CACHE_CHECKPOINT_INTERVAL) {
      logger('Setting up Interval to Checkpoint all Processes every %s', ms(config.PROCESS_MEMORY_CACHE_CHECKPOINT_INTERVAL))
      const cacheCheckpointInterval = setInterval(async () => {
        logger('Checkpoint Interval Reached. Attempting to Checkpoint all Processes currently in WASM heap cache...')
        await domain.apis.checkpointWasmMemoryCache().toPromise()
        logger('Interval Checkpoint Done. Done checkpointing all processes in WASM heap cache.')
      }, config.PROCESS_MEMORY_CACHE_CHECKPOINT_INTERVAL)
      cacheCheckpointInterval.unref()
    }

    process.on('SIGTERM', async () => {
      logger('Received SIGTERM. Gracefully shutting down server...')
      app.close(
        () => logger('Server shut down.'),
        (e) => logger('Failed to shut down server!', e)
      )

      logger('Received SIGTERM. Attempting to Checkpoint all Processes currently in WASM heap cache...')
      await domain.apis.checkpointWasmMemoryCache().toPromise()
      logger('Done checkpointing all processes in WASM heap cache. Exiting...')
      process.exit()
    })

    process.on('SIGUSR2', async () => {
      logger('Received SIGUSR2. Manually Attempting to Checkpoint all Processes currently in WASM heap cache...')
      await domain.apis.checkpointWasmMemoryCache().toPromise()
      logger('SIGUSR2 Done. Done checkpointing all processes in WASM heap cache.')
    })

    process.on('uncaughtException', (err) => {
      console.trace('Uncaught Exception:', err)
      process.exit(1)
    })

    process.on('unhandledRejection', (reason, promise) => {
      console.trace('Unhandled Rejection at:', promise, 'reason:', reason)
    })

    return server
  }
)(Fastify())
