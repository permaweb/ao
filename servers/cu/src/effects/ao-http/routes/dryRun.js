import { always, compose } from 'ramda'
import { z } from 'zod'

import { busyIn } from '../../../domain/utils.js'

import { withErrorHandler } from './middleware/withErrorHandler.js'
import { withMetrics } from './middleware/withMetrics.js'
import { withProcessRestrictionFromQuery } from './middleware/withProcessRestriction.js'

const inputSchema = z.object({
  processId: z.string().min(1, 'a process-id query parameter is required'),
  messageUid: z.string().min(1, 'to must be a transaction id').optional(),
  maxProcessAge: z.coerce.number().nullish(),
  dryRun: z.object({
    Id: z.string().nullish(),
    Signature: z.string().nullish(),
    Owner: z.string().nullish(),
    Target: z.string().nullish(),
    Data: z.any().nullish(),
    Tags: z.array(z.object({
      name: z.string(),
      value: z.string()
    })).nullish(),
    Anchor: z.string().nullish(),
    Timestamp: z.coerce.number().nullish(),
    'Block-Height': z.coerce.number().nullish()
  }).passthrough()
})

export const withDryRunRoutes = app => {
  app.post(
    '/dry-run',
    compose(
      withErrorHandler,
      withMetrics({ tracesFrom: (req) => ({ process_id: req.query['process-id'] }) }),
      withProcessRestrictionFromQuery,
      always(async (req, res) => {
        const {
          headers: { 'x-max-age': maxProcessAge },
          query: { 'process-id': processId, to: messageUid },
          body,
          domain: { BUSY_THRESHOLD, apis: { dryRun } }
        } = req

        const input = inputSchema.parse({ processId, messageUid, maxProcessAge, dryRun: body })

        await busyIn(
          BUSY_THRESHOLD,
          dryRun(input).toPromise(),
          () => {
            res.status(202)
            return { message: `Evaluation of process "${input.processId}" to "${input.messageUid || 'latest'}" is in progress.` }
          }
        ).then((output) => res.send(output))
      })
    )()
  )

  return app
}
