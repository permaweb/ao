import { join } from 'node:path'

import heapdump from 'heapdump'
import { unapply, pipeWith } from 'ramda'

import Fastify from 'fastify'
import FastifyMiddie from '@fastify/middie'
import serveStatic from 'serve-static'
import cors from 'cors'
import helmet from 'helmet'

import { logger } from './logger.js'
import { config } from './config.js'
import { withRoutes } from './routes/index.js'

const pipeP = unapply(pipeWith((fn, p) => Promise.resolve(p).then(fn)))

export const server = pipeP(
  /**
   * Allow us to use some simple express middleware
   */
  (app) => app.register(FastifyMiddie).then(() => app),
  /**
   * Allows us to download heapdumps, if created
   */
  (app) => app.use(helmet()),
  (app) => app.use(serveStatic(config.DUMP_PATH)),
  (app) => app.use(cors()),
  withRoutes,
  (app) => {
    const server = app.listen({ port: config.port }, () => {
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
)(Fastify())
