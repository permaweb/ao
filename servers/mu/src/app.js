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
  (app) => {
    const server = app.listen(config.port, () => {
      logger({ log: `Server is running on http://localhost:${config.port}` })
    })

    process.on('SIGTERM', () => {
      logger({ log: 'Recevied SIGTERM. Gracefully shutting down server...' })
      server.close(() => logger({ log: 'Server Shut Down' }))
    })

    domain.apis.initCronProcs().then(() => {
      logger({ log: 'Crons initialized' })
    })

    return server
  }
)(express())
