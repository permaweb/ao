import { always, compose } from 'ramda'
import { z } from 'zod'

import { withErrorHandler } from '../../../middleware/withErrorHandler.js'
import { withMetrics } from '../../../middleware/withMetrics.js'
import { withProcessRestrictionFromQuery } from '../../../middleware/withProcessRestriction.js'

const inputSchema = z.object({
  messageTxId: z.string().min(1, 'a message tx id is required'),
  processId: z.string().min(1, 'a process-id query parameter is required')
})

function mapAssignmentFrom ({ headers, body }) {
  return {
    noSave: true,
    ordinate: headers.slot,
    name: `Hyperbeam Message ${headers.timestamp}:${headers.slot}`,
    exclude: headers.exclude,
    /**
     * TODO: how do we determine whether of not this is an
     * assignment of data from arweave?
     */
    isAssignment: undefined,
    assignmentId: undefined,
    message: {
      /**
       * TODO: Add fields from the body
       */
      Epoch: headers.epoch,
      Nonce: headers.slot,
      Timestamp: parseInt(headers.timestamp),
      'Block-Height': parseInt(headers['block-height']),
      Target: headers.process,
      'Hash-Chain': headers['hash-chain']
    },
    block: {
      height: parseInt(headers['block-height']),
      /**
       * TODO: is this seconds or milliseconds?
       */
      timestamp: parseInt(headers['block-timestamp'])
    }
  }
}

export const withResultRoutes = app => {
  app.post(
    '/result/:messageTxId',
    compose(
      withErrorHandler,
      withProcessRestrictionFromQuery,
      withMetrics(),
      always(async ({ req, res }) => {
        /**
         * TODO:
         * - map the body into a payload for business logic
         * - seed HB SU with initial message
         * - send result to HB MU
         */

        const {
          body,
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
