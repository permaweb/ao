import { always, compose } from 'ramda'
import { z } from 'zod'

import { withMiddleware } from './middleware/index.js'

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
      always(async (req, res) => {
        const {
          query: { 'process-id': processId, to: messageTxId },
          body,
          domain: { apis: { dryRun } }
        } = req

        const input = inputSchema.parse({ processId, messageTxId, dryRun: body })

        await dryRun(input)
          .map((output) => res.send(output))
          .toPromise()
      })
    )()
  )

  return app
}
