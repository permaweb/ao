import { compose, pipe, prop, sum, values } from 'ramda'
import { z } from 'zod'

import { busyIn } from '../../../domain/utils.js'

import { withInMemoryCache } from './middleware/withInMemoryCache.js'
import { withErrorHandler } from './middleware/withErrorHandler.js'
import { withCuMode } from './middleware/withCuMode.js'
import { withMetrics } from './middleware/withMetrics.js'
import { withProcessRestrictionFromQuery } from './middleware/withProcessRestriction.js'

const inputSchema = z.object({
  messageUid: z.string().min(1, 'a message unique identifier is required'),
  processId: z.string().min(1, 'a process-id query parameter is required')
})

const gatherStatCounts = pipe(prop('messages'), values, sum)

export const withResultRoutes = app => {
  app.get(
    '/result/:messageUid',
    compose(
      withErrorHandler,
      withCuMode,
      withProcessRestrictionFromQuery,
      withMetrics({ tracesFrom: (req) => ({ process_id: req.query['process-id'] }) }),
      withInMemoryCache({
        keyer: (req) => {
          const {
            params: { messageUid },
            query: { 'process-id': processId }
          } = req
          return `${processId}:${messageUid}`
        },
        loader: async ({ req, res }) => {
          const {
            params: { messageUid },
            /**
             * Client may set the 'no-busy' query parameter to any value
             * to disable the busy response.
             *
             * Useful for MUs that would rather wait on the evaluation response
             */
            query: { 'process-id': processId, 'no-busy': noBusy },
            domain: { BUSY_THRESHOLD, apis: { readResult } }
          } = req

          const input = inputSchema.parse({ messageUid, processId })

          return busyIn(
            noBusy ? 0 : BUSY_THRESHOLD,
            readResult(input)
              .map((result) => {
                const { output, last, isColdStart, exact, stats } = result

                /**
                 * Set various headers that contain metadata concerning the eval
                 * stream
                 */
                const cacheableHeaders = []

                if (last.id) cacheableHeaders.push(['Message', last.id])
                cacheableHeaders.push(['timestamp', last.timestamp])
                cacheableHeaders.push(['block-height', last.blockHeight])
                cacheableHeaders.push(['slot', last.ordinate])

                const aoTypes = [
                  ['timestamp', 'integer'],
                  ['block-height', 'integer'],
                  ['slot', 'integer'],
                  ['cold-start', 'atom'],
                  ['cu-cached', 'atom'],
                  ['eval-stream-length', 'integer']
                ].map(t => t.join('='))
                cacheableHeaders.push(['ao-types', aoTypes.join(',')])

                /**
                 * Some headers ought not be cached on the edge,
                 * as they have to do with this specific evaluation stream
                 * -- this specific request
                 *
                 * So we set them here, so that they are not included as part
                 * of subsequent cached responses, but still included
                 * on this specific response
                 */
                res.header('cold-start', isColdStart)
                res.header('cu-cached', exact)
                res.header('eval-stream-length', gatherStatCounts(stats))

                return [output, cacheableHeaders]
              })
              .toPromise(),
            () => {
              res.status(202)
              return [
                { message: `Evaluation of process "${input.processId}" to "${input.messageUid || 'latest'}" is in progress.` },
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
