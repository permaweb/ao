import { always, compose } from 'ramda'
import { z } from 'zod'

import { withMiddleware } from './middleware/index.js'

const inputSchema = z.object({
  processId: z.string().min(1, 'a process-id query parameter is required'),
  messageTxId: z.string().min(1, 'to must be a transaction id').optional(),
  /**
   * TODO: I think dryRun messages would only need Data and Tags.
   * DO we think we need to allow anything else?
   */
  dryRun: z.object({
    Data: z.any().nullish(),
    Tags: z.array(z.object({
      name: z.string(),
      value: z.string()
    })).nullish()
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

        return dryRun(input)
          .map((output) => res.send(output))
          .toPromise()
      })
    )()
  )

  return app
}
