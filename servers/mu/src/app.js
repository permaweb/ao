import { join } from 'node:path'
import express from 'express'
import cors from 'cors'
import { pipe } from 'ramda'
import heapdump from 'heapdump'

import { logger } from './logger.js'
import { config } from './config.js'
import { withRoutes } from './routes/index.js'
import { initCronProcs } from './domain/index.js'

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

    process.on('SIGUSR2', () => {
      const name = `${Date.now()}.heapsnapshot`
      heapdump.writeSnapshot(join(config.DUMP_PATH, name))
      console.log(name)
    })

    initCronProcs()

    return server
  }
)(express())
