import express from 'express'
import { pipe } from 'ramda'
import bodyParser from 'body-parser'
import cors from 'cors'

import { logger } from './logger.js'
import { config } from './config.js'
import { withRoutes } from './routes/index.js'

export const server = pipe(
  (app) => app.use(cors()),
  (app) => app.use(bodyParser.json()),
  (app) => app.use(bodyParser.urlencoded({ extended: false })),
  (app) => app.get('/', (_req, res) => res.send('ao messenger unit')),
  withRoutes,
  app => {
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
