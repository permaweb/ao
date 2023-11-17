import { join } from 'node:path'
import heapdump from 'heapdump'
import { pipe } from 'ramda'
import express from 'express'
import cors from 'cors'

import { logger } from './logger.js'
import { config } from './config.js'
import { withRoutes } from './routes/index.js'

export const server = pipe(
  /**
   * Allows us to download heapdumps, if created
   */
  (app) => app.use(express.static(config.DUMP_PATH)),
  (app) => app.use(cors()),
  (app) => app.use(express.json({ type: 'application/json' })),
  (app) => app.get('/', (_req, res) => res.send('ao compute unit')),
  withRoutes,
  app => {
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
