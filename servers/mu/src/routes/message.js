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
          domain: { apis: { initMsgs, crankMsgs } }
        } = req

        if (!body) return res.status(400).send('Signed data item is required')

        /**
         * Passively process the messages
         */
        of({ raw: body })
          .chain(initMsgs)
          .bimap(
            logger.tap('Failed to forward initial message to the SU and read result from the CU'),
            logger.tap('Successfully forwarded initial message to the SU and read result from the CU. Beginning to crank...')
          )
          .map(response => {
            /**
             * Respond to the client after the initial message has been forwarded,
             * then transparently continue cranking.
             */
            res.status(202).send({ message: 'Processing message', id: response.tx.id })
            return response
          })
          .map(res => ({ msgs: res.msgs, spawns: res.spawns }))
          .chain(res =>
            crankMsgs(res)
              .bimap(
                logger.tap('Failed to crank messages'),
                logger.tap('Successfully cranked messages')
              )
          )
          .toPromise()
      })
    )()
  )

  return app
}
