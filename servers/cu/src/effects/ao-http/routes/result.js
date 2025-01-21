import { compose } from 'ramda'
import { z } from 'zod'

import { busyIn } from '../../../domain/utils.js'

import { withInMemoryCache } from './middleware/withInMemoryCache.js'
import { withErrorHandler } from './middleware/withErrorHandler.js'
import { withCuMode } from './middleware/withCuMode.js'
import { withMetrics } from './middleware/withMetrics.js'
import { withProcessRestrictionFromQuery } from './middleware/withProcessRestriction.js'

const inputSchema = z.object({
  messageTxId: z.string().min(1, 'a message tx id is required'),
  processId: z.string().min(1, 'a process-id query parameter is required')
})

export const withResultRoutes = app => {
  app.get(
    '/result/:messageTxId',
    compose(
      withErrorHandler,
      withCuMode,
      withProcessRestrictionFromQuery,
      withMetrics({ tracesFrom: (req) => ({ process_id: req.query['process-id'] }) }),
      withInMemoryCache({
        keyer: (req) => {
          const { params: { messageTxId } } = req
          return messageTxId
        },
        loader: async ({ req, res }) => {
          const {
            params: { messageTxId },
            /**
             * Client may set the 'no-busy' query parameter to any value
             * to disable the busy response.
             *
             * Useful for MUs that would rather wait on the evaluation response
             */
            query: { 'process-id': processId, 'no-busy': noBusy },
            domain: { BUSY_THRESHOLD, apis: { readResult } }
          } = req

          const input = inputSchema.parse({ messageTxId, processId })

          return busyIn(
            noBusy ? 0 : BUSY_THRESHOLD,
            readResult(input)
              .map((output) => [output])
              .toPromise(),
            () => {
              res.status(202)
              return [
                { message: `Evaluation of process "${input.processId}" to "${input.messageTxId || 'latest'}" is in progress.` },
                /**
                 * Don't store the busy message in the In-Memory cache
                 */
                true // noCache
              ]
            }
          )
        }
      })
    )()
  )

  return app
}
