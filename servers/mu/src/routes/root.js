import { always, compose, pipe } from 'ramda'
import { of } from 'hyper-async'
import { z } from 'zod'
// import WarpArBundles from 'warp-arbundles'
// arbundles verifies cross chain signed data items, warp-arbundles only supports arweave
import { DataItem } from 'arbundles'

import { withMetrics, withMiddleware } from './middleware/index.js'

// const { DataItem } = WarpArBundles

const withMessageRoutes = (app) => {
  app.post(
    '/',
    compose(
      withMiddleware,
      always(async (req, res) => {
        const {
          body,
          logger: _logger,
          domain: { apis: { sendDataItem, sendAssign } },
          query: {
            'process-id': processId,
            assign,
            'base-layer': baseLayer,
            exclude
          }
        } = req

        const logger = _logger.child('POST_root')

        if ((processId && !assign) || (!processId && assign)) {
          res.status(400).send({ error: 'You must set both process-id and assign to send an assignment, not just one' })
        } else if (processId && assign) {
          /**
           * Forward the Assignment
           */
          await of({
            assign: {
              processId,
              txId: assign,
              baseLayer,
              exclude
            }
          })
            .chain(sendAssign)
            .bimap(
              logger.tap('Failed to send the Assignment'),
              logger.tap('Successfully sent Assignment. Beginning to crank...')
            )
            .chain(({ tx, crank: crankIt }) => {
              /**
               * Respond to the client after the initial data item has been forwarded,
               * then transparently continue cranking its results
               */
              res.status(202).send({ message: 'Processing Assignment', id: tx.id })
              return crankIt()
            })
            .toPromise()
        } else {
          const now = Date.now()
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
              console.log('Processing Data Item took', Date.now() - now)
              res.status(202).send({ message: 'Processing DataItem', id: tx.id })
              return crankIt()
            })
            .toPromise()
        }
      })
    )()
  )

  return app
}

const withBaseRoute = (app) => {
  app.get(
    '/',
    compose(
      withMiddleware,
      withMetrics(),
      always(async (_req, res) => {
        return res.send('ao messenger unit')
      })
    )()
  )

  return app
}

export const withRootRoutes = pipe(
  withMessageRoutes,
  withBaseRoute
)
