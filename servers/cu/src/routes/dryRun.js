import { always, compose } from 'ramda'
import { z } from 'zod'

import { busyIn } from '../domain/utils.js'
import { withMiddleware, withProcessRestrictionFromQuery } from './middleware/index.js'

const inputSchema = z.object({
  processId: z.string().min(1, 'a process-id query parameter is required'),
  messageTxId: z.string().min(1, 'to must be a transaction id').optional(),
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
      withMiddleware,
      withProcessRestrictionFromQuery,
      always(async (req, res) => {
        const {
          query: { 'process-id': processId, to: messageTxId },
          body,
          domain: { BUSY_THRESHOLD, apis: { dryRun } }
        } = req

        const input = inputSchema.parse({ processId, messageTxId, dryRun: body })

        await busyIn(
          BUSY_THRESHOLD,
          dryRun(input).toPromise(),
          () => {
            res.status(202)
            return { message: `Evaluation of process "${input.processId}" to "${input.messageTxId || 'latest'}" is in progress.` }
          }
        ).then((output) => res.send(output))
      })
    )()
  )

  return app
}
