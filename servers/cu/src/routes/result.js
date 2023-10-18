import { always, compose } from 'ramda'

import { withMiddleware } from './middleware/index.js'
import { z } from 'zod'

const inputSchema = z.object({
  messageTxId: z.string().min(1, 'a message tx id is required')
})

export const withResultRoutes = app => {
  app.get(
    '/result/:interactionId',
    compose(
      withMiddleware,
      always(async (req, res) => {
        const {
          params: { interactionId },
          domain: { apis: { readResult } }
        } = req

        const input = inputSchema.parse({ messageTxId: interactionId })
        return res.send(await readResult(input))
      })
    )()
  )

  return app
}
