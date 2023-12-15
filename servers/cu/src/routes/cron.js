import { always, compose, map } from 'ramda'

import { withMiddleware } from './middleware/index.js'
import { z } from 'zod'

const inputSchema = z.object({
  processId: z.string().min(1, 'an ao process id is required'),
  from: z.string().optional(),
  to: z.string().optional()
})

export const withScheduledRoutes = app => {
  app.get(
    '/cron/:processId',
    compose(
      withMiddleware,
      always(async (req, res) => {
        const {
          params: { processId },
          query: { from, to },
          domain: { apis: { readScheduledMessages } }
        } = req

        const input = inputSchema.parse({ processId, from, to })

        const outboxes = await readScheduledMessages(input)
          .map(map((res) => ({
            Output: res.output,
            Messages: res.messages,
            Spawns: res.spawns,
            Error: res.error
          })))
          .toPromise()

        return res.send(outboxes)
      })
    )()
  )

  return app
}
