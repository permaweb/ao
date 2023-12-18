import { always, compose } from 'ramda'
import { of } from 'hyper-async'
import { z } from 'zod'
import WarpArBundles from 'warp-arbundles'

import { withMiddleware } from './middleware/index.js'

const { DataItem } = WarpArBundles

export const withRootRoutes = (app) => {
  // TODO: add healthcheck endpoint

  app.post(
    '/',
    compose(
      withMiddleware,
      always(async (req, res) => {
        const {
          body,
          logger: _logger,
          domain: { apis: { sendDataItem } }
        } = req

        const logger = _logger.child('POST_root')

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
         * Forward the DataItem
         */
        await of({ raw: input.body })
          .chain(sendDataItem)
          .bimap(
            logger.tap('Failed to send the DataItem'),
            logger.tap('Successfully sent DataItem. Beginning to crank...')
          )
          .chain(({ tx, crank: crankIt }) => {
            /**
             * Respond to the client after the initial data item has been forwarded,
             * then transparently continue cranking its results
             */
            res.status(202).send({ message: 'Processing DataItem', id: tx.id })
            return crankIt()
          })
          .toPromise()
      })
    )()
  )

  return app
}
