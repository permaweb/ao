import { always, compose } from 'ramda'
import { of } from 'hyper-async'
import { z } from 'zod'
import WarpArBundles from 'warp-arbundles'

import { withMiddleware } from './middleware/index.js'

const { DataItem } = WarpArBundles

export const withMessageRoutes = (app) => {
  app.post(
    '/message',
    compose(
      withMiddleware,
      always(async (req, res) => {
        const {
          body,
          logger: _logger,
          domain: { apis: { sendMsg } }
        } = req

        const logger = _logger.child('POST_message')

        const inputSchema = z.object({
          body: z.any().refine(
            async (val) => DataItem.verify(val).catch((err) => {
              logger('Error verifying DataItem', err)
              return false
            }),
            { message: 'A valid and signed data item must be provided as the body' }
          )
        })

        const input = await inputSchema.parseAsync({ body })

        /**
         * Forward the message
         */
        await of({ raw: input })
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
