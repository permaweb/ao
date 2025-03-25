import { always, compose, pipe } from 'ramda'
import { of } from 'hyper-async'

import { withMetrics, withMiddleware } from './middleware/index.js'
import { randomBytes } from 'node:crypto'

const withPushRoute = (app) => {
  app.post(
    '/push/:id/:number',
    compose(
      withMiddleware,
      withMetrics(),
      always(async (req, res) => {
        const {
          logger: _logger,
          domain: { apis: { pushMsg } },
          params: { id, number },
          query: {
            'process-id': processId,
            'custom-cu': customCu
          }
        } = req

        const logger = _logger.child('POST_push')
        const logId = randomBytes(8).toString('hex')

        if (isNaN(Number(number))) {
          return res.status(400).send({ error: `'number' parameter must be a valid number` });
        }

        await of({ tx: { id, processId }, number: Number(number), logId, messageId: id, initialTxId: id, customCu })
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
