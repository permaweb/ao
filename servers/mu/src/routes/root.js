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
        }
      })
    )()
  )

  return app
}

/**
 * TODO: could be moved into a route utils or middleware
 *
 * keeping local for now, for simplicity
 */
const toConnection = ({ cursorFn }) => ({ nodes, pageSize }) => {
  return {
    pageInfo: {
      hasNextPage: nodes.length > pageSize
    },
    edges: nodes.slice(0, pageSize).map(node => ({
      node,
      cursor: cursorFn(node)
    }))
  }
}

const withTraceRoutes = (app) => {
  const DEFAULT_PAGE_SIZE = 10
  const traceConnection = toConnection({ cursorFn: (trace) => trace.id })

  app.get(
    '/',
    compose(
      withMiddleware,
      withMetrics(),
      always(async (req, res) => {
        const {
          query,
          logger: _logger,
          domain: { apis: { traceMsgs } }
        } = req

        /**
         * Not debugging, so just return the base response
         *
         * TODO: add healthcheck
         */
        if (!query.debug) return res.send('ao messenger unit')

        const logger = _logger.child('GET_trace')

        const inputSchema = z.object({
          process: z.string().optional(),
          message: z.string().optional(),
          wallet: z.string().optional(),
          page: z.coerce.number().int().default(1),
          pageSize: z.coerce.number().int().default(DEFAULT_PAGE_SIZE)
        })

        const input = inputSchema.parse({ ...query, pageSize: query['page-size'] })

        if (input.process && input.message) {
          const err = new Error('Only one of process or message query parameters can be provided')
          err.status = 422
          throw err
        }

        /**
         * Retrieve all message traces for the given input
         */

        await of({ ...input, limit: input.pageSize, offset: input.pageSize * (input.page - 1) })
          .chain(traceMsgs)
          .bimap(
            logger.tap('Failed to retrieve trace for process "%s" or message "%s"', input.process, input.message),
            logger.tap('Successfully retrieved trace for process "%s" or message "%s"', input.process, input.message)
          )
          .map((traces) => res.send(traceConnection({ nodes: traces, pageSize: input.pageSize })))
          .toPromise()
      })
    )()
  )

  return app
}

export const withRootRoutes = pipe(
  withMessageRoutes,
  withTraceRoutes
)
