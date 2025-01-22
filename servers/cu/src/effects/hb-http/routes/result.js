import { always, compose } from 'ramda'
import { z } from 'zod'

import { withErrorHandler } from '../../middleware/withErrorHandler.js'
import { withMetrics } from '../../middleware/withMetrics.js'
import { withProcessRestrictionFromQuery } from '../../middleware/withProcessRestriction.js'

const inputSchema = z.object({
  messageTxId: z.string().min(1, 'a message tx id is required'),
  processId: z.string().min(1, 'a process-id query parameter is required')
})

export const withResultRoutes = app => {
  app.post(
    '/result/:messageTxId',
    compose(
      withErrorHandler,
      withProcessRestrictionFromQuery,
      withMetrics({ tracesFrom: (req) => ({ process_id: req.query['process-id'] }) }),
      always(async ({ req, res }) => {
        /**
         * TODO:
         * - map the body into a payload for business logic
         * - seed HB SU with initial message
         * - send result to HB MU
         */

        const {
          params: { messageTxId },
          query: { 'process-id': processId },
          // eslint-disable-next-line
          domain: { apis: { readResult } }
        } = req

        // eslint-disable-next-line
        const input = inputSchema.parse({ messageTxId, processId })

        /**
         * Executes in the background
         */
        // readResult(input)
        //   .map((output) => [output])
        //   .chain((result) => {
        //     // send to HB Messenger
        //   })
        //   .toPromise()

        return res.status(200).send('Computing...')
      }
      )()
    )
  )

  return app
}
