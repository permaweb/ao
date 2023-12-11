import { always, compose } from 'ramda'
import { of } from 'hyper-async'
import { z } from 'zod'

import WarpArBundles from 'warp-arbundles'

import { withMiddleware } from './middleware/index.js'
const { DataItem } = WarpArBundles

export const withSpawnRoutes = (app) => {
  app.post(
    '/spawn',
    compose(
      withMiddleware,
      always(async (req, res) => {
        const {
          body,
          logger,
          domain: { apis: { sendSpawn } }
        } = req

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

        await of({ raw: input.body })
          .chain(sendSpawn)
          .bimap(
            logger.tap('Failed to forward spawn message to the SU'),
            logger.tap('Successfully forwarded spawn message to the SU')
          )
          .chain(({ tx }) => {
            /**
             * Respond to the client after the spawn message has been forwarded
             */
            res.status(202).send({ message: 'Spawned Process: ', id: tx.id })

            return of(() => {})
          })
          .toPromise()
      })
    )()
  )

  return app
}
