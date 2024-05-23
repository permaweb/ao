import express from 'express'
import cors from 'cors'
import { pipe } from 'ramda'

import { logger } from './logger.js'
import { config } from './config.js'
import { withRoutes } from './routes/index.js'
import { domain } from './routes/middleware/withDomain.js'

export const server = pipe(
  (app) => app.use(cors()),
  (app) => app.use(express.json({ type: 'application/json' })),
  (app) => app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' })),
  withRoutes,
  app => {
    const server = app.listen(config.port, () => {
      logger(`Server is running on http://localhost:${config.port}`)
    })

    process.on('SIGTERM', () => {
      logger('Recevied SIGTERM. Gracefully shutting down server...')
      server.close(() => logger('Server Shut Down'))
    })

    domain.apis.initCronProcs().then(() => {
      logger('Crons initialized')
    })

    return server
  }
)(express())
