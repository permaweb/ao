import { always, compose, pipe } from 'ramda'
import { of } from 'hyper-async'
import { randomBytes } from 'node:crypto'

import { withMetrics, withMiddleware } from './middleware/index.js'

const withPushResultToHbRoute = (app) => {
  app.post(
    '/push-result/:id/:number',
    compose(
      withMiddleware,
      withMetrics(),
      always(async (req, res) => {
        const {
          logger: _logger,
          domain: { apis: { pushResultToHb } },
          params: { id, number },
          query: {
            'process-id': processId
          }
        } = req

        const logger = _logger.child('POST_push_result_to_hb')
        const logId = randomBytes(8).toString('hex')

        if (isNaN(Number(number))) {
          return res.status(400).send({ error: "'number' parameter must be a valid number" })
        }

        await of({
          tx: { id, processId },
          number: Number(number),
          logId,
          messageId: id,
          initialTxId: id
        })
          .chain(pushResultToHb)
          .bimap(
            (e) => {
              logger({ log: `[push-result] Failed: ${e}`, end: true }, e.cause)
              res.status(500).send({ error: String(e) })
            },
            ({ hbRes }) => {
              logger({ log: `[push-result] Success for ${id}/${number}`, end: true })
              res.status(200).send({ message: 'Result uploaded to HB', id, number: Number(number), hbRes })
            }
          )
          .toPromise()
      })
    )()
  )

  return app
}

export const withPushResultToHbRoutes = pipe(
  withPushResultToHbRoute
)
