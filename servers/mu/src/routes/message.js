import { always, compose } from 'ramda'
import { of } from 'hyper-async'

import { withMiddleware } from './middleware/index.js'

export const withMessageRoutes = (app) => {
  app.post(
    '/message',
    compose(
      withMiddleware,
      always(async (req, res) => {
        const {
          body,
          logger,
          domain: { apis: { sendMsg } }
        } = req

        if (!body) return res.status(400).send('Signed data item is required')

        /**
         * Forward the message
         */
        await of({ raw: body })
          .chain(sendMsg)
          .bimap(
            logger.tap('Failed to forward initial message to the SU and read result from the CU'),
            logger.tap('Successfully forwarded initial message to the SU and read result from the CU. Beginning to crank...')
          )
          .chain(({ tx, crank: crankIt }) => {
            /**
             * Respond to the client after the initial message has been forwarded,
             * then transparently continue cranking its results
             */
            res.status(202).send({ message: 'Processing message', id: tx.id })

            return crankIt().bimap(
              logger.tap('Failed to crank messages'),
              logger.tap('Successfully cranked messages')
            )
          })
          .toPromise()
      })
    )()
  )

  return app
}
