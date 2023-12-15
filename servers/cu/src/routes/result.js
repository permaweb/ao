import { compose } from 'ramda'
import { z } from 'zod'

import { withMiddleware } from './middleware/index.js'
import { withInMemoryCache } from './middleware/withInMemoryCache.js'

const inputSchema = z.object({
  messageTxId: z.string().min(1, 'a message tx id is required'),
  processId: z.string().min(1, 'a process-id query parameter is required')
})

export const withResultRoutes = app => {
  app.get(
    '/result/:messageTxId',
    compose(
      withMiddleware,
      withInMemoryCache({
        keyer: (req) => {
          const { params: { messageTxId } } = req
          return messageTxId
        },
        loader: async (requests) => {
          return requests.map(async ({ req }) => {
            const {
              params: { messageTxId },
              query: { 'process-id': processId },
              domain: { apis: { readResult } }
            } = req

            const input = inputSchema.parse({ messageTxId, processId })

            return readResult(input)
              .map((res) => ({
                Output: res.output,
                Messages: res.messages,
                Spawns: res.spawns,
                Error: res.error
              }))
              .toPromise()
              /**
               * Will bubble up to the individual load call
               * on the dataloader, where it can be handled
               * individually
               */
              .catch(err => err)
          })
        }
      })
    )()
  )

  return app
}
