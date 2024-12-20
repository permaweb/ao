import { always, compose, pipe } from 'ramda'
import { of } from 'hyper-async'

import { withMetrics, withMiddleware } from './middleware/index.js'
import { randomBytes } from 'node:crypto'

const withPushRoute = (app) => {
  app.post(
    '/push/:processId/:id',
    compose(
      withMiddleware,
      withMetrics(),
      always(async (req, res) => {
        const {
          logger: _logger,
          domain: { apis: { pushMsg } },
          params: { processId, id }
        } = req

        const logger = _logger.child('POST_push')
        const logId = randomBytes(8).toString('hex')

        await of({ tx: { id, processId }, logId, messageId: id })
          .chain(pushMsg)
          .bimap(
            (e) => {
              logger({ log: `Failed to fetch the result: ${e}`, end: true }, e.cause)
              return e
            },
            logger.tap({ log: 'Successfully fetched result. Beginning to push...' })
          )
          .chain(({ crank: crankIt }) => {
            res.status(202).send({ message: 'Processing Message Result', id })
            return crankIt()
          })
          .toPromise()
      })
    )()
  )

  return app
}

export const withPushRoutes = pipe(
  withPushRoute,
)
